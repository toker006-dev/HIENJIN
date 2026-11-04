import { Suspense, useState, type ReactNode } from 'react'
import { BookOpen, CalendarDays, ChevronRight, Headphones, Layers, Pencil, Play, Puzzle, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { CourseCard } from '../components/CourseCard.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { arrangeSetsById, isDifficulty, levelsOf } from '../data/arrange.ts'
import { categories, coursesById, currentLesson, useLoadedCourse, type Course } from '../data/courses.ts'
import { LEVELS, useVocabulary } from '../data/vocabulary.ts'
import { t } from '../i18n/lo.ts'
import { dayKey, useVocabHistory, type VocabHistory } from '../lib/activity.ts'
import { DAILY_REVIEW_SIZE, useKnownWords } from '../lib/known.ts'
import { hideFromRecent, useArrangeRecent, useHiddenFromRecent, useProgress, type CourseProgress } from '../lib/progress.ts'
import { timeAgo } from '../lib/time.ts'

const card = 'rounded-3xl border border-stone-200 bg-surface p-5 shadow-sm sm:p-6'

const primaryButton =
  'font-lao inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-on-primary transition hover:bg-primary-hover'
const secondaryButton =
  'font-lao inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-stone-300 bg-surface px-6 font-semibold text-stone-800 transition hover:bg-stone-100'

/** Words of one HSK level / lesson, straight from the word lists (no sentences needed). */
function levelWords(level: number, lesson?: number): string[] {
  const lessons = coursesById.get(`hsk${level}`)?.course.lessons ?? []
  return (lesson ? lessons.filter((l) => l.number === lesson) : lessons).flatMap((l) => l.words)
}

export function HomePage() {
  const progress = useProgress()
  const hidden = useHiddenFromRecent()
  const history = useVocabHistory()
  const [now] = useState(() => Date.now())

  // Every course studied since it was last hidden (if ever), most recently studied first.
  const recent = categories
    .flatMap((category) => category.courses.map((course) => ({ category, course })))
    .map((entry) => ({
      ...entry,
      lastStudied: Math.max(0, ...entry.course.lessons.map((l) => progress[l.id]?.lastStudied ?? 0)),
    }))
    .filter((entry) => entry.lastStudied > (hidden[entry.course.id] ?? 0))
    .sort((a, b) => b.lastStudied - a.lastStudied)

  const arrangeRecent = useArrangeRecent()
  // Word-order rounds share the list with courses, hidden the same way (id "arrange/hsk/easy").
  const recentArrange = Object.entries(arrangeRecent)
    .map(([key, lastStudied]) => ({ key, lastStudied }))
    .filter(({ key, lastStudied }) => lastStudied > (hidden[`arrange/${key}`] ?? 0))
  const recentAll = [
    ...recent.map((entry) => ({ ...entry, key: entry.course.id })),
    ...recentArrange.map((entry) => ({ ...entry, category: undefined, course: undefined })),
  ].sort((a, b) => b.lastStudied - a.lastStudied)

  const isNew = !history.last && recentAll.length === 0

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-6 sm:px-6 sm:py-10">
      <Welcome isNew={isNew} progress={progress} />

      {!isNew && (history.last || recent[0]) && (
        <section>
          <SectionHeading>{t.continueTitle}</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {history.last && <ContinueVocabulary last={history.last} now={now} />}
            {recent[0] && (
              <Suspense fallback={<div className={`${card} h-40 animate-pulse`} />}>
                <ContinuePractice course={recent[0].course} progress={progress} subtitle={timeAgo(recent[0].lastStudied, now)} />
              </Suspense>
            )}
          </div>
        </section>
      )}

      <ActivityBento />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <HskProgress />
        <Suspense fallback={<div className={`${card} h-72 animate-pulse`} />}>
          <WordOfDay />
        </Suspense>
      </div>

      {recentAll.length > 0 && (
        <section>
          <SectionHeading>{t.recentTitle}</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentAll.map(({ key, category, course, lastStudied }) =>
              course ? (
                <RecentCourse key={key} course={course} progress={progress} subtitle={`${category.title} · ${timeAgo(lastStudied, now)}`} />
              ) : (
                <RecentArrange key={key} id={key} subtitle={timeAgo(lastStudied, now)} />
              ),
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-lao mb-4 text-xl font-bold text-stone-900 sm:text-2xl">{children}</h2>
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? t.greetMorning : hour < 18 ? t.greetAfternoon : t.greetEvening
}

/** Greeting, one big "what to do next" button, today's review, and two simple numbers. */
function Welcome({ isNew, progress }: { isNew: boolean; progress: Record<string, CourseProgress> }) {
  const known = useKnownWords()
  const allWords = LEVELS.flatMap((level) => levelWords(level))
  const knownCount = allWords.filter((w) => known.has(w)).length
  const lessonsDone = Object.values(progress).filter((p) => p.rounds > 0).length
  // First vocabulary lesson (lowest level first) that still has words to learn.
  const next = LEVELS.flatMap((level) => coursesById.get(`hsk${level}`)?.course.lessons ?? []).find((l) =>
    l.words.some((w) => !known.has(w)),
  )
  const nextLevel = next ? Number(next.courseId.replace('hsk', '')) : 1
  const reviewCount = Math.min(known.size, DAILY_REVIEW_SIZE)

  return (
    <section className="rounded-3xl bg-teal-50 p-6 sm:p-8">
      <p className="font-lao text-lg font-medium text-teal-800">{greeting()}</p>
      <h2 className="font-lao mt-1 text-3xl leading-snug font-bold text-stone-900 sm:text-4xl">{isNew ? t.welcomeTitle : t.heroLine}</h2>
      {isNew && <p className="font-lao mt-2 max-w-xl text-lg text-stone-600">{t.welcomeBody}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to={next ? `/vocabulary/${nextLevel}?lesson=${next.number}` : '/vocabulary/1'} className={`${primaryButton} min-h-14 text-lg`}>
          <Play aria-hidden className="size-5" />
          {isNew ? t.heroStart : `${t.nextUp}: HSK ${nextLevel} · ${t.lessonTitle(next?.number ?? 1)}`}
        </Link>
        {reviewCount > 0 && (
          <Link to="/vocabulary/review" className={`${secondaryButton} min-h-14 text-lg`}>
            <CalendarDays aria-hidden className="size-5" />
            {t.reviewToday} ({reviewCount})
          </Link>
        )}
      </div>

      {!isNew && (
        <dl className="mt-6 grid max-w-md grid-cols-2 gap-3">
          <Stat label={t.totalKnown} value={knownCount.toLocaleString()} total={allWords.length.toLocaleString()} />
          <Stat label={t.lessonsCompleted} value={String(lessonsDone)} />
        </dl>
      )}
    </section>
  )
}

function Stat({ label, value, total }: { label: string; value: string; total?: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <dt className="font-lao text-sm text-stone-600">{label}</dt>
      <dd className="mt-0.5 text-2xl font-bold text-stone-900 tabular-nums">
        {value}
        {total && <span className="text-base font-normal text-stone-500"> / {total}</span>}
      </dd>
    </div>
  )
}

/** The four activities as equal, large cards: icon, title, one-line description. */
export function ActivityBento({ heading = t.activitiesTitle }: { heading?: string }) {
  const tiles = [
    { to: '/vocabulary/1', title: t.navVocabulary, desc: t.flashcards, icon: Layers },
    { to: '/courses/translate', title: t.hskVocabulary, desc: t.hskVocabularyDesc, icon: Pencil },
    { to: '/courses/arrange/hsk', title: t.arrangeTitle, desc: t.arrangeDesc, icon: Puzzle },
    { to: '/courses/listen/hsk', title: t.listenTitle, desc: t.listenDesc, icon: Headphones },
  ]
  return (
    <section>
      <SectionHeading>{heading}</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className="group flex items-center gap-4 rounded-3xl border border-stone-200 bg-surface p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-800 transition group-hover:bg-primary group-hover:text-on-primary">
              <tile.icon aria-hidden className="size-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-lao block text-lg font-bold text-stone-900">{tile.title}</span>
              <span className="font-lao mt-0.5 line-clamp-2 block text-stone-600">{tile.desc}</span>
            </span>
            <ChevronRight aria-hidden className="size-6 shrink-0 text-stone-400 transition group-hover:translate-x-1 group-hover:text-teal-700" />
          </Link>
        ))}
      </div>
    </section>
  )
}

function ContinueCard({ icon, kind, title, detail, children }: { icon: ReactNode; kind: string; title: string; detail: string; children: ReactNode }) {
  return (
    <div className={`${card} flex flex-col`}>
      <p className="font-lao flex items-center gap-1.5 text-sm font-semibold text-teal-800">
        {icon} {kind}
      </p>
      <p className="font-lao mt-2 text-xl font-bold text-stone-900">{title}</p>
      <p className="font-lao text-stone-600">{detail}</p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function ContinueVocabulary({ last, now }: { last: NonNullable<VocabHistory['last']>; now: number }) {
  const known = useKnownWords()
  const words = levelWords(last.level, last.lesson)
  const knownCount = words.filter((w) => known.has(w)).length
  return (
    <ContinueCard
      icon={<BookOpen aria-hidden className="size-4" />}
      kind={t.continueVocabulary}
      title={`HSK ${last.level} · ${t.lessonTitle(last.lesson)}`}
      detail={`${t.knownInLesson(knownCount, words.length)} · ${timeAgo(last.time, now)}`}
    >
      <Link to={`/vocabulary/${last.level}/cards?lesson=${last.lesson}`} className={primaryButton}>
        <Layers aria-hidden className="size-5" /> {t.flashcards}
      </Link>
      <Link to={`/vocabulary/${last.level}?lesson=${last.lesson}`} className={secondaryButton}>
        {t.wordList}
      </Link>
    </ContinueCard>
  )
}

function ContinuePractice({ course: info, progress, subtitle }: { course: Course; progress: Record<string, CourseProgress>; subtitle: string }) {
  const course = useLoadedCourse(info)
  const lesson = currentLesson(course, progress)
  if (!lesson) return null
  const total = lesson.sentences.length
  const solved = Math.min(progress[lesson.id]?.solved ?? 0, total)
  return (
    <ContinueCard
      icon={<Pencil aria-hidden className="size-4" />}
      kind={t.continuePractice}
      title={`${course.title} · ${t.lessonTitle(lesson.number)}`}
      detail={`${t.progress(solved, total)} · ${subtitle}`}
    >
      <Link to={`/courses/${lesson.id}`} className={primaryButton}>
        <Play aria-hidden className="size-5" /> {t.continueAction}
      </Link>
    </ContinueCard>
  )
}

/** One row per HSK level with a progress bar of known words. */
function HskProgress() {
  const known = useKnownWords()
  return (
    <section className={card}>
      <SectionHeading>{t.hskOverview}</SectionHeading>
      <ul className="space-y-1">
        {LEVELS.map((level) => {
          const words = levelWords(level)
          const knownCount = words.filter((w) => known.has(w)).length
          return (
            <li key={level}>
              <Link to={`/vocabulary/${level}`} className="group -mx-2 flex items-center gap-4 rounded-2xl px-2 py-2.5 transition hover:bg-stone-100">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-100 text-lg font-bold text-teal-800">{level}</span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-stone-900">HSK {level}</span>
                    <span className="text-stone-600 tabular-nums">
                      {knownCount} / {words.length}
                    </span>
                  </span>
                  <ProgressBar ratio={knownCount / words.length} />
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-stone-400 group-hover:text-teal-700" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** A different word each day, picked from the lowest HSK level the learner hasn't fully learned. */
function WordOfDay() {
  const known = useKnownWords()
  const level = LEVELS.find((l) => levelWords(l).some((w) => !known.has(w))) ?? 1
  const words = useVocabulary(level)
  const today = dayKey()
  const seed = [...today].reduce((sum, c) => sum * 31 + c.charCodeAt(0), 7)
  const w = words[Math.abs(seed) % words.length]

  return (
    <section className={`${card} flex flex-col items-center justify-center text-center`}>
      <p className="font-lao flex items-center justify-center gap-1.5 font-semibold text-teal-800">
        <Sparkles aria-hidden className="size-5" /> {t.wordOfDay}
      </p>
      <span lang="zh-CN" className="font-zh mt-3 block text-7xl text-stone-900">
        {w.word}
      </span>
      <div className="mt-2 flex items-center justify-center gap-1">
        <span className="text-xl font-medium text-teal-800">{w.pinyin}</span>
        <SpeakButton text={w.word} />
      </div>
      <p lang="lo" className="font-lao text-xl font-semibold text-stone-900">
        {w.lao}
      </p>
      <p className="text-stone-600">{w.english}</p>
      {w.sentence && (
        <p className="font-lao mt-4 rounded-2xl bg-stone-100 p-3 text-stone-700">
          <span lang="zh-CN" className="font-zh block text-lg text-stone-900">
            {w.sentence.words.join('')}
          </span>
          {w.sentence.lao}
        </p>
      )}
      <span className="mt-3 inline-block rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-800">HSK {level}</span>
    </section>
  )
}

/** Card for a recently played word-order / listening round; goes straight into a new round. */
function RecentArrange({ id, subtitle }: { id: string; subtitle: string }) {
  const [setId, difficulty, activity] = id.split('/')
  const listen = activity === 'listen'
  const set = arrangeSetsById.get(setId)
  if (!set || !isDifficulty(difficulty)) return null
  const level = t.difficultyLevels(...levelsOf(difficulty))
  const Icon = listen ? Headphones : Puzzle
  return (
    <div className={`${card} flex flex-col`}>
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-800">
          <Icon aria-hidden className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-lao text-lg font-bold text-stone-900">{listen ? t.listenTitle : t.arrangeTitle}</p>
          <p className="font-lao text-stone-600">
            {level} · {subtitle}
          </p>
        </div>
        <button
          onClick={() => hideFromRecent(`arrange/${id}`)}
          aria-label={`${t.remove}: ${listen ? t.listenTitle : t.arrangeTitle} ${level}`}
          title={t.remove}
          className="grid size-10 place-items-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
      <Link to={`/courses/${listen ? 'listen' : 'arrange'}/${setId}/${difficulty}`} className={`${primaryButton} mt-4 self-start`}>
        <Play aria-hidden className="size-5" /> {t.playAgain}
      </Link>
    </div>
  )
}

/** Card for one recent course; loads that course's sentences to know which lesson to continue with. */
function RecentCourse({ course: info, progress, subtitle }: { course: Course; progress: Record<string, CourseProgress>; subtitle: string }) {
  const course = useLoadedCourse(info)
  const lesson = currentLesson(course, progress)
  if (!lesson) return null
  return (
    <CourseCard
      course={course}
      lesson={lesson}
      progress={progress[lesson.id]}
      subtitle={subtitle}
      onRemove={() => hideFromRecent(course.id)}
    />
  )
}
