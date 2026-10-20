const API_KEY = process.env.GEMINI_API_KEY
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest'
const MAX_WAIT_MS = 5 * 60 * 1000

if (!API_KEY) {
  console.error('GEMINI_API_KEY is missing - copy .env.example to .env and fill it in.')
  process.exit(1)
}

/** Sends a prompt and parses the JSON reply, which Gemini shapes to match `responseSchema`. */
export async function callGemini<T>(prompt: string, responseSchema: object): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 1, responseMimeType: 'application/json', responseSchema },
  }

  for (let retry = 0; ; retry++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY! },
      body: JSON.stringify(body),
    })

    if ((res.status === 429 || res.status >= 500) && retry < 5) {
      const errorBody = await res.text()
      const wait = retryDelayMs(errorBody) ?? 2 ** retry * 5000
      if (wait > MAX_WAIT_MS) {
        // Daily free-tier quota is used up - waiting hours is pointless, so stop (progress is saved).
        console.error(`\nGemini quota for ${MODEL} is exhausted (retry in ${Math.round(wait / 3600000)}h).`)
        console.error('Re-run later, or set GEMINI_MODEL in .env to another model to continue now.')
        process.exit(1)
      }
      console.warn(`  Gemini HTTP ${res.status}, retrying in ${Math.round(wait / 1000)}s`)
      await sleep(wait)
      continue
    }
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`)

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
