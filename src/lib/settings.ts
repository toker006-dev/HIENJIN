import { useStored, writeStored } from './storage.ts'

/** An on/off setting remembered in the browser (defaults to on). */
export function useSetting(key: string): [boolean, () => void] {
  const on = useStored(key) !== 'off'
  return [on, () => writeStored(key, on ? 'off' : 'on')]
}

export const useSoundEffects = () => useSetting('sound-effects')
export const useVoice = () => useSetting('voice')

