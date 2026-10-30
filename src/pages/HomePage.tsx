import { Suspense, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CourseCard } from '../components/CourseCard.tsx'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { arrangeSetsById, isDifficulty, levelsOf } from '../data/arrange.ts'
import { categories, coursesById, currentLesson, useLoadedCourse, type Course } from '../data/courses.ts'
import { LEVELS, useVocabulary } from '../data/vocabulary.ts'
import { t } from '../i18n/lo.ts'
import { dayKey, useVocabHistory, type VocabHistory } from '../lib/activity.ts'
import { DAILY_REVIEW_SIZE, useKnownWords } from '../lib/known.ts'
import { hideFromRecent, useArrangeRecent, useHiddenFromRecent, useProgress, type CourseProgress } from '../lib/progress.ts'
import { timeAgo } from '../lib/time.ts'

const card = 'rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-stone-200 sm:p-5'

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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
      {isNew ? <Welcome /> : <ProgressSummary progress={progress} />}

      {!isNew && (
        <section>
          <h2 className="font-lao mb-3 text-xl font-bold text-stone-900">{t.continueTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {history.last && <ContinueVocabulary last={history.last} now={now} />}
            {recent[0] && (
              <Suspense fallback={<div className={`${card} h-36 animate-pulse`} />}>
                <ContinuePractice course={recent[0].course} progress={progress} subtitle={timeAgo(recent[0].lastStudied, now)} />
              </Suspense>
            )}
          </div>
        </section>
      )}

      <QuickReview />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <HskOverview />
        <Suspense fallback={<div className={`${card} h-64 animate-pulse`} />}>
          <WordOfDay />
        </Suspense>
      </div>

      {recentAll.length > 0 && (
        <section>
          <h2 className="font-lao mb-3 text-xl font-bold text-stone-900">{t.recentTitle}</h2>
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

/** First visit: what the app is and where to start. */
function Welcome() {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 px-6 py-10 text-center text-white sm:px-10">
      <p lang="zh-CN" className="font-zh text-5xl">
        你好！
      </p>
      <h2 className="font-lao mt-3 text-2xl font-bold">{t.welcomeTitle}</h2>
      <p className="font-lao mx-auto mt-2 max-w-md text-teal-100">{t.welcomeBody}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/vocabulary/1" className="font-lao rounded-full bg-surface px-6 py-2.5 font-semibold text-teal-800 transition hover:bg-teal-50">
          📖 {t.startVocabulary}
        </Link>
        <Link to="/courses/hsk1/1" className="font-lao rounded-full px-6 py-2.5 font-semibold text-white ring-1 ring-white/60 transition hover:bg-surface/10">
          ✏️ {t.startPractice}
        </Link>
      </div>
    </section>
  )
}

/** Overall progress: known words, finished practice lessons, and the next lesson worth studying. */
function ProgressSummary({ progress }: { progress: Record<string, CourseProgress> }) {
  const known = useKnownWords()
  const allWords = LEVELS.flatMap((level) => levelWords(level))
  const knownCount = allWords.filter((w) => known.has(w)).length
  const lessonsDone = Object.values(progress).filter((p) => p.rounds > 0).length
  // First vocabulary lesson (lowest level first) that still has words to learn.
  const next = LEVELS.flatMap((level) => coursesById.get(`hsk${level}`)?.course.lessons ?? []).find((l) =>
    l.words.some((w) => !known.has(w)),
  )
  const nextLevel = next && Number(next.courseId.replace('hsk', ''))

  return (
    <section className={`${card} grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-stone-100`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">📖</span>
        <div>
          <p className="font-lao text-sm text-stone-500">{t.totalKnown}</p>
          <p className="text-xl font-bold text-stone-900 tabular-nums">
            {knownCount.toLocaleString()} <span className="text-base font-normal text-stone-400">/ {allWords.length.toLocaleString()}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:pl-4">
        <span className="text-3xl">✏️</span>
        <div>
          <p className="font-lao text-sm text-stone-500">{t.lessonsCompleted}</p>
          <p className="text-xl font-bold text-stone-900 tabular-nums">{lessonsDone}</p>
        </div>
      </div>
      {next && (
        <Link to={`/vocabulary/${nextLevel}?lesson=${next.number}`} className="group flex items-center gap-3 rounded-xl sm:pl-4">
          <span className="text-3xl">🎯</span>
          <div>
            <p className="font-lao text-sm text-stone-500">{t.nextUp}</p>
            <p className="font-lao text-lg font-bold text-teal-700 group-hover:underline">
              HSK {nextLevel} · {t.lessonTitle(next.number)} →
            </p>
          </div>
        </Link>
      )}
    </section>
  )
}

function ContinueCard({ icon, kind, title, detail, children }: { icon: string; kind: string; title: string; detail: string; children: ReactNode }) {
  return (
    <div className={`${card} flex flex-col`}>
      <p className="font-lao text-sm font-medium text-teal-700">
        {icon} {kind}
      </p>
      <p className="font-lao mt-1 text-lg font-bold text-stone-900">{title}</p>
      <p className="font-lao text-sm text-stone-500">{detail}</p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

const primaryButton = 'font-lao rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800'
const secondaryButton = 'font-lao rounded-full px-5 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100'

function ContinueVocabulary({ last, now }: { last: NonNullable<VocabHistory['last']>; now: number }) {
  const known = useKnownWords()
  const words = levelWords(last.level, last.lesson)
  const knownCount = words.filter((w) => known.has(w)).length
  return (
    <ContinueCard
      icon="📖"
      kind={t.continueVocabulary}
      title={`HSK ${last.level} · ${t.lessonTitle(last.lesson)}`}
      detail={`${t.knownInLesson(knownCount, words.length)} · ${timeAgo(last.time, now)}`}
    >
      <Link to={`/vocabulary/${last.level}/cards?lesson=${last.lesson}`} className={primaryButton}>
        🃏 {t.flashcards}
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
      icon="✏️"
      kind={t.continuePractice}
      title={`${course.title} · ${t.lessonTitle(lesson.number)}`}
      detail={`${t.progress(solved, total)} · ${subtitle}`}
    >
      <Link to={`/courses/${lesson.id}`} className={primaryButton}>
        ▶ {t.continueAction}
      </Link>
    </ContinueCard>
  )
}

/** Today's review: 30 random known words (fewer if fewer are known), the same set all day. */
function QuickReview() {
  const known = useKnownWords()
  if (known.size === 0) return null
  const count = Math.min(known.size, DAILY_REVIEW_SIZE)

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:p-5">
      <div>
        <p className="font-lao font-bold text-amber-900">📅 {t.reviewToday}</p>
        <p className="font-lao text-sm text-amber-800">{t.reviewTodayBody(count)}</p>
      </div>
      <Link to="/vocabulary/review" className="font-lao rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600">
        {t.reviewNow}
      </Link>
    </section>
  )
}

/** One tile per HSK level with how many of its words are known. */
function HskOverview() {
  const known = useKnownWords()
  return (
    <section className={card}>
      <h2 className="font-lao mb-3 text-lg font-bold text-stone-900">{t.hskOverview}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LEVELS.map((level) => {
          const words = levelWords(level)
          const knownCount = words.filter((w) => known.has(w)).length
          return (
            <Link key={level} to={`/vocabulary/${level}`} className="rounded-xl p-3 ring-1 ring-stone-200 transition hover:bg-teal-50 hover:ring-teal-300">
              <p className="font-bold text-stone-900">HSK {level}</p>
              <p className="text-sm text-stone-500 tabular-nums">
                {knownCount} / {words.length}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(knownCount / words.length) * 100}%` }} />
              </div>
            </Link>
          )
        })}
      </div>
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
    <section className={`${card} flex flex-col items-center text-center`}>
      <p className="font-lao self-start text-lg font-bold text-stone-900">✨ {t.wordOfDay}</p>
      <span lang="zh-CN" className="font-zh mt-2 text-6xl text-stone-900">
        {w.word}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-xl font-medium text-teal-800">{w.pinyin}</span>
        <SpeakButton text={w.word} />
      </div>
      <p lang="lo" className="font-lao text-lg font-semibold text-stone-800">
        {w.lao}
      </p>
      <p className="text-sm text-stone-500">{w.english}</p>
      {w.sentence && (
        <p className="font-lao mt-2 border-t border-stone-100 pt-2 text-sm text-stone-600">
          <span lang="zh-CN" className="font-zh block text-base text-stone-900">
            {w.sentence.words.join('')}
          </span>
          {w.sentence.lao}
        </p>
      )}
      <span className="mt-2 text-xs text-stone-400">HSK {level}</span>
    </section>
  )
}

/** Card for a recently played word-order round; goes straight into a new round. */
function RecentArrange({ id, subtitle }: { id: string; subtitle: string }) {
  const [setId, difficulty, activity] = id.split('/')
  const listen = activity === 'listen'
  const set = arrangeSetsById.get(setId)
  if (!set || !isDifficulty(difficulty)) return null
  const level = t.difficultyLevels(...levelsOf(difficulty))
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-teal-300">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={set.cover} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute bottom-2 left-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-lg font-bold text-white backdrop-blur-sm">{listen ? '🎧' : '🧩'} {level}</span>
        <button
          onClick={() => hideFromRecent(`arrange/${id}`)}
          aria-label={`${t.remove}: ${listen ? t.listenTitle : t.arrangeTitle} ${level}`}
          title={t.remove}
          className="absolute top-2 right-2 rounded-lg bg-surface/90 p-1.5 text-stone-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-lao font-bold text-stone-900">{listen ? t.listenTitle : t.arrangeTitle}</p>
        <p className="font-lao text-sm text-stone-500">{subtitle}</p>
        <Link to={`/courses/${listen ? 'listen' : 'arrange'}/${setId}/${difficulty}`} className={`${primaryButton} mt-3 self-start`}>
          ▶ {t.playAgain}
        </Link>
      </div>
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
