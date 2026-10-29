import { useMemo } from 'react'
import { readStoredJSON, useStored, writeStored } from './storage.ts'

// Words the learner marked as memorised, keyed by hanzi (words are unique across HSK levels).
// Every other word counts as "still learning".
const KEY = 'known-words'

export function useKnownWords(): Set<string> {
  const raw = useStored(KEY)
  return useMemo(() => {
    try {
      return new Set(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      return new Set<string>()
    }
  }, [raw])
}

export function setKnown(word: string, known: boolean) {
  const words = new Set(readStoredJSON<string[]>(KEY, []))
  if (known) words.add(word)
  else words.delete(word)
  writeStored(KEY, JSON.stringify([...words]))
}
