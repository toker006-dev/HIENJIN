import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { t } from '../i18n/lo.ts'
import { isCorrect } from '../lib/answer.ts'
import { playCorrect, playType, playWrong } from '../lib/sfx.ts'
import { canSpeak, speak } from '../lib/speech.ts'
import type { Sentence } from '../types.ts'
import { WordCard } from './WordCard.tsx'

type Status = 'idle' | 'correct' | 'wrong'

interface Props {
  sentence: Sentence
  onNext: () => void
  /** Typing / correct / wrong sound effects on. */
  sfx: boolean
  /** Read the sentence aloud when it is solved. */
  voice: boolean
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'])

const blankStyles: Record<Status, string> = {
  idle: 'border-stone-300 text-stone-900',
  wrong: 'animate-shake border-red-500 bg-red-50 text-red-700',
  correct: 'animate-pop border-emerald-500 bg-emerald-50 text-emerald-700',
}

const hintButton =
  'font-lao inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-medium text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-100 hover:text-stone-900 aria-pressed:bg-amber-50 aria-pressed:text-amber-700 aria-pressed:ring-amber-300'

/** One sentence: the Lao prompt plus one input per Chinese word. Remount (via `key`) for each new sentence. */
export function Exercise({ sentence, onNext, sfx, voice }: Props) {
  const [answers, setAnswers] = useState(() => sentence.words.map(() => ''))
  const [statuses, setStatuses] = useState<Status[]>(() => sentence.words.map(() => 'idle'))
  const [solved, setSolved] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const nextButton = useRef<HTMLButtonElement>(null)
  const [revealed, setRevealed] = useState(false)
  const lastFocused = useRef(0)
  const lastKeyAt = useRef(0)
  const speakTimer = useRef<number>(undefined)

  useEffect(() => inputs.current[0]?.focus(), [])
  useEffect(() => () => clearTimeout(speakTimer.current), [])
  useEffect(() => {
    if (solved) nextButton.current?.focus()
  }, [solved])

  const hasMistake = statuses.includes('wrong')

  function check() {
    const result = sentence.words.map((word, i): Status => (isCorrect(answers[i], word) ? 'correct' : 'wrong'))
    setStatuses(result)
    const firstWrong = result.indexOf('wrong')
    if (firstWrong === -1) {
      setSolved(true)
      if (sfx) playCorrect()
      // Let the chime finish before the voice starts.
      if (voice && canSpeak) speakTimer.current = window.setTimeout(() => speak(sentence.words.join('')), sfx ? 450 : 0)
    } else {
      if (sfx) playWrong()
      inputs.current[firstWrong]?.focus()
    }
  }

  function focusBlank(i: number) {
    inputs.current[i]?.focus()
  }

  /** Runs a hint action, then returns the cursor to the blank the learner was typing in. */
  function withFocusBack(action: () => void) {
    action()
    focusBlank(lastFocused.current)
  }

  function handleChange(i: number, value: string, at: number) {
    // Some phone keyboards send no key events, so click here unless a key press just did.
    if (sfx && at - lastKeyAt.current > 100) playType()
    setAnswers((prev) => prev.map((a, j) => (j === i ? value : a)))
    setStatuses((prev) => prev.map((s, j) => (j === i ? 'idle' : s)))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, i: number) {
    const composing = e.nativeEvent.isComposing || e.keyCode === 229
    // Enter outside the IME plays the correct/wrong sound instead of a click.
    if (sfx && !MODIFIER_KEYS.has(e.key) && (composing || e.key !== 'Enter')) {
      lastKeyAt.current = e.timeStamp
      playType()
    }

    // While a Chinese IME is composing, Enter/Space/Backspace belong to the IME.
    if (composing) return

    if (e.key === 'Enter') {
      e.preventDefault()
      check()
    } else if (e.key === ' ') {
      e.preventDefault()
      focusBlank(i + 1)
    } else if (e.key === 'Backspace' && answers[i] === '') {
      e.preventDefault()
      focusBlank(i - 1)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="space-y-2">
        <p className="font-lao text-stone-600">{t.instruction}</p>
        <p lang="lo" className="font-lao text-2xl leading-snug font-bold text-stone-900 sm:text-[2rem]">
          {sentence.lao}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3" lang="zh-CN">
        {sentence.words.map((word, i) => (
          <div key={i} className="flex flex-col items-center">
            <span
              className={`block rounded-2xl border-2 bg-surface transition-colors focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100 ${blankStyles[statuses[i]]}`}
            >
              <input
                ref={(el) => {
                  inputs.current[i] = el
                }}
                value={answers[i]}
                onChange={(e) => handleChange(i, e.target.value, e.timeStamp)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onFocus={() => (lastFocused.current = i)}
                readOnly={solved}
                aria-label={t.blank(i + 1)}
                aria-invalid={statuses[i] === 'wrong'}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  width: `${Math.max(1, [...answers[i]].length) * 1.15 + 0.75}em`,
                }}
                className="font-zh relative z-10 block h-[1.9em] bg-transparent text-center text-3xl outline-none sm:text-4xl"
              />
            </span>
            {/* Fixed-height slot so revealing the answer doesn't shift the layout. */}
            <span aria-hidden={!revealed} className="font-zh mt-1 h-6 text-lg text-amber-600">
              {revealed && !solved ? word : ''}
            </span>
          </div>
        ))}
      </div>

      {!solved && (
        <div className="-mt-3 flex gap-2">
          {canSpeak && (
            <button onClick={() => withFocusBack(() => speak(sentence.words.join(''), 0.7))} className={hintButton}>
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
              </svg>
              {t.listenAnswer}
            </button>
          )}
          <button onClick={() => withFocusBack(() => setRevealed((r) => !r))} aria-pressed={revealed} className={hintButton}>
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {revealed ? (
                <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
              ) : (
                <>
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
            {revealed ? t.hideAnswer : t.showAnswer}
          </button>
        </div>
      )}

      <div className="flex min-h-20 flex-col items-center gap-2.5">
        <p aria-live="polite" className={`font-lao text-lg font-semibold ${solved ? 'text-emerald-700' : 'text-red-600'}`}>
          {solved ? t.correct : hasMistake ? t.wrong : ''}
        </p>
        {solved && <WordCard sentence={sentence} />}
        {solved ? (
          <button
            ref={nextButton}
            onClick={onNext}
            className="font-lao animate-pop min-h-14 rounded-full bg-emerald-600 px-12 text-lg font-semibold text-white transition hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:outline-none"
          >
            {t.next} →
          </button>
        ) : (
          <button
            onClick={check}
            className="font-lao min-h-14 rounded-full bg-primary px-12 text-lg font-semibold text-on-primary transition hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-teal-200 focus-visible:outline-none"
          >
            {t.check}
          </button>
        )}
      </div>
    </div>
  )
}
