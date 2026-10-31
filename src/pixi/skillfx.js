// =====================================================================
// skillfx.js - Hiệu ứng riêng cho từng kỹ năng trong cây kỹ năng (hiện có 8 chiêu của Kiếm Tu).
// Vẽ hoàn toàn bằng Graphics: kiếm bay, sét, mưa kiếm, kiếm ánh sáng khổng lồ, vòng buff.
// vfx = Vfx (add/later/time), ev = { id, name, color, kind, element, seconds }, from/to = điểm đầu (nhân vật) và đích (quái).
// Trả về true nếu kỹ năng có hiệu ứng riêng (Vfx.castSkill bỏ hiệu ứng chung theo hệ).
// =====================================================================
import { Sprite } from 'pixi.js'

const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const ease = (t) => 1 - (1 - t) * (1 - t)
const rand = (a, b) => a + Math.random() * (b - a)
const CYAN = 0x7fd8ff
const GOLD = 0xffd36b

/** Thanh kiếm: thân hình thoi từ chuôi (x, y) theo góc ang, dài L; hào quang màu `color`. */
function sword(g, x, y, ang, L, W, color, alpha = 1) {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const pts = [x, y, x + c * L * 0.22 - s * W, y + s * L * 0.22 + c * W, x + c * L, y + s * L, x + c * L * 0.22 + s * W, y + s * L * 0.22 - c * W]
  g.poly(pts).fill({ color: 0xffffff, alpha })
  g.poly(pts).stroke({ width: W * 0.7, color, alpha: alpha * 0.8 })
  g.moveTo(x - s * W * 1.7, y + c * W * 1.7).lineTo(x + s * W * 1.7, y - c * W * 1.7).stroke({ width: W * 0.5, color: GOLD, alpha })
}

/** Đường cong bậc hai qua A, điều khiển C, tới B. */
const bez = (a, c, b, t) => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
})

/** Một thanh kiếm bay từ A tới B sau `delay` giây, để vệt; chạm đích thì chớp `spark`. */
function flySword(vfx, A, B, { delay = 0, dur = 0.28, bulge = 0, L = 30, W = 4, color = CYAN, trail = 0.3, spark = true }) {
  const u = vfx.scene.u
  const C = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 + bulge * u }
  vfx.later(delay, () =>
    vfx.add(dur, (g, t) => {
      const k = ease(t)
      const p = bez(A, C, B, k)
      const q = bez(A, C, B, Math.min(1, k + 0.02))
      const ang = Math.atan2(q.y - p.y, q.x - p.x)
      for (let i = 1; i <= 6; i++) {
        const pb = bez(A, C, B, Math.max(0, k - i * trail * 0.06))
        const pa = bez(A, C, B, Math.max(0, k - (i - 1) * trail * 0.06))
        g.moveTo(pa.x, pa.y).lineTo(pb.x, pb.y).stroke({ width: (L / 7) * u * (1 - i / 7) + 1, color, alpha: 0.6 * (1 - i / 7), cap: 'round' })
      }
      sword(g, p.x - Math.cos(ang) * L * u * 0.3, p.y - Math.sin(ang) * L * u * 0.3, ang, L * u, W * u, color)
    }, {
      blend: 'add',
      onEnd: () => spark && vfx.add(0.22, (g, t) => {
        const r = lerp(6, 30, ease(t)) * u
        g.moveTo(B.x - r, B.y - r).lineTo(B.x + r, B.y + r).stroke({ width: 3 * u * (1 - t), color: 0xffffff, alpha: 1 - t })
        g.moveTo(B.x + r, B.y - r).lineTo(B.x - r, B.y + r).stroke({ width: 2.5 * u * (1 - t), color, alpha: 1 - t })
      }, { blend: 'add' }),
    }),
  )
}

