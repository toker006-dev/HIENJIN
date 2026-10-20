import { useState } from 'react'
import { Exercise } from './components/Exercise.tsx'
import { t } from './i18n/lo.ts'
import type { Sentence } from './types.ts'

// Every generated level file (hsk1.json ... hsk6.json), keyed by level number.
const files = import.meta.glob<Sentence[]>('./data/sentences/hsk*.json', { eager: true, import: 'default' })
const sentencesByLevel = new Map(
  Object.entries(files)
    .map(([path, sentences]) => [Number(/hsk(\d+)\.json$/.exec(path)![1]), sentences] as const)
    .sort(([a], [b]) => a - b),
)
const levels = [...sentencesByLevel.keys()]

const LEVEL_KEY = 'hsk-level'

function savedLevel(): number {
  try {
    const level = Number(localStorage.getItem(LEVEL_KEY))
    if (sentencesByLevel.has(level)) return level
  } catch {
    // storage unavailable - fall through to the default
  }
  return levels[0]
}

export default function App() {
  const [level, setLevel] = useState(savedLevel)
  const [index, setIndex] = useState(0)
  const sentences = sentencesByLevel.get(level)!

  function chooseLevel(next: number) {
    setLevel(next)
    setIndex(0)
    try {
      localStorage.setItem(LEVEL_KEY, String(next))
    } catch {
      // not critical
    }
  }

  const done = index >= sentences.length
  const progress = Math.min(index, sentences.length) / sentences.length

  return (
    <div className="flex min-h-svh flex-col bg-stone-50">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-4">
        <h1 className="font-lao text-lg font-bold text-stone-900">
          <span className="font-zh mr-2 text-teal-700">汉语</span>
          {t.appTitle}
        </h1>
        <nav aria-label={t.chooseLevel} className="flex gap-1 rounded-full bg-stone-200/70 p-1">
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => chooseLevel(l)}
              aria-pressed={l === level}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                l === level ? 'bg-teal-700 text-white shadow-sm' : 'text-stone-600 hover:bg-white hover:text-stone-900'
              }`}
            >
              <span className="hidden sm:inline">HSK </span>
              {l}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div className="mb-2 flex justify-end">
          <span className="font-lao text-sm text-stone-500">
            {t.progress(Math.min(index + 1, sentences.length), sentences.length)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-600 transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-4">
        <div className="w-full rounded-3xl bg-white px-6 py-8 shadow-sm ring-1 ring-stone-200 sm:px-12">
          {done ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-5xl">🎉</p>
              <h2 className="font-lao text-3xl font-bold text-stone-900">{t.doneTitle}</h2>
              <p className="font-lao text-stone-600">{t.doneBody(sentences.length)}</p>
              <button
                onClick={() => setIndex(0)}
                autoFocus
                className="font-lao mt-4 rounded-full bg-stone-900 px-8 py-3 font-semibold text-white transition hover:bg-stone-700"
              >
                {t.restart}
              </button>
            </div>
          ) : (
            <Exercise key={`${level}-${sentences[index].id}`} sentence={sentences[index]} onNext={() => setIndex((i) => i + 1)} />
          )}
        </div>
      </main>

      <footer className="font-lao pb-3 text-center text-xs text-stone-400">{t.hint}</footer>
    </div>
  )
}
