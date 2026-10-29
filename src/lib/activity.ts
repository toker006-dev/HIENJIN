import { useMemo } from 'react'
import { readStoredJSON, useStored, writeStored } from './storage.ts'

// Remembers where the learner was in the vocabulary, so Home can offer "continue" and a quick review.

/** Local date as "2026-10-29" (used to pick the word of the day). */
export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Last vocabulary lesson opened, plus every lesson opened (for the quick review deck).
const VOCAB_KEY = 'vocab-history'

export interface VocabHistory {
  last?: { level: number; lesson: number; time: number }
  /** "level/lesson" keys, e.g. "3/7". */
  opened: string[]
}

export function recordVocabLesson(level: number, lesson: number) {
  const history = readStoredJSON<VocabHistory>(VOCAB_KEY, { opened: [] })
  const key = `${level}/${lesson}`
  if (history.last?.level === level && history.last.lesson === lesson && history.opened.includes(key)) return
  history.last = { level, lesson, time: Date.now() }
  if (!history.opened.includes(key)) history.opened.push(key)
  writeStored(VOCAB_KEY, JSON.stringify(history))
}

export function useVocabHistory(): VocabHistory {
  const raw = useStored(VOCAB_KEY)
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as VocabHistory) : { opened: [] }
    } catch {
      return { opened: [] }
    }
  }, [raw])
}
