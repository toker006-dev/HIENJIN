import { useEffect, useRef, useState } from 'react'
import { Puzzle } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { ResultIcon } from '../components/ResultIcon.tsx'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { arrangeSetsById, DIFFICULTIES, isDifficulty, levelsOf, ROUND_SIZE, useArrangePool, type Difficulty } from '../data/arrange.ts'
import { t } from '../i18n/lo.ts'
import { markArrangePlayed } from '../lib/progress.ts'
import { useSoundEffects, useVoice } from '../lib/settings.ts'
import { playComplete, playCorrect, playType, playWrong } from '../lib/sfx.ts'
import { canSpeak, speak } from '../lib/speech.ts'
import type { Sentence } from '../types.ts'

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

interface Tile {
  id: number
  text: string
}

/** The sentence's words as tiles in random order - never already in the right order. */
function shuffledTiles(words: string[]): Tile[] {
  const tiles = words.map((text, id) => ({ id, text }))
  const answer = words.join('')
  for (let tries = 0; tries < 10; tries++) {
    const order = shuffle(tiles)
    if (order.map((tile) => tile.text).join('') !== answer) return order
  }
  // Only possible when every order reads the same (e.g. 谢谢 + 谢谢); then any order is fine.
  return shuffle(tiles)
}

/** A word-order set (one card on the practice page): what it is, then pick a difficulty to start. */
export function ArrangeSetPage() {
  const set = arrangeSetsById.get(useParams().setId ?? '')
  if (!set) return <Navigate to="/courses" replace />

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
      <section className="flex flex-col gap-5 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-stone-200 sm:flex-row sm:p-5">
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden rounded-xl sm:w-72">
          <img src={set.cover} alt="" className="size-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-lg font-bold text-white backdrop-blur-sm">
            <Puzzle aria-hidden className="inline size-4 align-[-0.15em]" /> {set.title}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="font-lao text-2xl font-bold text-stone-900">
            {t.arrangeTitle} {set.title}
          </h2>
          <p className="font-lao mt-3 leading-relaxed text-stone-700">{set.description}</p>
        </div>
      </section>

      <section>
        <h3 className="font-lao mb-3 text-lg font-bold text-stone-900">{t.chooseDifficulty}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {DIFFICULTIES.map(({ id, levels }) => (
              <Link
                key={id}
                to={`/courses/arrange/${set.id}/${id}`}
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

export function ArrangeRoute() {
  const { setId, difficulty } = useParams()
  if (!arrangeSetsById.has(setId ?? '')) return <Navigate to="/courses" replace />
  if (!isDifficulty(difficulty)) return <Navigate to={`/courses/arrange/${setId}`} replace />
  return <ArrangeGame key={difficulty} setId={setId!} difficulty={difficulty} />
}

/** One round: ROUND_SIZE random sentences of the difficulty, each solved by tapping its words into order. */
function ArrangeGame({ setId, difficulty }: { setId: string; difficulty: Difficulty }) {
  const pool = useArrangePool(difficulty)
  const [sfx] = useSoundEffects()
  const [voice] = useVoice()
  const [round, setRound] = useState(() => shuffle(pool).slice(0, ROUND_SIZE))
  const [index, setIndex] = useState(0)
  // Sentences answered wrong at least once in this round.
  const [missed, setMissed] = useState<Sentence[]>([])
  const done = index >= round.length

  useEffect(() => markArrangePlayed(`${setId}/${difficulty}`), [setId, difficulty])

  function next() {
    if (index + 1 === round.length && sfx) playComplete()
    setIndex(index + 1)
  }

  function playAgain() {
    setRound(shuffle(pool).slice(0, ROUND_SIZE))
    setIndex(0)
    setMissed([])
  }

  if (done) {
    const score = round.length - missed.length
    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <ResultIcon perfect={score === round.length} />
        <h2 className="font-lao text-2xl font-bold text-stone-900">{t.arrangeScore(score, round.length)}</h2>
        {missed.length > 0 && (
          <div className="w-full rounded-2xl bg-surface p-4 text-left ring-1 ring-stone-200">
            <p className="font-lao mb-2 text-sm font-medium text-stone-500">{t.arrangeMistakes}</p>
            <ul className="divide-y divide-stone-100">
              {missed.map((s) => (
                <li key={s.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p lang="zh-CN" className="font-zh text-lg text-stone-900">
                      {s.words.join('')}
                    </p>
                    <p lang="lo" className="font-lao text-sm text-stone-600">
                      {s.lao}
                    </p>
                  </div>
                  <SpeakButton text={s.words.join('')} rate={0.7} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button onClick={playAgain} autoFocus className="font-lao rounded-full bg-teal-700 px-8 py-3 font-semibold text-white transition hover:bg-teal-800">
            {t.playAgain}
          </button>
          <Link to="/courses/arrange/hsk" className="font-lao rounded-full px-8 py-3 font-semibold text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100">
            {t.changeDifficulty}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4">
      <div className="pt-4">
        <div className="mb-2 flex justify-between">
          <span className="font-lao text-sm font-medium text-stone-600">
            {t.arrangeTitle} · {t.difficultyLevels(...levelsOf(difficulty))}
          </span>
          <span className="font-lao text-sm text-stone-500">{t.progress(index + 1, round.length)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-600 transition-all duration-500" style={{ width: `${(index / round.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-1 items-center py-4">
        <div className="w-full rounded-3xl bg-surface px-6 py-8 shadow-sm ring-1 ring-stone-200 sm:px-12">
          <ArrangeExercise
            key={`${round[index].id}-${index}`}
            sentence={round[index]}
            sfx={sfx}
            voice={voice}
            onMistake={() => setMissed((list) => (list.includes(round[index]) ? list : [...list, round[index]]))}
            onNext={next}
          />
        </div>
      </div>

      <footer className="font-lao pb-3 text-center text-xs text-stone-400">{t.arrangeHint}</footer>
    </div>
  )
}

type Status = 'idle' | 'wrong' | 'correct'

function ArrangeExercise({ sentence, sfx, voice, onMistake, onNext }: {
  sentence: Sentence
  sfx: boolean
  voice: boolean
  onMistake: () => void
  onNext: () => void
}) {
  const [tiles] = useState(() => shuffledTiles(sentence.words))
  const [placed, setPlaced] = useState<number[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const nextButton = useRef<HTMLButtonElement>(null)
  const speakTimer = useRef<number>(undefined)
  const chinese = sentence.words.join('')

  useEffect(() => () => clearTimeout(speakTimer.current), [])
  useEffect(() => {
    if (status === 'correct') nextButton.current?.focus()
  }, [status])

  function update(nextPlaced: number[]) {
    setPlaced(nextPlaced)
    if (nextPlaced.length < tiles.length) {
      setStatus('idle')
      return
    }
    // Compare the text, not tile order, so swapping two identical or interchangeable-looking words still counts.
    const answer = nextPlaced.map((id) => tiles.find((tile) => tile.id === id)!.text).join('')
    if (answer === chinese) {
      setStatus('correct')
      if (sfx) playCorrect()
      if (voice && canSpeak) speakTimer.current = window.setTimeout(() => speak(chinese), sfx ? 450 : 0)
    } else {
      setStatus('wrong')
      onMistake()
      if (sfx) playWrong()
    }
  }

  function place(id: number) {
    if (status === 'correct') return
    if (sfx) playType()
    update([...placed, id])
  }

  function unplace(id: number) {
    if (status === 'correct') return
    if (sfx) playType()
    update(placed.filter((p) => p !== id))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Backspace' && placed.length && status !== 'correct') {
        e.preventDefault()
        unplace(placed[placed.length - 1])
      } else if (e.key === 'Enter' && status === 'correct' && document.activeElement !== nextButton.current) {
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const tileBase = 'font-zh rounded-xl px-4 py-2 text-2xl shadow-sm ring-1 transition'
  const placedStyle =
    status === 'correct'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-400'
      : status === 'wrong'
        ? 'bg-red-50 text-red-700 ring-red-400'
        : 'bg-teal-50 text-stone-900 ring-teal-300 hover:bg-teal-100'

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-3">
        <p className="font-lao text-sm font-medium tracking-wide text-stone-500">{t.arrangeInstruction}</p>
        <p lang="lo" className="font-lao text-2xl leading-relaxed font-semibold text-stone-900 sm:text-3xl">
          {sentence.lao}
        </p>
      </div>

      {/* Answer row: tap a placed word to send it back. */}
      <div
        lang="zh-CN"
        className={`flex min-h-16 w-full flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 ${
          status === 'wrong' ? 'animate-shake border-red-300' : status === 'correct' ? 'border-emerald-300' : 'border-stone-200'
        }`}
      >
        {placed.map((id) => (
          <button key={id} onClick={() => unplace(id)} className={`${tileBase} ${placedStyle}`}>
            {tiles.find((tile) => tile.id === id)!.text}
          </button>
        ))}
      </div>

      {/* Word bank: a used tile keeps its place as an empty slot, so the others don't jump around. */}
      <div lang="zh-CN" className="flex min-h-14 flex-wrap justify-center gap-2">
        {tiles.map((tile) =>
          placed.includes(tile.id) ? (
            <span key={tile.id} aria-hidden className={`${tileBase} invisible`}>
              {tile.text}
            </span>
          ) : (
            <button
              key={tile.id}
              onClick={() => place(tile.id)}
              disabled={status === 'correct'}
              className={`${tileBase} bg-surface text-stone-900 ring-stone-300 hover:bg-stone-100`}
            >
              {tile.text}
            </button>
          ),
        )}
      </div>

      <div className="flex min-h-24 flex-col items-center gap-3">
        <p aria-live="polite" className={`font-lao ${status === 'correct' ? 'text-emerald-700' : 'text-red-600'}`}>
          {status === 'correct' ? t.arrangeCorrect : status === 'wrong' ? t.arrangeWrong : ''}
        </p>
        {status === 'correct' && (
          <>
            <div className="flex items-center gap-1">
              <span lang="zh-CN" className="font-zh text-xl text-stone-900">
                {chinese}
              </span>
              <SpeakButton text={chinese} rate={0.7} />
            </div>
            <button
              ref={nextButton}
              onClick={onNext}
              className="font-lao rounded-full bg-emerald-600 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:outline-none"
            >
              {t.next} →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
