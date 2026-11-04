export type Mood = 'idle' | 'happy' | 'sad' | 'wow'

const moodAnimation: Record<Mood, string> = {
  idle: 'animate-bob',
  happy: 'animate-hop',
  sad: 'animate-wobble',
  wow: 'animate-pop',
}

/**
 * Bao (包), the steamed-bun mascot. Flat shapes only. Remount (via `key`) to replay the mood animation.
 * The face changes with `mood`; the body bobs, hops or wobbles.
 */
export function Mascot({ mood = 'idle', className = 'size-24' }: { mood?: Mood; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${moodAnimation[mood]} origin-bottom overflow-visible ${className}`}>
      {/* shadow */}
      <ellipse cx="50" cy="94" rx="30" ry="4" className="fill-stone-900/10" />
      {/* bun body */}
      <path d="M12 72c0-26 17-48 38-48s38 22 38 48c0 12-17 18-38 18S12 84 12 72Z" fill="#fffaf0" stroke="#1c1a17" strokeWidth="3" />
      {/* pleats on top */}
      <path d="M50 24c-4 6-4 11 0 14M50 24c-9 3-14 8-13 15M50 24c9 3 14 8 13 15" fill="none" stroke="#1c1a17" strokeWidth="2.5" strokeLinecap="round" />
      {/* cheeks */}
      <ellipse cx="28" cy="70" rx="6" ry="4" fill="#f2a89c" />
      <ellipse cx="72" cy="70" rx="6" ry="4" fill="#f2a89c" />
      <Face mood={mood} />
      {/* red dot like a festival bun */}
      <circle cx="50" cy="46" r="3" fill="#c03b2e" />
    </svg>
  )
}

function Face({ mood }: { mood: Mood }) {
  const ink = { fill: 'none', stroke: '#1c1a17', strokeWidth: 3, strokeLinecap: 'round' as const }
  switch (mood) {
    case 'happy':
      return (
        <>
          <path d="M33 62q4-5 8 0M59 62q4-5 8 0" {...ink} />
          <path d="M42 70q8 9 16 0Z" fill="#8a2a20" stroke="#1c1a17" strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )
    case 'sad':
      return (
        <>
          <path d="M33 60l8 3M67 60l-8 3" {...ink} />
          <path d="M44 74q6-5 12 0" {...ink} />
          <path d="M70 66q2 4 0 6q-2-2 0-6Z" fill="#7cb7e0" />
        </>
      )
    case 'wow':
      return (
        <>
          <circle cx="37" cy="62" r="3.5" fill="#1c1a17" />
          <circle cx="63" cy="62" r="3.5" fill="#1c1a17" />
          <ellipse cx="50" cy="72" rx="4" ry="5" fill="#8a2a20" stroke="#1c1a17" strokeWidth="2.5" />
        </>
      )
    default:
      return (
        <>
          <g className="animate-blink origin-[50px_62px]">
            <circle cx="37" cy="62" r="3.5" fill="#1c1a17" />
            <circle cx="63" cy="62" r="3.5" fill="#1c1a17" />
          </g>
          <path d="M45 70q5 4 10 0" {...ink} />
        </>
      )
  }
}
