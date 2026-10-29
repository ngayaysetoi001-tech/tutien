// =====================================================================
// art.js - Toàn bộ hình vẽ bằng code của nhân vật, hồ ly Bạch Linh và yêu thú.
//
// Mọi hàm nhận một đối tượng Graphics (PixiJS v8) và tự vẽ; không import pixi nên có thể
// test bằng Graphics giả trong Node. Gốc toạ độ = điểm tiếp đất, quay mặt sang phải.
//   drawEnemy(g, kind, color, boss, t, atk)  - vẽ lại MỖI KHUNG: t = giây, atk = 0..1 (đang tấn công)
//   drawHeroBody / drawHeroFace / drawSword   - vẽ khi đổi tư thế, cảnh giới, vũ khí, trạng thái mắt
//   drawHeroFx(g, ...)                        - hiệu ứng theo cảnh giới, vẽ lại mỗi khung
//   drawFox(g, ...)                           - Bạch Linh, vẽ lại mỗi khung
// =====================================================================

const { sin, cos, PI } = Math

function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
  const l = (x, y) => Math.round(x + (y - x) * t)
  return (l(ar, br) << 16) | (l(ag, bg) << 8) | l(ab, bb)
}

const line = (g, pts, width, color, alpha = 1) => {
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
  g.stroke({ width, color, alpha, cap: 'round', join: 'round' })
}

// =====================================================================
// YÊU THÚ
// =====================================================================
export const ENEMY_KINDS = ['beast', 'serpent', 'spirit', 'golem', 'ape', 'treant', 'zombie', 'demon', 'bird', 'ghost', 'skeleton', 'dragon', 'bat']

function beast({ g, color, dark, light, eye, t, a }) {
  const sw = sin(t * 3) * 6
  const br = sin(t * 2.2) * 1.2
  const open = a * 10
  g.moveTo(-34, -34).quadraticCurveTo(-64 + sw, -62 + sw * 0.6, -54 + sw * 1.2, -16).stroke({ width: 8, color: dark, cap: 'round' })
  ;[[-24, 0], [-12, 2], [16, 1], [28, 3]].forEach(([x, ph]) => {
    g.moveTo(x, -22).lineTo(x + (x < 0 ? -3 : 3) + sin(t * 2 + ph) * 1.5, 0).stroke({ width: 8, color: dark, cap: 'round' })
  })
  for (let i = 0; i < 4; i++) g.poly([-26 + i * 14, -50 + br, -20 + i * 14, -66 + br, -14 + i * 14, -50 + br]).fill({ color: dark })
  g.ellipse(0, -32 + br, 40, 21 + br * 0.5).fill({ color })
  g.ellipse(2, -26 + br, 30, 11).fill({ color: light, alpha: 0.3 })
  g.ellipse(38, -44, 17, 14).fill({ color })
  g.poly([48, -47 - open * 0.4, 70, -38 - open * 0.8, 50, -33]).fill({ color: dark }) // hàm trên
  g.poly([48, -33, 66, -31 + open, 46, -27 + open * 0.5]).fill({ color: dark }) // hàm dưới
  if (open > 2) g.poly([50, -32, 62, -30 + open * 0.7, 50, -28]).fill({ color: 0xd8445a })
  g.poly([30, -54, 34 + sin(t * 7) * 1.5, -74, 43, -54]).fill({ color: dark }) // tai giật
  g.circle(44, -48, 3.2).fill({ color: eye })
  g.poly([54, -37 - open * 0.3, 57, -30, 60, -37 - open * 0.2]).fill({ color: 0xffffff })
}

function serpent({ g, color, dark, light, eye, t, a }) {
  const pts = []
  for (let i = 0; i <= 18; i++) pts.push([-52 + i * 5.6, -12 - i * 1.2 - sin(i * 0.75 - t * 3) * 13])
  line(g, pts, 18, color)
  line(g, pts.map(([x, y]) => [x, y - 3]), 6, light, 0.45)
  // vảy vằn
  for (let i = 2; i < 18; i += 3) line(g, [[pts[i][0] - 2, pts[i][1] - 7], [pts[i][0] + 2, pts[i][1] + 7]], 2, dark, 0.5)
  const [hx0, hy0] = pts[18]
  const hx = hx0 + a * 10
  const hy = hy0 - a * 14
  const open = a * 9
  g.ellipse(hx + 4, hy - 8, 16, 12).fill({ color })
  g.poly([hx + 12, hy - 11 - open * 0.5, hx + 26, hy - 8, hx + 12, hy - 5]).fill({ color: dark })
  g.circle(hx + 8, hy - 12, 3).fill({ color: eye })
  const flick = sin(t * 14) * 3
  g.poly([hx + 18, hy - 8 + open * 0.3, hx + 32 + flick, hy - 11, hx + 27, hy - 6, hx + 33 + flick, hy - 3]).fill({ color: 0xff5577 })
  g.poly([hx + 10, hy - 1 + open * 0.4, hx + 12, hy + 6 + open * 0.8, hx + 15, hy - 1 + open * 0.4]).fill({ color: 0xffffff })
}

function spirit({ g, color, dark, light, eye, t, a }) {
  const fl = sin(t * 3)
  for (let i = 0; i < 4; i++) {
    const x = -24 + i * 16
    g.poly([x, -36, x + 8 + sin(t * 4 + i) * 5, -2, x + 16, -36]).fill({ color, alpha: 0.5 })
  }
  const r = 1 + a * 0.15
  g.circle(0, -54 + fl * 2, 32 * r).fill({ color, alpha: 0.35 })
  g.circle(0, -54 + fl * 2, 25 * r).fill({ color, alpha: 0.85 })
  g.circle(-4, -60 + fl * 2, 12).fill({ color: light, alpha: 0.5 })
  g.ellipse(-9, -56 + fl * 2, 4.5, 7).fill({ color: eye })
  g.ellipse(9, -56 + fl * 2, 4.5, 7).fill({ color: eye })
  g.ellipse(0, -42 + fl * 2, 6 + a * 3, 2 + a * 6).fill({ color: dark })
  for (let i = 0; i < 3; i++) g.circle(sin(t * 1.5 + i * 2.1) * 36, -54 + cos(t * 1.5 + i * 2.1) * 30, 3).fill({ color: light, alpha: 0.7 })
}

