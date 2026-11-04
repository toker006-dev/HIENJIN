import { Suspense } from 'react'
import { ArrowLeft, BookOpen, House, Moon, Music, Pencil, Sun } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { coursesById } from '../data/courses.ts'
import { arrangeSetsById, levelsOf, type Difficulty } from '../data/arrange.ts'
import { t } from '../i18n/lo.ts'
import { useSoundEffects, useVoice } from '../lib/settings.ts'
import { useDarkMode } from '../lib/theme.ts'
import { Mascot } from './Mascot.tsx'
import { Seal } from './Seal.tsx'

const navItems = [
  { to: '/', label: t.navHome, icon: House },
  { to: '/courses', label: t.navCourses, icon: Pencil },
  { to: '/vocabulary', label: t.navVocabulary, icon: BookOpen },
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
  'rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 aria-pressed:bg-teal-700 aria-pressed:text-white hover:rotate-12'

/** Top bar (nav tabs on desktop), a slim back/title strip on inner pages, and a bottom tab bar on phones. */
export function Layout() {
  const location = useLocation()
  const page = pageInfo(location.pathname, location.search)
  const [sfx, toggleSfx] = useSoundEffects()
  const [voice, toggleVoice] = useVoice()
  const [dark, toggleDark] = useDarkMode()

  return (
    <div className="flex h-svh flex-col bg-paper">
      <header className="z-20 shrink-0 border-b-2 border-stone-900 bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="transition group-hover:-rotate-12">
              <Seal className="size-9 text-xl" />
            </span>
            <span className="text-lg font-black tracking-[0.2em] text-stone-900">{t.appTitle}</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = isActive(item.to, location.pathname)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`font-lao relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? 'bg-stone-900 text-surface' : 'text-stone-600 hover:-translate-y-0.5 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <item.icon aria-hidden className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggleSfx} aria-pressed={sfx} aria-label={t.soundEffects} title={t.soundEffects} className={toggle}>
              <Music aria-hidden className="size-5" />
            </button>
            <button onClick={toggleVoice} aria-pressed={voice} aria-label={t.voice} title={t.voice} className={toggle}>
              {/* speaking head; crossed out when off */}
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      </header>

      {page.back && (
        <div className="shrink-0 border-b border-stone-200 bg-surface/60">
          <div className="mx-auto flex h-11 max-w-6xl items-center gap-2 px-4 sm:px-6">
            <Link
              to={page.back}
              aria-label={t.back}
              title={t.back}
              className="group -ml-2 rounded-full p-1.5 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
            >
              <ArrowLeft aria-hidden className="size-5 transition group-hover:-translate-x-1" />
            </Link>
            <h1 className="font-lao truncate font-semibold text-stone-900">{page.title}</h1>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Shown while a course's sentences load for the first time (see useLoadedCourse). */}
        <Suspense
          fallback={
            <div role="status" aria-label={t.loading} className="flex h-full min-h-60 items-center justify-center">
              <Mascot className="size-20" />
            </div>
          }
        >
          <div key={location.pathname} className="page-enter min-h-full">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 rounded-2xl border-2 border-stone-900 bg-surface p-1 shadow-[0_4px_0_0_var(--color-stone-900)] md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.to, location.pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`font-lao flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                active ? 'bg-teal-700 text-white' : 'text-stone-500'
              }`}
            >
              <item.icon aria-hidden className={`size-5 ${active ? 'animate-hop' : ''}`} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
