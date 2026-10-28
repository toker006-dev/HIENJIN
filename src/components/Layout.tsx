import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { coursesById } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import { useSoundEffects, useVoice } from '../lib/settings.ts'

const toggleButton =
  'rounded-full p-1.5 transition aria-pressed:bg-teal-100 aria-pressed:text-teal-800 text-stone-400 hover:text-stone-700'

const navItems = [
  {
    to: '/',
    label: t.navHome,
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" />,
  },
  {
    to: '/courses',
    label: t.navCourses,
    icon: (
      <>
        <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5a2.5 2.5 0 0 0 0 5H19" />
        <path d="M9 7h6" />
      </>
    ),
  },
]

/** Header title, plus where the ← back arrow leads (course pages only). */
function pageInfo(pathname: string): { title: string; back?: string } {
  if (pathname === '/') return { title: t.navHome }
  const [, courseId, lesson] = /^\/courses\/([^/]+)(?:\/([^/]+))?/.exec(pathname) ?? []
  if (!courseId) return { title: t.allCourses }
  const course = coursesById.get(courseId)?.course.title ?? t.navCourses
  if (lesson) return { title: `${course} · ${t.lessonTitle(Number(lesson))}`, back: `/courses/${courseId}` }
  return { title: course, back: '/courses' }
}

/** Side menu + header around every page. On small screens the menu slides in from a hamburger button. */
export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const page = pageInfo(useLocation().pathname)
  const [sfx, toggleSfx] = useSoundEffects()
  const [voice, toggleVoice] = useVoice()

  return (
    <div className="flex h-svh bg-stone-50">
      {/* Dimmed backdrop behind the open menu on small screens */}
      {menuOpen && (
        <button aria-label={t.closeMenu} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-stone-900/30 md:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-stone-200 bg-white transition-transform md:static md:translate-x-0 ${
          menuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center px-5">
          <span className="text-xl font-extrabold tracking-wide text-teal-700">{t.appTitle}</span>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `font-lao flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
                  isActive ? 'bg-teal-50 text-teal-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`
              }
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 bg-white/70 px-4 backdrop-blur">
          <button onClick={() => setMenuOpen(true)} aria-label={t.openMenu} className="-ml-1 rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 md:hidden">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {page.back && (
            <Link to={page.back} aria-label={t.back} title={t.back} className="-ml-1 rounded-lg p-1.5 text-stone-600 hover:bg-stone-100">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <h1 className="font-lao flex-1 truncate text-lg font-semibold text-stone-900">{page.title}</h1>
          <button onClick={toggleSfx} aria-pressed={sfx} aria-label={t.soundEffects} title={t.soundEffects} className={toggleButton}>
            {/* music note; crossed out when off */}
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
              {!sfx && <path d="m2 2 20 20" />}
            </svg>
          </button>
          <button onClick={toggleVoice} aria-pressed={voice} aria-label={t.voice} title={t.voice} className={toggleButton}>
            {/* speaking head; crossed out when off */}
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 21v-3a4 4 0 0 0 4-4V9A7 7 0 0 0 4 9c0 3 1 4 2 5v7" />
              <path d="M20 6a6 6 0 0 1 2 4M18 9a3 3 0 0 1 1 2" />
              {!voice && <path d="m2 2 20 20" />}
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Shown while a course's sentences load for the first time (see useLoadedCourse). */}
          <Suspense
            fallback={
              <div role="status" aria-label={t.loading} className="flex h-full min-h-40 items-center justify-center">
                <span className="size-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-700" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
