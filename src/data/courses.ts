import { use } from 'react'
import hskCover from '../assets/hsk-vocabulary.webp'
import { t } from '../i18n/lo.ts'
import type { CourseProgress } from '../lib/progress.ts'
import type { Sentence } from '../types.ts'
import hskWords from './hsk-words.json'

/** Words per lesson: lesson 1 = words 1-25 of the level, lesson 2 = 26-50, ... */
export const LESSON_SIZE = 25

/** A lesson as known up front, without its sentences (those load on demand, see `useLoadedCourse`). */
export interface LessonInfo {
  /** e.g. "hsk1/2" - also the key its progress is stored under. */
  id: string
  courseId: string
  number: number
  /** 1-based position of the first and last word in the HSK list. */
  first: number
  last: number
  words: string[]
}

export interface Lesson extends LessonInfo {
  /** Generated sentences for this lesson's words; empty means "coming soon". */
  sentences: Sentence[]
}

export interface Course {
  id: string
  title: string
  /** Decorative character, e.g. 一 for HSK 1. */
  badge: string
  /** Cover image for the course tile. */
  cover: string
  description: string
  tags: string[]
  wordCount: number
  lessons: LessonInfo[]
  /** Fetches the course's sentences (a separate file per course, so the app doesn't load them all up front). */
  loadSentences: () => Promise<Sentence[]>
}

/** A course whose sentences have been loaded. */
export interface LoadedCourse extends Omit<Course, 'lessons'> {
  lessons: Lesson[]
}

export interface Category {
  id: string
  title: string
  description: string
  courses: Course[]
}

// One lazily loaded file per level (hsk1.json ... hsk6.json); a level without a file is all "coming soon".
const sentenceFiles = import.meta.glob<Sentence[]>('./sentences/hsk*.json', { import: 'default' })
const wordsByLevel = hskWords as Record<string, string[]>

const BADGES = ['一', '二', '三', '四', '五', '六']

function hskCourse(level: number): Course {
  const id = `hsk${level}`
  const words = wordsByLevel[level] ?? []

  const lessons: LessonInfo[] = []
  for (let start = 0; start < words.length; start += LESSON_SIZE) {
    const number = lessons.length + 1
    const lessonWords = words.slice(start, start + LESSON_SIZE)
    lessons.push({ id: `${id}/${number}`, courseId: id, number, first: start + 1, last: start + lessonWords.length, words: lessonWords })
  }

  const file = sentenceFiles[`./sentences/hsk${level}.json`]
  return {
    id,
    title: `HSK ${level}`,
    badge: BADGES[level - 1] ?? String(level),
    cover: hskCover,
    description: `${t.hskLevelDesc[level - 1]} ${t.hskCourseDesc(level)}`,
    tags: [t.tagVocabulary, `HSK ${level}`, level <= 2 ? t.tagBeginner : level <= 4 ? t.tagIntermediate : t.tagAdvanced],
    wordCount: words.length,
    lessons,
    loadSentences: file ?? (() => Promise.resolve([])),
  }
}

// To add a category later (grammar, listening, ...), add another entry here.
export const categories: Category[] = [
  {
    id: 'hsk-vocabulary',
    title: t.hskVocabulary,
    description: t.hskVocabularyDesc,
    courses: [1, 2, 3, 4, 5, 6].map(hskCourse),
  },
]

export const coursesById = new Map(categories.flatMap((c) => c.courses.map((course) => [course.id, { course, category: c }])))

const loaded = new Map<string, Promise<LoadedCourse>>()

function loadCourse(course: Course): Promise<LoadedCourse> {
  let promise = loaded.get(course.id)
  if (!promise) {
    promise = course.loadSentences().then((sentences) => {
      const byTarget = new Map(sentences.map((s) => [s.target, s]))
      return { ...course, lessons: course.lessons.map((l) => ({ ...l, sentences: l.words.flatMap((w) => byTarget.get(w) ?? []) })) }
    })
    loaded.set(course.id, promise)
  }
  return promise
}

/** The course with its sentences; suspends (shows the nearest <Suspense> fallback) while they load the first time. */
export function useLoadedCourse(course: Course): LoadedCourse {
  return use(loadCourse(course))
}

export function isPlayable(lesson: Lesson): boolean {
  return lesson.sentences.length > 0
}

/**
 * The lesson to continue with: the most recently studied one, or the next playable lesson after it
 * once it has been finished. Without any history, the first playable lesson.
 */
export function currentLesson(course: LoadedCourse, progress: Record<string, CourseProgress>): Lesson | undefined {
  const studied = course.lessons.filter((l) => progress[l.id]).sort((a, b) => progress[b.id].lastStudied - progress[a.id].lastStudied)
  const latest = studied[0]
  if (!latest) return course.lessons.find(isPlayable)
  if (!progress[latest.id].rounds) return latest
  return course.lessons.find((l) => l.number > latest.number && isPlayable(l)) ?? latest
}
