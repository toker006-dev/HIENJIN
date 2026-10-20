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
    return { word: s.target, readings: hsk?.readings, english: hsk?.meanings.slice(0, 3), sentence: s.words.join('') }
  })

  const prompt = `For each item:
- "pinyin": copy the ONE entry of "readings" that is the pronunciation of "word" AS USED IN "sentence"
  (e.g. 吧 at the end of a suggestion is "ba", not "bā"; 白 meaning white is "bái", not the surname "Bái")
- "pos": the part of speech of "word" as used in "sentence"
- "meaningLao": a short, natural Lao meaning (Lao script only, never Thai; 1-5 words) for that usage
Return one result per item, in the same order.

${JSON.stringify(items, null, 2)}`

  const results = await callGemini<{ word: string; pinyin: string; pos: PartOfSpeech; meaningLao: string }[]>(prompt, {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        word: { type: 'STRING' },
        pinyin: { type: 'STRING' },
        pos: { type: 'STRING', enum: [...PARTS_OF_SPEECH] },
        meaningLao: { type: 'STRING' },
      },
      required: ['word', 'pinyin', 'pos', 'meaningLao'],
      propertyOrdering: ['word', 'pinyin', 'pos', 'meaningLao'],
    },
  })

  let filled = 0
  for (const s of missing) {
    const r = results.find((x) => x.word === s.target)
    if (!r || !PARTS_OF_SPEECH.includes(r.pos) || !isLaoText(r.meaningLao)) continue
    // Only trust a pinyin the dictionary actually lists, so tones can't be invented.
    const readings = byWord.get(s.target)?.readings ?? []
    const reading = readings.find((x) => x === r.pinyin.trim()) ?? readings[0] ?? ''
    // The HSK list spaces syllables ("bà ba"); pinyin is written joined ("bàba").
    s.info = { pinyin: reading.replace(/\s+/g, ''), pos: r.pos, meaningLao: r.meaningLao.trim() }
    filled++
  }
  return filled
}

/** Lao script and no Thai letters - Gemini sometimes slips Thai (which looks similar) into Lao text. */
export function isLaoText(text: string): boolean {
  return /[຀-໿]/.test(text) && !/[฀-๿]/.test(text)
}
