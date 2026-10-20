// Sound effects generated with the Web Audio API - no audio files needed.
// To use real recordings later, replace a function body with `new Audio('/sounds/x.mp3').play()`.

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

/** Browsers only allow audio after a user gesture; every call here comes from a key press or click. */
function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, volume: number, type: OscillatorType) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration)
  return osc
}

/** Soft key click: a very short burst of filtered noise, pitch varied a little so fast typing sounds natural. */
export function playType() {
  const ac = audio()
  if (!ac) return
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 0.03, ac.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const now = ac.currentTime
  const src = ac.createBufferSource()
  const filter = ac.createBiquadFilter()
  const gain = ac.createGain()
  src.buffer = noise
  filter.type = 'bandpass'
  filter.frequency.value = 1800 + Math.random() * 1200
  filter.Q.value = 1.5
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
  src.connect(filter).connect(gain).connect(ac.destination)
  src.start(now)
}

/** Rising two-note chime. */
export function playCorrect() {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  tone(ac, 659.25, now, 0.18, 0.25, 'sine') // E5
  tone(ac, 987.77, now + 0.12, 0.35, 0.25, 'sine') // B5
}

/** Little fanfare for finishing a level: rising C-E-G-C arpeggio, then the chord rings out. */
export function playComplete() {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  notes.forEach((freq, i) => tone(ac, freq, now + i * 0.11, 0.25, 0.2, 'triangle'))
  notes.forEach((freq) => tone(ac, freq, now + 0.5, 0.9, 0.12, 'sine'))
}

/** Short, low falling buzz. */
export function playWrong() {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const osc = tone(ac, 180, now, 0.25, 0.25, 'triangle')
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.25)
}