function golem({ g, color, dark, light, eye, t, a }) {
  const br = sin(t * 1.8) * 1.2
  g.rect(-22, -34, 16, 34).fill({ color: dark })
  g.rect(6, -34, 16, 34).fill({ color: dark })
  g.rect(-32, -86 + br, 64, 56).fill({ color })
  g.rect(-32, -86 + br, 64, 10).fill({ color: light, alpha: 0.35 })
  for (let i = 0; i < 3; i++) g.moveTo(-26 + i * 22, -80 + br).lineTo(-20 + i * 22, -40).stroke({ width: 1.5, color: dark, alpha: 0.5 })
  g.rect(-46, -82 + br, 14, 44).fill({ color: dark })
  // tay phải giơ búa khi tấn công
  g.poly([32, -82 + br, 46, -82 + br, 46 + a * 8, -38 - a * 56, 32 + a * 4, -38 - a * 50]).fill({ color: dark })
  g.rect(-16, -112 + br, 32, 28).fill({ color })
  g.rect(-10, -104 + br, 7, 6).fill({ color: eye })
  g.rect(3, -104 + br, 7, 6).fill({ color: eye })
  const pulse = 0.7 + 0.3 * sin(t * 4)
  g.circle(0, -58 + br, 9).fill({ color: eye, alpha: 0.9 * pulse })
  g.circle(0, -58 + br, 16).fill({ color: eye, alpha: 0.25 * pulse })
}

function ape({ g, color, dark, light, eye, t, a }) {
  const br = sin(t * 2.4) * 1.5
  g.moveTo(-18, -30).quadraticCurveTo(-52, -34 + sin(t * 3) * 6, -44, -66).stroke({ width: 6, color: dark, cap: 'round' })
  line(g, [[-10, -26], [-16, -12], [-14, 0]], 11, dark)
  line(g, [[12, -26], [18, -12], [16, 0]], 11, dark)
  g.ellipse(0, -48 + br, 24, 28).fill({ color })
  g.ellipse(4, -44 + br, 14, 18).fill({ color: light, alpha: 0.5 })
  // tay trái đu đưa, tay phải vung lên khi tấn công
  line(g, [[-14, -66 + br], [-30, -50], [-26 + sin(t * 2) * 4, -26]], 11, color)
  g.circle(-26 + sin(t * 2) * 4, -24, 7).fill({ color: dark })
  const hx = 30 + a * 8
  const hy = -34 - a * 74
  line(g, [[16, -66 + br], [34, -60 - a * 20], [hx, hy]], 11, color)
  g.circle(hx, hy, 8).fill({ color: dark })
  g.circle(8, -84 + br, 15).fill({ color })
  g.circle(-4, -92 + br, 5).fill({ color: dark })
  g.circle(18, -92 + br, 5).fill({ color: dark })
  g.ellipse(14, -80 + br, 10, 9).fill({ color: light })
  g.poly([8, -91 + br, 20, -88 + br, 20, -85 + br]).fill({ color: dark }) // chân mày giận dữ
  g.circle(16, -87 + br, 2.6).fill({ color: eye })
  g.moveTo(10, -75 + br).lineTo(20, -75 + br - a * 3).stroke({ width: 2, color: dark })
  for (const x of [13, 17]) g.poly([x, -75 + br, x + 1.5, -71 + br - a * 3, x + 3, -75 + br]).fill({ color: 0xffffff })
}

function treant({ g, color, dark, light, eye, t, a }) {
  const sw = sin(t * 1.8) * 3
  for (const [x, w] of [[-22, 12], [-6, 8], [14, 12]]) g.poly([x, -8, x + w, -8, x + w * 0.6 + 8, 2, x - 8, 2]).fill({ color: dark })
  g.poly([-22, -4, -16, -62, -12, -100, 12, -100, 16, -62, 22, -4]).fill({ color: dark })
  g.poly([-6, -100, -2, -60, 4, -4, 12, -4, 8, -62, 12, -100]).fill({ color: mix(dark, 0x000000, 0.3), alpha: 0.5 })
  for (let i = 0; i < 4; i++) g.moveTo(-14 + i * 9, -86 + i * 6).lineTo(-12 + i * 9, -60 + i * 3).stroke({ width: 1.5, color: 0x000000, alpha: 0.3 })
  // mặt: mắt hốc phát sáng, miệng há khi đánh
  g.ellipse(-7, -84, 4, 6).fill({ color: 0x0a0a0a })
  g.ellipse(8, -84, 4, 6).fill({ color: 0x0a0a0a })
  g.circle(-7, -84, 2.4).fill({ color: eye })
  g.circle(8, -84, 2.4).fill({ color: eye })
  g.ellipse(0, -68, 7, 3 + a * 8).fill({ color: 0x0a0a0a })
  // cành tay
  line(g, [[-14, -80], [-40, -96 + sw], [-54, -82 + sw]], 9, dark)
  for (const [x, y] of [[-54, -82 + sw], [-48, -94 + sw], [-40, -98 + sw]]) g.circle(x, y, 9).fill({ color, alpha: 0.95 })
  const hy = -92 + a * 52
  line(g, [[14, -80], [38, -100 + sw - a * 24], [44 + a * 14, hy]], 9, dark)
  g.circle(46 + a * 14, hy, 10).fill({ color, alpha: 0.95 })
  // tán lá
  for (const [x, y, r] of [[0, -112, 26], [-22, -104, 19], [22, -104, 19], [-8, -124, 17], [12, -122, 16]]) {
    g.circle(x + sin(t * 1.4 + x) * 2, y + sw * 0.3, r).fill({ color, alpha: 0.96 })
    g.circle(x - 5, y - 6, r * 0.5).fill({ color: light, alpha: 0.35 })
  }
}

