import { ProgressTrail } from '../components/ProgressTrail.tsx'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { ResultIcon } from '../components/ResultIcon.tsx'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { LEVELS, useVocabulary, type VocabWord } from '../data/vocabulary.ts'
import { t } from '../i18n/lo.ts'
import { useSoundEffects } from '../lib/settings.ts'
import { playComplete, playCorrect, playWrong } from '../lib/sfx.ts'
import { canSpeak, speak } from '../lib/speech.ts'

/** Questions in a quiz on a whole level (a lesson quiz asks every word of the lesson). */
const LEVEL_QUIZ_SIZE = 20

type QuestionType = 'meaning' | 'hanzi' | 'audio'
/** `mixed` picks a random type per question. */
type QuizMode = 'mixed' | QuestionType

const MODES: QuizMode[] = ['mixed', 'meaning', 'hanzi', 'audio']

function parseMode(value: string | null): QuizMode {
  return MODES.includes(value as QuizMode) && (value !== 'audio' || canSpeak) ? (value as QuizMode) : 'mixed'
}

interface Question {
  type: QuestionType
  word: VocabWord
  options: VocabWord[]
}

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Each word gets the chosen (or, when mixed, a random) question type and three wrong answers from the same level. */
function makeQuiz(words: VocabWord[], pool: VocabWord[], mode: QuizMode): Question[] {
  const types: QuestionType[] = mode !== 'mixed' ? [mode] : canSpeak ? ['meaning', 'hanzi', 'audio'] : ['meaning', 'hanzi']
  return shuffle(words).map((word) => {
    // Distractors must differ in both hanzi and Lao meaning, so there is only one right answer.
    const wrong = shuffle(pool.filter((w) => w.word !== word.word && w.lao && w.lao !== word.lao)).slice(0, 3)
    return { type: types[Math.floor(Math.random() * types.length)], word, options: shuffle([word, ...wrong]) }
  })
}

export function QuizRoute() {
  const level = Number(useParams().level)
  const [params] = useSearchParams()
  if (!LEVELS.includes(level)) return <Navigate to="/vocabulary/1" replace />
  const lesson = Number(params.get('lesson')) || undefined
  return <QuizLoader key={params.toString()} level={level} lesson={lesson} mode={parseMode(params.get('type'))} />
}

