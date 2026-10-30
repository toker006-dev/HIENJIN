import { Link } from 'react-router'
import type { Course } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import type { CourseProgress } from '../lib/progress.ts'

/** Course in a category row: cover image with the course name on it, title and stats underneath. */
export function CourseTile({ course, progress }: { course: Course; progress: Record<string, CourseProgress> }) {
  const lessonsDone = course.lessons.filter((l) => progress[l.id]?.rounds).length
  const started = course.lessons.some((l) => progress[l.id])

  return (
    <Link to={`/courses/${course.id}`} className="group block w-60 shrink-0 snap-start sm:w-auto">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-stone-200 transition group-hover:shadow-lg group-hover:ring-teal-400">
        <img
          src={course.cover}
          alt=""
          loading="lazy"
          className="size-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute right-2 bottom-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-lg font-bold text-white backdrop-blur-sm">
          {course.title}
        </span>
        {started && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-stone-900/20">
            <div className="h-full bg-teal-500" style={{ width: `${(lessonsDone / course.lessons.length) * 100}%` }} />
          </div>
        )}
      </div>
      <h3 className="mt-2.5 font-semibold text-stone-900 group-hover:text-teal-800">
        {course.title}
        <span lang="zh-CN" className="font-zh ml-1.5 text-stone-400">
          {course.badge}级
        </span>
      </h3>
      <p className="font-lao mt-0.5 text-sm text-stone-500">
        {t.wordCount(course.wordCount)} · {started ? t.lessonsDone(lessonsDone, course.lessons.length) : t.lessonCount(course.lessons.length)}
      </p>
    </Link>
  )
}