/** Vòng sao quay trên đầu quái trong `seconds` giây (choáng). */
function stunStars(vfx, seconds) {
  const s = vfx.scene
  const u = s.u
  vfx.add(seconds, (g, t) => {
    const env = Math.min(1, t * seconds * 8, (1 - t) * seconds * 4)
    const cx = s.enemyX - 6 * u
    const cy = s.groundY - (s.enemyBoss ? 168 : 116) * u
    for (let i = 0; i < 3; i++) {
      const a = vfx.time * 6 + (i / 3) * Math.PI * 2
      const x = cx + Math.cos(a) * 20 * u
      const y = cy + Math.sin(a) * 6 * u
      for (let r = 0; r < 4; r++) {
        const b = (r / 4) * Math.PI * 2 + vfx.time * 3
        g.moveTo(x, y).lineTo(x + Math.cos(b) * 5 * u, y + Math.sin(b) * 5 * u).stroke({ width: 2 * u, color: GOLD, alpha: env })
      }
      g.circle(x, y, 2.4 * u).fill({ color: 0xffffff, alpha: env })
    }
  }, { blend: 'add' })
}

/** Ngự Kiếm Quyết: một thanh phi kiếm xé gió tới quái. */
function ngu(vfx, from, to) {
  vfx.landAt = vfx.time + 0.28
  flySword(vfx, from, to, { dur: 0.28, bulge: -12, L: 34, W: 4.5, trail: 0.5 })
}

/** Phi Kiếm Liên Hoàn: năm thanh kiếm nhỏ xoè quạt rồi lao vào quái lần lượt. */
function lienHoan(vfx, from, to) {
  const u = vfx.scene.u
  const n = 5
  vfx.landAt = vfx.time + 0.3 + (n - 1) * 0.07
  for (let i = 0; i < n; i++) {
    const spread = (i - (n - 1) / 2) * 34
    const A = { x: from.x - 24 * u, y: from.y + spread * u * 0.6 }
    flySword(vfx, A, { x: to.x + rand(-8, 8) * u, y: to.y + (i - 2) * 9 * u }, { delay: i * 0.07, dur: 0.3, bulge: spread * 0.9, L: 24, W: 3.2, trail: 0.4, color: i % 2 ? CYAN : 0xbfeaff })
  }
}

/** Phong Lôi Kiếm Quyết: sét từ trời giáng xuống quái, vòng sao choáng. */
function phongLoi(vfx, from, to, seconds) {
  const s = vfx.scene
  const u = s.u
  vfx.landAt = vfx.time + 0.2
  vfx.later(0.12, () => {
    const pts = [[to.x + rand(-10, 10) * u, -10]]
    const steps = 9
    for (let i = 1; i <= steps; i++) pts.push([to.x + rand(-16, 16) * u * (1 - i / steps), lerp(-10, to.y, i / steps)])
    pts[steps] = [to.x, to.y]
    s.shake = Math.max(s.shake, 6)
    s.flash = Math.max(s.flash, 0.25)
    vfx.add(0.3, (g, t) => {
      const a = (1 - t) * (Math.random() < 0.3 ? 0.4 : 1)
      g.moveTo(pts[0][0], pts[0][1])
      pts.forEach(([x, y]) => g.lineTo(x, y))
      g.stroke({ width: 9 * u * (1 - t * 0.6), color: CYAN, alpha: a * 0.6, join: 'round', cap: 'round' })
      g.moveTo(pts[0][0], pts[0][1])
      pts.forEach(([x, y]) => g.lineTo(x, y))
      g.stroke({ width: 3 * u, color: 0xffffff, alpha: a, join: 'round' })
      g.circle(to.x, to.y, lerp(8, 40, ease(t)) * u).stroke({ width: 3 * u, color: 0xffffff, alpha: 1 - t })
    }, { blend: 'add' })
    stunStars(vfx, seconds ?? 1.5)
  })
  flySword(vfx, from, { x: to.x - 10 * u, y: to.y }, { dur: 0.16, L: 30, W: 4, color: 0xdff6ff, trail: 0.3, spark: false })
}

