import { PartyPopper, Trophy } from 'lucide-react'

/** Big icon on end-of-round screens. */
export function ResultIcon({ perfect = false }: { perfect?: boolean }) {
  return perfect ? <Trophy aria-hidden className="size-14 text-amber-500" /> : <PartyPopper aria-hidden className="size-14 text-teal-600" />
}
