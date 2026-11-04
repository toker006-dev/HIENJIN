import { Link } from 'react-router'
import type { Course, Lesson } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import type { CourseProgress } from '../lib/progress.ts'

interface Props {
  course: Course
  /** The lesson the card continues with. */
  lesson: Lesson
  progress?: CourseProgress
  /** Extra line under the title, e.g. "studied 5 minutes ago". */
  subtitle?: string
  onRemove?: () => void
}

/** A recently studied course on Home: cover, current lesson with its last result, and a button straight into it. */
export function CourseCard({ course, lesson, progress, subtitle, onRemove }: Props) {
  const total = lesson.sentences.length
  const solved = Math.min(progress?.solved ?? 0, total)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-stone-900 bg-surface shadow-[0_5px_0_0_var(--color-stone-900)] transition hover:shadow-md hover:ring-teal-300">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={course.cover} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute bottom-2 left-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-lg font-bold text-white backdrop-blur-sm">
          {course.title}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label={`${t.remove}: ${course.title}`}
            title={t.remove}
            className="absolute top-2 right-2 rounded-lg bg-surface/90 p-1.5 text-stone-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-900">
            {course.title}
            <span lang="zh-CN" className="font-zh ml-1.5 text-stone-400">
              {course.badge}级
            </span>
          </h3>
          <p className="font-lao truncate text-sm text-stone-500">{subtitle ?? t.wordCount(course.wordCount)}</p>
        </div>

        <div className="mt-4">
          <div className="font-lao mb-1.5 flex justify-between text-xs text-stone-500">
            <span>
              {t.lessonTitle(lesson.number)} · {progress ? t.lastResult(solved, total) : t.notStarted}
            </span>
            {!!progress?.rounds && <span className="font-semibold text-teal-700">{t.rounds(progress.rounds)}</span>}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${(solved / total) * 100}%` }} />
          </div>
        </div>

        <Link
          to={`/courses/${lesson.id}`}
          className="font-lao mt-5 rounded-full bg-stone-900 py-2.5 text-center font-semibold text-white transition hover:bg-teal-700"
        >
          {progress ? t.continueLesson(lesson.number) : t.startLesson(lesson.number)}
        </Link>
      </div>
    </div>
  )
}
