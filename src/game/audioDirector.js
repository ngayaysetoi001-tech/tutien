// =====================================================================
// audioDirector.js - Nối sự kiện game (events.js) với âm thanh (audio.js).
// Gọi bindAudio() một lần khi mở game; trả về hàm huỷ.
// =====================================================================
import { on } from './events.js'
import { sfx, setMusicMode, unlockAudio } from './audio.js'

export function bindAudio() {
  // Mở khoá âm thanh ở lần chạm đầu tiên (chính sách autoplay của trình duyệt)
  const unlock = () => unlockAudio()
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)

  let lastHit = 0
  const throttled = (fn) => {
    const now = performance.now()
    if (now - lastHit < 70) return
    lastHit = now
    fn()
  }

  const offs = [
    on('battle-hit', ({ target, crit, skill }) => {
      if (target === 'player') return throttled(() => sfx.hurt())
      // Đòn chiêu thức chạm đích sau ~0.3s (khớp hiệu ứng bay)
      if (skill) setTimeout(() => sfx.hit(true), 300)
      else throttled(() => sfx.hit(crit))
    }),
    on('battle-skill', ({ kind }) => sfx.skill(kind)),
    on('battle-heal', () => sfx.heal()),
    on('battle-enemy-die', ({ boss }) => setTimeout(() => sfx.die(boss), 120)),
    on('breakthrough-success', ({ realmChanged }) => sfx.breakthrough(realmChanged)),
    on('breakthrough-fail', () => sfx.fail()),
    on('tribulation-start', () => {
      setMusicMode('battle')
      sfx.rumble()
    }),
    on('tribulation-bolt', () => sfx.bolt()),
    on('tribulation-end', ({ survived }) => {
      setMusicMode('calm')
      if (survived) sfx.breakthrough(true)
      else sfx.fail()
    }),
  ]

  return () => {
    offs.forEach((off) => off())
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
}
