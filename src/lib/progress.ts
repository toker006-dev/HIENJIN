import { useMemo } from 'react'
import { readStoredJSON, useStored, writeStored } from './storage.ts'

// Per-lesson study history (keyed by lesson id, e.g. "hsk1/2"), kept in the browser for now
// (moves to the database once accounts exist).

export interface CourseProgress {
  /** When the course was last opened (ms since epoch). */
  lastStudied: number
  /** Sentences solved in the most recent round. */
  solved: number
  total: number
  /** How many full rounds have been finished. */
  rounds: number
}

type ProgressMap = Record<string, CourseProgress>

const KEY = 'course-progress'

function update(change: (all: ProgressMap) => void) {
  const all = readStoredJSON<ProgressMap>(KEY, {})
  change(all)
  writeStored(KEY, JSON.stringify(all))
}

export function useProgress(): ProgressMap {
  const raw = useStored(KEY)
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as ProgressMap) : {}
    } catch {
      return {}
    }
  }, [raw])
}

/** Opening a lesson puts its course at the top of "recent"; the last round's result is kept until a sentence is solved. */
export function markStudied(lessonId: string, total: number) {
  update((all) => {
    const prev = all[lessonId]
    all[lessonId] = { solved: prev?.solved ?? 0, rounds: prev?.rounds ?? 0, total, lastStudied: Date.now() }
  })
}

/** Called after each solved sentence; `solved` counts from 1 within the current round. */
export function recordSolved(lessonId: string, solved: number, total: number) {
  update((all) => {
    const prev = all[lessonId]
    all[lessonId] = {
      lastStudied: Date.now(),
      solved,
      total,
      rounds: (prev?.rounds ?? 0) + (solved === total ? 1 : 0),
    }
  })
}

// Courses hidden from Home's "recent" list, with when they were hidden. Progress is kept; studying the
// course again after that moment brings it back.
const HIDDEN_KEY = 'recent-hidden'

export function useHiddenFromRecent(): Record<string, number> {
  const raw = useStored(HIDDEN_KEY)
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as Record<string, number>) : {}
    } catch {
      return {}
    }
  }, [raw])
}

export function hideFromRecent(courseId: string) {
  const hidden = readStoredJSON<Record<string, number>>(HIDDEN_KEY, {})
  hidden[courseId] = Date.now()
  writeStored(HIDDEN_KEY, JSON.stringify(hidden))
}