/** Vạn Kiếm Quy Tông: trận kiếm hiện dưới chân quái, hàng chục thanh kiếm rơi như mưa. */
function vanKiem(vfx, from, to) {
  const s = vfx.scene
  const u = s.u
  const WAVES = 3
  const GAP = 0.45 // khớp `gap` của kiem_4: mỗi đợt kiếm rơi chạm quái cách nhau 0,45 giây
  vfx.landAt = vfx.time + 0.4 + (WAVES - 1) * GAP
  // Trận pháp kiếm dưới chân quái
  vfx.add(0.75 + (WAVES - 1) * GAP, (g, t) => {
    const env = Math.min(1, t * 6, (1 - t) * 2.5)
    const rx = 62 * u
    const ry = 16 * u
    const cx = to.x
    const cy = s.groundY + 2 * u
    g.ellipse(cx, cy, rx, ry).stroke({ width: 2.5 * u, color: GOLD, alpha: 0.9 * env })
    g.ellipse(cx, cy, rx * 0.62, ry * 0.62).stroke({ width: 1.5 * u, color: CYAN, alpha: 0.8 * env })
    for (let i = 0; i < 8; i++) {
      const a = vfx.time * 2 + (i / 8) * Math.PI * 2
      const x = cx + Math.cos(a) * rx
      const y = cy + Math.sin(a) * ry
      g.moveTo(x, y).lineTo(x, y - 12 * u).stroke({ width: 2 * u, color: 0xffffff, alpha: 0.85 * env })
    }
  }, { blend: 'add' })
  // Mưa kiếm
  const n = 22
  for (let i = 0; i < n; i++) {
    const wave = i % WAVES
    const delay = wave * GAP + rand(0.05, 0.36)
    const x = to.x + rand(-74, 74) * u
    const ground = s.groundY - rand(-6, 46) * u
    const top = -30 * u
    vfx.later(delay, () =>
      vfx.add(0.4, (g, t) => {
        const fall = clamp(t / 0.35, 0, 1)
        const y = lerp(top, ground, fall * fall)
        const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1
        if (fall < 1) g.moveTo(x, y - 60 * u).lineTo(x, y).stroke({ width: 2 * u, color: CYAN, alpha: 0.5 * fade })
        sword(g, x, y - 26 * u, Math.PI / 2, 30 * u, 3.4 * u, CYAN, fade)
        if (fall >= 1 && t < 0.55) g.circle(x, ground, lerp(3, 14, (t - 0.35) / 0.2) * u).stroke({ width: 2 * u, color: 0xffffff, alpha: 1 - (t - 0.35) / 0.2 })
      }, { blend: 'add' }),
    )
  }
  for (let wv = 0; wv < WAVES; wv++) {
    vfx.later(0.38 + wv * GAP, () => {
      s.shake = Math.max(s.shake, 8)
      s.burst(14, to.x, to.y, CYAN)
    })
  }
}

