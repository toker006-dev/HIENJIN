import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { t } from '../i18n/lo.ts'
import { isCorrect } from '../lib/answer.ts'
import { playCorrect, playType, playWrong } from '../lib/sfx.ts'
import { canSpeak, speak } from '../lib/speech.ts'
import type { Sentence } from '../types.ts'
import { Seal } from './Seal.tsx'
import { Mascot } from './Mascot.tsx'
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
  idle: 'text-stone-900',
  wrong: 'animate-shake border-red-500 bg-red-50 text-red-700',
  correct: 'animate-pop border-emerald-500 bg-emerald-50 text-emerald-700',
}

const hintButton =
  'font-lao inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-100 hover:text-stone-900 aria-pressed:bg-amber-50 aria-pressed:text-amber-700 aria-pressed:ring-amber-300'

/** One sentence: the Lao prompt plus one input per Chinese word. Remount (via `key`) for each new sentence. */
export function Exercise({ sentence, onNext, sfx, voice }: Props) {
  const [answers, setAnswers] = useState(() => sentence.words.map(() => ''))
  const [statuses, setStatuses] = useState<Status[]>(() => sentence.words.map(() => 'idle'))
  const [solved, setSolved] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const nextButton = useRef<HTMLButtonElement>(null)
  const [revealed, setRevealed] = useState(false)
  /** Bumped on every wrong check so the ink-blot ripple replays. */
  const [misses, setMisses] = useState(0)
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
      setMisses((m) => m + 1)
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
    <div className="relative flex flex-col items-center gap-4 text-center">
      {solved && (
        <div className="absolute -top-4 right-0 sm:-right-4">
          <Seal char="对" stamp className="size-12 text-2xl" />
        </div>
      )}
      {/* Bao reacts to each check; floats in the corner so it adds no height. */}
      <div className="pointer-events-none absolute -top-2 -left-2 flex items-start gap-1 sm:-left-6">
        <Mascot key={`${solved}-${misses}`} mood={solved ? 'happy' : misses ? 'sad' : 'idle'} className="size-12" />
        <span
          key={`b-${solved}-${misses}`}
          className="font-lao animate-pop hidden rounded-2xl rounded-tl-none border-2 border-stone-900 bg-surface px-2.5 py-0.5 text-xs font-semibold text-stone-800 sm:block"
        >
          {solved ? t.mascotCorrect : misses ? t.mascotWrong : t.mascotIdle}
        </span>
      </div>
      <div className="space-y-2 pt-6 sm:pt-4">
        <p className="text-sm font-medium tracking-wide text-stone-500">{t.instruction}</p>
        <p lang="lo" className="font-lao-display text-2xl leading-snug font-bold text-stone-900 sm:text-[2rem]">
          {sentence.lao}
        </p>
      </div>

      <div className="relative flex flex-wrap justify-center gap-3" lang="zh-CN">
        {misses > 0 && !solved && (
          <span
            key={misses}
            aria-hidden
            className="animate-ink pointer-events-none absolute top-1/2 left-1/2 -mt-10 -ml-10 size-20 rounded-full bg-stone-900"
          />
        )}
        {sentence.words.map((word, i) => (
          <div key={i} className="flex flex-col items-center">
            <span
              className={`tianzige block transition-colors focus-within:border-teal-700 focus-within:ring-4 focus-within:ring-teal-100 ${blankStyles[statuses[i]]}`}
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
        <p aria-live="polite" className={`font-lao text-base ${solved ? 'text-emerald-700' : 'text-red-600'}`}>
          {solved ? t.correct : hasMistake ? t.wrong : ''}
        </p>
        {solved && <WordCard sentence={sentence} />}
        {solved ? (
          <button
            ref={nextButton}
            onClick={onNext}
            className="font-lao animate-pop rounded-full border-2 border-stone-900 bg-emerald-600 px-10 py-3 shadow-[0_4px_0_0_var(--color-stone-900)] active:translate-y-1 active:shadow-none font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:outline-none"
          >
            {t.next} →
          </button>
        ) : (
          <button
            onClick={check}
            className="font-lao rounded-full border-2 border-stone-900 bg-teal-700 px-10 py-3 shadow-[0_4px_0_0_var(--color-stone-900)] active:translate-y-1 active:shadow-none font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:ring-4 focus-visible:ring-teal-200 focus-visible:outline-none"
          >
            {t.check}
          </button>
        )}
      </div>
    </div>
  )
}
