const list = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

// Comma-separated in .env. Models are best first; each model is tried with every key before falling back
// to the next model, so a second key doubles the quota of the good models. When a (model, key) pair's
// daily free quota runs out, the next pair takes over.
const API_KEYS = list(process.env.GEMINI_API_KEY ?? '')
const MODELS = list(process.env.GEMINI_MODEL ?? 'gemini-3.6-flash,gemini-3.7-flash,gemini-3.5-flash,gemini-3.8-flash,gemini-3.5-flash-lite')
const ROUTES = MODELS.flatMap((model) => API_KEYS.map((key, i) => ({ model, key, label: `${model} (key ${i + 1})` })))
const MAX_WAIT_MS = 5 * 60 * 1000

let current = 0

if (!API_KEYS.length) {
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
    const { model, key, label } = ROUTES[current]
    let res: Response
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      })
    } catch (error) {
      // Network hiccup (e.g. ECONNRESET) - wait and try again instead of crashing the run.
      if (retry >= 5) {
        if (current + 1 >= ROUTES.length) throw error
        console.warn(`  ${label} keeps failing, switching to ${ROUTES[++current].label}`)
        retry = -1
        continue
      }
      console.warn(`  ${label} network error, retrying in ${5 * (retry + 1)}s`)
      await sleep(5000 * (retry + 1))
      continue
    }

    if ((res.status === 429 || res.status >= 500) && retry < 5) {
      const errorBody = await res.text()
      const wait = retryDelayMs(errorBody) ?? 2 ** retry * 5000
      if (wait > MAX_WAIT_MS) {
        // Daily free-tier quota is used up - waiting hours is pointless, so move on to the next model/key.
        console.warn(`  quota for ${label} is exhausted (resets in ${Math.round(wait / 3600000)}h)`)
        if (++current >= ROUTES.length) {
          console.error('\nAll models and keys are out of quota. Progress is saved - re-run later to continue.')
          process.exit(1)
        }
        console.warn(`  switching to ${ROUTES[current].label}`)
        retry = -1
        continue
      }
      console.warn(`  ${label} HTTP ${res.status}, retrying in ${Math.round(wait / 1000)}s`)
      await sleep(wait)
      continue
    }
    if ((res.status === 429 || res.status >= 500) && current + 1 < ROUTES.length) {
      // Still overloaded after all retries - another model is usually free.
      console.warn(`  ${label} still unavailable, switching to ${ROUTES[++current].label}`)
      retry = -1
      continue
    }
    if (!res.ok) throw new Error(`Gemini ${label} HTTP ${res.status}: ${await res.text()}`)

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