function zombie({ g, color, dark, light, eye, t, a }) {
  const lean = sin(t * 1.5) * 2
  const skin = mix(color, 0xcfd6c0, 0.5)
  line(g, [[-6, -32], [-9 + sin(t * 2) * 3, 0]], 9, dark)
  line(g, [[8, -32], [12 - sin(t * 2) * 3, 0]], 9, dark)
  g.poly([-18, -30, -15 + lean, -78, 15 + lean, -78, 19, -30, 11, -24, 4, -33, -4, -22, -12, -32]).fill({ color: dark })
  g.poly([-6, -76, 0, -34, 6, -76]).fill({ color: mix(dark, 0x000000, 0.4), alpha: 0.5 })
  line(g, [[-14 + lean, -62], [14 + lean, -48]], 3, 0xe8e0c8, 0.7) // băng vải
  g.circle(6 + lean, -92, 13).fill({ color: skin })
  g.poly([-6 + lean, -102, 20 + lean, -102, 17 + lean, -94, 0 + lean, -96]).fill({ color: dark }) // tóc rũ
  g.circle(2 + lean, -92, 3).fill({ color: 0x1a1a1a })
  g.circle(11 + lean, -92, 3).fill({ color: eye })
  g.moveTo(1 + lean, -85).lineTo(13 + lean, -84).stroke({ width: 1.5, color: 0x3a1a1a })
  // hai tay duỗi về phía trước
  const reach = sin(t * 2) * 4 + a * 16
  line(g, [[10 + lean, -72], [28 + lean, -68 - a * 10], [44 + reach, -66 - a * 16]], 7, skin)
  line(g, [[6 + lean, -70], [24 + lean, -58], [38 + reach * 0.8, -54 - a * 8]], 6, mix(skin, 0x000000, 0.2))
}

function demon({ g, color, dark, light, eye, t, a }) {
  const flap = sin(t * 2.5) * 0.25
  const wing = (dx, s, alpha) => {
    g.poly([dx - 8, -84, dx - 56 * s, -124 + flap * 44, dx - 72 * s, -84 + flap * 34, dx - 54 * s, -74, dx - 40 * s, -52, dx - 28 * s, -68, dx - 8, -54]).fill({ color: dark, alpha })
  }
  wing(6, 1, 0.95)
  wing(18, 0.8, 0.7)
  g.poly([-20, -80, 20, -80, 28, -8 + sin(t * 3) * 3, 0, -22, -28, -6 - sin(t * 3) * 3]).fill({ color: mix(dark, 0x000000, 0.4) }) // áo choàng
  line(g, [[-8, -34], [-10, -16], [-8, 0]], 12, dark)
  line(g, [[10, -34], [14, -16], [14, 0]], 12, dark)
  g.poly([-18, -90, 18, -90, 14, -36, -14, -36]).fill({ color })
  g.poly([-6, -84, 6, -84, 4, -44, -4, -44]).fill({ color: light, alpha: 0.2 })
  g.poly([-22, -92, -12, -104, -8, -88]).fill({ color: dark }) // gai vai
  g.poly([22, -92, 12, -104, 8, -88]).fill({ color: dark })
  // tay trái buông, tay phải đấm lên kèm lửa
  line(g, [[-16, -84], [-30, -60], [-26, -40]], 11, color)
  g.poly([-30, -40, -22, -34, -30, -32]).fill({ color: 0x111111 })
  const fx = 30 + a * 12
  const fy = -62 - a * 58
  line(g, [[16, -84], [34, -76 - a * 10], [fx, fy]], 11, color)
  g.circle(fx, fy, 8).fill({ color: dark })
  if (a > 0.1) {
    g.circle(fx + 4, fy - 6, 12 * a + 4).fill({ color: 0xff7a2a, alpha: 0.7 })
    g.circle(fx + 4, fy - 6, 7 * a + 2).fill({ color: 0xffe08a, alpha: 0.9 })
  }
  g.circle(0, -102, 13).fill({ color: mix(color, 0x000000, 0.2) })
  g.poly([-10, -110, -20, -136, -4, -114]).fill({ color: 0xe8dcc0 }) // sừng
  g.poly([10, -110, 20, -136, 4, -114]).fill({ color: 0xe8dcc0 })
  g.poly([-9, -102, -2, -99, -9, -97]).fill({ color: eye })
  g.poly([9, -102, 2, -99, 9, -97]).fill({ color: eye })
  g.moveTo(-6, -92).lineTo(6, -92 + a * 3).stroke({ width: 2, color: 0x200000 })
  for (let i = 0; i < 4; i++) g.poly([-10 + i * 5 + sin(t * 6 + i) * 1.5, -113, -8 + i * 5, -126 - sin(t * 8 + i) * 4, -6 + i * 5, -113]).fill({ color: 0xff7a2a, alpha: 0.7 })
}

function bird({ g, color, dark, light, eye, t, a }) {
  const flap = sin(t * 5)
  const hy = -34 + sin(t * 2) * 3
  for (let i = 0; i < 5; i++) {
    const ang = (i - 2) * 0.28
    const tx = -24 - 52 * cos(ang)
    const ty = hy - 20 + (i - 2) * 14 + sin(t * 3 + i) * 5
    g.poly([-20, hy - 20 + (i - 2) * 2, tx, ty - 5, tx - 6, ty, tx, ty + 6]).fill({ color: i % 2 ? color : mix(color, 0xffd36b, 0.5), alpha: 0.92 })
  }
  line(g, [[-4, hy - 8], [-4, hy + 6]], 3, dark)
  line(g, [[6, hy - 8], [8, hy + 6]], 3, dark)
  const wing = (k, c, alpha) => {
    const up = 0.3 + 0.7 * flap
    g.poly([0, hy - 22, -18 * k, hy - 22 - 38 * up, -50 * k, hy - 18 - 22 * up, -36 * k, hy - 8, -12 * k, hy - 12]).fill({ color: c, alpha })
  }
  wing(1.15, dark, 0.8)
  g.ellipse(0, hy - 20, 26, 17).fill({ color })
  g.ellipse(6, hy - 15, 16, 10).fill({ color: light, alpha: 0.5 })
  wing(1, mix(color, 0xffffff, 0.2), 0.95)
  g.circle(24, hy - 34, 11).fill({ color })
  for (let i = 0; i < 3; i++) g.poly([22 - i * 4, hy - 42, 14 - i * 6, hy - 54 - i * 3 + sin(t * 4 + i) * 2, 26 - i * 4, hy - 41]).fill({ color: 0xffd36b })
  g.poly([32, hy - 36, 48, hy - 33 - a * 5, 32, hy - 30]).fill({ color: 0xffb02e })
  g.poly([32, hy - 29, 44, hy - 27 + a * 6, 32, hy - 26]).fill({ color: 0xe08a1e })
  g.circle(27, hy - 36, 2.6).fill({ color: eye })
}

