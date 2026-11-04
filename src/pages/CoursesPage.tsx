import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { CourseTile } from '../components/CourseTile.tsx'
import { categories } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import { useProgress } from '../lib/progress.ts'
import { ActivityBento } from './HomePage.tsx'

const row = 'mt-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-x-visible sm:px-8 2xl:grid-cols-6'

/** Practice hub: one section per activity, each a row of cards: swipe sideways on phones, a grid that fills the width on wider screens. */
export function CoursesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <ActivityBento heading={t.navCourses} />
    </div>
  )
}

/** Sentence translation: pick an HSK course. */
export function TranslatePage() {
  const progress = useProgress()

  return (
    <div className="space-y-10 py-8">
      {categories.map((category) => (
        <section key={category.id}>
          <SectionTitle title={<><Pencil aria-hidden className="inline size-5 align-[-0.15em]" /> {category.title}</>} description={category.description} />
          <div className={row}>
            {category.courses.map((course) => (
              <CourseTile key={course.id} course={course} progress={progress} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function SectionTitle({ title, description }: { title: ReactNode; description?: string }) {
  return (
    <div className="px-4 sm:px-8">
      <h2 className="font-lao text-xl font-bold text-stone-900">{title}</h2>
      {description && <p className="font-lao mt-0.5 text-sm text-stone-500">{description}</p>}
    </div>
  )
}
