import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { coursesById, currentLesson, isPlayable, useLoadedCourse, type Category, type Course, type Lesson } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import { useProgress, type CourseProgress } from '../lib/progress.ts'

/** Lessons shown before "show all", like a collapsed syllabus. */
const COLLAPSED_LESSONS = 10

export function CourseDetailPage() {
  const { courseId = '' } = useParams()
  const entry = coursesById.get(courseId)
  if (!entry) return <Navigate to="/courses" replace />
  return <CourseDetail course={entry.course} category={entry.category} />
}

/** Course overview: what the course is, then its lessons to pick from. */
function CourseDetail({ course: info, category }: { course: Course; category: Category }) {
  const course = useLoadedCourse(info)
  const progress = useProgress()
  const [expanded, setExpanded] = useState(false)
  const next = currentLesson(course, progress)
  const lessons = expanded ? course.lessons : course.lessons.slice(0, COLLAPSED_LESSONS)
  const hidden = course.lessons.length - COLLAPSED_LESSONS

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
      <section className="flex flex-col gap-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:flex-row sm:p-5">
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden rounded-xl sm:w-72">
          <img src={course.cover} alt="" className="size-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-lg font-bold text-white backdrop-blur-sm">
            {course.title}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-2xl font-bold text-stone-900">
            {course.title}
            <span lang="zh-CN" className="font-zh ml-2 text-stone-400">
              {course.badge}级
            </span>
          </h2>
          <p className="font-lao mt-0.5 text-sm text-stone-500">{category.title}</p>
          <p className="font-lao mt-3 leading-relaxed text-stone-700">{course.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {course.tags.map((tag) => (
              <span key={tag} className="font-lao rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
            <span className="font-lao text-sm text-stone-500">
              {t.wordCount(course.wordCount)} · {t.lessonCount(course.lessons.length)}
            </span>
            {next && (
              <Link
                to={`/courses/${next.id}`}
                className="font-lao inline-flex items-center gap-2 rounded-full bg-teal-700 px-6 py-2.5 font-semibold text-white transition hover:bg-teal-800"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                  <path d="M7 4v16l13-8Z" />
                </svg>
                {progress[next.id] ? t.continueLesson(next.number) : t.startLesson(next.number)}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5">
        <h3 className="font-lao text-lg font-bold text-stone-900">
          {t.outline}
          <span className="ml-2 text-sm font-normal text-stone-500">{t.lessonCount(course.lessons.length)}</span>
        </h3>
        <ol className="mt-2 divide-y divide-stone-100">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <LessonRow lesson={lesson} progress={progress[lesson.id]} />
            </li>
          ))}
        </ol>
        {hidden > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="font-lao mx-auto mt-2 flex items-center gap-1 rounded-full px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-100"
          >
            <svg viewBox="0 0 24 24" className={`size-4 transition ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
            {expanded ? t.showLess : t.showAll(course.lessons.length)}
          </button>
        )}
      </section>
    </div>
  )
}

function LessonRow({ lesson, progress }: { lesson: Lesson; progress?: CourseProgress }) {
  const playable = isPlayable(lesson)
  const total = lesson.sentences.length

  const content = (
    <>
      <span className="w-7 shrink-0 text-sm text-stone-400 tabular-nums">{String(lesson.number).padStart(2, '0')}</span>
      <div className="min-w-0 flex-1">
        <p className="font-lao font-semibold text-stone-900">
          {t.lessonTitle(lesson.number)}
          <span className="ml-2 text-sm font-normal text-stone-500">{t.wordRange(lesson.first, lesson.last)}</span>
        </p>
      </div>
      <LessonStatus playable={playable} progress={progress} total={total} />
    </>
  )

  if (!playable) return <div className="flex items-center gap-3 py-3 opacity-50">{content}</div>
  return (
    <Link to={`/courses/${lesson.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-teal-50">
      {content}
    </Link>
  )
}

function LessonStatus({ playable, progress, total }: { playable: boolean; progress?: CourseProgress; total: number }) {
  const badge = 'font-lao shrink-0 rounded-md px-2 py-0.5 text-xs font-medium'
  if (!playable) return <span className={`${badge} bg-stone-100 text-stone-500`}>{t.comingSoon}</span>
  if (progress?.rounds) return <span className={`${badge} bg-emerald-50 text-emerald-700`}>✓ {t.lessonDone}</span>
  if (progress?.solved) return <span className={`${badge} bg-amber-50 text-amber-700`}>{Math.min(progress.solved, total)} / {total}</span>
  return <span className={`${badge} text-stone-400`}>{t.sentenceCount(total)}</span>
}
