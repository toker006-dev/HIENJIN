import { Seal } from './Seal.tsx'

const CONFETTI_COLOURS = ['#a83226', '#c03b2e', '#cc9a2e', '#1f7a4a', '#1c1a17']

/** Stable pseudo-random in [0, 1) from a piece index and a salt (render must stay pure). */
const rand = (i: number, salt: number) => ((Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1

/** Falling paper-cut pieces. */
function Confetti({ count }: { count: number }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    left: rand(i, 1) * 100,
    size: 6 + rand(i, 2) * 8,
    delay: rand(i, 3) * 0.8,
    duration: 2.2 + rand(i, 4) * 1.8,
    colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
    round: i % 3 === 0,
  }))
  return (
    <div aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}vw`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            background: p.colour,
            borderRadius: p.round ? '50%' : 1,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

/** Hanging lantern drawn in flat shapes. */
function Lantern() {
  return (
    <svg viewBox="0 0 48 72" className="animate-swing h-20 origin-top" aria-hidden>
      <path d="M24 0v10" stroke="currentColor" strokeWidth="2" className="text-stone-500" />
      <rect x="14" y="10" width="20" height="5" rx="1" fill="#cc9a2e" />
      <ellipse cx="24" cy="34" rx="20" ry="19" fill="#a83226" />
      <path d="M24 15v38M14 18q-6 16 0 32M34 18q6 16 0 32" stroke="#8a2a20" strokeWidth="1.5" fill="none" />
      <rect x="14" y="52" width="20" height="5" rx="1" fill="#cc9a2e" />
      <path d="M20 57v12M24 57v14M28 57v12" stroke="#cc9a2e" strokeWidth="2" />
    </svg>
  )
}

/** Big mark on end-of-round screens: a swinging lantern with confetti; a perfect round gets a 优 (excellent) seal stamped on. */
export function ResultIcon({ perfect = false }: { perfect?: boolean }) {
  return (
    <div className="relative flex items-end gap-2">
      <Confetti count={perfect ? 60 : 36} />
      <Lantern />
      {perfect && <Seal char="优" stamp className="mb-1 size-12 text-2xl" />}
    </div>
  )
}
