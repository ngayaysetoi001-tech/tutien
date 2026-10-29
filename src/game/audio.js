// =====================================================================
// audio.js - Âm thanh tổng hợp bằng WebAudio (không cần file âm thanh).
//   * sfx.*  : tiếng chạm, đòn đánh, chiêu thức, sấm sét, đột phá...
//   * nhạc nền: drone trầm + nốt ngũ cung ngẫu nhiên; chuyển nhịp nhanh có trống khi chiến đấu
// Trình duyệt chỉ cho phát âm sau khi người chơi chạm/bấm lần đầu: gọi unlockAudio().
// =====================================================================

let ctx = null
let master = null
let sfxBus = null
let musicBus = null
let noiseBuf = null
let musicTimer = null
let beatTimer = null
let drone = null
const prefs = { sfx: true, music: true, mode: 'calm' }

// Ngũ cung Rê: D F G A C
const SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25, 587.33]

const rand = (a, b) => a + Math.random() * (b - a)

/** Tạo AudioContext (một lần). Trả về false nếu trình duyệt không hỗ trợ. */
export function initAudio() {
  if (ctx) return true
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return false
  try {
    ctx = new AC()
  } catch {
    return false
  }
  master = ctx.createGain()
  master.gain.value = 0.7
  master.connect(ctx.destination)
  sfxBus = ctx.createGain()
  sfxBus.gain.value = prefs.sfx ? 0.9 : 0
  sfxBus.connect(master)
  musicBus = ctx.createGain()
  musicBus.gain.value = 0
  musicBus.connect(master)
  // 2 giây nhiễu trắng dùng chung cho mọi tiếng "xẹt", "ầm"
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  applyMusic()
  return true
}

/** Gọi trong sự kiện chạm/bấm đầu tiên để mở khoá âm thanh. */
export function unlockAudio() {
  if (!initAudio()) return
  if (ctx.state === 'suspended') ctx.resume()
}

export function setAudioPrefs({ sfx, music }) {
  prefs.sfx = sfx !== false
  prefs.music = music !== false
  if (!ctx) return
  sfxBus.gain.setTargetAtTime(prefs.sfx ? 0.9 : 0, ctx.currentTime, 0.05)
  applyMusic()
}

/** 'calm' (tu luyện) hoặc 'battle' (chiến đấu / độ kiếp). */
export function setMusicMode(mode) {
  prefs.mode = mode
}

// ---------------------------------------------------------------------
// Dụng cụ tổng hợp
// ---------------------------------------------------------------------
function tone(freq, { dur = 0.2, type = 'sine', gain = 0.2, slide = null, delay = 0, attack = 0.005, bus = sfxBus } = {}) {
  if (!ctx || (bus === sfxBus && !prefs.sfx)) return
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(bus)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise({ dur = 0.2, gain = 0.2, filter = 'lowpass', freq = 1000, sweepTo = null, q = 1, delay = 0, bus = sfxBus } = {}) {
  if (!ctx || (bus === sfxBus && !prefs.sfx)) return
  const t = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = filter
  f.Q.value = q
  f.frequency.setValueAtTime(freq, t)
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f)
  f.connect(g)
  g.connect(bus)
  src.start(t, Math.random() * 1.5)
  src.stop(t + dur + 0.05)
}