/** Tru Tiên Nhất Kiếm: tối màn hình, ngưng tụ kiếm ánh sáng khổng lồ, chém chéo, sóng xung kích. */
function truTien(vfx, from, to) {
  const s = vfx.scene
  const u = s.u
  const { w, h } = s.layoutSize
  const IMPACT = 0.72
  vfx.landAt = vfx.time + IMPACT
  // Màn hình tối đi rồi sáng lại
  vfx.add(1.35, (g, t) => {
    const a = t < 0.18 ? t / 0.18 : t < 0.68 ? 1 : 1 - (t - 0.68) / 0.32
    g.rect(0, 0, w, h).fill({ color: 0x050816, alpha: 0.55 * clamp(a, 0, 1) })
  })
  // Kiếm ánh sáng ngưng tụ trên đầu nhân vật, vòng sáng và hạt hội tụ
  const hx = from.x
  const hy = from.y - 70 * u
  vfx.add(IMPACT, (g, t) => {
    const k = clamp(t / 0.7, 0, 1)
    const L = lerp(30, 150, ease(k)) * u
    const ang = lerp(-Math.PI / 2 - 0.15, -Math.PI / 2 + 0.55, clamp((t - 0.55) / 0.17, 0, 1))
    g.circle(hx, hy, lerp(70, 18, k) * u).stroke({ width: 3 * u, color: GOLD, alpha: 0.6 * (1 - k * 0.4) })
    g.circle(hx, hy, lerp(110, 28, k) * u).stroke({ width: 2 * u, color: CYAN, alpha: 0.5 * (1 - k * 0.5) })
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 5
      const r = lerp(95, 6, (k + i * 0.05) % 1) * u
      g.circle(hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.6, 2.2 * u).fill({ color: 0xffffff, alpha: 0.9 })
    }
    sword(g, hx, hy + 24 * u, ang, L, 11 * u, CYAN, clamp(t * 4, 0, 1))
  }, { blend: 'add' })
  // Nhát chém chéo xuyên qua quái, sóng xung kích, vết nứt đất
  vfx.later(IMPACT, () => {
    s.shake = Math.max(s.shake, 14)
    s.flash = Math.max(s.flash, 0.7)
    s.burst(46, to.x, to.y, 0xffffff)
    const x0 = to.x - 240 * u
    const y0 = to.y - 190 * u
    const x1 = to.x + 150 * u
    const y1 = to.y + 70 * u
    vfx.add(0.4, (g, t) => {
      const grow = clamp(t / 0.12, 0, 1)
      const a = 1 - clamp((t - 0.1) / 0.3, 0, 1)
      const ex = lerp(x0, x1, grow)
      const ey = lerp(y0, y1, grow)
      g.moveTo(x0, y0).lineTo(ex, ey).stroke({ width: 40 * u * a, color: CYAN, alpha: 0.45 * a, cap: 'round' })
      g.moveTo(x0, y0).lineTo(ex, ey).stroke({ width: 18 * u * a, color: 0xffffff, alpha: a, cap: 'round' })
    }, { blend: 'add' })
    vfx.add(0.7, (g, t) => {
      for (let i = 0; i < 3; i++) {
        const tt = clamp(t * 1.3 - i * 0.14, 0, 1)
        if (tt <= 0) continue
        g.ellipse(to.x, s.groundY + 4 * u, lerp(10, 130, ease(tt)) * u, lerp(4, 30, ease(tt)) * u).stroke({ width: 4 * u * (1 - tt), color: i === 0 ? 0xffffff : CYAN, alpha: 1 - tt })
      }
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI
        const r = lerp(8, 90, ease(t)) * u
        g.moveTo(to.x, s.groundY + 4 * u).lineTo(to.x + Math.cos(a) * r * 1.3, s.groundY + 4 * u + Math.sin(a) * r * 0.25).stroke({ width: 2.5 * u * (1 - t), color: 0xffffff, alpha: 1 - t })
      }
    }, { blend: 'add' })
  })
}

/** Kiếm Tâm Thông Minh (tăng chí mạng): vòng vàng và hạt sáng quanh đầu nhân vật trong `seconds` giây. */
function kiemTam(vfx, seconds) {
  const s = vfx.scene
  const u = s.u
  vfx.add(seconds, (g, t) => {
    const env = Math.min(1, t * seconds * 5, (1 - t) * seconds * 2)
    const cx = s.char.x
    const cy = s.groundY - 158 * u
    const ph = vfx.time * 2.4
    g.ellipse(cx, cy, 30 * u, 8 * u).stroke({ width: 2.5 * u, color: GOLD, alpha: 0.85 * env })
    for (let i = 0; i < 3; i++) {
      const a = ph + (i / 3) * Math.PI * 2
      const x = cx + Math.cos(a) * 30 * u
      const y = cy + Math.sin(a) * 8 * u
      g.circle(x, y, 3 * u).fill({ color: 0xffffff, alpha: env })
      g.circle(x, y, 7 * u).fill({ color: GOLD, alpha: 0.35 * env })
    }
    for (let i = 0; i < 4; i++) {
      const f = (vfx.time * 0.9 + i / 4) % 1
      g.circle(cx + Math.sin(i * 2.7) * 18 * u, cy + 14 * u - f * 40 * u, 1.8 * u).fill({ color: GOLD, alpha: (1 - f) * env })
    }
  }, { blend: 'add' })
}

