import { t } from '../i18n/lo.ts'
import { canSpeak, speak } from '../lib/speech.ts'
import type { Sentence } from '../types.ts'

/** The HSK word a sentence was built around: hanzi, pinyin, part of speech and Lao meaning. */
export function WordCard({ sentence }: { sentence: Sentence }) {
  const { info } = sentence
  if (!info) return null

  return (
    <div title={t.wordOfSentence} className="animate-pop flex w-full max-w-sm flex-col items-center rounded-2xl border-2 border-teal-200 bg-teal-50 px-4 py-2">
      <div className="flex items-center justify-center gap-2">
        <span lang="zh-CN" className="font-zh text-4xl leading-tight text-stone-900">
          {sentence.target}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xl font-medium text-teal-800">{info.pinyin}</span>
          {canSpeak && (
            <button
              onClick={() => speak(sentence.target)}
              aria-label={t.listen}
              title={t.listen}
              className="rounded-full p-1.5 text-teal-700 transition hover:bg-teal-100"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex w-full items-center justify-center gap-2 border-t border-dashed border-teal-200 pt-1.5">
        <span className="font-lao rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
          {t.pos[info.pos]}
        </span>
        <p lang="lo" className="font-lao text-lg font-semibold text-stone-800">
          {info.meaningLao}
        </p>
      </div>
    </div>
  )
}
