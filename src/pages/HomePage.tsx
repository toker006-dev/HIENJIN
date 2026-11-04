import { Suspense, useState, type ReactNode } from 'react'
import { BookOpen, CalendarDays, Headphones, Layers, Pencil, Play, Puzzle, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { CourseCard } from '../components/CourseCard.tsx'
import { Mascot } from '../components/Mascot.tsx'
import { Seal } from '../components/Seal.tsx'
import { SpeakButton } from '../components/SpeakButton.tsx'
import { arrangeSetsById, isDifficulty, levelsOf } from '../data/arrange.ts'
import { categories, coursesById, currentLesson, useLoadedCourse, type Course } from '../data/courses.ts'
import { LEVELS, useVocabulary } from '../data/vocabulary.ts'
import { t } from '../i18n/lo.ts'
import { dayKey, useVocabHistory, type VocabHistory } from '../lib/activity.ts'
import { DAILY_REVIEW_SIZE, useKnownWords } from '../lib/known.ts'
import { hideFromRecent, useArrangeRecent, useHiddenFromRecent, useProgress, type CourseProgress } from '../lib/progress.ts'
import { timeAgo } from '../lib/time.ts'

/** Chunky "sticker" card: ink outline with a solid offset shadow. */
export const card = 'rounded-3xl border-2 border-stone-900 bg-surface p-5 shadow-[0_5px_0_0_var(--color-stone-900)] sm:p-6'

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
    ...recentArrange.map((entry) => ({
      ...entry,
      category: undefined,
      course: undefined,
    })),
  ].sort((a, b) => b.lastStudied - a.lastStudied)

  const isNew = !history.last && recentAll.length === 0

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-6 sm:py-8">
      <Hero isNew={isNew} progress={progress} />

      {!isNew && (history.last || recent[0]) && (
        <section>
          <SectionHeading>{t.continueTitle}</SectionHeading>
          <div className="grid gap-5 sm:grid-cols-2">
            {history.last && <ContinueVocabulary last={history.last} now={now} />}
            {recent[0] && (
              <Suspense fallback={<div className={`${card} h-36 animate-pulse`} />}>
                <ContinuePractice course={recent[0].course} progress={progress} subtitle={timeAgo(recent[0].lastStudied, now)} />
              </Suspense>
            )}
          </div>
        </section>
      )}

      <ActivityBento />

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_19rem]">
        <HskPath />
        <Suspense fallback={<div className={`${card} h-80 animate-pulse`} />}>
          <WordOfDay />
        </Suspense>
      </div>

      {recentAll.length > 0 && (
        <section>
          <SectionHeading>{t.recentTitle}</SectionHeading>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-lao mb-4 flex items-center gap-3 text-xl font-bold text-stone-900">
      <span aria-hidden className="size-3 rotate-45 border-2 border-stone-900 bg-teal-700" />
      {children}
    </h2>
  )
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? t.greetMorning : hour < 18 ? t.greetAfternoon : t.greetEvening
}

