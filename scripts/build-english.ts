// Writes src/data/english/hskN.json: { word: "short English meaning" } for the vocabulary page.
// Only the first two dictionary senses are kept so the files stay small.
import { mkdir, writeFile } from 'node:fs/promises'
import { loadLevel } from './hsk.ts'

const OUT_DIR = new URL('../src/data/english/', import.meta.url)
await mkdir(OUT_DIR, { recursive: true })

for (let level = 1; level <= 6; level++) {
  const words = await loadLevel(level)
  const english = Object.fromEntries(words.map((w) => [w.word, w.meanings.slice(0, 2).join('; ')]))
  await writeFile(new URL(`hsk${level}.json`, OUT_DIR), JSON.stringify(english) + '\n')
  console.log(`HSK ${level}: ${words.length} words`)
}
