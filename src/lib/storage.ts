import { useSyncExternalStore } from 'react'

// Tiny reactive wrapper around localStorage: every component reading a key re-renders when it changes,
// in this tab (via `listeners`) and in other tabs (via the "storage" event).
// Storage can be unavailable (private mode, blocked site data), so every access is guarded.

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // not critical - the app still works, it just won't remember
  }
  listeners.forEach((l) => l())
}

/** The raw string stored under `key` (null if missing); re-renders when it changes. */
export function useStored(key: string): string | null {
  return useSyncExternalStore(subscribe, () => read(key))
}

export function readStoredJSON<T>(key: string, fallback: T): T {
  try {
    const raw = read(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
