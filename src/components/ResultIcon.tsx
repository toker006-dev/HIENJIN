import { createPortal } from 'react-dom'
import { PartyPopper, Trophy } from 'lucide-react'

const CONFETTI_COLOURS = ['#47ce87', '#96e8bc', '#65e4a1', '#fbbf24', '#091911']

/** Stable pseudo-random in [0, 1) from a piece index and a salt (render must stay pure). */
const rand = (i: number, salt: number) => (((Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1) + 1) % 1

/** Rendered into <body> so no transformed ancestor can trap the fixed pieces on screen. */
function Confetti({ count }: { count: number }) {
  return createPortal(
    <div aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const size = 6 + rand(i, 2) * 8
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${rand(i, 1) * 100}vw`,
              width: size,
              height: i % 3 ? size * 0.5 : size,
              background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
              borderRadius: i % 3 ? 2 : '50%',
              animationDelay: `${rand(i, 3) * 0.8}s`,
              animationDuration: `${2.2 + rand(i, 4) * 1.8}s`,
            }}
          />
        )
      })}
    </div>,
    document.body,
  )
}

/** Big icon on end-of-round screens, with a burst of confetti (more for a perfect round). */
export function ResultIcon({ perfect = false }: { perfect?: boolean }) {
  const Icon = perfect ? Trophy : PartyPopper
  return (
    <>
      <Confetti count={perfect ? 60 : 36} />
      <span className="animate-pop grid size-24 place-items-center rounded-full bg-teal-100 text-teal-700">
        <Icon aria-hidden className="size-12" />
      </span>
    </>
  )
}
