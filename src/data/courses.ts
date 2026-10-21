import hskCover from '../assets/hsk-vocabulary.webp'
import { t } from '../i18n/lo.ts'
import type { CourseProgress } from '../lib/progress.ts'
import type { Sentence } from '../types.ts'
import hskWords from './hsk-words.json'

/** Words per lesson: lesson 1 = words 1-25 of the level, lesson 2 = 26-50, ... */
export const LESSON_SIZE = 25

export interface Lesson {
  /** e.g. "hsk1/2" - also the key its progress is stored under. */
  id: string
  courseId: string
  number: number
  /** 1-based position of the first and last word in the HSK list. */
  first: number
  last: number
  words: string[]
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
  lessons: Lesson[]
}

export interface Category {
  id: string
  title: string
  description: string
  courses: Course[]
}

// Every generated level file (hsk1.json ... hsk6.json); levels without a file still appear, all "coming soon".
const files = import.meta.glob<Sentence[]>('./sentences/hsk*.json', { eager: true, import: 'default' })
const sentencesByLevel = new Map(Object.entries(files).map(([path, list]) => [Number(/hsk(\d+)\.json$/.exec(path)![1]), list]))
const wordsByLevel = hskWords as Record<string, string[]>

const BADGES = ['一', '二', '三', '四', '五', '六']

function hskCourse(level: number): Course {
  const id = `hsk${level}`
  const words = wordsByLevel[level] ?? []
  const byTarget = new Map((sentencesByLevel.get(level) ?? []).map((s) => [s.target, s]))

  const lessons: Lesson[] = []
  for (let start = 0; start < words.length; start += LESSON_SIZE) {
    const lessonWords = words.slice(start, start + LESSON_SIZE)
    const number = lessons.length + 1
    lessons.push({
      id: `${id}/${number}`,
      courseId: id,
      number,
      first: start + 1,
      last: start + lessonWords.length,
      words: lessonWords,
      sentences: lessonWords.flatMap((w) => byTarget.get(w) ?? []),
    })
  }

  return {
    id,
    title: `HSK ${level}`,
    badge: BADGES[level - 1] ?? String(level),
    cover: hskCover,
    description: `${t.hskLevelDesc[level - 1]} ${t.hskCourseDesc(level)}`,
    tags: [t.tagVocabulary, `HSK ${level}`, level <= 2 ? t.tagBeginner : level <= 4 ? t.tagIntermediate : t.tagAdvanced],
    wordCount: words.length,
    lessons,
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

export function isPlayable(lesson: Lesson): boolean {
  return lesson.sentences.length > 0
}

/**
 * The lesson to continue with: the most recently studied one, or the next playable lesson after it
 * once it has been finished. Without any history, the first playable lesson.
 */
export function currentLesson(course: Course, progress: Record<string, CourseProgress>): Lesson | undefined {
  const studied = course.lessons.filter((l) => progress[l.id]).sort((a, b) => progress[b.id].lastStudied - progress[a.id].lastStudied)
  const latest = studied[0]
  if (!latest) return course.lessons.find(isPlayable)
  if (!progress[latest.id].rounds) return latest
  return course.lessons.find((l) => l.number > latest.number && isPlayable(l)) ?? latest
}
