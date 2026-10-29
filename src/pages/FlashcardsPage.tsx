import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { LEVELS, parseFilter, useAllVocabulary, useVocabulary, type VocabWord, type WordFilter } from '../data/vocabulary.ts'
import { t } from '../i18n/lo.ts'
import { recordVocabLesson, useVocabHistory } from '../lib/activity.ts'
import { setKnown, useKnownWords } from '../lib/known.ts'

export function FlashcardsRoute() {
  const level = Number(useParams().level)
  const [params] = useSearchParams()
  if (!LEVELS.includes(level)) return <Navigate to="/vocabulary/1" replace />
  const lesson = Number(params.get('lesson')) || undefined
  const filter = parseFilter(params.get('filter'))
  return <FlashcardsLoader key={params.toString()} level={level} lesson={lesson} filter={filter} />
}

function FlashcardsLoader({ level, lesson, filter }: { level: number; lesson?: number; filter: WordFilter }) {
  const words = useVocabulary(level)
  const known = useKnownWords()
  // The deck is fixed when the session starts, so marking a card doesn't make it disappear mid-review.
  const [deck] = useState(() => {
    const inLesson = words.filter((w) => !lesson || w.lesson === lesson)
    const filtered = inLesson.filter((w) => filter === 'all' || (filter === 'known') === known.has(w.word))
    return filtered.length ? filtered : inLesson
  })
  useEffect(() => {
    if (lesson) recordVocabLesson(level, lesson)
  }, [level, lesson])
  const listLink = `/vocabulary/${level}${lesson && lesson > 1 ? `?lesson=${lesson}` : ''}`
  return (
    <Flashcards
      label={`HSK ${level}${lesson ? ` · ${t.lessonTitle(lesson)}` : ''}`}
      deck={deck}
      listLink={listLink}
      reviewLink={`/vocabulary/${level}/cards?${lesson ? `lesson=${lesson}&` : ''}filter=learning`}
    />
  )
}

/** Most still-learning words per quick-review session. */
const REVIEW_SIZE = 30

/** Quick review from Home: still-learning words from every vocabulary lesson the learner has opened. */
export function ReviewRoute() {
  const all = useAllVocabulary()
  const known = useKnownWords()
  const { opened } = useVocabHistory()
  const [deck] = useState(() => {
    const lessons = new Set(opened)
    return all.filter((w) => lessons.has(`${w.level}/${w.lesson}`) && !known.has(w.word)).slice(0, REVIEW_SIZE)
  })
  if (deck.length === 0) return <Navigate to="/" replace />
  return <Flashcards label={t.quickReview} deck={deck} listLink="/vocabulary" showLevel />
}

/** One card at a time: hanzi on the front; flipping shows pinyin, meanings and the example sentence. */
function Flashcards({ label, deck, listLink, reviewLink, showLevel }: {
  label: string
  deck: VocabWord[]
  listLink: string
  /** Deck of this session's still-learning words, offered at the end. */
  reviewLink?: string
  /** Show each card's HSK level (for decks mixing levels). */
  showLevel?: boolean
}) {
  const known = useKnownWords()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const done = index >= deck.length
  const card = deck[index]

  function go(to: number) {
    setIndex(Math.max(0, Math.min(to, deck.length)))
    setFlipped(false)
  }

  function mark(isKnown: boolean) {
    setKnown(card.word, isKnown)
    go(index + 1)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || e.target instanceof HTMLInputElement) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
      else if (e.key === '1') mark(true)
      else if (e.key === '2') mark(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) {
    const knownInDeck = deck.filter((w) => known.has(w.word)).length
    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="font-lao text-3xl font-bold text-stone-900">{t.cardsDoneTitle}</h2>
        <p className="font-lao text-stone-600">{t.cardsDoneBody(knownInDeck, deck.length)}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {reviewLink && knownInDeck < deck.length && (
            <Link
              to={reviewLink}
              autoFocus
              className="font-lao rounded-full bg-teal-700 px-8 py-3 font-semibold text-white transition hover:bg-teal-800"
            >
              {t.reviewLearning}
            </Link>
          )}
          <button onClick={() => go(0)} className="font-lao rounded-full bg-stone-900 px-8 py-3 font-semibold text-white transition hover:bg-stone-700">
            {t.restart}
          </button>
          <Link to={listLink} className="font-lao rounded-full px-8 py-3 font-semibold text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100">
            {t.backToVocabulary}
          </Link>
        </div>
      </div>
    )
  }

  const isKnown = known.has(card.word)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-4">
      <div className="pt-4">
        <div className="mb-2 flex justify-between">
          <span className="font-lao text-sm font-medium text-stone-600">
            {label}
            {showLevel && ` · HSK ${card.level}`}
          </span>
          <span className="font-lao text-sm text-stone-500">{t.cardProgress(index + 1, deck.length)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-600 transition-all duration-300" style={{ width: `${(index / deck.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5 py-6">
        <div
          role="button"
          tabIndex={0}
          aria-label={t.flip}
          onClick={() => setFlipped(!flipped)}
          className={`relative flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-3xl px-6 py-8 text-center shadow-sm ring-1 transition select-none ${
            isKnown ? 'bg-emerald-50/50 ring-emerald-200' : 'bg-white ring-stone-200'
          }`}
        >
          {isKnown && <span className="font-lao absolute top-3 right-4 text-xs font-medium text-emerald-600">✓ {t.gotIt}</span>}
          <span lang="zh-CN" className="font-zh text-7xl leading-tight text-stone-900 sm:text-8xl">
            {card.word}
          </span>

          {flipped ? (
            <div className="mt-4 flex w-full flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-medium text-teal-800">{card.pinyin}</span>
                <SpeakButton text={card.word} />
              </div>
              {card.pos && (
                <span className="font-lao rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
                  {t.pos[card.pos]}
                </span>
              )}
              <p lang="lo" className="font-lao text-2xl font-semibold text-stone-800">
                {card.lao}
              </p>
              <p className="text-stone-500">{card.english}</p>
              {card.sentence && (
                <div className="mt-2 w-full border-t border-stone-200 pt-3">
                  <div className="flex items-center justify-center gap-1">
                    <p lang="zh-CN" className="font-zh text-lg text-stone-900">
                      {card.sentence.words.map((part, i) => (
                        <span key={i} className={part === card.word ? 'font-semibold text-teal-700' : ''}>
                          {part}
                        </span>
                      ))}
                    </p>
                    <SpeakButton text={card.sentence.words.join('')} rate={0.7} />
                  </div>
                  <p lang="lo" className="font-lao text-stone-600">
                    {card.sentence.lao}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="font-lao mt-6 text-sm text-stone-400">{t.tapToFlip}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label={t.previous}
            title={t.previous}
            className="rounded-full p-3 text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-100 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => mark(false)}
            className="font-lao flex-1 rounded-full bg-amber-100 py-3 font-semibold text-amber-900 transition hover:bg-amber-200"
          >
            {t.stillLearning}
          </button>
          <button
            onClick={() => mark(true)}
            className="font-lao flex-1 rounded-full bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700"
          >
            ✓ {t.gotIt}
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label={t.next}
            title={t.next}
            className="rounded-full p-3 text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-100"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <footer className="font-lao pb-3 text-center text-xs text-stone-400">{t.cardsHint}</footer>
    </div>
  )
}
