import { t } from '../i18n/lo.ts'
import { canSpeak, speak } from '../lib/speech.ts'

/** 🔊 button that reads `text` aloud; renders nothing when the browser has no speech synthesis. */
export function SpeakButton({ text, rate, className = '' }: { text: string; rate?: number; className?: string }) {
  if (!canSpeak) return null
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        speak(text, rate)
      }}
      aria-label={t.listen}
      title={t.listen}
      className={`shrink-0 rounded-full p-1.5 text-teal-700 transition hover:bg-teal-100 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
      </svg>
    </button>
  )
}
