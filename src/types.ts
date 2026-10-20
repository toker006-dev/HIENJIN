export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'numeral',
  'measure word',
  'preposition',
  'conjunction',
  'particle',
  'interjection',
  'phrase',
] as const

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number]

/** One translation exercise: a Lao prompt and its Chinese answer split into words (1 word = 1 blank). */
export interface Sentence {
  id: string
  /** HSK level (1-6) the sentence belongs to. */
  level: number
  /** The HSK word this sentence was built around. */
  target: string
  /** Chinese answer, one entry per blank, e.g. ["你", "吃饭", "了", "吗"]. */
  words: string[]
  /** Lao prompt shown to the learner. */
  lao: string
  /** Details about `target`, shown after the sentence is solved. */
  info?: {
    pinyin: string
    /** Part of speech of `target` as used in this sentence. */
    pos: PartOfSpeech
    meaningLao: string
  }
}