// ---------------------------------------------------------------------
// Hiệu ứng âm thanh
// ---------------------------------------------------------------------
export const sfx = {
  /** Bấm Tụ Khí: chuông nhỏ. */
  click() {
    tone(660, { dur: 0.14, type: 'triangle', gain: 0.12, slide: 990 })
    tone(1320, { dur: 0.25, gain: 0.05, delay: 0.03 })
  },
  /** Đánh trúng yêu thú. */
  hit(crit = false) {
    noise({ dur: 0.09, gain: 0.25, filter: 'bandpass', freq: 900, q: 0.8 })
    tone(150, { dur: 0.13, gain: 0.3, slide: 60 })
    if (crit) tone(1200, { dur: 0.12, type: 'square', gain: 0.06, slide: 1800 })
  },
  /** Nhân vật bị đánh. */
  hurt() {
    tone(110, { dur: 0.2, type: 'sawtooth', gain: 0.18, slide: 50 })
    noise({ dur: 0.12, gain: 0.15, filter: 'lowpass', freq: 600 })
  },
  skill(kind) {
    if (kind === 'heal') {
      ;[523, 659, 784, 1046].forEach((f, i) => tone(f, { dur: 0.35, gain: 0.09, delay: i * 0.07 }))
    } else if (kind === 'shield') {
      tone(220, { dur: 0.6, type: 'triangle', gain: 0.14, attack: 0.05 })
      tone(440, { dur: 0.6, gain: 0.07, attack: 0.05 })
    } else if (kind === 'haste') {
      noise({ dur: 0.5, gain: 0.18, filter: 'bandpass', freq: 400, sweepTo: 3000, q: 1.5 })
    } else {
      noise({ dur: 0.35, gain: 0.2, filter: 'highpass', freq: 1500, sweepTo: 4500 })
      tone(300, { dur: 0.3, type: 'sawtooth', gain: 0.08, slide: 900 })
    }
  },
  die(boss = false) {
    tone(boss ? 160 : 220, { dur: boss ? 0.9 : 0.45, type: 'sawtooth', gain: 0.18, slide: 38 })
    noise({ dur: boss ? 0.9 : 0.4, gain: 0.2, filter: 'lowpass', freq: 1200, sweepTo: 120 })
  },
  heal() {
    ;[392, 523, 659].forEach((f, i) => tone(f, { dur: 0.3, gain: 0.08, delay: i * 0.06 }))
  },
  /** Đột phá thành công: hợp âm ngũ cung đi lên, chuông ngân; lên đại cảnh giới có thêm tiếng ầm. */
  breakthrough(big = false) {
    ;[392, 494, 587, 784, 988].forEach((f, i) => tone(f, { dur: 0.5, type: 'triangle', gain: 0.14, delay: i * 0.09 }))
    tone(1568, { dur: 1.2, gain: 0.07, delay: 0.4 })
    if (big) {
      tone(60, { dur: 1.2, gain: 0.35, slide: 35 })
      noise({ dur: 1.4, gain: 0.18, filter: 'lowpass', freq: 800, sweepTo: 80 })
    }
  },
  fail() {
    ;[330, 262, 196].forEach((f, i) => tone(f, { dur: 0.3, type: 'triangle', gain: 0.14, delay: i * 0.14 }))
    noise({ dur: 0.5, gain: 0.12, filter: 'lowpass', freq: 400, delay: 0.1 })
  },
  /** Mây kiếp tụ lại. */
  rumble() {
    noise({ dur: 2.2, gain: 0.3, filter: 'lowpass', freq: 160, sweepTo: 60 })
    tone(48, { dur: 2.2, gain: 0.2, attack: 0.4 })
  },
  /** Một đạo thiên lôi: tiếng nứt rồi sấm ầm. */
  bolt() {
    noise({ dur: 0.12, gain: 0.5, filter: 'highpass', freq: 2500 })
    noise({ dur: 1.3, gain: 0.5, filter: 'lowpass', freq: 500, sweepTo: 70, delay: 0.05 })
    tone(55, { dur: 0.9, gain: 0.3, slide: 30, delay: 0.05 })
  },
}

// ---------------------------------------------------------------------
// Nhạc nền
// ---------------------------------------------------------------------
function applyMusic() {
  if (!ctx) return
  musicBus.gain.setTargetAtTime(prefs.music ? 0.22 : 0, ctx.currentTime, 0.4)
  if (prefs.music) startMusic()
  else stopMusic()
}

function startMusic() {
  if (musicTimer || !ctx) return
  // Drone trầm: Rê và La lệch nhẹ tạo âm "ngân" huyền ảo
  drone = [73.42, 110.0, 110.6].map((f, i) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.value = f
    g.gain.value = i === 0 ? 0.5 : 0.18
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.07 + i * 0.03
    lfoGain.gain.value = g.gain.value * 0.5
    lfo.connect(lfoGain)
    lfoGain.connect(g.gain)
    osc.connect(g)
    g.connect(musicBus)
    osc.start()
    lfo.start()
    return { osc, lfo }
  })
  const playNote = () => {
    const battle = prefs.mode === 'battle'
    const idx = Math.floor(Math.random() * SCALE.length)
    const f = SCALE[idx]
    tone(f, { dur: battle ? 1.2 : 3.2, type: battle ? 'triangle' : 'sine', gain: battle ? 0.11 : 0.12, attack: battle ? 0.03 : 0.5, bus: musicBus })
    if (!battle && Math.random() < 0.35) tone(f * 1.5, { dur: 2.6, gain: 0.05, attack: 0.8, bus: musicBus, delay: 0.4 })
    musicTimer = setTimeout(playNote, (battle ? rand(500, 900) : rand(1800, 3800)))
  }
  const beat = () => {
    if (prefs.mode === 'battle') {
      tone(85, { dur: 0.22, gain: 0.3, slide: 42, bus: musicBus })
      noise({ dur: 0.06, gain: 0.04, filter: 'highpass', freq: 5000, bus: musicBus, delay: 0.3 })
    }
    beatTimer = setTimeout(beat, 600)
  }
  playNote()
  beat()
}

function stopMusic() {
  clearTimeout(musicTimer)
  clearTimeout(beatTimer)
  musicTimer = null
  beatTimer = null
  if (drone) {
    const old = drone
    drone = null
    setTimeout(() => old.forEach(({ osc, lfo }) => { osc.stop(); lfo.stop() }), 1200) // chờ nhạc nhỏ dần rồi tắt
  }
}
