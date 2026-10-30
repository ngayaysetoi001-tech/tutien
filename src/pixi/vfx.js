// =====================================================================
// vfx.js - Hiệu ứng chiêu thức theo ngũ hành, khiên, hồi máu, tăng tốc và cảnh đột phá.
// Mỗi hiệu ứng là một Graphics/Sprite được vẽ lại mỗi khung theo tiến độ t (0..1) rồi tự huỷ.
// Scene cung cấp: px, enemyX, groundY, u, glowTex, burst(), addRing(), spawnText().
// =====================================================================
import { Container, Graphics, Sprite } from 'pixi.js'

const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const ease = (t) => 1 - (1 - t) * (1 - t)
const css = (n) => '#' + n.toString(16).padStart(6, '0')

export class Vfx {
  constructor(scene) {
    this.scene = scene
    this.layer = new Container()
    this.fx = []
    this.timers = []
    this.time = 0
    this.landAt = 0 // thời điểm chiêu thức đang bay chạm đích (trễ các hiệu ứng trúng đòn tương ứng)
  }

  /** Chạy fn sau `delay` giây. */
  later(delay, fn) {
    this.timers.push({ at: this.time + delay, fn })
  }

  /** Nếu có chiêu đang bay thì trì hoãn fn tới lúc chạm đích, ngược lại chạy ngay. */
  defer(fn) {
    const wait = this.landAt - this.time
    if (wait > 0) this.later(wait, fn)
    else fn()
  }

  /**
   * Thêm hiệu ứng sống `dur` giây. draw(node, t, dt) được gọi mỗi khung (node là Graphics
   * đã clear, hoặc Sprite nếu truyền opts.node). opts: { blend, onEnd, node }.
   */
  add(dur, draw, opts = {}) {
    const node = opts.node ?? new Graphics()
    if (opts.blend) node.blendMode = opts.blend
    this.layer.addChild(node)
    this.fx.push({ node, dur, t: 0, draw, onEnd: opts.onEnd })
    return node
  }

