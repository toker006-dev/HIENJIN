// Generates translation exercises with Gemini: one Chinese sentence per HSK word (segmented into
// words = blanks) plus its Lao translation, then adds pinyin / part of speech / Lao meaning of each
// target word. Results go to src/data/sentences/hsk<level>.json.
//
// Usage: npm run generate -- [--level 1] [--count 20] [--words 爱,吃,...] [--force] [--batch 10]
//   --count  how many words of the level to cover (taken in list order), default 20
//   --words  explicit target words instead of --count
//   --force  regenerate sentences that already exist
//   --batch  how many sentences to ask for per Gemini request, default 10
// Words that already have a sentence are skipped, so an interrupted run can simply be restarted.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import type { Sentence } from '../src/types.ts'
import { enrichSentences, isLaoText } from './enrich-words.ts'
import { callGemini, sleep } from './gemini.ts'
import { loadLevel, loadVocabUpTo, type HskWord } from './hsk.ts'

const MAX_ATTEMPTS = 4
const DELAY_MS = 4000 // keeps us under the free-tier requests-per-minute limit

const { values: args } = parseArgs({
  options: {
    level: { type: 'string', default: '1' },
    count: { type: 'string', default: '20' },
    words: { type: 'string' },
    force: { type: 'boolean', default: false },
    batch: { type: 'string', default: '10' },
  },
})

const level = Number(args.level)
const batchSize = Number(args.batch)
const outDir = new URL('../src/data/sentences/', import.meta.url)
const outFile = new URL(`hsk${level}.json`, outDir)

const levelWords = await loadLevel(level)
const vocab = await loadVocabUpTo(level)
const vocabWords = new Set(vocab.map((w) => w.word))
const vocabChars = new Set(vocab.flatMap((w) => [...w.word]))

const targets: HskWord[] = args.words
  ? args.words.split(',').map((w) => {
      const found = levelWords.find((x) => x.word === w.trim())
      if (!found) throw new Error(`"${w}" is not an HSK${level} word`)
      return found
    })
  : levelWords.slice(0, Number(args.count))

const sentences = await loadExisting()

// A run cut short by the quota never reaches the word-info step at the end, so catch up on those first.
if (await enrichSentences(sentences, vocab)) await save()

const todo = targets.filter((t) => args.force || !sentences.some((s) => s.target === t.word))
console.log(`HSK${level}: ${targets.length - todo.length} of ${targets.length} words already have a sentence, ${todo.length} to generate`)

const failed: string[] = []
for (let i = 0; i < todo.length; i += batchSize) {
  const batch = todo.slice(i, i + batchSize)
  console.log(`\nBatch ${i / batchSize + 1}/${Math.ceil(todo.length / batchSize)}: ${batch.map((t) => t.word).join(' ')}`)
  failed.push(...(await generateBatch(batch)))
}

const enriched = await enrichSentences(sentences, vocab)
if (enriched) {
  await save()
  console.log(`\nAdded word info for ${enriched} sentences`)
}
const stillMissing = sentences.filter((s) => !s.info).length
if (stillMissing) console.warn(`${stillMissing} sentences still have no word info - re-run to retry`)
if (failed.length) console.warn(`No valid sentence after ${MAX_ATTEMPTS} attempts: ${failed.join(' ')} - re-run to retry`)

console.log(`\n${sentences.length} sentences in ${outFile.pathname}`)

/**
 * Asks for sentences for several words in one request. Sentences that pass validation are saved;
 * the rest are asked for again (with what was wrong) up to MAX_ATTEMPTS times. Returns words that never passed.
 */
