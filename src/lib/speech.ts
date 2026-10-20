export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/** Reads Chinese text aloud with the browser's built-in zh-CN voice. */
export function speak(text: string, rate = 0.8) {
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = rate
  speechSynthesis.speak(utterance)
}
