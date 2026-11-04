import { Suspense } from 'react'
import { ArrowLeft, BookOpen, House, Moon, Music, Pencil, Sun } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { coursesById } from '../data/courses.ts'
import { arrangeSetsById, levelsOf, type Difficulty } from '../data/arrange.ts'
import { t } from '../i18n/lo.ts'
import { useSoundEffects, useVoice } from '../lib/settings.ts'
import { useDarkMode } from '../lib/theme.ts'
import { Logo } from './Logo.tsx'

const navItems = [
  { to: '/', label: t.navHome, icon: House },
  { to: '/vocabulary', label: t.navVocabulary, icon: BookOpen },
  { to: '/courses', label: t.navCourses, icon: Pencil },
]

/** Active-route match; the vocabulary item shouldn't light up on the review page. */
function isActive(to: string, pathname: string) {
  if (to === '/') return pathname === '/'
  if (to === '/vocabulary') return pathname.startsWith('/vocabulary') && pathname !== '/vocabulary/review'
  return pathname.startsWith(to)
}

/** Header title, plus where the ← back arrow leads (inner pages only). */
function pageInfo(pathname: string, search: string): { title: string; back?: string } {
  if (pathname === '/') return { title: t.navHome }
  if (pathname === '/vocabulary/review') return { title: t.quickReview, back: '/' }
  const [, level, cards] = /^\/vocabulary\/(\d+)(?:\/(cards|quiz))?/.exec(pathname) ?? []
  if (level) {
    const title = `${t.navVocabulary} · HSK ${level}`
    // Back from flashcards / quiz returns to the same lesson page of the word list.
    const lesson = Number(new URLSearchParams(search).get('lesson'))
    const back = `/vocabulary/${level}${lesson > 1 ? `?lesson=${lesson}` : ''}`
    return cards ? { title: `${title} · ${cards === 'quiz' ? t.quiz : t.flashcards}`, back } : { title }
  }
  const [, activity, setId, difficulty] = /^\/courses\/(arrange|listen)\/([^/]+)(?:\/(easy|medium|hard))?/.exec(pathname) ?? []
  if (setId) {
    const title = `${activity === 'listen' ? t.listenTitle : t.arrangeTitle} ${arrangeSetsById.get(setId)?.title ?? ''}`
    return difficulty
      ? { title: `${title} · ${t.difficultyLevels(...levelsOf(difficulty as Difficulty))}`, back: `/courses/${activity}/${setId}` }
      : { title, back: '/courses' }
  }
  if (pathname === '/courses/translate') return { title: t.hskVocabulary, back: '/courses' }
  const [, courseId, lesson] = /^\/courses\/([^/]+)(?:\/([^/]+))?/.exec(pathname) ?? []
  if (!courseId) return { title: t.allCourses }
  const course = coursesById.get(courseId)?.course.title ?? t.navCourses
  if (lesson) return { title: `${course} · ${t.lessonTitle(Number(lesson))}`, back: `/courses/${courseId}` }
  return { title: course, back: '/courses/translate' }
}

const toggle =
  'grid size-11 place-items-center rounded-full text-stone-500 transition hover:bg-surface hover:text-stone-900 aria-pressed:bg-surface aria-pressed:text-teal-800 aria-pressed:shadow-sm'

/** Top bar (nav on desktop), a back + title bar on inner pages, and a bottom tab bar on phones. */
export function Layout() {
  const location = useLocation()
  const page = pageInfo(location.pathname, location.search)
  const [sfx, toggleSfx] = useSoundEffects()
  const [voice, toggleVoice] = useVoice()
  const [dark, toggleDark] = useDarkMode()

  return (
    <div className="flex h-svh flex-col bg-paper">
      {/* Top bar and the inner-page title bar share one shadow. */}
      <header className="relative z-20 shrink-0 bg-surface shadow-[0_2px_4px_0_rgb(9_25_17/0.06),0_6px_20px_-4px_rgb(9_25_17/0.14)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-wide text-stone-900">{t.appTitle}</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = isActive(item.to, location.pathname)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`font-lao flex h-11 items-center gap-2 rounded-full px-4 font-semibold transition ${
                    active ? 'bg-primary text-on-primary shadow-sm' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <item.icon aria-hidden className="size-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-0.5 rounded-full bg-stone-100 p-1">
            <button onClick={toggleSfx} aria-pressed={sfx} aria-label={t.soundEffects} title={t.soundEffects} className={toggle}>
              <Music aria-hidden className="size-5" />
            </button>
            <button onClick={toggleVoice} aria-pressed={voice} aria-label={t.voice} title={t.voice} className={toggle}>
              {/* speaking head; crossed out when off */}
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 21v-3a4 4 0 0 0 4-4V9A7 7 0 0 0 4 9c0 3 1 4 2 5v7" />
                <path d="M20 6a6 6 0 0 1 2 4M18 9a3 3 0 0 1 1 2" />
                {!voice && <path d="m2 2 20 20" />}
              </svg>
            </button>
            <button onClick={toggleDark} aria-label={t.darkMode} title={t.darkMode} className={toggle}>
              {dark ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
            </button>
          </div>
        </div>

        {page.back && (
          <div className="border-t border-stone-100">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">
              <Link
                to={page.back}
                aria-label={t.back}
                title={t.back}
                className="-ml-2 grid size-11 place-items-center rounded-full text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
              >
                <ArrowLeft aria-hidden className="size-6" />
              </Link>
              <h1 className="font-lao truncate text-lg font-semibold text-stone-900">{page.title}</h1>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Shown while a course's sentences load for the first time (see useLoadedCourse). */}
        <Suspense
          fallback={
            <div role="status" aria-label={t.loading} className="flex h-full min-h-60 items-center justify-center">
              <span className="size-10 animate-spin rounded-full border-4 border-teal-100 border-t-primary" />
            </div>
          }
        >
          <div key={location.pathname} className="page-enter h-full">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 bg-surface shadow-[0_-2px_4px_0_rgb(9_25_17/0.05),0_-6px_20px_-4px_rgb(9_25_17/0.14)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.to, location.pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`font-lao flex flex-col items-center gap-1 py-1 text-sm font-semibold transition ${active ? 'text-teal-800' : 'text-stone-500'}`}
            >
              <span className={`grid h-8 w-16 place-items-center rounded-full transition ${active ? 'bg-teal-100' : ''}`}>
                <item.icon aria-hidden className="size-6" />
              </span>
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
