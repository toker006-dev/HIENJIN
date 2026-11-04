import { ProgressBar } from '../components/ProgressBar.tsx'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { ResultIcon } from '../components/ResultIcon.tsx'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { LEVELS, parseFilter, useAllVocabulary, useVocabulary, type VocabWord, type WordFilter } from '../data/vocabulary.ts'
import { t } from '../i18n/lo.ts'
import { dayKey, recordVocabLesson } from '../lib/activity.ts'
import { dailyReview, setKnown, useKnownWords } from '../lib/known.ts'

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

/** Today's review from Home: 30 random known words from HSK 1-6, the same set all day. */
export function ReviewRoute() {
  const all = useAllVocabulary()
  const known = useKnownWords()
  const [deck] = useState(() => {
    const byWord = new Map(all.map((w) => [w.word, w]))
    return dailyReview(known, dayKey()).flatMap((word) => byWord.get(word) ?? [])
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

  function markKnown() {
    setKnown(card.word, true)
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
      else if (e.key === '1') markKnown()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) {
    const knownInDeck = deck.filter((w) => known.has(w.word)).length
    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <ResultIcon />
        <h2 className="font-lao text-3xl font-bold text-stone-900">{t.cardsDoneTitle}</h2>
        <p className="font-lao text-stone-600">{t.cardsDoneBody(knownInDeck, deck.length)}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {reviewLink && knownInDeck < deck.length && (
            <Link
              to={reviewLink}
              autoFocus
              className="font-lao rounded-md bg-primary px-8 py-3 font-semibold text-on-primary transition hover:bg-primary-hover"
            >
              {t.reviewLearning}
            </Link>
          )}
          <button onClick={() => go(0)} className="font-lao rounded-md bg-stone-900 px-8 py-3 font-semibold text-white transition hover:bg-stone-700">
            {t.restart}
          </button>
          <Link to={listLink} className="font-lao rounded-md px-8 py-3 font-semibold text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100">
            {t.backToVocabulary}
          </Link>
        </div>
      </div>
    )
  }

  const isKnown = known.has(card.word)

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col px-4">
      <div className="pt-3">
        <div className="mb-2 flex justify-between">
          <span className="font-lao text-sm font-medium text-stone-600">
            {label}
            {showLevel && ` · HSK ${card.level}`}
          </span>
          <span className="font-lao text-sm text-stone-500">{t.cardProgress(index + 1, deck.length)}</span>
        </div>
        <ProgressBar ratio={(index / deck.length)} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-3">
        <div
          key={index}
          role="button"
          tabIndex={0}
          aria-label={t.flip}
          onClick={() => setFlipped(!flipped)}
          className={`animate-flip relative flex max-h-full min-h-0 flex-1 cursor-pointer flex-col items-center justify-center overflow-y-auto rounded-3xl px-5 py-5 sm:max-h-[32rem] text-center shadow-sm ring-1 transition select-none ${
            isKnown ? 'bg-emerald-50/50 ring-emerald-200' : 'bg-surface ring-stone-200'
          }`}
        >
          {isKnown && <span className="font-lao absolute top-3 right-4 text-xs font-medium text-emerald-600">✓ {t.gotIt}</span>}
          <span lang="zh-CN" className={`font-zh leading-tight text-stone-900 transition-all ${flipped ? 'text-6xl' : 'text-7xl sm:text-8xl'}`}>
            {card.word}
          </span>

          {flipped ? (
            <div className="mt-2 flex w-full flex-col items-center gap-1.5">
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
                <div className="mt-1 w-full border-t border-stone-200 pt-2">
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
            className="grid size-12 shrink-0 place-items-center rounded-full text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-100 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => markKnown()}
            className="font-lao min-h-12 flex-1 rounded-full bg-emerald-600 font-semibold text-white transition hover:bg-emerald-700"
          >
            ✓ {t.gotIt}
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label={t.next}
            title={t.next}
            className="grid size-12 shrink-0 place-items-center rounded-full text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-100"
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