function ghost({ g, color, dark, light, eye, t, a }) {
  const bob = sin(t * 2) * 4
  const hem = []
  for (let i = 0; i <= 6; i++) hem.push(30 - i * 10, -10 + bob + sin(t * 3 + i * 1.3) * 6)
  g.poly([-18, -96 + bob, 18, -96 + bob, 30, -30 + bob, ...hem]).fill({ color, alpha: 0.82 })
  g.poly([-8, -90 + bob, 8, -90 + bob, 6, -30 + bob, -6, -30 + bob]).fill({ color: light, alpha: 0.18 })
  g.ellipse(0, -84 + bob, 15, 17).fill({ color: dark })
  g.ellipse(0, -82 + bob, 10, 12).fill({ color: mix(color, 0xffffff, 0.75) })
  g.circle(-4, -84 + bob, 3.4).fill({ color: 0x080808 })
  g.circle(4, -84 + bob, 3.4).fill({ color: 0x080808 })
  g.circle(-4, -84 + bob, 1.6).fill({ color: eye })
  g.circle(4, -84 + bob, 1.6).fill({ color: eye })
  g.poly([-1.5, -79 + bob, 1.5, -79 + bob, 0, -76 + bob]).fill({ color: 0x080808 })
  for (let i = -2; i <= 2; i++) g.moveTo(i * 2.4, -74 + bob).lineTo(i * 2.4, -71 + bob + a * 3).stroke({ width: 1.2, color: 0x080808 })
  line(g, [[14, -70 + bob], [30 + a * 8, -60 + bob - a * 8], [44 + a * 14, -56 + bob - a * 14]], 5, mix(color, 0xffffff, 0.5), 0.9)
  line(g, [[-14, -70 + bob], [-30, -52 + bob + sin(t * 2) * 4]], 5, mix(color, 0xffffff, 0.5), 0.8)
  for (const k of [-1, 1]) g.circle(k * 36, -62 + bob + sin(t * 2.2 + k) * 6, 6).fill({ color: light, alpha: 0.55 })
}

function skeleton({ g, color, dark, light, eye, t, a }) {
  const bone = mix(color, 0xf0ecd8, 0.6)
  const br = sin(t * 2) * 1
  line(g, [[-8, -34], [-8 + sin(t * 2) * 2, -16], [-9, 0]], 5, bone)
  line(g, [[10, -34], [10, -16], [11, 0]], 5, bone)
  g.ellipse(0, -36, 14, 7).fill({ color: bone })
  line(g, [[0, -42], [0, -80 + br]], 4, bone)
  for (let i = 0; i < 4; i++) {
    const y = -50 - i * 8 + br
    line(g, [[-14 + i, y], [0, y - 3], [14 - i, y]], 3, bone)
  }
  g.poly([-20, -82 + br, -8, -90 + br, -10, -76 + br]).fill({ color: dark }) // giáp vai
  g.poly([20, -82 + br, 8, -90 + br, 10, -76 + br]).fill({ color: dark })
  g.circle(4, -96 + br, 12).fill({ color: bone })
  g.rect(-2, -88 + br, 12, 5 + a * 4).fill({ color: bone })
  g.circle(0, -97 + br, 3).fill({ color: 0x0a0a0a })
  g.circle(9, -97 + br, 3).fill({ color: 0x0a0a0a })
  g.circle(9, -97 + br, 1.5).fill({ color: eye })
  line(g, [[-12, -80], [-24, -56], [-20, -40]], 4, bone)
  g.circle(-24, -52, 13).fill({ color: dark }) // khiên
  g.circle(-24, -52, 5).fill({ color: bone })
  // tay phải cầm kiếm, bổ xuống khi tấn công
  const hx = 28
  const hy = -64
  line(g, [[12, -80], [20, -72], [hx, hy]], 4, bone)
  const ang = -1.1 + a * 2.3
  const len = 46
  const bx = hx + cos(ang) * len
  const by = hy + sin(ang) * len
  g.poly([hx - sin(ang) * 3, hy + cos(ang) * 3, bx, by, hx + sin(ang) * 3, hy - cos(ang) * 3]).fill({ color: 0xc8d0dc })
  g.circle(hx, hy, 3.4).fill({ color: dark })
}

function dragon({ g, color, dark, light, eye, t, a }) {
  const pts = []
  for (let i = 0; i <= 20; i++) pts.push([-56 + i * 5, -16 - i * 2.4 - sin(i * 0.6 - t * 2.4) * 12])
  for (let i = 1; i < 20; i += 2) g.poly([pts[i][0] - 4, pts[i][1] - 8, pts[i][0], pts[i][1] - 18 - sin(t * 5 + i) * 2, pts[i][0] + 4, pts[i][1] - 8]).fill({ color: 0xffb02e, alpha: 0.85 })
  line(g, pts, 22, color)
  line(g, pts.map(([x, y]) => [x, y + 4]), 9, light, 0.4)
  for (let i = 1; i < 19; i += 3) line(g, [[pts[i][0] - 2, pts[i][1] - 9], [pts[i][0] + 3, pts[i][1] + 9]], 2, dark, 0.45)
  // hai chân trước
  line(g, [[pts[8][0], pts[8][1] + 6], [pts[8][0] + 4, pts[8][1] + 20], [pts[8][0] + 12, pts[8][1] + 24]], 6, dark)
  line(g, [[pts[13][0], pts[13][1] + 6], [pts[13][0] + 4, pts[13][1] + 18]], 6, dark)
  const [x0, y0] = pts[20]
  const hx = x0 + a * 8
  const hy = y0 - a * 10
  const open = a * 12
  g.ellipse(hx + 6, hy - 10, 20, 15).fill({ color })
  g.poly([hx + 14, hy - 16 - open * 0.5, hx + 38, hy - 12 - open * 0.7, hx + 14, hy - 6]).fill({ color: dark })
  g.poly([hx + 14, hy - 5, hx + 34, hy - 5 + open, hx + 12, hy + 0 + open * 0.6]).fill({ color: dark })
  if (open > 3) g.poly([hx + 16, hy - 6, hx + 32, hy - 5 + open * 0.8, hx + 14, hy - 1]).fill({ color: 0xff4a3a })
  g.poly([hx - 2, hy - 22, hx - 16, hy - 40, hx + 6, hy - 24]).fill({ color: 0xe8dcc0 }) // sừng
  g.poly([hx + 6, hy - 24, hx - 6, hy - 44, hx + 12, hy - 25]).fill({ color: 0xd8c8a0 })
  line(g, [[hx + 30, hy - 12], [hx + 46, hy - 4 + sin(t * 4) * 3], [hx + 40, hy + 6]], 2, 0xffe08a, 0.9) // râu rồng
  g.circle(hx + 10, hy - 14, 3.4).fill({ color: eye })
  if (a > 0.3) {
    g.circle(hx + 44, hy - 4, 14 * a + 4).fill({ color: 0xff7a2a, alpha: 0.65 })
    g.circle(hx + 40, hy - 4, 8 * a + 2).fill({ color: 0xffe08a, alpha: 0.85 })
  }
}

