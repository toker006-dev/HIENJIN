import { PARTS_OF_SPEECH, type PartOfSpeech, type Sentence } from '../src/types.ts'
import { callGemini } from './gemini.ts'
import type { HskWord } from './hsk.ts'

/**
 * Fills `info` (pinyin, part of speech, Lao meaning) for every sentence that lacks it, using one Gemini
 * request for all of them. Pinyin comes from the HSK list; part of speech is judged from the sentence.
 */
export async function enrichSentences(sentences: Sentence[], vocab: HskWord[]): Promise<number> {
  const missing = sentences.filter((s) => !s.info)
  if (!missing.length) return 0

  const byWord = new Map(vocab.map((w) => [w.word, w]))
  const items = missing.map((s) => {
    const hsk = byWord.get(s.target)
    return { word: s.target, pinyin: hsk?.pinyin, english: hsk?.meanings.slice(0, 3), sentence: s.words.join('') }
  })

  const prompt = `For each item, give the part of speech of "word" AS USED IN "sentence", and a short, natural
Lao meaning (Lao script, 1-5 words) that a Lao beginner understands for that usage.
Return one result per item, in the same order.

${JSON.stringify(items, null, 2)}`

  const results = await callGemini<{ word: string; pos: PartOfSpeech; meaningLao: string }[]>(prompt, {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        word: { type: 'STRING' },
        pos: { type: 'STRING', enum: [...PARTS_OF_SPEECH] },
        meaningLao: { type: 'STRING' },
      },
      required: ['word', 'pos', 'meaningLao'],
      propertyOrdering: ['word', 'pos', 'meaningLao'],
    },
  })

  let filled = 0
  for (const s of missing) {
    const r = results.find((x) => x.word === s.target)
    if (!r || !PARTS_OF_SPEECH.includes(r.pos) || !/[຀-໿]/.test(r.meaningLao)) continue
    // The HSK list spaces syllables ("bà ba"); pinyin is written joined ("bàba").
    const pinyin = (byWord.get(s.target)?.pinyin ?? '').replace(/\s+/g, '')
    s.info = { pinyin, pos: r.pos, meaningLao: r.meaningLao.trim() }
    filled++
  }
  return filled
}
