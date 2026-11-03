import { memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Link, Navigate, NavLink, useParams, useSearchParams } from 'react-router'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { LESSON_SIZE } from '../data/courses.ts'
import { LEVELS, matchesSearch, parseFilter, useAllVocabulary, useVocabulary, type VocabWord, type WordFilter } from '../data/vocabulary.ts'
import { t } from '../i18n/lo.ts'
import { recordVocabLesson } from '../lib/activity.ts'
import { setKnown, setManyKnown, useKnownWords } from '../lib/known.ts'

/** Search results beyond this are cut off (the learner should refine the search). */
const MAX_RESULTS = 200

export function VocabularyRoute() {
  const level = Number(useParams().level)
  if (!LEVELS.includes(level)) return <Navigate to="/vocabulary/1" replace />
  return <VocabularyPage key={level} level={level} />
}

/** Every word of one HSK level as compact rows that expand, grouped into the practice lessons. */
function VocabularyPage({ level }: { level: number }) {
  const words = useVocabulary(level)
  const known = useKnownWords()
  const [params, setParams] = useSearchParams()
  const filter = parseFilter(params.get('filter'))
  const [query, setQuery] = useState('')
  const search = useDeferredValue(query)
  const [open, setOpen] = useState<string | null>(null)
  // Stable, so memoised rows don't all re-render when one opens.
  const toggle = useCallback((word: string) => setOpen((o) => (o === word ? null : word)), [])

  const knownCount = useMemo(() => words.filter((w) => known.has(w.word)).length, [words, known])
  const lessonCount = Math.ceil(words.length / LESSON_SIZE)
  const lesson = Math.min(Math.max(Number(params.get('lesson')) || 1, 1), lessonCount)
  useEffect(() => recordVocabLesson(level, lesson), [level, lesson])
  const lessonWords = useMemo(
    () => words.filter((w) => w.lesson === lesson && (filter === 'all' || (filter === 'known') === known.has(w.word))),
    [words, known, filter, lesson],
  )
  // Lessons whose every word is known get a green page button.
  const doneLessons = useMemo(() => {
    const done = new Set<number>()
    for (let n = 1; n <= lessonCount; n++) {
      if (words.filter((w) => w.lesson === n).every((w) => known.has(w.word))) done.add(n)
    }
    return done
  }, [words, known, lessonCount])

  /** Updates one URL parameter, keeping the others (lesson + filter). */
  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  function goToLesson(n: number) {
    setParam('lesson', n === 1 ? null : String(n))
    setOpen(null)
    document.querySelector('main')?.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
      <nav className="flex gap-1 overflow-x-auto pb-1">
        {LEVELS.map((n) => (
          <NavLink
            key={n}
            to={`/vocabulary/${n}`}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                isActive ? 'bg-teal-700 text-white' : 'bg-surface text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'
              }`
            }
          >
            HSK {n}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-3">
          <span className="font-lao text-sm font-medium text-stone-700">{t.knownCount(knownCount, words.length)}</span>
          <span className="text-sm text-stone-400 tabular-nums">{Math.round((knownCount / words.length) * 100)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(knownCount / words.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchWords}
            className="font-lao min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <div className="flex shrink-0 rounded-xl bg-stone-100 p-1">
            {(['all', 'known'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setParam('filter', f === 'all' ? null : f)}
                aria-pressed={filter === f}
                className="font-lao flex-1 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-stone-600 transition aria-pressed:bg-surface aria-pressed:font-semibold aria-pressed:text-teal-800 aria-pressed:shadow-sm"
              >
                {f === 'all' ? t.filterAll : t.filterKnown}
              </button>
            ))}
          </div>
        </div>
      </div>

      {search.trim() ? (
        <Suspense fallback={<div role="status" aria-label={t.loading} className="mx-auto mt-10 size-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-700" />}>
          <SearchResults query={search} filter={filter} known={known} open={open} onToggle={toggle} />
        </Suspense>
      ) : (
        <section className="mt-6">
          <Pager lesson={lesson} count={lessonCount} done={doneLessons} onChange={goToLesson} />
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3 px-1">
            <h3 className="font-lao font-semibold text-stone-800">
              {t.lessonTitle(lesson)}
              <span className="ml-2 text-sm font-normal text-stone-500">
                {t.wordRange((lesson - 1) * LESSON_SIZE + 1, Math.min(lesson * LESSON_SIZE, words.length))}
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              <LessonToggle words={words.filter((w) => w.lesson === lesson).map((w) => w.word)} known={known} />
              <Link
                to={`/vocabulary/${level}/cards?lesson=${lesson}${filter === 'all' ? '' : `&filter=${filter}`}`}
                className="font-lao inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800 ring-1 ring-teal-200 transition hover:bg-teal-100"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <rect x="3" y="6" width="14" height="14" rx="2" />
                  <path d="M7 6V4h12a2 2 0 0 1 2 2v12h-4" />
                </svg>
                {t.flashcards}
              </Link>
              <Link
                to={`/vocabulary/${level}/quiz?lesson=${lesson}`}
                className="font-lao inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100"
              >
                <CircleHelp aria-hidden className="inline size-4 align-[-0.15em]" /> {t.quiz}
              </Link>
            </div>
          </div>
          {lessonWords.length === 0 ? (
            <p className="font-lao rounded-2xl bg-surface py-16 text-center text-stone-500 ring-1 ring-stone-200">{t.noWords}</p>
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-stone-200">
              {lessonWords.map((w) => (
                <WordRow key={w.word} word={w} known={known.has(w.word)} open={open === w.word} onToggle={toggle} />
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => goToLesson(lesson - 1)}
              disabled={lesson === 1}
              className="font-lao rounded-full px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100 disabled:invisible"
            >
              ← {t.lessonTitle(lesson - 1)}
            </button>
            <button
              onClick={() => goToLesson(lesson + 1)}
              disabled={lesson === lessonCount}
              className="font-lao rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:invisible"
            >
              {t.lessonTitle(lesson + 1)} →
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

/** Matches from every HSK level, grouped by level, so the learner needn't know which level a word is in. */
function SearchResults({ query, filter, known, open, onToggle }: {
  query: string
  filter: WordFilter
  known: Set<string>
  open: string | null
  onToggle: (word: string) => void
}) {
  const all = useAllVocabulary()
  const matches = useMemo(
    () => all.filter((w) => matchesSearch(w, query) && (filter === 'all' || (filter === 'known') === known.has(w.word))),
    [all, query, filter, known],
  )
  if (matches.length === 0) return <p className="font-lao py-16 text-center text-stone-500">{t.noWords}</p>

  const shown = matches.slice(0, MAX_RESULTS)
  const levels = groupBy(shown, (w) => w.level)

  return (
    <>
      <p className="font-lao mt-6 px-1 text-sm text-stone-500">{t.searchResults(matches.length)}</p>
      {[...levels].map(([level, levelWords]) => (
        <section key={level} className="mt-3">
          <h3 className="mb-2 px-1 font-semibold text-stone-800">HSK {level}</h3>
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-stone-200">
            {levelWords.map((w) => (
              <WordRow
                key={w.word}
                word={w}
                known={known.has(w.word)}
                open={open === w.word}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      ))}
      {matches.length > MAX_RESULTS && <p className="font-lao mt-4 text-center text-sm text-stone-500">{t.moreResults(MAX_RESULTS)}</p>}
    </>
  )
}

/** One numbered button per lesson (a page of 25 words); green once every word in it is known. */
function Pager({ lesson, count, done, onChange }: { lesson: number; count: number; done: Set<number>; onChange: (n: number) => void }) {
  return (
    <nav aria-label={t.outline} className="mb-4 flex flex-wrap gap-1.5">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          aria-current={n === lesson ? 'page' : undefined}
          title={t.lessonTitle(n)}
          className={`size-9 rounded-lg text-sm font-medium tabular-nums transition ${
            n === lesson
              ? 'bg-teal-700 text-white'
              : done.has(n)
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
                : 'bg-surface text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'
          }`}
        >
          {n}
        </button>
      ))}
    </nav>
  )
}

function groupBy<K>(words: VocabWord[], key: (w: VocabWord) => K): Map<K, VocabWord[]> {
  const groups = new Map<K, VocabWord[]>()
  for (const w of words) {
    const group = groups.get(key(w))
    if (group) group.push(w)
    else groups.set(key(w), [w])
  }
  return groups
}

/** Memoised: only the rows whose open/known state changed re-render. */
const WordRow = memo(function WordRow({ word: w, known, open, onToggle }: { word: VocabWord; known: boolean; open: boolean; onToggle: (word: string) => void }) {
  return (
    <li className={open ? 'bg-teal-50/40' : ''}>
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <KnownToggle word={w.word} known={known} />
        <button onClick={() => onToggle(w.word)} aria-expanded={open} className="flex min-w-0 flex-1 items-baseline gap-3 py-1 text-left">
          <span lang="zh-CN" className="font-zh shrink-0 text-2xl text-stone-900">
            {w.word}
          </span>
          <span className="shrink-0 text-sm font-medium text-teal-800">{w.pinyin}</span>
          <span lang="lo" className="font-lao min-w-0 truncate text-stone-700">
            {w.lao}
          </span>
          <span className="hidden min-w-0 flex-1 truncate text-right text-sm text-stone-400 sm:block">{w.english}</span>
        </button>
        <SpeakButton text={w.word} />
      </div>

      {open && (
        <div className="space-y-3 px-4 pb-4 pl-12 sm:pl-14">
          <div className="flex flex-wrap items-center gap-2">
            {w.pos && (
              <span className="font-lao rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
                {t.pos[w.pos]}
              </span>
            )}
            <span className="text-sm text-stone-600">{w.english}</span>
          </div>
          {w.sentence && (
            <div className="rounded-xl bg-surface p-3 ring-1 ring-stone-200">
              <p className="font-lao mb-1 text-xs font-medium text-stone-400">{t.exampleSentence}</p>
              <div className="flex items-center gap-2">
                <p lang="zh-CN" className="font-zh flex-1 text-lg text-stone-900">
                  {w.sentence.words.map((part, i) => (
                    <span key={i} className={part === w.word ? 'font-semibold text-teal-700' : ''}>
                      {part}
                    </span>
                  ))}
                </p>
                <SpeakButton text={w.sentence.words.join('')} rate={0.7} />
              </div>
              <p lang="lo" className="font-lao mt-1 text-stone-600">
                {w.sentence.lao}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  )
})

/** Marks every word of the lesson known, or (when all already are) unmarks them all. */
function LessonToggle({ words, known }: { words: string[]; known: Set<string> }) {
  const allKnown = words.every((w) => known.has(w))
  return (
    <button
      onClick={() => setManyKnown(words, !allKnown)}
      aria-pressed={allKnown}
      className="font-lao inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100 aria-pressed:bg-emerald-50 aria-pressed:text-emerald-700 aria-pressed:ring-emerald-300"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10" />
      </svg>
      {allKnown ? t.unmarkLesson : t.markLesson}
    </button>
  )
}

/** Round check button: filled green once the word is memorised. */
export function KnownToggle({ word, known }: { word: string; known: boolean }) {
  return (
    <button
      onClick={() => setKnown(word, !known)}
      aria-pressed={known}
      aria-label={known ? t.markLearning : t.markKnown}
      title={known ? t.markLearning : t.markKnown}
      className="grid size-7 shrink-0 place-items-center rounded-full text-stone-300 ring-2 ring-stone-200 transition hover:text-emerald-500 hover:ring-emerald-300 aria-pressed:bg-emerald-500 aria-pressed:text-white aria-pressed:ring-emerald-500"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10" />
      </svg>
    </button>
  )
}
