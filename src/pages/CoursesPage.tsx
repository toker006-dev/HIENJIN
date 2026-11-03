import type { ReactNode } from 'react'
import { Headphones, Pencil, Puzzle } from 'lucide-react'
import { Link } from 'react-router'
import { CourseTile } from '../components/CourseTile.tsx'
import { ARRANGE_SETS, type ArrangeSet } from '../data/arrange.ts'
import { categories } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import { useProgress } from '../lib/progress.ts'

const row = 'mt-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-x-visible sm:px-8 2xl:grid-cols-6'

/** Practice hub: one section per activity, each a row of cards: swipe sideways on phones, a grid that fills the width on wider screens. */
export function CoursesPage() {
  return (
    <div className="space-y-10 py-8">
      <section>
        <SectionTitle title={<><Pencil aria-hidden className="inline size-5 align-[-0.15em]" /> {t.hskVocabulary}</>} />
        <div className={row}>
          {ARRANGE_SETS.map((set) => (
            <SetTile key={set.id} set={set} icon={<Pencil aria-hidden className="inline size-4 align-[-0.15em]" />} description={t.hskVocabularyDesc} to="/courses/translate" />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={<><Puzzle aria-hidden className="inline size-5 align-[-0.15em]" /> {t.arrangeTitle}</>} />
        <div className={row}>
          {ARRANGE_SETS.map((set) => (
            <SetTile key={set.id} set={set} icon={<Puzzle aria-hidden className="inline size-4 align-[-0.15em]" />} description={t.arrangeDesc} to={`/courses/arrange/${set.id}`} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={<><Headphones aria-hidden className="inline size-5 align-[-0.15em]" /> {t.listenTitle}</>} />
        <div className={row}>
          {ARRANGE_SETS.map((set) => (
            <SetTile key={set.id} set={set} icon={<Headphones aria-hidden className="inline size-4 align-[-0.15em]" />} description={t.listenDesc} to={`/courses/listen/${set.id}`} />
          ))}
        </div>
      </section>
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

/** Activity set card, styled like a course tile. */
function SetTile({ set, icon, description, to }: { set: ArrangeSet; icon: ReactNode; description: string; to: string }) {
  return (
    <Link to={to} className="group block w-60 shrink-0 snap-start sm:w-auto">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-stone-200 transition group-hover:shadow-lg group-hover:ring-teal-400">
        <img src={set.cover} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute right-2 bottom-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-lg font-bold text-white backdrop-blur-sm">
          {icon} {set.title}
        </span>
      </div>
      <p className="font-lao mt-2.5 text-sm text-stone-600 group-hover:text-teal-800">{description}</p>
    </Link>
  )
}
