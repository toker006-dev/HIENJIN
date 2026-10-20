import { useState } from 'react'
import { Exercise } from './components/Exercise.tsx'
import hsk1 from './data/sentences/hsk1.json'
import { t } from './i18n/lo.ts'
import type { Sentence } from './types.ts'

const sentences = hsk1 as Sentence[]

export default function App() {
  const [index, setIndex] = useState(0)
  const done = index >= sentences.length
  const progress = Math.min(index, sentences.length) / sentences.length

  return (
    <div className="flex min-h-svh flex-col bg-stone-50">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-4">
        <h1 className="font-lao text-lg font-bold text-stone-900">
          <span className="font-zh mr-2 text-teal-700">汉语</span>
          {t.appTitle}
        </h1>
        <span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-800">HSK 1</span>
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
            <Exercise key={sentences[index].id} sentence={sentences[index]} onNext={() => setIndex((i) => i + 1)} />
          )}
        </div>
      </main>

      <footer className="font-lao pb-3 text-center text-xs text-stone-400">{t.hint}</footer>
    </div>
  )
}