function bat({ g, color, dark, light, eye, t, a }) {
  const flap = sin(t * 9)
  const hy = -64 + sin(t * 3) * 4
  const wing = (dir, c, alpha) => {
    const up = 0.25 + 0.75 * (dir > 0 ? flap : -flap * 0.6 + 0.4)
    g.poly([0, hy - 4, -26 * dir, hy - 8 - 34 * up, -38 * dir, hy - 2 - 16 * up, -46 * dir, hy + 6, -30 * dir, hy + 2, -22 * dir, hy + 12, -10 * dir, hy + 4]).fill({ color: c, alpha })
  }
  wing(-1, dark, 0.8)
  wing(1, mix(color, 0x000000, 0.2), 0.95)
  g.ellipse(0, hy, 15, 18).fill({ color })
  g.ellipse(2, hy + 4, 9, 11).fill({ color: light, alpha: 0.3 })
  g.circle(0, hy - 20, 11).fill({ color })
  g.poly([-9, hy - 26, -14, hy - 44, -3, hy - 30]).fill({ color: dark })
  g.poly([9, hy - 26, 14, hy - 44, 3, hy - 30]).fill({ color: dark })
  g.circle(-4, hy - 22, 2.8).fill({ color: eye })
  g.circle(5, hy - 22, 2.8).fill({ color: eye })
  g.poly([-4, hy - 14, -2, hy - 8 + a * 4, 0, hy - 14]).fill({ color: 0xffffff })
  g.poly([2, hy - 14, 4, hy - 8 + a * 4, 6, hy - 14]).fill({ color: 0xffffff })
  line(g, [[-4, hy + 16], [-4, hy + 26]], 2.5, dark)
  line(g, [[5, hy + 16], [5, hy + 26]], 2.5, dark)
}

const ENEMY_DRAW = { beast, serpent, spirit, golem, ape, treant, zombie, demon, bird, ghost, skeleton, dragon, bat }

/** Vẽ yêu thú; gọi mỗi khung (scene đã clear). `atk` 0..1 là mức đang ra đòn. */
export function drawEnemy(g, kind, color, boss, t, atk = 0) {
  const ctx = {
    g,
    color,
    dark: mix(color, 0x000000, 0.45),
    light: mix(color, 0xffffff, 0.4),
    eye: boss ? 0xff3b3b : 0xffe066,
    t,
    a: Math.max(0, Math.min(1, atk)),
    boss,
  }
  ;(ENEMY_DRAW[kind] ?? golem)(ctx)
}

// =====================================================================
// NHÂN VẬT CHÍNH
// =====================================================================
const SKIN = 0xf2d2b6
const HAIR = 0x14161f

/** Trang phục theo đại cảnh giới (index = realmIdx). */
export const SKINS = [
  { robe: 0xdfe6f2, shade: 0xaab6cf, trim: 0x7fe3ff, name: 'Áo vải' },
  { robe: 0xeefaf3, shade: 0xb4d9c4, trim: 0x6dffb0, name: 'Áo ngọc', pendant: 0x6dffb0 },
  { robe: 0xfff3d2, shade: 0xe0c98f, trim: 0xffd36b, name: 'Áo kim', pauldron: 0xd9a53a, crown: 0xd9a53a },
  { robe: 0xefe6ff, shade: 0xbba6e0, trim: 0xd49bff, name: 'Áo tử', pauldron: 0x9a6bd8, crown: 0xd49bff, cloak: 0x4a2c7a },
  { robe: 0xffeaf1, shade: 0xe0a8bd, trim: 0xff8fb8, name: 'Áo hồng', pauldron: 0xff6f9f, crown: 0xff8fb8, cloak: 0x7a2a52, gem: 0xff3b6b },
  { robe: 0xe8f0ff, shade: 0x9fb4e6, trim: 0x8fb8ff, name: 'Áo tinh', pauldron: 0x6f8fe0, crown: 0xcfe0ff, cloak: 0x1a2c6a, gem: 0x9fd0ff },
  { robe: 0xfffbe6, shade: 0xe8d98a, trim: 0xfff2a8, name: 'Áo thánh', pauldron: 0xf0c64a, crown: 0xffe680, cloak: 0x8a6a1c, gem: 0xfff2a8 },
]

/** Toạ độ đầu theo tư thế. */
export const headY = (pose) => (pose === 'sword' ? -114 : -87)

/** Thân + đầu (không có nét mặt). Vẽ lại khi đổi tư thế / cảnh giới. */
export function drawHeroBody(g, { pose, realmIdx }) {
  const s = SKINS[Math.min(realmIdx, SKINS.length - 1)]
  const hy = headY(pose)
  if (pose === 'sword') drawStanding(g, s, hy)
  else drawSeated(g, s, hy)
  drawHeadShape(g, s, hy)
}

