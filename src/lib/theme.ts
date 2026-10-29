import { useEffect, useSyncExternalStore } from 'react'
import { useStored, writeStored } from './storage.ts'

// Light / dark colour theme. Without a saved choice it follows the device setting.
// index.html applies the same rule before the first paint.
const KEY = 'color-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function subscribeMedia(listener: () => void) {
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

/** Whether dark mode is on, and a toggle that saves the opposite choice. */
export function useDarkMode(): [boolean, () => void] {
  const saved = useStored(KEY)
  const systemDark = useSyncExternalStore(subscribeMedia, () => media.matches)
  const dark = saved ? saved === 'dark' : systemDark

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return [dark, () => writeStored(KEY, dark ? 'light' : 'dark')]
}
