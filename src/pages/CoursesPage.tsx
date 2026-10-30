import { Link } from 'react-router'
import { CourseTile } from '../components/CourseTile.tsx'
import { ARRANGE_SETS, type ArrangeSet } from '../data/arrange.ts'
import { categories } from '../data/courses.ts'
import { t } from '../i18n/lo.ts'
import { useProgress } from '../lib/progress.ts'

const row = 'mt-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-x-visible sm:px-8 2xl:grid-cols-6'

/** Practice hub: one section per activity, each a row of cards: swipe sideways on phones, a grid that fills the width on wider screens. */
export function CoursesPage() {
  const progress = useProgress()

  return (
    <div className="space-y-10 py-8">
      {categories.map((category) => (
        <section key={category.id}>
          <SectionTitle title={`✏️ ${category.title}`} description={category.description} />
          <div className={row}>
            {category.courses.map((course) => (
              <CourseTile key={course.id} course={course} progress={progress} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <SectionTitle title={`🧩 ${t.arrangeTitle}`} description={t.arrangeDesc} />
        <div className={row}>
          {ARRANGE_SETS.map((set) => (
            <SetTile key={set.id} set={set} icon="🧩" title={t.arrangeTitle} to={`/courses/arrange/${set.id}`} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={`🎧 ${t.listenTitle}`} description={t.listenDesc} />
        <div className={row}>
          {ARRANGE_SETS.map((set) => (
            <SetTile key={set.id} set={set} icon="🎧" title={t.listenTitle} to={`/courses/listen/${set.id}`} />
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-4 sm:px-8">
      <h2 className="font-lao text-xl font-bold text-stone-900">{title}</h2>
      <p className="font-lao mt-0.5 text-sm text-stone-500">{description}</p>
    </div>
  )
}

/** Activity set card, styled like a course tile. */
function SetTile({ set, icon, title, to }: { set: ArrangeSet; icon: string; title: string; to: string }) {
  return (
    <Link to={to} className="group block w-60 shrink-0 snap-start sm:w-auto">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl ring-1 ring-stone-200 transition group-hover:shadow-lg group-hover:ring-teal-400">
        <img src={set.cover} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute right-2 bottom-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-lg font-bold text-white backdrop-blur-sm">
          {icon} {set.title}
        </span>
      </div>
      <h3 className="font-lao mt-2.5 font-semibold text-stone-900 group-hover:text-teal-800">
        {title} {set.title}
      </h3>
      <p className="font-lao mt-0.5 text-sm text-stone-500">
        HSK 1–6
      </p>
    </Link>
  )
}