function drawSeated(g, s, hy) {
  if (s.cloak) g.poly([-34, -12, -26, -78, 26, -78, 34, -12, 22, -4, -22, -4]).fill({ color: s.cloak, alpha: 0.95 })
  // tóc dài sau lưng, bay nhẹ
  g.poly([-13, -88, 13, -88, 19, -30, 4, -20, -6, -24, -19, -32]).fill({ color: HAIR })
  // chân xếp bằng + nếp áo
  g.ellipse(0, -9, 50, 14).fill({ color: s.shade })
  g.ellipse(-20, -12, 23, 9).fill({ color: s.robe })
  g.ellipse(20, -12, 23, 9).fill({ color: s.robe })
  g.moveTo(-34, -10).quadraticCurveTo(-20, -4, -6, -10).stroke({ width: 1.3, color: s.shade, alpha: 0.9 })
  g.moveTo(6, -10).quadraticCurveTo(20, -4, 34, -10).stroke({ width: 1.3, color: s.shade, alpha: 0.9 })
  // thân áo hai lớp
  g.poly([-27, -10, -19, -72, 19, -72, 27, -10]).fill({ color: s.robe })
  g.poly([0, -72, 7, -72, 11, -10, 4, -10]).fill({ color: s.shade, alpha: 0.5 })
  g.poly([-19, -72, -8, -72, 4, -50, -3, -30, -22, -10, -27, -10]).fill({ color: s.shade, alpha: 0.28 })
  // cổ áo chéo
  g.poly([-10, -72, 0, -72, 8, -50, 4, -46]).fill({ color: s.trim, alpha: 0.9 })
  g.poly([10, -72, 0, -72, -6, -54, 0, -50]).fill({ color: s.shade })
  // đai lưng + nút thắt
  g.rect(-24, -34, 48, 6).fill({ color: s.trim })
  g.circle(-3, -31, 4.5).fill({ color: s.trim })
  g.poly([-3, -28, -8, -14, -3, -18]).fill({ color: s.trim, alpha: 0.9 })
  g.poly([-3, -28, 2, -14, 0, -20]).fill({ color: s.trim, alpha: 0.9 })
  if (s.pendant) g.circle(0, -56, 3).fill({ color: s.pendant })
  // tay áo rộng buông trên gối
  g.poly([-18, -70, -36, -50, -40, -22, -26, -18, -14, -26, -12, -50]).fill({ color: s.robe })
  g.poly([18, -70, 36, -50, 40, -22, 26, -18, 14, -26, 12, -50]).fill({ color: s.robe })
  g.poly([-40, -22, -26, -18, -28, -14, -42, -18]).fill({ color: s.trim, alpha: 0.9 })
  g.poly([40, -22, 26, -18, 28, -14, 42, -18]).fill({ color: s.trim, alpha: 0.9 })
  g.circle(-9, -20, 6).fill({ color: SKIN })
  g.circle(9, -20, 6).fill({ color: SKIN })
  if (s.pauldron) {
    g.ellipse(-20, -72, 10, 6).fill({ color: s.pauldron })
    g.ellipse(20, -72, 10, 6).fill({ color: s.pauldron })
  }
}

function drawStanding(g, s, hy) {
  if (s.cloak) g.poly([-24, 0, -22, -100, 22, -100, 28, 0]).fill({ color: s.cloak, alpha: 0.95 })
  g.poly([-14, -100, 14, -100, 17, -34, -17, -34]).fill({ color: s.robe })
  g.poly([-24, 0, 24, 0, 17, -42, -17, -42]).fill({ color: s.shade })
  g.poly([-8, 0, 8, 0, 4, -42, -4, -42]).fill({ color: s.robe, alpha: 0.8 })
  g.poly([-10, -98, -2, -98, 6, -62, 0, -60]).fill({ color: s.trim, alpha: 0.9 })
  g.rect(-17, -62, 34, 6).fill({ color: s.trim })
  g.circle(-3, -59, 4).fill({ color: s.trim })
  if (s.pendant) g.circle(0, -84, 3).fill({ color: s.pendant })
  g.moveTo(-8, -4).lineTo(-8, 4).stroke({ width: 10, color: 0x1a1d28, cap: 'round' })
  g.moveTo(9, -4).lineTo(9, 4).stroke({ width: 10, color: 0x1a1d28, cap: 'round' })
  // tay áo rộng
  g.poly([-14, -96, -34, -76, -34, -46, -20, -46, -12, -78]).fill({ color: s.robe })
  g.poly([-34, -46, -20, -46, -20, -42, -34, -42]).fill({ color: s.trim })
  g.moveTo(14, -96).lineTo(30, -112).lineTo(26, -130).stroke({ width: 10, color: s.robe, cap: 'round', join: 'round' })
  g.poly([22, -126, 32, -126, 34, -112, 20, -108]).fill({ color: s.trim, alpha: 0.9 })
  g.circle(26, -133, 5.5).fill({ color: SKIN })
  if (s.pauldron) {
    g.ellipse(-14, -98, 10, 6).fill({ color: s.pauldron })
    g.ellipse(14, -98, 10, 6).fill({ color: s.pauldron })
  }
}

function drawHeadShape(g, s, y) {
  g.circle(0, y - 14, 6).fill({ color: HAIR }) // búi tóc
  g.circle(0, y, 14).fill({ color: HAIR })
  g.circle(0, y + 2, 12).fill({ color: SKIN })
  g.ellipse(0, y + 9, 8, 3).fill({ color: 0xe0b896, alpha: 0.45 }) // bóng cằm
  g.poly([-13, y - 2, 13, y - 2, 11, y - 9, 0, y - 12, -11, y - 9]).fill({ color: HAIR }) // mái tóc
  g.poly([-13, y - 2, -15, y + 18, -10, y + 8]).fill({ color: HAIR }) // lọn tóc bên
  g.poly([13, y - 2, 15, y + 16, 10, y + 6]).fill({ color: HAIR })
  if (s.crown) {
    // mão / trâm cài theo cảnh giới
    g.poly([-7, y - 14, -4, y - 24, 0, y - 16, 4, y - 24, 7, y - 14]).fill({ color: s.crown })
    g.rect(-8, y - 14, 16, 3).fill({ color: s.crown })
  } else {
    g.rect(-1.6, y - 20, 3.2, 8).fill({ color: 0xc8a050, alpha: 0.9 })
  }
  if (s.gem) g.circle(0, y - 16, 2.4).fill({ color: s.gem })
}

/**
 * Nét mặt. state: 'closed' (thiền) | 'open' (mở mắt) | 'glow' (mắt sáng, sẵn sàng đột phá) | 'blink'.
 * glowColor: màu hào quang của cảnh giới.
 */
