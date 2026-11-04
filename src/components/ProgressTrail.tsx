import { Mascot } from './Mascot.tsx'

/** Progress bar Bao runs along, toward a seal-red flag at the end. `ratio` is 0–1. */
export function ProgressTrail({ ratio }: { ratio: number }) {
  const pct = Math.min(1, Math.max(0, ratio)) * 100
  return (
    <div className="relative mt-6 mr-6 h-3.5 rounded-full border-2 border-stone-900 bg-surface">
      <div className="h-full rounded-full bg-teal-700 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      <div className="absolute bottom-1 -translate-x-1/2 transition-[left] duration-700 ease-out" style={{ left: `${pct}%` }}>
        <Mascot key={Math.round(pct)} mood={pct > 0 ? 'happy' : 'idle'} className="size-9" />
      </div>
      {/* finish flag */}
      <svg aria-hidden viewBox="0 0 20 28" className="absolute -right-6 bottom-0 h-7">
        <path d="M3 28V2" strokeWidth="2.5" className="stroke-stone-900" />
        <path d="M4 3h13l-4 5 4 5H4Z" className="fill-teal-700 stroke-stone-900" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
