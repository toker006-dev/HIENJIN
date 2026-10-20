import { readFile } from 'node:fs/promises'

export interface HskWord {
  word: string
  pinyin: string
  /** Every reading the dictionary lists, e.g. 吧 -> ["bā", "ba"]; `pinyin` is just the first. */
  readings: string[]
  meanings: string[]
}

export const HSK_DIR = new URL('../data/hsk/', import.meta.url)

export async function loadLevel(level: number): Promise<HskWord[]> {
  const raw = await readFile(new URL(`${level}.json`, HSK_DIR), 'utf8')
  return JSON.parse(raw) as HskWord[]
}

/** Every word from HSK 1 up to and including `level` - the vocabulary a sentence at that level may use. */
export async function loadVocabUpTo(level: number): Promise<HskWord[]> {
  const levels = await Promise.all(Array.from({ length: level }, (_, i) => loadLevel(i + 1)))
  return levels.flat()
}
