const API_KEY = process.env.GEMINI_API_KEY
// Comma-separated, best first. When one model's daily free quota runs out, the next one takes over.
const MODELS = (process.env.GEMINI_MODEL ?? 'gemini-3.6-flash,gemini-3.7-flash,gemini-3.5-flash,gemini-3.8-flash,gemini-3.5-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
const MAX_WAIT_MS = 5 * 60 * 1000

let current = 0

if (!API_KEY) {
  console.error('GEMINI_API_KEY is missing - copy .env.example to .env and fill it in.')
  process.exit(1)
}

/** Sends a prompt and parses the JSON reply, which Gemini shapes to match `responseSchema`. */
export async function callGemini<T>(prompt: string, responseSchema: object): Promise<T> {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 1, responseMimeType: 'application/json', responseSchema },
  }

  for (let retry = 0; ; retry++) {
    const model = MODELS[current]
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY! },
      body: JSON.stringify(body),
    })

    if ((res.status === 429 || res.status >= 500) && retry < 5) {
      const errorBody = await res.text()
      const wait = retryDelayMs(errorBody) ?? 2 ** retry * 5000
      if (wait > MAX_WAIT_MS) {
        // Daily free-tier quota is used up - waiting hours is pointless, so move on to the next model.
        console.warn(`  quota for ${model} is exhausted (resets in ${Math.round(wait / 3600000)}h)`)
        if (++current >= MODELS.length) {
          console.error('\nAll models are out of quota. Progress is saved - re-run later to continue.')
          process.exit(1)
        }
        console.warn(`  switching to ${MODELS[current]}`)
        retry = -1
        continue
      }
      console.warn(`  ${model} HTTP ${res.status}, retrying in ${Math.round(wait / 1000)}s`)
      await sleep(wait)
      continue
    }
    if ((res.status === 429 || res.status >= 500) && current + 1 < MODELS.length) {
      // Still overloaded after all retries - another model is usually free.
      console.warn(`  ${model} still unavailable, switching to ${MODELS[++current]}`)
      retry = -1
      continue
    }
    if (!res.ok) throw new Error(`Gemini ${model} HTTP ${res.status}: ${await res.text()}`)

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
    }
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
    return JSON.parse(text) as T
  }
}

/** Reads the "retryDelay" Gemini sends with rate-limit errors, e.g. "23s". */
function retryDelayMs(errorBody: string): number | null {
  const match = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(errorBody)
  return match ? Math.ceil(Number(match[1]) * 1000) + 1000 : null
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
