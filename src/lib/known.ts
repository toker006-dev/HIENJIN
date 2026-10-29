import { useMemo } from 'react'
import { readStored, useStored, writeStored } from './storage.ts'

// Words the learner marked as memorised, keyed by hanzi (words are unique across HSK levels).
// Every other word is "not known yet". Moves to the database once accounts exist.
const KEY = 'known-words'
/** A short-lived spaced-repetition store; its known words are merged in and it is removed on the next save. */
const OLD_SRS_KEY = 'srs'

function parse(raw: string | null, oldSrs: string | null): Set<string> {
  const words = new Set<string>()
  try {
    if (oldSrs) {
      // The SRS store was migrated from KEY and then kept up to date, so it wins. Steps 2+ (7+ day gap) were "known".
      const srs = JSON.parse(oldSrs) as Record<string, { step: number }>
      for (const [word, entry] of Object.entries(srs)) if (entry.step >= 2) words.add(word)
    } else {
      for (const word of raw ? (JSON.parse(raw) as string[]) : []) words.add(word)
    }
  } catch {
    // corrupt storage - keep what was read so far
  }
  return words
}

export function useKnownWords(): Set<string> {
  const raw = useStored(KEY)
  const oldSrs = useStored(OLD_SRS_KEY)
  return useMemo(() => parse(raw, oldSrs), [raw, oldSrs])
}

/** Words in each day's review. */
export const DAILY_REVIEW_SIZE = 30

/**
 * Today's review: DAILY_REVIEW_SIZE random known words. The pick is seeded by the date, so it stays the
 * same all day (reloading doesn't change it) and is different tomorrow.
 */
export function dailyReview(known: Set<string>, day: string): string[] {
  let seed = [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const words = [...known].sort()
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[words[i], words[j]] = [words[j], words[i]]
  }
  return words.slice(0, DAILY_REVIEW_SIZE)
}

export function setKnown(word: string, known: boolean) {
  setManyKnown([word], known)
}

/** Marks (or unmarks) several words in one save, e.g. a whole lesson. */
export function setManyKnown(list: string[], known: boolean) {
  const words = parse(readStored(KEY), readStored(OLD_SRS_KEY))
  for (const word of list) {
    if (known) words.add(word)
    else words.delete(word)
  }
  writeStored(KEY, JSON.stringify([...words]))
  writeStored(OLD_SRS_KEY, null)
}
