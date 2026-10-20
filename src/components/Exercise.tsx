import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { t } from '../i18n/lo.ts'
import { isCorrect } from '../lib/answer.ts'
import type { Sentence } from '../types.ts'
import { WordCard } from './WordCard.tsx'

type Status = 'idle' | 'correct' | 'wrong'

interface Props {
  sentence: Sentence
  onNext: () => void
}

const blankStyles: Record<Status, string> = {
  idle: 'border-stone-300 text-stone-900 focus:border-teal-600',
  wrong: 'border-red-500 bg-red-50 text-red-700',
  correct: 'border-emerald-500 text-emerald-700',
}

/** One sentence: the Lao prompt plus one input per Chinese word. Remount (via `key`) for each new sentence. */
export function Exercise({ sentence, onNext }: Props) {
  const [answers, setAnswers] = useState(() => sentence.words.map(() => ''))
  const [statuses, setStatuses] = useState<Status[]>(() => sentence.words.map(() => 'idle'))
  const [solved, setSolved] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const nextButton = useRef<HTMLButtonElement>(null)

  useEffect(() => inputs.current[0]?.focus(), [])
  useEffect(() => {
    if (solved) nextButton.current?.focus()
  }, [solved])

  const hasMistake = statuses.includes('wrong')

  function check() {
    const result = sentence.words.map((word, i): Status => (isCorrect(answers[i], word) ? 'correct' : 'wrong'))
    setStatuses(result)
    const firstWrong = result.indexOf('wrong')
    if (firstWrong === -1) setSolved(true)
    else inputs.current[firstWrong]?.focus()
  }

  function focusBlank(i: number) {
    inputs.current[i]?.focus()
  }

  function handleChange(i: number, value: string) {
    setAnswers((prev) => prev.map((a, j) => (j === i ? value : a)))
    setStatuses((prev) => prev.map((s, j) => (j === i ? 'idle' : s)))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, i: number) {
    // While a Chinese IME is composing, Enter/Space/Backspace belong to the IME.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return

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
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-stone-500">{t.instruction}</p>
        <p lang="lo" className="font-lao text-3xl leading-relaxed font-semibold text-stone-900 sm:text-4xl">
          {sentence.lao}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3" lang="zh-CN">
        {sentence.words.map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el
            }}
            value={answers[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            readOnly={solved}
            aria-label={t.blank(i + 1)}
            aria-invalid={statuses[i] === 'wrong'}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{ width: `${Math.max(2, [...answers[i]].length) + 1}em` }}
            className={`font-zh rounded-t-md border-b-4 bg-transparent px-2 pb-1 text-center text-3xl transition-colors outline-none ${blankStyles[statuses[i]]}`}
          />
        ))}
      </div>

      <div className="flex min-h-24 flex-col items-center gap-3">
        <p aria-live="polite" className={`font-lao text-base ${solved ? 'text-emerald-700' : 'text-red-600'}`}>
          {solved ? t.correct : hasMistake ? t.wrong : ''}
        </p>
        {solved && <WordCard sentence={sentence} />}
        {solved ? (
          <button
            ref={nextButton}
            onClick={onNext}
            className="font-lao rounded-full bg-emerald-600 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:outline-none"
          >
            {t.next} →
          </button>
        ) : (
          <button
            onClick={check}
            className="font-lao rounded-full bg-stone-900 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-stone-700 focus-visible:ring-4 focus-visible:ring-stone-300 focus-visible:outline-none"
          >
            {t.check}
          </button>
        )}
      </div>
    </div>
  )
}