async function generateBatch(batch: HskWord[]): Promise<string[]> {
  let pending = batch
  const feedback = new Map<string, string>()

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && pending.length; attempt++) {
    const results = await callGemini<{ target: string; words: string[]; lao: string }[]>(buildPrompt(pending, feedback), {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          target: { type: 'STRING' },
          words: { type: 'ARRAY', items: { type: 'STRING' } },
          lao: { type: 'STRING' },
        },
        required: ['target', 'words', 'lao'],
        propertyOrdering: ['target', 'words', 'lao'],
      },
    })

    const stillPending: HskWord[] = []
    for (const target of pending) {
      const result = results.find((r) => r.target.trim() === target.word)
      if (!result) {
        feedback.set(target.word, 'you returned no sentence for this word')
        stillPending.push(target)
        continue
      }
      const words = result.words.map((w) => w.trim()).filter((w) => w && !isPunctuation(w))
      const problem = validate(target.word, words, result.lao)
      if (problem) {
        console.warn(`  ${target.word}: rejected (${words.join(' ')}): ${problem}`)
        feedback.set(target.word, `your previous answer ${JSON.stringify(words)} was rejected: ${problem}`)
        stillPending.push(target)
        continue
      }

      const sentence: Sentence = { id: `hsk${level}-${target.word}`, level, target: target.word, words, lao: result.lao.trim() }
      const existing = sentences.findIndex((s) => s.target === target.word)
      if (existing !== -1) sentences[existing] = sentence
      else sentences.push(sentence)
      console.log(`  ${target.word}: ${words.join(' ')}  ->  ${sentence.lao}`)
    }

    await save()
    pending = stillPending
    await sleep(DELAY_MS)
  }
  return pending.map((t) => t.word)
}

function buildPrompt(batch: HskWord[], feedback: Map<string, string>): string {
  const batchWords = new Set(batch.map((t) => t.word))
  const others = sentences.filter((s) => !batchWords.has(s.target)).map((s) => s.words.join(''))
  const targetList = batch
    .map((t) => {
      const note = feedback.get(t.word)
      return `- ${t.word} (${t.readings.join(' / ')}) - ${t.meanings.slice(0, 3).join('; ')}${note ? `\n  NOTE: ${note}. Fix this.` : ''}`
    })
    .join('\n')

  return `You write translation exercises for Lao-speaking beginners learning Mandarin Chinese (HSK ${level}).

For EACH target word below, return one object { "target", "words", "lao" }:

1. Write ONE short, natural, everyday sentence in Simplified Chinese that uses the target word in its common meaning.
   Use ONLY words from the allowed vocabulary below (or ordinary words made purely of their characters, e.g. 吃饭).
2. "words": split the sentence into words the way a Chinese dictionary would, one array element per word:
   - keep multi-character words together (吃饭, 不客气, 打电话, 北京, 什么)
   - grammatical particles (了, 吗, 呢, 的) and measure words (个, 本, 块) are separate words
   - the target word must be exactly one element of the array
   - no punctuation in the array
3. "lao": translate the sentence into natural, everyday spoken Lao (Lao script only - never Thai letters), keeping
   the meaning, the people (我们 = ພວກເຮົາ, not ພວກເຂົາ) and the sentence type (a question stays a question).
   This Lao sentence is what the learner sees, so it must be unambiguous.
4. Every sentence must be different from the others and from the existing sentences.

Examples:
- {"target": "爱", "words": ["我", "爱", "中国"], "lao": "ຂ້ອຍຮັກປະເທດຈີນ"}
- {"target": "吃", "words": ["你", "吃饭", "了", "吗"], "lao": "ເຈົ້າກິນເຂົ້າແລ້ວຫວາ"}

Target words:
${targetList}
${others.length ? `\nExisting sentences (do not repeat): ${others.join(', ')}\n` : ''}
Allowed vocabulary: ${[...vocabWords].join(' ')}`
}

/** Returns a description of what's wrong, or null when the sentence is usable. */
function validate(target: string, words: string[], lao: string): string | null {
  if (words.length < 2 || words.length > 10) return `sentence must have 2-10 words, got ${words.length}`
  if (!words.includes(target)) return `the target word ${target} must be one separate element`
  const outside = words.filter((w) => !vocabWords.has(w) && ![...w].every((c) => vocabChars.has(c)))
  if (outside.length) return `these words are not HSK ${level} vocabulary: ${outside.join(', ')}`
  if (!isLaoText(lao)) return 'the "lao" field must be written in Lao script only (no Thai letters)'
  // A slip the lite model makes a lot: "we" written twice.
  if (lao.includes('ພວກພວກ')) return 'the "lao" field repeats ພວກ (write ພວກເຮົາ / ພວກເຂົາ once)'
  return null
}

function isPunctuation(word: string): boolean {
  return /^[\p{P}\p{S}\s]+$/u.test(word)
}

async function loadExisting(): Promise<Sentence[]> {
  try {
    return JSON.parse(await readFile(outFile, 'utf8')) as Sentence[]
  } catch {
    return []
  }
}

async function save(): Promise<void> {
  await mkdir(outDir, { recursive: true })
  await writeFile(outFile, JSON.stringify(sentences, null, 2) + '\n')
}
