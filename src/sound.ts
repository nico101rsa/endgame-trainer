// Tiny WebAudio cues — no audio assets, just short oscillator blips.
// Everything is gated on the sound setting and fails silently where
// audio isn't available (autoplay policies, test browsers).
import { loadSettings } from './settings/store'

let ctx: AudioContext | null = null

function blip(freq: number, at: number, duration: number, type: OscillatorType, gainPeak: number) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ctx.currentTime + at
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(gainPeak, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

function play(fn: () => void) {
  if (!loadSettings().sound) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    fn()
  } catch {
    // No audio — fine.
  }
}

export const sounds = {
  move: () => play(() => blip(660, 0, 0.06, 'triangle', 0.12)),
  reply: () => play(() => blip(440, 0, 0.06, 'triangle', 0.1)),
  wrong: () => play(() => blip(160, 0, 0.18, 'square', 0.08)),
  solved: () =>
    play(() => {
      blip(523, 0, 0.09, 'triangle', 0.12)
      blip(659, 0.09, 0.09, 'triangle', 0.12)
      blip(784, 0.18, 0.16, 'triangle', 0.12)
    }),
}