export function drawHeroFace(g, { pose, state, glowColor = 0x7fe3ff }) {
  const y = headY(pose)
  const ink = 0x20242f
  // lông mày
  g.moveTo(-8, y - 2).lineTo(-3, y - 3.5).stroke({ width: 1.3, color: HAIR })
  g.moveTo(3, y - 3.5).lineTo(8, y - 2).stroke({ width: 1.3, color: HAIR })
  if (state === 'closed' || state === 'blink') {
    g.moveTo(-7, y + 2).quadraticCurveTo(-4.5, y + 4, -2, y + 2).stroke({ width: 1.3, color: ink })
    g.moveTo(2, y + 2).quadraticCurveTo(4.5, y + 4, 7, y + 2).stroke({ width: 1.3, color: ink })
  } else {
    const c = state === 'glow' ? glowColor : ink
    if (state === 'glow') {
      g.circle(-4.5, y + 1.5, 4.2).fill({ color: glowColor, alpha: 0.35 })
      g.circle(4.5, y + 1.5, 4.2).fill({ color: glowColor, alpha: 0.35 })
    }
    g.ellipse(-4.5, y + 1.5, 2, 2.6).fill({ color: c })
    g.ellipse(4.5, y + 1.5, 2, 2.6).fill({ color: c })
    g.circle(-3.9, y + 0.7, 0.7).fill({ color: 0xffffff })
    g.circle(5.1, y + 0.7, 0.7).fill({ color: 0xffffff })
  }
  g.ellipse(-7.5, y + 6, 2.6, 1.5).fill({ color: 0xf08a8a, alpha: 0.4 }) // má hồng
  g.ellipse(7.5, y + 6, 2.6, 1.5).fill({ color: 0xf08a8a, alpha: 0.4 })
  g.moveTo(0, y + 3.5).lineTo(-0.6, y + 6).stroke({ width: 1, color: 0xc89a82 })
  if (pose === 'sword') g.moveTo(-2.5, y + 8.5).lineTo(2.5, y + 8.5).stroke({ width: 1.2, color: 0xb86f5a })
  else g.moveTo(-2.5, y + 8).quadraticCurveTo(0, y + 9.6, 2.5, y + 8).stroke({ width: 1.2, color: 0xb86f5a })
}

/** Màu theo độ hiếm vũ khí: Phàm / Linh / Bảo / Tiên. */
const BLADES = [
  { blade: 0xe8f4ff, edge: 0x9ac0e0, glow: 0 },
  { blade: 0xd8ffe8, edge: 0x4fdca6, glow: 0 },
  { blade: 0xd8ecff, edge: 0x60a5fa, glow: 0.5 },
  { blade: 0xfff1c4, edge: 0xf6c85f, glow: 1 },
]

/** Kiếm trong tay (gốc toạ độ tại bàn tay, lưỡi hướng lên). rarity: 0..3, null = kiếm gỗ mặc định. */
export function drawSword(s, { rarity = null, trim = 0x7fe3ff }) {
  const b = BLADES[rarity ?? 0]
  const len = 58 + (rarity ?? 0) * 7
  if (b.glow) {
    s.poly([-5, -8, 5, -8, 6, -len, 0, -len - 16, -6, -len]).fill({ color: b.edge, alpha: 0.25 * b.glow })
  }
  s.poly([-2.5, -8, 2.5, -8, 3.5, -len, 0, -len - 14, -3.5, -len]).fill({ color: b.blade })
  s.poly([0, -8, 2.5, -8, 3.5, -len, 0, -len - 14]).fill({ color: rarity === null ? trim : b.edge, alpha: 0.65 })
  s.moveTo(0, -12).lineTo(0, -len + 4).stroke({ width: 0.8, color: 0xffffff, alpha: 0.6 })
  // chắn kiếm: Bảo/Tiên có cánh
  if ((rarity ?? 0) >= 2) {
    s.poly([-12, -8, -4, -12, 4, -12, 12, -8, 6, -5, -6, -5]).fill({ color: 0xd9a53a })
    s.poly([-12, -8, -16, -14, -6, -11]).fill({ color: 0xd9a53a })
    s.poly([12, -8, 16, -14, 6, -11]).fill({ color: 0xd9a53a })
  } else {
    s.rect(-9, -10, 18, 4).fill({ color: 0xd9a53a })
  }
  s.rect(-2, -6, 4, 16).fill({ color: 0x5a3b22 })
  if ((rarity ?? 0) >= 1) s.circle(0, 11, 2.4).fill({ color: b.edge })
}

