import { CourseTile } from '../components/CourseTile.tsx'
import { categories } from '../data/courses.ts'
import { useProgress } from '../lib/progress.ts'

/** One horizontal row of course tiles per category; rows scroll sideways when they don't fit. */
export function CoursesPage() {
  const progress = useProgress()

  return (
    <div className="space-y-10 py-8">
      {categories.map((category) => (
        <section key={category.id}>
          <div className="px-4 sm:px-8">
            <h2 className="font-lao text-xl font-bold text-stone-900">{category.title}</h2>
            <p className="font-lao mt-0.5 text-sm text-stone-500">{category.description}</p>
          </div>
          <div className="mt-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 sm:scroll-px-8 sm:px-8">
            {category.courses.map((course) => (
              <CourseTile key={course.id} course={course} progress={progress} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
