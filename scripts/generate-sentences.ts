// Generates translation exercises with Gemini: one Chinese sentence per HSK word (segmented into
// words = blanks) plus its Lao translation, then adds pinyin / part of speech / Lao meaning of each
// target word. Results go to src/data/sentences/hsk<level>.json.
//
// Usage: npm run generate -- [--level 1] [--count 20] [--words 爱,吃,...] [--force]
//   --count  how many words of the level to cover (taken in list order), default 20
//   --words  explicit target words instead of --count
//   --force  regenerate sentences that already exist
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
  },
})

const level = Number(args.level)
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

for (const [i, target] of targets.entries()) {
  const label = `[${i + 1}/${targets.length}] ${target.word}`
  const existing = sentences.findIndex((s) => s.target === target.word)
  if (existing !== -1 && !args.force) {
    console.log(`${label}: exists, skipping`)
    continue
  }

  const sentence = await generateFor(target)
  if (!sentence) {
    console.error(`${label}: FAILED after ${MAX_ATTEMPTS} attempts, skipped`)
    continue
  }

  if (existing !== -1) sentences[existing] = sentence
  else sentences.push(sentence)
  await save()
  console.log(`${label}: ${sentence.words.join(' ')}  ->  ${sentence.lao}`)
  await sleep(DELAY_MS)
}

const enriched = await enrichSentences(sentences, vocab)
if (enriched) {
  await save()
  console.log(`\nAdded word info for ${enriched} sentences`)
}
const stillMissing = sentences.filter((s) => !s.info).length
if (stillMissing) console.warn(`${stillMissing} sentences still have no word info - re-run to retry`)

console.log(`\n${sentences.length} sentences in ${outFile.pathname}`)

async function generateFor(target: HskWord): Promise<Sentence | null> {
  let feedback = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await callGemini<{ words: string[]; lao: string }>(buildPrompt(target, feedback), {
      type: 'OBJECT',
      properties: {
        words: { type: 'ARRAY', items: { type: 'STRING' } },
        lao: { type: 'STRING' },
      },
      required: ['words', 'lao'],
      propertyOrdering: ['words', 'lao'],
    })
    const words = result.words.map((w) => w.trim()).filter((w) => w && !isPunctuation(w))
    const problem = validate(target.word, words, result.lao)
    if (!problem) {
      return { id: `hsk${level}-${target.word}`, level, target: target.word, words, lao: result.lao.trim() }
    }
    console.warn(`  attempt ${attempt} rejected (${words.join(' ')}): ${problem}`)
    feedback = `Your previous answer ${JSON.stringify(words)} was rejected: ${problem}. Fix this.`
    await sleep(DELAY_MS)
  }
  return null
}

function buildPrompt(target: HskWord, feedback: string): string {
  const others = sentences
    .filter((s) => s.target !== target.word)
    .map((s) => s.words.join(''))
  return `You write translation exercises for Lao-speaking beginners learning Mandarin Chinese (HSK ${level}).

Target word: ${target.word} (${target.pinyin}) - ${target.meanings.slice(0, 3).join('; ')}

1. Write ONE short, natural, everyday sentence in Simplified Chinese that uses the target word in its common meaning.
   Use ONLY words from the allowed vocabulary below (or ordinary words made purely of their characters, e.g. 吃饭).
2. Split the sentence into words the way a Chinese dictionary would, one array element per word:
   - keep multi-character words together (吃饭, 不客气, 打电话, 北京, 什么)
   - grammatical particles (了, 吗, 呢, 的) and measure words (个, 本, 块) are separate words
   - the target word must be exactly one element of the array
   - no punctuation in the array
3. Translate the sentence into natural, everyday spoken Lao (Lao script), keeping the meaning and the sentence type
   (a question stays a question). This Lao sentence is what the learner sees, so it must be unambiguous.

Examples:
- target 爱: {"words": ["我", "爱", "中国"], "lao": "ຂ້ອຍຮັກປະເທດຈີນ"}
- target 吃: {"words": ["你", "吃饭", "了", "吗"], "lao": "ເຈົ້າກິນເຂົ້າແລ້ວຫວາ"}
${others.length ? `\nDo not repeat these existing sentences: ${others.join(', ')}\n` : ''}
Allowed vocabulary: ${[...vocabWords].join(' ')}
${feedback ? `\n${feedback}` : ''}`
}

/** Returns a description of what's wrong, or null when the sentence is usable. */
function validate(target: string, words: string[], lao: string): string | null {
  if (words.length < 2 || words.length > 10) return `sentence must have 2-10 words, got ${words.length}`
  if (!words.includes(target)) return `the target word ${target} must be one separate element`
  const outside = words.filter((w) => !vocabWords.has(w) && ![...w].every((c) => vocabChars.has(c)))
  if (outside.length) return `these words are not HSK ${level} vocabulary: ${outside.join(', ')}`
  if (!isLaoText(lao)) return 'the "lao" field must be written in Lao script only (no Thai letters)'
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
