// Downloads the HSK 2.0 (levels 1-6) word lists from drkameleon/complete-hsk-vocabulary
// and stores a slimmed-down copy in data/hsk/<level>.json.
// Usage: npm run hsk:fetch
import { mkdir, writeFile } from 'node:fs/promises'
import { HSK_DIR, type HskWord } from './hsk.ts'

const SOURCE = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/wordlists/exclusive/old'

interface SourceEntry {
  simplified: string
  forms: { transcriptions: { pinyin: string }; meanings: string[] }[]
}

await mkdir(HSK_DIR, { recursive: true })

for (let level = 1; level <= 6; level++) {
  const res = await fetch(`${SOURCE}/${level}.json`)
  if (!res.ok) throw new Error(`HSK${level}: HTTP ${res.status}`)
  const entries = (await res.json()) as SourceEntry[]

  const words: HskWord[] = entries.map((e) => ({
    word: e.simplified,
    pinyin: e.forms[0]?.transcriptions.pinyin ?? '',
    meanings: e.forms.flatMap((f) => f.meanings),
  }))

  await writeFile(new URL(`${level}.json`, HSK_DIR), JSON.stringify(words, null, 2) + '\n')
  console.log(`HSK${level}: ${words.length} words`)
}
