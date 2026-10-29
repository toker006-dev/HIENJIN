import { use } from 'react'
import type { PartOfSpeech, Sentence } from '../types.ts'
import { coursesById, LESSON_SIZE } from './courses.ts'

export const LEVELS = [1, 2, 3, 4, 5, 6]

export interface VocabWord {
  word: string
  level: number
  pinyin: string
  pos?: PartOfSpeech
  lao: string
  english: string
  /** Example sentence built around this word. */
  sentence?: Sentence
  /** Same 25-word lessons as the practice courses. */
  lesson: number
}

// One lazily loaded file per level with short English meanings (made by `npm run hsk:english`).
const englishFiles = import.meta.glob<Record<string, string>>('./english/hsk*.json', { import: 'default' })

const loaded = new Map<number, Promise<VocabWord[]>>()

function loadLevel(level: number): Promise<VocabWord[]> {
  let promise = loaded.get(level)
  if (!promise) {
    const course = coursesById.get(`hsk${level}`)!.course
    const english = englishFiles[`./english/hsk${level}.json`]?.() ?? Promise.resolve({})
    promise = Promise.all([course.loadSentences(), english]).then(([sentences, english]) => {
      const byTarget = new Map(sentences.map((s) => [s.target, s]))
      return course.lessons.flatMap((lesson) => lesson.words).map((word, i) => {
        const sentence = byTarget.get(word)
        return {
          word,
          level,
          pinyin: sentence?.info?.pinyin ?? '',
          pos: sentence?.info?.pos,
          lao: sentence?.info?.meaningLao ?? '',
          english: english[word] ?? '',
          sentence,
          lesson: Math.floor(i / LESSON_SIZE) + 1,
        }
      })
    })
    loaded.set(level, promise)
  }
  return promise
}

/** Every word of an HSK level in list order; suspends while the level loads the first time. */
export function useVocabulary(level: number): VocabWord[] {
  return use(loadLevel(level))
}

const allLevels = () => Promise.all(LEVELS.map(loadLevel)).then((levels) => levels.flat())
let all: Promise<VocabWord[]> | undefined

/** Every word of HSK 1-6 (for searching across levels); suspends until all levels have loaded. */
export function useAllVocabulary(): VocabWord[] {
  all ??= allLevels()
  return use(all)
}

/** Which words the list / flashcards show, from the `?filter=` URL parameter. */
export type WordFilter = 'all' | 'learning' | 'known'

export function parseFilter(value: string | null): WordFilter {
  return value === 'learning' || value === 'known' ? value : 'all'
}

/** Pinyin without tone marks, so "ni hao" finds "nǐ hǎo". */
export function plainPinyin(pinyin: string): string {
  return pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesSearch(w: VocabWord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const compactQ = plainPinyin(q).replace(/\s+/g, '')
  return (
    w.word.includes(q) ||
    w.lao.includes(q) ||
    w.english.toLowerCase().includes(q) ||
    plainPinyin(w.pinyin).replace(/\s+/g, '').includes(compactQ)
  )
}
