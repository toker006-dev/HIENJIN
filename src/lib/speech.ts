export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

let chineseVoice: SpeechSynthesisVoice | undefined

/**
 * Picks a Mandarin voice. Android Chrome often ignores `utterance.lang` alone and reads with the default
 * (non-Chinese) voice, so a voice must be set explicitly. Android reports langs like "zh_CN" or "cmn-Hans-CN".
 */
function pickVoice() {
  const voices = speechSynthesis.getVoices()
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase()
  chineseVoice =
    voices.find((v) => lang(v) === 'zh-cn') ??
    voices.find((v) => lang(v).startsWith('cmn')) ??
    voices.find((v) => lang(v).startsWith('zh') && !/hk|tw/.test(lang(v))) ??
    voices.find((v) => lang(v).startsWith('zh'))
}

if (canSpeak) {
  pickVoice()
  // The voice list loads asynchronously (empty at first on Android and Chrome).
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

/** Reads Chinese text aloud with the browser's built-in Mandarin voice. */
export function speak(text: string, rate = 0.8) {
  if (!chineseVoice) pickVoice()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = chineseVoice?.lang ?? 'zh-CN'
  if (chineseVoice) utterance.voice = chineseVoice
  utterance.rate = rate

  const start = () => {
    speechSynthesis.resume() // Chrome can get stuck in a paused state
    speechSynthesis.speak(utterance)
  }
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    // On Android, speak() right after cancel() is often dropped; give the cancel a moment.
    speechSynthesis.cancel()
    setTimeout(start, 80)
  } else {
    start()
  }
}
