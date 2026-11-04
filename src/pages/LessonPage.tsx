import { ProgressTrail } from '../components/ProgressTrail.tsx'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { ResultIcon } from '../components/ResultIcon.tsx'
import { Exercise } from '../components/Exercise.tsx'
import { coursesById, isPlayable, useLoadedCourse, type Course, type Lesson, type LoadedCourse } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import { markStudied, recordSolved } from '../lib/progress.ts'
import { useSoundEffects, useVoice } from '../lib/settings.ts'
import { playComplete } from '../lib/sfx.ts'
import type { Sentence } from '../types.ts'

/** A new random order of the lesson's sentences (Fisher-Yates shuffle). */
function shuffled(list: Sentence[]): Sentence[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function LessonRoute() {
  const { courseId = '', lesson: lessonNumber = '' } = useParams()
  const course = coursesById.get(courseId)?.course
  if (!course) return <Navigate to="/courses" replace />
  return <LessonLoader course={course} lessonNumber={lessonNumber} />
}

function LessonLoader({ course: info, lessonNumber }: { course: Course; lessonNumber: string }) {
  const course = useLoadedCourse(info)
  const lesson = course.lessons.find((l) => String(l.number) === lessonNumber)
  if (!lesson || !isPlayable(lesson)) return <Navigate to={`/courses/${course.id}`} replace />
  // `key` gives each lesson its own fresh state when moving between them.
  return <LessonPage key={lesson.id} course={course} lesson={lesson} />
}

/** Plays through every sentence of a lesson once, in random order. Opening a lesson always starts a new round. */
function LessonPage({ course, lesson }: { course: LoadedCourse; lesson: Lesson }) {
  const [sfx] = useSoundEffects()
  const [voice] = useVoice()
  const [sentences, setSentences] = useState(() => shuffled(lesson.sentences))
  const [index, setIndex] = useState(0)
  // Bumped on every new round so the exercise always remounts, even if the same sentence comes first again.
  const [round, setRound] = useState(0)

  useEffect(() => markStudied(lesson.id, lesson.sentences.length), [lesson])

  const nextLesson = course.lessons.find((l) => l.number === lesson.number + 1)

  function restart() {
    setSentences(shuffled(lesson.sentences))
    setIndex(0)
    setRound((r) => r + 1)
  }

  function next() {
    recordSolved(lesson.id, index + 1, sentences.length)
    // Finishing the last sentence of the lesson gets a fanfare.
    if (index + 1 === sentences.length && sfx) playComplete()
    setIndex(index + 1)
  }

  const done = index >= sentences.length
  const progress = Math.min(index, sentences.length) / sentences.length

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4">
      <div className="pt-3">
        <div className="mb-2 flex justify-between">
          <span className="font-lao text-sm font-medium text-stone-600">{t.lessonTitle(lesson.number)}</span>
          <span className="font-lao text-sm text-stone-500">
            {t.progress(Math.min(index + 1, sentences.length), sentences.length)}
          </span>
        </div>
        <ProgressTrail ratio={progress} />
      </div>

      <div className="flex flex-1 items-center py-3">
        <div className="w-full rounded-3xl border-2 border-stone-900 bg-surface px-5 py-5 sm:py-6 shadow-[0_5px_0_0_var(--color-stone-900)] sm:px-12">
          {done ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <ResultIcon />
              <h2 className="font-lao text-3xl font-bold text-stone-900">{t.doneTitle}</h2>
              <p className="font-lao text-stone-600">{t.doneBody(sentences.length)}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {nextLesson && isPlayable(nextLesson) && (
                  <Link
                    to={`/courses/${nextLesson.id}`}
                    autoFocus
                    className="font-lao rounded-md bg-teal-700 px-8 py-3 font-semibold text-white transition hover:bg-teal-800"
                  >
                    {t.nextLesson} →
                  </Link>
                )}
                <button
                  onClick={restart}
                  autoFocus={!nextLesson || !isPlayable(nextLesson)}
                  className="font-lao rounded-md bg-stone-900 px-8 py-3 font-semibold text-white transition hover:bg-stone-700"
                >
                  {t.restart}
                </button>
                <Link
                  to={`/courses/${course.id}`}
                  className="font-lao rounded-md px-8 py-3 font-semibold text-stone-700 ring-1 ring-stone-300 transition hover:bg-stone-100"
                >
                  {t.backToCourses}
                </Link>
              </div>
            </div>
          ) : (
            <Exercise
              key={`${round}-${sentences[index].id}`}
              sentence={sentences[index]}
              onNext={next}
              sfx={sfx}
              voice={voice}
            />
          )}
        </div>
      </div>

      <footer className="font-lao pb-3 text-center text-xs text-stone-400">{t.hint}</footer>
    </div>
  )
}