  update(dt) {
    this.time += dt
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.timers[i].at <= this.time) {
        const { fn } = this.timers[i]
        this.timers.splice(i, 1)
        fn()
      }
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const e = this.fx[i]
      e.t += dt
      const p = clamp(e.t / e.dur, 0, 1)
      if (e.node.clear) e.node.clear()
      e.draw(e.node, p, dt)
      if (p >= 1) {
        e.onEnd?.()
        e.node.destroy()
        this.fx.splice(i, 1)
      }
    }
  }

  // ------------------------------------------------------------------
  // Chiêu thức
  // ------------------------------------------------------------------
  /** Thi triển võ kỹ: ev = { name, color, kind, element, seconds }. */
  castSkill(ev) {
    const s = this.scene
    const u = s.u
    const from = { x: s.px + 34 * u, y: s.groundY - 95 * u }
    const to = { x: s.enemyX - 12 * u, y: s.groundY - 58 * u }
    const color = ev.color

    // Vòng triệu hồi quanh người thi triển
    this.add(0.4, (g, t) => {
      g.ellipse(s.px, s.groundY - 4 * u, lerp(20, 78, ease(t)) * u, lerp(6, 18, ease(t)) * u).stroke({ width: 3 * u, color, alpha: 1 - t })
    }, { blend: 'add' })

    if (ev.kind === 'damage') {
      this.landAt = this.time + 0.3
      this.damageSkill(ev.element, from, to, color)
    } else if (ev.kind === 'heal') {
      this.healEffect(color)
    } else if (ev.kind === 'shield') {
      this.shieldEffect(color, ev.seconds ?? 8)
    } else if (ev.kind === 'haste') {
      this.hasteEffect(color, ev.seconds ?? 6)
    }
  }

  damageSkill(element, from, to, color) {
    const s = this.scene
    const u = s.u
    const dir = Math.atan2(to.y - from.y, to.x - from.x)
    const pos = (t) => ({ x: lerp(from.x, to.x, ease(t)), y: lerp(from.y, to.y, ease(t)) })

    if (element === 'kim') {
      // Phi kiếm xé gió rồi để lại hai vệt chém hình chữ X
      this.add(0.3, (g, t) => {
        const p = pos(t)
        const back = pos(Math.max(0, t - 0.25))
        g.moveTo(back.x, back.y).lineTo(p.x, p.y).stroke({ width: 4 * u, color, alpha: 0.5 })
        const c = Math.cos(dir), sn = Math.sin(dir)
        const L = 26 * u, W = 5 * u
        g.poly([p.x + c * L, p.y + sn * L, p.x - sn * W, p.y + c * W, p.x - c * L * 0.6, p.y - sn * L * 0.6, p.x + sn * W, p.y - c * W]).fill({ color: 0xffffff })
      }, { blend: 'add', onEnd: () => {
        this.add(0.28, (g, t) => {
          const r = lerp(8, 46, ease(t)) * u
          g.moveTo(to.x - r, to.y - r).lineTo(to.x + r, to.y + r).stroke({ width: 4 * u, color: 0xffffff, alpha: 1 - t })
          g.moveTo(to.x + r, to.y - r).lineTo(to.x - r, to.y + r).stroke({ width: 3 * u, color, alpha: 1 - t })
        }, { blend: 'add' })
      } })
    } else if (element === 'hoa') {
      // Cầu lửa có đuôi, nổ tung khi chạm
      this.add(0.3, (g, t) => {
        for (let k = 6; k >= 0; k--) {
          const p = pos(Math.max(0, t - k * 0.04))
          g.circle(p.x, p.y + Math.sin(k + t * 20) * 2 * u, (13 - k * 1.5) * u).fill({ color: k < 2 ? 0xffe08a : color, alpha: 0.85 - k * 0.1 })
        }
      }, { blend: 'add', onEnd: () => {
        s.burst(16, to.x, to.y, color)
        this.add(0.45, (g, t) => {
          g.circle(to.x, to.y, lerp(10, 62, ease(t)) * u).stroke({ width: 5 * u, color, alpha: 1 - t })
          g.circle(to.x, to.y, lerp(30, 8, t) * u).fill({ color: 0xffe08a, alpha: 0.7 * (1 - t) })
        }, { blend: 'add' })
      } })
    } else if (element === 'thuy') {
      // Ba mảnh băng bay liên tiếp, vỡ thành bông tuyết
      this.add(0.38, (g, t) => {
        for (let i = 0; i < 3; i++) {
          const tt = clamp(t * 1.5 - i * 0.18, 0, 1)
          if (tt <= 0 || tt >= 1) continue
          const p = pos(tt)
          const y = p.y + (i - 1) * 16 * u
          const c = Math.cos(dir), sn = Math.sin(dir)
          g.poly([p.x + c * 20 * u, y + sn * 20 * u, p.x - sn * 6 * u, y + c * 6 * u, p.x - c * 12 * u, y - sn * 12 * u, p.x + sn * 6 * u, y - c * 6 * u]).fill({ color: 0xcfeeff, alpha: 0.95 })
        }
      }, { blend: 'add', onEnd: () => {
        s.burst(10, to.x, to.y, 0xcfeeff)
        this.add(0.5, (g, t) => {
          const r = lerp(8, 44, ease(t)) * u
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2
            g.moveTo(to.x, to.y).lineTo(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r).stroke({ width: 3 * u, color: 0xcfeeff, alpha: 1 - t })
          }
          g.circle(to.x, to.y, r * 0.6).stroke({ width: 2 * u, color, alpha: 1 - t })
        }, { blend: 'add' })
      } })
    } else if (element === 'moc') {
      // Dây leo trồi lên từ mặt đất quấn lấy mục tiêu
      this.add(0.5, (g, t) => {
        const grow = clamp(t * 1.8, 0, 1)
        for (let i = 0; i < 4; i++) {
          const bx = to.x + (i - 1.5) * 16 * u
          const pts = []
          const steps = 10
          for (let k = 0; k <= steps * grow; k++) {
            const f = k / steps
            pts.push([bx + Math.sin(f * 6 + i) * 10 * u, s.groundY + 6 * u - f * 90 * u])
          }
          if (pts.length < 2) continue
          g.moveTo(pts[0][0], pts[0][1])
          pts.forEach(([x, y]) => g.lineTo(x, y))
          g.stroke({ width: 4 * u, color: 0x3fa84a, alpha: (1 - t * 0.6), cap: 'round', join: 'round' })
          const [tx, ty] = pts[pts.length - 1]
          g.circle(tx, ty, 5 * u).fill({ color, alpha: 1 - t * 0.5 })
        }
      }, { onEnd: () => s.burst(12, to.x, to.y - 20 * u, color) })
    } else if (element === 'tho') {
      // Gai đá nhô lên từ lòng đất
      this.add(0.45, (g, t) => {
        const up = ease(clamp(t * 2, 0, 1))
        const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
        for (let i = 0; i < 3; i++) {
          const bx = to.x + (i - 1) * 22 * u
          const hh = (60 + (i % 2) * 24) * u * up
          const by = s.groundY + 6 * u
          g.poly([bx - 12 * u, by, bx - 3 * u, by - hh, bx + 4 * u, by - hh * 0.9, bx + 13 * u, by]).fill({ color: 0xa8814a, alpha: fade })
          g.poly([bx - 3 * u, by - hh, bx + 4 * u, by - hh * 0.9, bx + 13 * u, by, bx + 2 * u, by]).fill({ color: 0x6e5230, alpha: fade })
        }
      }, { onEnd: () => s.burst(12, to.x, s.groundY - 10 * u, 0xd2a15a) })
    } else {
      this.add(0.3, (g, t) => {
        const p = pos(t)
        g.circle(p.x, p.y, 12 * u).fill({ color, alpha: 0.9 })
      }, { blend: 'add' })
    }
  }

  /** Vệt chém cong khi đánh thường (đòn chí mạng to và vàng hơn). */
  slashArc(crit) {
    const s = this.scene
    const u = s.u
    const cx = s.enemyX - 20 * u
    const cy = s.groundY - 62 * u
    const color = crit ? 0xffd36b : 0xffffff
    this.add(0.22, (g, t) => {
      const k = ease(Math.min(1, t * 1.5))
      const sx = cx + 34 * u
      const sy = cy - 44 * u
      const ex = lerp(sx, cx + 18 * u, k)
      const ey = lerp(sy, cy + 44 * u, k)
      g.moveTo(sx, sy).quadraticCurveTo(cx - 16 * u, cy - 4 * u, ex, ey).stroke({ width: (crit ? 8 : 5) * u * (1 - t * 0.5), color, alpha: 1 - t, cap: 'round' })
      g.moveTo(sx, sy).quadraticCurveTo(cx - 8 * u, cy - 4 * u, ex, ey).stroke({ width: (crit ? 3 : 2) * u, color: 0xffffff, alpha: 1 - t, cap: 'round' })
    }, { blend: 'add' })
  }

  /** Chớp trúng đòn khi nhân vật có hoạt ảnh chém: tia toả ra và vòng sáng ở chỗ địch (vệt chém do mũi kiếm vẽ). */
  slashImpact(crit) {
    const s = this.scene
    const u = s.u
    const cx = s.enemyX - 20 * u
    const cy = s.groundY - 62 * u
    const color = crit ? 0xffd36b : 0xbfeaff
    this.add(0.26, (g, t) => {
      const k = ease(t)
      g.circle(cx, cy, lerp(6, crit ? 46 : 34, k) * u).stroke({ width: (crit ? 4 : 3) * u * (1 - t), color, alpha: 1 - t })
      for (let i = 0; i < 6; i++) {
        const a = -0.5 + i * 0.55
        const r0 = lerp(8, 26, k) * u
        const r1 = lerp(16, crit ? 58 : 44, k) * u
        g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0).lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1).stroke({ width: 2.5 * u * (1 - t), color: 0xffffff, alpha: 1 - t, cap: 'round' })
      }
    }, { blend: 'add' })
  }

  healEffect(color) {
    const s = this.scene
    const u = s.u
    this.add(1.0, (g, t) => {
      for (let i = 0; i < 7; i++) {
        const ph = (t + i / 7) % 1
        const x = s.px + Math.sin(i * 2.1 + t * 3) * 34 * u
        const y = s.groundY - 20 * u - ph * 120 * u
        const a = (1 - ph) * 0.9
        g.moveTo(x - 5 * u, y).lineTo(x + 5 * u, y).moveTo(x, y - 5 * u).lineTo(x, y + 5 * u).stroke({ width: 3 * u, color, alpha: a })
      }
      g.circle(s.px, s.groundY - 70 * u, lerp(30, 70, ease(t)) * u).fill({ color, alpha: 0.18 * (1 - t) })
    }, { blend: 'add' })
  }

  /** Khiên: vòm sáng bao quanh nhân vật trong `seconds` giây, đi theo nhân vật. */
  shieldEffect(color, seconds) {
    const s = this.scene
    const u = s.u
    this.add(seconds, (g, t) => {
      const env = Math.min(1, t * seconds * 6, (1 - t) * seconds * 1.5)
      const cx = s.px
      const cy = s.groundY - 66 * u
      const rx = 64 * u
      const ry = 82 * u
      const pulse = 0.8 + 0.2 * Math.sin(this.time * 5)
      g.ellipse(cx, cy, rx, ry).fill({ color, alpha: 0.12 * env })
      g.ellipse(cx, cy, rx, ry).stroke({ width: 2.5 * u, color, alpha: 0.75 * env * pulse })
      for (let k = -1; k <= 1; k++) g.ellipse(cx, cy + k * ry * 0.45, rx * (1 - Math.abs(k) * 0.25), ry * 0.18).stroke({ width: 1 * u, color, alpha: 0.28 * env })
      g.moveTo(cx, cy - ry).lineTo(cx, cy + ry).stroke({ width: 1 * u, color, alpha: 0.2 * env })
    }, { blend: 'add' })
  }

  /** Tăng tốc: vệt gió sau lưng và tàn ảnh. */
  hasteEffect(color, seconds) {
    const s = this.scene
    const u = s.u
    this.add(seconds, (g, t) => {
      const env = Math.min(1, t * seconds * 5, (1 - t) * seconds * 1.5)
      for (let i = 0; i < 8; i++) {
        const ph = (t * seconds * 2.4 + i / 8) % 1
        const x = s.px - 26 * u - ph * 80 * u
        const y = s.groundY - 18 * u - i * 12 * u
        g.moveTo(x, y).lineTo(x - 26 * u, y).stroke({ width: 2.5 * u, color, alpha: (1 - ph) * 0.8 * env })
      }
      g.ellipse(s.px, s.groundY - 4 * u, 52 * u, 10 * u).stroke({ width: 2 * u, color, alpha: 0.4 * env })
    }, { blend: 'add' })
  }

  // ------------------------------------------------------------------
  // Đột phá
  // ------------------------------------------------------------------
  /** Cột sáng xung thiên, tia sáng toả ra và chữ ĐỘT PHÁ. `big` khi lên đại cảnh giới. */
  breakthrough({ color, big, stageName }) {
    const s = this.scene
    const u = s.u
    const px = s.px

    for (const [width, tint, alpha] of [[1.1, color, 0.85], [0.45, 0xffffff, 1]]) {
      const sprite = new Sprite(s.glowTex)
      sprite.anchor.set(0.5, 0.9)
      sprite.tint = tint
      sprite.blendMode = 'add'
      this.add(big ? 2.2 : 1.5, (node, t) => {
        node.position.set(px, s.groundY - 8 * u)
        node.scale.set(width * u * (1 - 0.45 * t) * (0.9 + 0.1 * Math.sin(this.time * 18)), (big ? 9 : 6.5) * u)
        node.alpha = alpha * Math.pow(1 - t, 0.7)
      }, { node: sprite })
    }

    // Tia sáng toả ra
    this.add(big ? 1.6 : 1.1, (g, t) => {
      const cx = px
      const cy = s.groundY - 70 * u
      const n = big ? 18 : 12
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + t * 0.6
        const r0 = (30 + t * 60) * u
        const r1 = (60 + ease(t) * (big ? 300 : 200)) * u
        g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0).lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
        g.stroke({ width: 2.5 * u, color: i % 2 ? 0xffffff : color, alpha: 0.7 * (1 - t) })
      }
    }, { blend: 'add' })

    s.spawnText('ĐỘT PHÁ!', px, s.groundY - 140 * u, '#ffe08a', big ? 36 : 28)
    if (stageName) this.later(0.5, () => s.spawnText(stageName, px, s.groundY - 110 * u, css(color), 22))
  }
}
