import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Headphones, Turtle } from 'lucide-react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { ResultIcon } from '../components/ResultIcon.tsx'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { arrangeSetsById, DIFFICULTIES, isDifficulty, levelsOf, ROUND_SIZE, useArrangePool, type Difficulty } from '../data/arrange.ts'
import { t } from '../i18n/lo.ts'
import { isCorrect } from '../lib/answer.ts'
import { markArrangePlayed } from '../lib/progress.ts'
import { useSoundEffects } from '../lib/settings.ts'
import { playComplete, playCorrect, playWrong } from '../lib/sfx.ts'
import { canSpeak, speak } from '../lib/speech.ts'
import type { Sentence } from '../types.ts'

type ListenType = 'meaning' | 'dictation'

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const chinese = (s: Sentence) => s.words.join('')

/** A listening set (one card on the practice page): pick an HSK group to start. */
export function ListenSetPage() {
  const set = arrangeSetsById.get(useParams().setId ?? '')
  if (!set) return <Navigate to="/courses" replace />
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
      <section className="flex flex-col gap-5 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-stone-200 sm:flex-row sm:p-5">
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden rounded-xl sm:w-72">
          <img src={set.cover} alt="" className="size-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-lg font-bold text-white backdrop-blur-sm"><Headphones aria-hidden className="inline size-4 align-[-0.15em]" /> {set.title}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-lao text-2xl font-bold text-stone-900">
            {t.listenTitle} {set.title}
          </h2>
          <p className="font-lao mt-3 leading-relaxed text-stone-700">{t.listenSetDesc}</p>
        </div>
      </section>
      <section>
        <h3 className="font-lao mb-3 text-lg font-bold text-stone-900">{t.chooseDifficulty}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {DIFFICULTIES.map(({ id, levels }) => (
            <Link
              key={id}
              to={`/courses/listen/${set.id}/${id}`}
              className="rounded-2xl bg-surface p-5 text-center text-lg font-bold text-stone-900 shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-teal-300"
            >
              {t.difficultyLevels(...levels)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export function ListenRoute() {
  const { setId, difficulty } = useParams()
  const [params] = useSearchParams()
  if (!arrangeSetsById.has(setId ?? '')) return <Navigate to="/courses" replace />
  if (!isDifficulty(difficulty)) return <Navigate to={`/courses/listen/${setId}`} replace />
  const type: ListenType = params.get('type') === 'dictation' ? 'dictation' : 'meaning'
  return <ListenGame key={`${difficulty}-${type}`} setId={setId!} difficulty={difficulty} type={type} />
}

/** One round: ROUND_SIZE random sentences, heard rather than read. */
function ListenGame({ setId, difficulty, type }: { setId: string; difficulty: Difficulty; type: ListenType }) {
  const pool = useArrangePool(difficulty)
  const [sfx] = useSoundEffects()
  const [, setParams] = useSearchParams()
  const [round, setRound] = useState(() => shuffle(pool).slice(0, ROUND_SIZE))
  const [index, setIndex] = useState(0)
  const [missed, setMissed] = useState<Sentence[]>([])
  const done = index >= round.length

  useEffect(() => markArrangePlayed(`${setId}/${difficulty}/listen`), [setId, difficulty])

  function next() {
    if (index + 1 === round.length && sfx) playComplete()
    setIndex(index + 1)
  }

  function playAgain() {
    setRound(shuffle(pool).slice(0, ROUND_SIZE))
    setIndex(0)
    setMissed([])
  }

  const typePicker = (
    <div role="group" aria-label={t.quizType} className="flex rounded-xl bg-stone-200/70 p-1">
      {(['meaning', 'dictation'] as const).map((m) => (
        <button
          key={m}
          onClick={() => setParams(m === 'meaning' ? {} : { type: m }, { replace: true })}
          aria-pressed={type === m}
          className="font-lao flex-1 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-600 transition aria-pressed:bg-surface aria-pressed:font-semibold aria-pressed:text-teal-800 aria-pressed:shadow-sm"
        >
          {t.listenTypes[m]}
        </button>
      ))}
    </div>
  )

  if (!canSpeak) return <p className="font-lao px-4 py-16 text-center text-stone-600">{t.noVoice}</p>

  if (done) {
    const score = round.length - missed.length
    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <ResultIcon perfect={score === round.length} />
        <h2 className="font-lao text-2xl font-bold text-stone-900">{t.arrangeScore(score, round.length)}</h2>
        {missed.length > 0 && (
          <ul className="w-full divide-y divide-stone-100 rounded-2xl bg-surface p-4 text-left ring-1 ring-stone-200">
            {missed.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p lang="zh-CN" className="font-zh text-lg text-stone-900">
                    {chinese(s)}
                  </p>
                  <p lang="lo" className="font-lao text-sm text-stone-600">
                    {s.lao}
                  </p>
                </div>
                <SpeakButton text={chinese(s)} rate={0.7} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button onClick={playAgain} autoFocus className="font-lao rounded-full bg-teal-700 px-8 py-3 font-semibold text-white transition hover:bg-teal-800">
            {t.playAgain}
          </button>
          <Link to={`/courses/listen/${setId}`} className="font-lao rounded-full px-8 py-3 font-semibold text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100">
            {t.changeDifficulty}
          </Link>
        </div>
      </div>
    )
  }

  const sentence = round[index]
  const miss = () => setMissed((list) => (list.includes(sentence) ? list : [...list, sentence]))

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4">
      <div className="space-y-3 pt-4">
        {typePicker}
        <div className="flex justify-between">
          <span className="font-lao text-sm font-medium text-stone-600">{t.difficultyLevels(...levelsOf(difficulty))}</span>
          <span className="font-lao text-sm text-stone-500">{t.progress(index + 1, round.length)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-600 transition-all duration-500" style={{ width: `${(index / round.length) * 100}%` }} />
        </div>
      </div>
      <div className="flex flex-1 items-center py-4">
        <div className="w-full rounded-3xl bg-surface px-6 py-8 shadow-sm ring-1 ring-stone-200 sm:px-12">
          <ListenQuestion key={`${sentence.id}-${index}`} sentence={sentence} pool={pool} type={type} sfx={sfx} onMistake={miss} onNext={next} />
        </div>
      </div>
    </div>
  )
}

interface QuestionProps {
  sentence: Sentence
  pool: Sentence[]
  type: ListenType
  sfx: boolean
  onMistake: () => void
  onNext: () => void
}

function ListenQuestion({ sentence, pool, type, sfx, onMistake, onNext }: QuestionProps) {
  const text = chinese(sentence)
  const [solved, setSolved] = useState(false)
  const nextButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => speak(text), 300)
    return () => clearTimeout(timer)
  }, [text])
  useEffect(() => {
    if (solved) nextButton.current?.focus()
  }, [solved])

  function answered(right: boolean) {
    if (sfx) (right ? playCorrect : playWrong)()
    if (!right) onMistake()
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="font-lao text-sm font-medium text-stone-500">{t.listenPrompt[type]}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => speak(text)}
          aria-label={t.listen}
          title={t.listen}
          className="grid size-20 place-items-center rounded-full bg-teal-700 text-white shadow-md transition hover:bg-teal-800"
        >
          <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
          </svg>
        </button>
        <button onClick={() => speak(text, 0.5)} className="font-lao rounded-full px-4 py-2 text-sm font-medium text-teal-800 ring-1 ring-teal-300 transition hover:bg-teal-50">
          <Turtle aria-hidden className="inline size-4 align-[-0.15em]" /> {t.listenSlow}
        </button>
      </div>

      {type === 'meaning' ? (
        <MeaningChoices sentence={sentence} pool={pool} solved={solved} onAnswer={answered} onSolved={() => setSolved(true)} />
      ) : (
        <Dictation text={text} solved={solved} onAnswer={answered} onSolved={() => setSolved(true)} />
      )}

      {solved && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1">
            <span lang="zh-CN" className="font-zh text-xl text-stone-900">
              {text}
            </span>
            <SpeakButton text={text} rate={0.7} />
          </div>
          <p lang="lo" className="font-lao text-stone-600">
            {sentence.lao}
          </p>
          <button ref={nextButton} onClick={onNext} className="font-lao mt-1 rounded-full bg-emerald-600 px-8 py-3 font-semibold text-white transition hover:bg-emerald-700">
            {t.next} →
          </button>
        </div>
      )}
    </div>
  )
}

interface AnswerProps {
  solved: boolean
  onAnswer: (right: boolean) => void
  onSolved: () => void
}

/** Four Lao translations; a wrong pick reveals the right one. */
function MeaningChoices({ sentence, pool, solved, onAnswer, onSolved }: AnswerProps & { sentence: Sentence; pool: Sentence[] }) {
  const [options] = useState(() => {
    const wrong = shuffle(pool.filter((s) => s.lao !== sentence.lao)).slice(0, 3)
    return shuffle([sentence, ...wrong])
  })
  const [picked, setPicked] = useState<string | null>(null)

  function choose(option: Sentence) {
    if (solved) return
    setPicked(option.id)
    onAnswer(option.id === sentence.id)
    onSolved()
  }

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const option = options[Number(e.key) - 1]
      if (option) choose(option)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="grid w-full gap-3">
      {options.map((option, i) => {
        const right = option.id === sentence.id
        const style = !solved
          ? 'bg-surface ring-stone-200 hover:bg-teal-50 hover:ring-teal-300'
          : right
            ? 'bg-emerald-50 ring-2 ring-emerald-500'
            : option.id === picked
              ? 'bg-red-50 ring-2 ring-red-500'
              : 'opacity-50 ring-stone-200'
        return (
          <button key={option.id} onClick={() => choose(option)} disabled={solved} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition ${style}`}>
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-stone-100 text-xs font-semibold text-stone-500">{i + 1}</span>
            <span lang="lo" className="font-lao text-stone-900">
              {option.lao}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Type the whole sentence. Enter checks; a wrong answer can be fixed, or the answer revealed. */
function Dictation({ text, solved, onAnswer, onSolved }: AnswerProps & { text: string }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  function check() {
    if (solved || !value.trim()) return
    const right = isCorrect(value, text)
    onAnswer(right)
    setWrong(!right)
    if (right) onSolved()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // While a Chinese IME is composing, Enter belongs to the IME.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter') {
      e.preventDefault()
      check()
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <input
        lang="zh-CN"
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setWrong(false)
        }}
        onKeyDown={handleKeyDown}
        readOnly={solved}
        aria-label={t.listenPrompt.dictation}
        autoComplete="off"
        spellCheck={false}
        className={`font-zh w-full rounded-xl border-2 bg-transparent px-4 py-3 text-center text-2xl outline-none ${
          solved ? 'border-emerald-500' : wrong ? 'border-red-500' : 'border-stone-300 focus:border-teal-600'
        }`}
      />
      {wrong && <p className="font-lao text-sm text-red-600">{t.listenWrong}</p>}
      {!solved && (
        <div className="flex gap-2">
          <button onClick={check} className="font-lao rounded-full bg-stone-900 px-6 py-2.5 font-semibold text-white transition hover:bg-stone-700">
            {t.check}
          </button>
          <button
            onClick={() => {
              onAnswer(false)
              onSolved()
            }}
            className="font-lao rounded-full px-5 py-2.5 text-sm font-medium text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-100"
          >
            {t.showAnswer}
          </button>
        </div>
      )}
    </div>
  )
}
