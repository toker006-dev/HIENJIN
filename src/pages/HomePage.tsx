import { useState } from 'react'
import { Link } from 'react-router'
import { CourseCard } from '../components/CourseCard.tsx'
import { categories, currentLesson, useLoadedCourse, type Course } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import { hideFromRecent, useHiddenFromRecent, useProgress, type CourseProgress } from '../lib/progress.ts'
import { timeAgo } from '../lib/time.ts'

export function HomePage() {
  const progress = useProgress()
  const hidden = useHiddenFromRecent()
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h2 className="font-lao mb-6 text-2xl font-bold text-stone-900">{t.recentTitle}</h2>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-stone-200 px-6 py-16 text-center">
          <p className="text-5xl">📚</p>
          <p className="font-lao text-stone-600">{t.recentEmpty}</p>
          <Link to="/courses" className="font-lao rounded-full bg-teal-700 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-800">
            {t.browseCourses}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map(({ category, course, lastStudied }) => (
            <RecentCourse key={course.id} course={course} progress={progress} subtitle={`${category.title} · ${timeAgo(lastStudied, now)}`} />
          ))}
        </div>
      )}
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