function QuizLoader({ level, lesson, mode }: { level: number; lesson?: number; mode: QuizMode }) {
  const [params, setParams] = useSearchParams()
  const words = useVocabulary(level).filter((w) => w.lao)
  const [round, setRound] = useState(0)
  const [questions, setQuestions] = useState(() => build())

  function build() {
    const chosen = lesson ? words.filter((w) => w.lesson === lesson) : shuffle(words).slice(0, LEVEL_QUIZ_SIZE)
    return makeQuiz(chosen, words, mode)
  }

  function restart() {
    setQuestions(build())
    setRound((r) => r + 1)
  }

  const label = `HSK ${level}${lesson ? ` · ${t.lessonTitle(lesson)}` : ''}`
  const listLink = `/vocabulary/${level}${lesson && lesson > 1 ? `?lesson=${lesson}` : ''}`
  function chooseMode(next: QuizMode) {
    const nextParams = new URLSearchParams(params)
    if (next === 'mixed') nextParams.delete('type')
    else nextParams.set('type', next)
    // A new `type` changes QuizRoute's key, so the quiz starts over with the new question type.
    setParams(nextParams, { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <div role="group" aria-label={t.quizType} className="flex rounded-xl bg-stone-200/70 p-1">
          {MODES.filter((m) => m !== 'audio' || canSpeak).map((m) => (
            <button
              key={m}
              onClick={() => chooseMode(m)}
              aria-pressed={mode === m}
              className="font-lao flex-1 rounded-lg px-2 py-1.5 text-xs font-medium whitespace-nowrap text-stone-600 transition aria-pressed:bg-surface aria-pressed:font-semibold aria-pressed:text-teal-800 aria-pressed:shadow-sm sm:text-sm"
            >
              {t.quizModes[m]}
            </button>
          ))}
        </div>
      </div>
      <Quiz key={round} label={label} questions={questions} listLink={listLink} onRestart={restart} />
    </div>
  )
}

/** Multiple choice, one question at a time. Practice only: answers don't change the SRS state. */
function Quiz({ label, questions, listLink, onRestart }: { label: string; questions: Question[]; listLink: string; onRestart: () => void }) {
  const [sfx] = useSoundEffects()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [wrong, setWrong] = useState<VocabWord[]>([])
  const done = index >= questions.length
  const q = questions[index]

  // Audio questions play the word as soon as they appear.
  useEffect(() => {
    if (q?.type !== 'audio') return
    const timer = window.setTimeout(() => speak(q.word.word), 250)
    return () => clearTimeout(timer)
  }, [q])

  function choose(option: VocabWord) {
    if (picked) return
    setPicked(option.word)
    const right = option.word === q.word.word
    if (!right) setWrong((list) => [...list, q.word])
    if (sfx) (right ? playCorrect : playWrong)()
  }

  function next() {
    if (index + 1 === questions.length && sfx) playComplete()
    setIndex(index + 1)
    setPicked(null)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return
      const n = Number(e.key)
      if (!picked && n >= 1 && n <= q.options.length) choose(q.options[n - 1])
      else if (picked && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) {
    const score = questions.length - wrong.length
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <ResultIcon perfect={score === questions.length} />
        <h2 className="font-lao text-3xl font-bold text-stone-900">{t.quizScore(score, questions.length)}</h2>
        {wrong.length > 0 && (
          <div className="w-full rounded-2xl bg-surface p-4 text-left ring-1 ring-stone-200">
            <p className="font-lao mb-2 text-sm font-medium text-stone-500">{t.quizMistakes}</p>
            <ul className="divide-y divide-stone-100">
              {wrong.map((w) => (
                <li key={w.word} className="flex items-baseline gap-3 py-1.5">
                  <span lang="zh-CN" className="font-zh text-xl text-stone-900">
                    {w.word}
                  </span>
                  <span className="text-sm text-teal-800">{w.pinyin}</span>
                  <span lang="lo" className="font-lao flex-1 truncate text-stone-700">
                    {w.lao}
                  </span>
                  <SpeakButton text={w.word} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button onClick={onRestart} autoFocus className="font-lao rounded-md bg-teal-700 px-8 py-3 font-semibold text-white transition hover:bg-teal-800">
            {t.restart}
          </button>
          <Link to={listLink} className="font-lao rounded-md px-8 py-3 font-semibold text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100">
            {t.backToVocabulary}
          </Link>
        </div>
      </div>
    )
  }

  const prompt =
    q.type === 'meaning' ? (
      <span lang="zh-CN" className="font-zh text-7xl text-stone-900">
        {q.word.word}
      </span>
    ) : q.type === 'hanzi' ? (
      <span lang="lo" className="font-lao text-3xl font-semibold text-stone-900">
        {q.word.lao}
      </span>
    ) : (
      <button
        onClick={() => speak(q.word.word)}
        aria-label={t.listen}
        className="grid size-24 place-items-center rounded-full bg-teal-700 text-white shadow-md transition hover:bg-teal-800"
      >
        <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
        </svg>
      </button>
    )

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4">
      <div className="pt-4">
        <div className="mb-2 flex justify-between">
          <span className="font-lao text-sm font-medium text-stone-600">{label}</span>
          <span className="font-lao text-sm text-stone-500">{t.questionProgress(index + 1, questions.length)}</span>
        </div>
        <ProgressTrail ratio={(index / questions.length)} />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-lao text-sm font-medium text-stone-500">{t.quizPrompt[q.type]}</p>
          <div className="flex min-h-28 items-center">{prompt}</div>
          {/* After answering, show the full word so every question also teaches. */}
          <p className={`font-lao min-h-7 text-stone-600 ${picked ? '' : 'invisible'}`}>
            <span lang="zh-CN" className="font-zh text-stone-900">
              {q.word.word}
            </span>{' '}
            · {q.word.pinyin} · {q.word.lao}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {q.options.map((option, i) => {
            const isRight = option.word === q.word.word
            const state = !picked ? 'idle' : isRight ? 'right' : option.word === picked ? 'wrong' : 'dim'
            return (
              <button
                key={option.word}
                onClick={() => choose(option)}
                disabled={!!picked}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition ${
                  state === 'idle'
                    ? 'bg-surface ring-stone-200 hover:bg-teal-50 hover:ring-teal-300'
                    : state === 'right'
                      ? 'bg-emerald-50 ring-2 ring-emerald-500'
                      : state === 'wrong'
                        ? 'bg-red-50 ring-2 ring-red-500'
                        : 'bg-surface opacity-50 ring-stone-200'
                }`}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">{i + 1}</span>
                {q.type === 'meaning' ? (
                  <span lang="lo" className="font-lao text-lg text-stone-900">
                    {option.lao}
                  </span>
                ) : (
                  <span lang="zh-CN" className="font-zh text-2xl text-stone-900">
                    {option.word}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex min-h-12 justify-center">
          {picked && (
            <button onClick={next} autoFocus className="font-lao rounded-md bg-stone-900 px-8 py-3 font-semibold text-white transition hover:bg-stone-700">
              {t.next} →
            </button>
          )}
        </div>
      </div>

      <footer className="font-lao pb-3 text-center text-xs text-stone-400">{t.quizHint}</footer>
    </div>
  )
}
