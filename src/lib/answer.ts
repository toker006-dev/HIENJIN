/** Strips spaces and punctuation so "吃 饭" or "吗？" still count as the right word. */
export function normalize(input: string): string {
  return input.replace(/[\s\p{P}]/gu, '')
}

export function isCorrect(input: string, expected: string): boolean {
  return normalize(input) === expected
}