/** Hiệu ứng riêng của từng đại cảnh giới (vẽ lại mỗi khung, blend cộng). */
export function drawHeroFx(g, { t, realmIdx, pose, fill = 0, color = 0xffffff }) {
  const sword = pose === 'sword'
  const top = sword ? -136 : -109
  const mid = sword ? -66 : -50
  const ready = fill >= 1
  if (ready) {
    // Sẵn sàng đột phá: hào quang thở quanh thân
    const p = 0.5 + 0.5 * sin(t * 4)
    g.ellipse(0, mid, 40 + p * 6, 54 + p * 6).stroke({ width: 2, color, alpha: 0.35 + p * 0.3 })
  }
  if (realmIdx >= 3 && realmIdx !== 6) {
    // Nguyên Anh (và các cảnh giới sau): bé thần hồn bay lơ lửng trên đầu
    const bob = sin(t * 2) * 3
    const sx = sword ? 20 : 0
    const sy = top - 22 + bob
    g.circle(sx, sy, 15).fill({ color, alpha: 0.18 })
    g.circle(sx, sy - 5, 5).fill({ color: 0xfff0e0, alpha: 0.95 })
    g.ellipse(sx, sy + 3, 5, 6).fill({ color: 0xffffff, alpha: 0.85 })
    g.circle(sx - 1.8, sy - 5.5, 0.8).fill({ color: 0x20242f })
    g.circle(sx + 1.8, sy - 5.5, 0.8).fill({ color: 0x20242f })
  }
  if (realmIdx === 4) {
    // Hóa Thần: vòng hào quang nghiêng trên đầu, hạt sáng quay quanh
    g.ellipse(0, top - 8, 22, 6).stroke({ width: 2, color, alpha: 0.85 })
    g.ellipse(0, top - 8, 26, 8).stroke({ width: 1, color, alpha: 0.4 })
    for (let i = 0; i < 6; i++) {
      const a = t * 1.4 + (i / 6) * PI * 2
      g.circle(cos(a) * 24, top - 8 + sin(a) * 7, 1.6).fill({ color: 0xffffff, alpha: 0.9 })
    }
  }
  if (realmIdx === 5) {
    // Luyện Hư: sao trời lấp lánh quanh người
    for (let i = 0; i < 9; i++) {
      const a = t * 0.5 + i * 0.7
      const r = 40 + (i % 3) * 8
      const tw = 0.5 + 0.5 * sin(t * 3 + i * 2)
      const x = cos(a) * r
      const y = mid + sin(a) * (r * 0.9)
      g.moveTo(x - 3 * tw, y).lineTo(x + 3 * tw, y).moveTo(x, y - 3 * tw).lineTo(x, y + 3 * tw).stroke({ width: 1.3, color: 0xdfeaff, alpha: 0.9 })
    }
  }
  if (realmIdx >= 7) {
    // Đại Thừa và Độ Kiếp: thêm vòng ánh sáng ngoài và những đốm sáng bay lên như đang tách khỏi mặt đất
    const pulse2 = 0.5 + 0.5 * sin(t * 1.1)
    g.circle(0, mid - 6, 76 + pulse2 * 4).stroke({ width: 2, color, alpha: 0.4 })
    for (let i = 0; i < 10; i++) {
      const rise = (t * 22 + i * 17) % 120
      g.circle(sin(i * 2.3) * 40, mid + 60 - rise, 1.8).fill({ color: 0xffffff, alpha: 0.8 * (1 - rise / 120) })
    }
  }
  if (realmIdx >= 6) {
    // Hợp Thể: vầng sáng vàng và đôi cánh ánh sáng phía sau lưng
    const pulse = 0.5 + 0.5 * sin(t * 1.6)
    g.circle(0, mid - 6, 62).stroke({ width: 3, color, alpha: 0.55 + pulse * 0.2 })
    g.circle(0, mid - 6, 54).stroke({ width: 1, color, alpha: 0.35 })
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2 + t * 0.2
      g.moveTo(cos(a) * 54, mid - 6 + sin(a) * 54).lineTo(cos(a) * (64 + (i % 2) * 6), mid - 6 + sin(a) * (64 + (i % 2) * 6)).stroke({ width: 1.5, color, alpha: 0.6 })
    }
    const fl = 0.85 + 0.15 * sin(t * 1.8)
    for (const k of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const a = 0.5 + i * 0.28
        g.poly([k * 12, mid - 16, k * (30 + i * 12) * fl, mid - 26 - sin(a) * 34 - i * 8, k * (36 + i * 12) * fl, mid - 22 - i * 8, k * 14, mid - 8]).fill({ color, alpha: 0.28 })
      }
    }
  }
}

// =====================================================================
// BẠCH LINH: hồ ly đồng hành (số đuôi tăng theo tu vi, tối đa 9)
// =====================================================================
/** g: Graphics gốc ở mặt đất. tails: 1..9. hop: 0..1 nhún nhảy khi chủ ra đòn. */
export function drawFox(g, { t, tails = 1, hop = 0, color = 0x7fe3ff, happy = false }) {
  const breathe = sin(t * 2.2) * 0.8
  const jump = -sin(PI * hop) * 16
  const white = 0xfdfdff
  const shade = 0xdfe4f0
  const pink = 0xffb4c8
  // các đuôi quạt ra phía sau
  for (let i = 0; i < tails; i++) {
    const f = tails === 1 ? 0.5 : i / (tails - 1)
    const base = -0.2 + f * 1.55 // góc xoè
    const sway = sin(t * 2 + i * 0.7) * 0.16
    const ang = base + sway
    const len = 30 + (i % 2) * 6
    const bx = -14
    const by = -12 + jump
    const ex = bx - cos(ang) * len
    const ey = by - sin(ang) * len
    g.moveTo(bx, by).quadraticCurveTo(bx - cos(ang - 0.5) * len * 0.7, by - sin(ang - 0.5) * len * 0.7, ex, ey).stroke({ width: 9, color: white, cap: 'round' })
    g.circle(ex, ey, 4.6).fill({ color })
  }
  // thân ngồi
  g.ellipse(-4, -9 + jump, 14, 9).fill({ color: shade })
  g.ellipse(2, -15 + jump + breathe, 14, 13).fill({ color: white })
  g.ellipse(8, -10 + jump, 7, 8).fill({ color: white, alpha: 0.9 }) // ngực lông xù
  g.moveTo(10, -9 + jump).lineTo(10, 0).stroke({ width: 5, color: white, cap: 'round' })
  g.moveTo(3, -7 + jump).lineTo(2, 0).stroke({ width: 5, color: shade, cap: 'round' })
  // đầu
  const hx = 12
  const hy = -30 + jump + breathe
  const twitch = sin(t * 6.5) > 0.96 ? 0.25 : 0
  g.poly([hx - 8, hy - 6, hx - 9 - twitch * 8, hy - 22, hx - 1, hy - 9]).fill({ color: white })
  g.poly([hx - 6.5, hy - 8, hx - 7.5 - twitch * 6, hy - 18, hx - 2, hy - 9]).fill({ color: pink })
  g.poly([hx + 2, hy - 9, hx + 7, hy - 23, hx + 10, hy - 6]).fill({ color: white })
  g.poly([hx + 3.5, hy - 9, hx + 7, hy - 18, hx + 8.5, hy - 7]).fill({ color: pink })
  g.circle(hx, hy, 10).fill({ color: white })
  g.poly([hx + 7, hy + 1, hx + 18, hy + 4, hx + 7, hy + 7]).fill({ color: white })
  g.circle(hx + 17.5, hy + 3.5, 1.6).fill({ color: 0x2a2a38 })
  if (happy || hop > 0) {
    g.moveTo(hx + 1, hy - 1).quadraticCurveTo(hx + 3.5, hy - 4, hx + 6, hy - 1).stroke({ width: 1.4, color: 0x2a2a38 })
  } else {
    g.ellipse(hx + 3.5, hy - 1, 1.8, 2.4).fill({ color: 0x2a2a38 })
    g.circle(hx + 4, hy - 1.8, 0.6).fill({ color: 0xffffff })
  }
  g.ellipse(hx - 1, hy + 4, 2.4, 1.4).fill({ color: pink, alpha: 0.6 })
  // ấn ký trên trán (màu hào quang cảnh giới)
  g.poly([hx + 3, hy - 8, hx + 5, hy - 4.5, hx + 3, hy - 5, hx + 1.2, hy - 4.5]).fill({ color })
}