/** Big cinnabar banner: Bao greets the learner, one main button, and stats as chips. Hanzi drift in the background. */
function Hero({ isNew, progress }: { isNew: boolean; progress: Record<string, CourseProgress> }) {
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
  const [mood, setMood] = useState<'idle' | 'happy'>('idle')

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-stone-900 bg-teal-700 text-white shadow-[0_6px_0_0_var(--color-stone-900)]">
      <div aria-hidden lang="zh-CN" className="font-zh pointer-events-none absolute inset-0 text-white/10 select-none">
        <span className="animate-float absolute -top-6 right-[6%] text-[9rem] leading-none">学</span>
        <span className="animate-float absolute bottom-[-2.5rem] left-[42%] text-[7rem] leading-none [animation-delay:-2s]">中</span>
        <span className="animate-float absolute top-[25%] left-[-1rem] text-[5rem] leading-none [animation-delay:-4s]">文</span>
      </div>

      <div className="relative grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:gap-10">
        {/* Tap Bao to make it jump. */}
        <button
          onClick={() => setMood((m) => (m === 'happy' ? 'idle' : 'happy'))}
          aria-label={t.mascotName}
          className="relative mx-auto w-fit cursor-pointer"
        >
          <Mascot key={mood} mood={mood} className="size-32 sm:size-40" />
          <span
            lang="zh-CN"
            className="font-zh animate-pop absolute -top-8 left-20 rounded-2xl rounded-bl-none border-2 border-stone-900 bg-surface px-3 py-1 text-xl font-bold text-stone-900 [animation-delay:400ms]"
          >
            你好!
          </span>
        </button>

        <div className="text-center md:text-left">
          <p className="font-lao text-sm font-semibold tracking-wide text-teal-100">{greeting()}</p>
          <h2 className="font-lao-display mt-1 text-3xl leading-snug font-bold sm:text-4xl">{isNew ? t.welcomeTitle : t.heroLine}</h2>
          {isNew && <p className="font-lao mt-2 max-w-lg text-teal-100">{t.welcomeBody}</p>}

          <div className="mt-5 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              to={next ? `/vocabulary/${nextLevel}?lesson=${next.number}` : '/vocabulary/1'}
              className="font-lao inline-flex items-center gap-2 rounded-full border-2 border-stone-900 bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-[0_4px_0_0_var(--color-stone-900)] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
            >
              <Play aria-hidden className="size-5" />
              {isNew ? t.heroStart : `${t.nextUp}: HSK ${nextLevel} · ${t.lessonTitle(next?.number ?? 1)}`}
            </Link>
            {reviewCount > 0 && (
              <Link
                to="/vocabulary/review"
                className="font-lao inline-flex items-center gap-2 rounded-full border-2 border-white/70 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                <CalendarDays aria-hidden className="size-5" />
                {t.reviewToday} · {reviewCount}
              </Link>
            )}
          </div>

          {!isNew && (
            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              <StatChip
                icon={<BookOpen aria-hidden className="size-4" />}
                label={t.totalKnown}
                value={`${knownCount.toLocaleString()} / ${allWords.length.toLocaleString()}`}
              />
              <StatChip icon={<Pencil aria-hidden className="size-4" />} label={t.lessonsCompleted} value={String(lessonsDone)} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function StatChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="font-lao inline-flex items-center gap-2 rounded-full bg-stone-900/25 px-3 py-1.5 text-sm">
      {icon}
      <span className="text-teal-100">{label}</span>
      <b className="tabular-nums">{value}</b>
    </span>
  )
}

/** Bento grid of activities: flat colour blocks with a huge hanzi watermark that turns on hover. */
export function ActivityBento({ heading = t.activitiesTitle }: { heading?: string }) {
  const tiles = [
    {
      to: '/courses/translate',
      title: t.hskVocabulary,
      desc: t.hskVocabularyDesc,
      char: '译',
      icon: Pencil,
      colour: 'bg-stone-900 text-surface',
      span: 'sm:col-span-2 sm:row-span-2',
    },
    {
      to: '/vocabulary/1',
      title: t.navVocabulary,
      desc: t.flashcards,
      char: '词',
      icon: Layers,
      colour: 'bg-amber-300 text-stone-900',
      span: '',
    },
    {
      to: '/courses/arrange/hsk',
      title: t.arrangeTitle,
      desc: t.arrangeDesc,
      char: '排',
      icon: Puzzle,
      colour: 'bg-emerald-600 text-white',
      span: '',
    },
    {
      to: '/courses/listen/hsk',
      title: t.listenTitle,
      desc: t.listenDesc,
      char: '听',
      icon: Headphones,
      colour: 'bg-sky-700 text-white',
      span: 'sm:col-span-2',
    },
  ]
  return (
    <section>
      <SectionHeading>{heading}</SectionHeading>
      <div className="grid auto-rows-[minmax(10rem,auto)] gap-5 sm:grid-cols-4">
        {tiles.map((tile, i) => (
          <Link
            key={tile.to}
            to={tile.to}
            style={{ animationDelay: `${i * 80}ms` }}
            className={`animate-rise group relative flex flex-col overflow-hidden rounded-3xl border-2 border-stone-900 p-5 shadow-[0_5px_0_0_var(--color-stone-900)] transition hover:-translate-y-1 hover:-rotate-1 active:translate-y-1 active:shadow-none ${tile.colour} ${tile.span}`}
          >
            <span
              aria-hidden
              lang="zh-CN"
              className="font-zh pointer-events-none absolute -right-3 -bottom-8 text-[9rem] leading-none font-bold opacity-15 transition duration-500 group-hover:scale-110 group-hover:-rotate-12"
            >
              {tile.char}
            </span>
            <span className="grid size-12 place-items-center rounded-2xl border-2 border-current transition group-hover:rotate-12">
              <tile.icon aria-hidden className="size-6" />
            </span>
            {tile.char === '译' && <TypingCells />}
            <p className="font-lao mt-auto pt-6 text-xl font-bold">{tile.title}</p>
            <p className="font-lao mt-1 line-clamp-2 max-w-md text-sm opacity-80">{tile.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Decoration for the translate tile: 田字格 cells whose characters appear one by one, on a loop. */
function TypingCells() {
  return (
    <span aria-hidden lang="zh-CN" className="mt-6 hidden gap-2 sm:flex">
      {[...'我爱中文'].map((char, i) => (
        <span key={i} className="tianzige grid size-16 place-items-center border-teal-400 bg-transparent">
          <span className="font-zh animate-type relative z-10 text-4xl" style={{ animationDelay: `${i * 0.6}s` }}>
            {char}
          </span>
        </span>
      ))}
    </span>
  )
}

function ContinueCard({
  icon,
  kind,
  title,
  detail,
  children,
}: {
  icon: ReactNode
  kind: string
  title: string
  detail: string
  children: ReactNode
}) {
  return (
    <div className={`${card} flex flex-col`}>
      <p className="font-lao inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
        {icon} {kind}
      </p>
      <p className="font-lao mt-3 text-xl font-bold text-stone-900">{title}</p>
      <p className="font-lao text-sm text-stone-500">{detail}</p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

const primaryButton =
  'font-lao inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-[0_3px_0_0_var(--color-stone-900)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none'
const secondaryButton =
  'font-lao rounded-full border-2 border-stone-900 px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100'

function ContinueVocabulary({ last, now }: { last: NonNullable<VocabHistory['last']>; now: number }) {
  const known = useKnownWords()
  const words = levelWords(last.level, last.lesson)
  const knownCount = words.filter((w) => known.has(w)).length
  return (
    <ContinueCard
      icon={<BookOpen aria-hidden className="size-3.5" />}
      kind={t.continueVocabulary}
      title={`HSK ${last.level} · ${t.lessonTitle(last.lesson)}`}
      detail={`${t.knownInLesson(knownCount, words.length)} · ${timeAgo(last.time, now)}`}
    >
      <Link to={`/vocabulary/${last.level}/cards?lesson=${last.lesson}`} className={primaryButton}>
        <Layers aria-hidden className="size-4" /> {t.flashcards}
      </Link>
      <Link to={`/vocabulary/${last.level}?lesson=${last.lesson}`} className={secondaryButton}>
        {t.wordList}
      </Link>
    </ContinueCard>
  )
}

function ContinuePractice({
  course: info,
  progress,
  subtitle,
}: {
  course: Course
  progress: Record<string, CourseProgress>
  subtitle: string
}) {
  const course = useLoadedCourse(info)
  const lesson = currentLesson(course, progress)
  if (!lesson) return null
  const total = lesson.sentences.length
  const solved = Math.min(progress[lesson.id]?.solved ?? 0, total)
  return (
    <ContinueCard
      icon={<Pencil aria-hidden className="size-3.5" />}
      kind={t.continuePractice}
      title={`${course.title} · ${t.lessonTitle(lesson.number)}`}
      detail={`${t.progress(solved, total)} · ${subtitle}`}
    >
      <Link to={`/courses/${lesson.id}`} className={primaryButton}>
        <Play aria-hidden className="size-4" /> {t.continueAction}
      </Link>
    </ContinueCard>
  )
}

/** HSK 1–6 as stepping stones on a winding dashed path; each stone is a progress ring. */
function HskPath() {
  const known = useKnownWords()
  return (
    <section className={card}>
      <SectionHeading>{t.hskPathTitle}</SectionHeading>
      <ol className="relative grid grid-cols-3 gap-y-8 pt-2 pb-10 sm:grid-cols-6 sm:gap-y-0">
        <svg
          aria-hidden
          viewBox="0 0 600 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-[8%] top-8 hidden h-24 w-[84%] sm:block"
        >
          <path
            d="M0 10 C 50 10, 50 70, 100 70 S 150 10, 200 10 S 250 70, 300 70 S 350 10, 400 10 S 450 70, 500 70 S 550 10, 600 10"
            fill="none"
            strokeWidth="3"
            strokeDasharray="1 10"
            strokeLinecap="round"
            className="stroke-stone-400"
          />
        </svg>
        {LEVELS.map((level, i) => {
          const words = levelWords(level)
          const knownCount = words.filter((w) => known.has(w)).length
          const ratio = knownCount / words.length
          return (
            <li key={level} className={`relative flex justify-center ${i % 2 ? 'sm:translate-y-12' : ''}`}>
              <Link
                to={`/vocabulary/${level}`}
                style={{ animationDelay: `${i * 90}ms` }}
                className="animate-pop group flex flex-col items-center gap-1"
              >
                <span className="relative grid size-20 place-items-center transition duration-300 group-hover:-translate-y-2 group-hover:rotate-6">
                  <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
                    <circle cx="20" cy="20" r="17" strokeWidth="5" className="fill-surface stroke-stone-200" />
                    {ratio > 0 && (
                      <circle
                        cx="20"
                        cy="20"
                        r="17"
                        fill="none"
                        strokeWidth="5"
                        strokeLinecap="round"
                        pathLength={100}
                        strokeDasharray={`${ratio * 100} 100`}
                        className="stroke-emerald-500"
                      />
                    )}
                    <circle cx="20" cy="20" r="19.5" fill="none" strokeWidth="1" className="stroke-stone-900" />
                  </svg>
                  <span className="relative text-center leading-none">
                    <span className="block text-[10px] font-bold text-stone-500">HSK</span>
                    <span className="block text-2xl font-black text-stone-900">{level}</span>
                  </span>
                  {ratio === 1 && (
                    <span className="absolute -top-1 -right-2">
                      <Seal char="满" className="size-7 text-sm" />
                    </span>
                  )}
                </span>
                <span className="text-xs font-medium text-stone-500 tabular-nums">
                  {knownCount}/{words.length}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** A different word each day as a hanging scroll that unrolls; from the lowest HSK level not fully learned. */
function WordOfDay() {
  const known = useKnownWords()
  const level = LEVELS.find((l) => levelWords(l).some((w) => !known.has(w))) ?? 1
  const words = useVocabulary(level)
  const today = dayKey()
  const seed = [...today].reduce((sum, c) => sum * 31 + c.charCodeAt(0), 7)
  const w = words[Math.abs(seed) % words.length]
  const rod = 'relative z-10 -mx-3 h-4 rounded-full border-2 border-stone-900 bg-amber-600'

  return (
    <section aria-label={t.wordOfDay} className="mx-auto w-full max-w-xs px-3 lg:sticky lg:top-4">
      {/* hanging string */}
      <svg aria-hidden viewBox="0 0 60 20" className="mx-auto block h-5 w-16">
        <path d="M2 20 L30 2 L58 20" fill="none" strokeWidth="2" className="stroke-stone-900" />
      </svg>
      <div className={rod} />
      <div className="animate-unroll border-x-2 border-stone-900 bg-surface px-5 pt-5 pb-6 text-center [animation-delay:250ms]">
        <p className="font-lao text-xs font-bold tracking-widest text-teal-700">
          <Sparkles aria-hidden className="inline size-4 align-[-0.2em]" /> {t.wordOfDay}
        </p>
        <span lang="zh-CN" className="font-zh mt-3 block text-7xl font-semibold text-stone-900">
          {w.word}
        </span>
        <div className="mt-1 flex items-center justify-center gap-1">
          <span className="text-xl font-medium text-teal-800">{w.pinyin}</span>
          <SpeakButton text={w.word} />
        </div>
        <p lang="lo" className="font-lao text-lg font-semibold text-stone-800">
          {w.lao}
        </p>
        <p className="text-sm text-stone-500">{w.english}</p>
        {w.sentence && (
          <p className="font-lao mt-3 border-t border-dashed border-stone-300 pt-3 text-sm text-stone-600">
            <span lang="zh-CN" className="font-zh block text-base text-stone-900">
              {w.sentence.words.join('')}
            </span>
            {w.sentence.lao}
          </p>
        )}
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-stone-500">
          <Seal char={String(level)} className="size-6 text-xs" /> HSK {level}
        </span>
      </div>
      <div className={rod} />
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
  const Icon = listen ? Headphones : Puzzle
  return (
    <div className={`${card} group relative flex flex-col`}>
      <div className="flex items-start gap-3">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-stone-900 text-white ${listen ? 'bg-sky-700' : 'bg-emerald-600'}`}
        >
          <Icon aria-hidden className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-lao font-bold text-stone-900">{listen ? t.listenTitle : t.arrangeTitle}</p>
          <p className="font-lao text-sm text-stone-500">
            {level} · {subtitle}
          </p>
        </div>
        <button
          onClick={() => hideFromRecent(`arrange/${id}`)}
          aria-label={`${t.remove}: ${listen ? t.listenTitle : t.arrangeTitle} ${level}`}
          title={t.remove}
          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
      <Link to={`/courses/${listen ? 'listen' : 'arrange'}/${setId}/${difficulty}`} className={`${primaryButton} mt-4 self-start`}>
        <Play aria-hidden className="size-4" /> {t.playAgain}
      </Link>
    </div>
  )
}

/** Card for one recent course; loads that course's sentences to know which lesson to continue with. */
function RecentCourse({
  course: info,
  progress,
  subtitle,
}: {
  course: Course
  progress: Record<string, CourseProgress>
  subtitle: string
}) {
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
