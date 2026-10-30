import { use } from 'react'
import hskCover from '../assets/hsk-vocabulary.webp'
import { t } from '../i18n/lo.ts'
import type { Sentence } from '../types.ts'
import { coursesById } from './courses.ts'

// Word-order game. Each set is one card on the practice page; the HSK set pools the practice courses'
// sentences into HSK level groups instead of by lesson. Sets from other sources go in ARRANGE_SETS later.

export interface ArrangeSet {
  id: string
  title: string
  cover: string
  description: string
}

export const ARRANGE_SETS: ArrangeSet[] = [{ id: 'hsk', title: 'HSK', cover: hskCover, description: t.arrangeHskDesc }]

export const arrangeSetsById = new Map(ARRANGE_SETS.map((set) => [set.id, set]))

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTIES: { id: Difficulty; levels: [number, number] }[] = [
  { id: 'easy', levels: [1, 2] },
  { id: 'medium', levels: [3, 4] },
  { id: 'hard', levels: [5, 6] },
]

/** Sentences per round. */
export const ROUND_SIZE = 25

export function levelsOf(difficulty: Difficulty): [number, number] {
  return DIFFICULTIES.find((d) => d.id === difficulty)!.levels
}

export function isDifficulty(value: string | undefined): value is Difficulty {
  return DIFFICULTIES.some((d) => d.id === value)
}

const loaded = new Map<Difficulty, Promise<Sentence[]>>()

function loadPool(difficulty: Difficulty): Promise<Sentence[]> {
  let promise = loaded.get(difficulty)
  if (!promise) {
    const [from, to] = levelsOf(difficulty)
    const courses = [from, to].map((level) => coursesById.get(`hsk${level}`)!.course)
    // A one-word "sentence" has nothing to arrange.
    promise = Promise.all(courses.map((c) => c.loadSentences())).then((lists) => lists.flat().filter((s) => s.words.length >= 2))
    loaded.set(difficulty, promise)
  }
  return promise
}

/** Every usable sentence of a difficulty; suspends while its levels load the first time. */
export function useArrangePool(difficulty: Difficulty): Sentence[] {
  return use(loadPool(difficulty))
}