/** Đạp Vân Bộ (tăng tốc): mây dưới chân, vệt tốc độ sau lưng và bóng mờ nối đuôi nhân vật. */
function dapVan(vfx, seconds) {
  const s = vfx.scene
  const u = s.u
  let nextGhost = 0
  vfx.add(seconds, (g, t) => {
    const env = Math.min(1, t * seconds * 5, (1 - t) * seconds * 2)
    const x = s.char.x
    for (let i = 0; i < 4; i++) {
      const ph = (vfx.time * 1.4 + i * 0.25) % 1
      g.circle(x - 18 * u + i * 12 * u - ph * 22 * u, s.groundY - 4 * u + Math.sin(i * 2 + vfx.time * 4) * 2 * u, lerp(8, 15, ph) * u).fill({ color: 0xffffff, alpha: 0.28 * (1 - ph) * env })
    }
    for (let i = 0; i < 6; i++) {
      const ph = (vfx.time * 3 + i * 0.17) % 1
      const y = s.groundY - (30 + i * 22) * u
      g.moveTo(x - 36 * u - ph * 30 * u, y).lineTo(x - 70 * u - ph * 50 * u, y).stroke({ width: 1.8 * u, color: 0xdff6ff, alpha: 0.5 * (1 - ph) * env })
    }
    if (vfx.time >= nextGhost) {
      nextGhost = vfx.time + 0.18
      ghost(vfx, 0.35 * env)
    }
  }, { blend: 'add' })
}

/** Bóng mờ của nhân vật (cùng tranh và tư thế) mờ dần về phía sau. */
function ghost(vfx, alpha) {
  const s = vfx.scene
  const hs = s.heroSprite
  if (!hs || !hs.visible || alpha < 0.05) return
  const node = new Sprite(hs.texture)
  node.anchor.set(hs.anchor.x, hs.anchor.y)
  node.scale.set(s.char.scale.x * hs.scale.x, s.char.scale.y * hs.scale.y)
  node.tint = 0x9fdcff
  const x0 = s.char.x
  node.position.set(x0, s.char.y)
  vfx.add(0.38, (n, t) => {
    n.alpha = alpha * (1 - t)
    n.x = x0 - 28 * s.u * t
  }, { node, blend: 'add' })
}

/** Kiếm Ý Hộ Thể (lá chắn): sáu thanh kiếm nhỏ xoay quanh nhân vật thành vòm ánh kiếm. */
function hoThe(vfx, seconds) {
  const s = vfx.scene
  const u = s.u
  vfx.add(seconds, (g, t) => {
    const env = Math.min(1, t * seconds * 5, (1 - t) * seconds * 2)
    const cx = s.char.x
    const cy = s.groundY - 92 * u
    const rx = 58 * u
    const ry = 84 * u
    g.ellipse(cx, cy, rx, ry).fill({ color: CYAN, alpha: 0.07 * env })
    g.ellipse(cx, cy, rx, ry).stroke({ width: 2 * u, color: CYAN, alpha: 0.55 * env * (0.8 + 0.2 * Math.sin(vfx.time * 5)) })
    for (let i = 0; i < 6; i++) {
      const a = vfx.time * 1.3 + (i / 6) * Math.PI * 2
      const x = cx + Math.cos(a) * rx * 0.92
      const y = cy + Math.sin(a) * ry * 0.5
      const tangent = a + Math.PI / 2
      const front = Math.sin(a) > 0 ? 1 : 0.55 // nửa sau mờ hơn: tạo chiều sâu
      sword(g, x - Math.cos(tangent) * 12 * u, y - Math.sin(tangent) * 12 * u, tangent, 24 * u, 3 * u, CYAN, env * front)
    }
  }, { blend: 'add' })
}

const HANDLERS = {
  kiem_1: (v, e, f, t) => ngu(v, f, t),
  kiem_2: (v, e, f, t) => lienHoan(v, f, t),
  kiem_3: (v, e, f, t) => phongLoi(v, f, t, e.seconds),
  kiem_4: (v, e, f, t) => vanKiem(v, f, t),
  kiem_5: (v, e, f, t) => truTien(v, f, t),
  kiem_6: (v, e) => kiemTam(v, e.seconds ?? 8),
  kiem_7: (v, e) => dapVan(v, e.seconds ?? 8),
  kiem_8: (v, e) => hoThe(v, e.seconds ?? 10),
}

/** Chạy hiệu ứng riêng của kỹ năng `ev.id` nếu có; trả về true nếu đã xử lý. */
export function skillFx(vfx, ev, from, to) {
  const h = HANDLERS[ev.id]
  if (!h) return false
  h(vfx, ev, from, to)
  return true
}
