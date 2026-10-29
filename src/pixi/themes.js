// =====================================================================
// themes.js - Chủ đề hình ảnh cho từng bí cảnh: màu trời, bối cảnh tiền cảnh (decor)
// và hạt khí quyển (ambient). Khi vào bí cảnh cảnh Pixi đổi theo chủ đề này.
//
// decor : rừng cây / hang động / băng giá / nghĩa địa / dung nham / hư không
// ambient.kind : leaves | spores | embers | snow | wisps | stars
// =====================================================================

export const THEMES = {
  hac_phong: {
    sky: [0x0a1512, 0x1d3b30, 0x5b7a5e], decor: 'trees', decorColor: 0x0b1a14, shape: 'pine',
    ambient: { kind: 'leaves', color: 0x8aa070, count: 14 }, moon: true,
  },
  linh_duoc: {
    sky: [0x0c2a1c, 0x2a6a3c, 0x9ad07a], decor: 'trees', decorColor: 0x14502c, shape: 'round',
    ambient: { kind: 'spores', color: 0xb8ff9a, count: 22 }, moon: false,
  },
  huyet_sat: {
    sky: [0x1a0505, 0x4a0f12, 0x9a2a22], decor: 'cave', decorColor: 0x1e0808, crystal: 0xff4a3a,
    ambient: { kind: 'embers', color: 0xff6a3a, count: 18 }, moon: false, stars: false,
  },
  bang_phong: {
    sky: [0x0a1a30, 0x2a5a90, 0xbfe6ff], decor: 'ice', decorColor: 0x7fb8e0,
    ambient: { kind: 'snow', color: 0xffffff, count: 32 }, moon: true,
  },
  cuu_u: {
    sky: [0x0a0618, 0x2a1650, 0x6a3a9a], decor: 'ghost', decorColor: 0x120a26,
    ambient: { kind: 'wisps', color: 0x9b8dff, count: 16 }, moon: true,
  },
  ma_uyen: {
    sky: [0x1a0408, 0x5a0f20, 0xd0402a], decor: 'magma', decorColor: 0x1a0a0c, crystal: 0xff8a2a,
    ambient: { kind: 'embers', color: 0xff8a3a, count: 26 }, moon: false, stars: false,
  },
  hu_khong: {
    sky: [0x03041a, 0x14206a, 0x5a50c8], decor: 'void', decorColor: 0x0a0e3a, crystal: 0x8fa0ff,
    ambient: { kind: 'stars', color: 0xaab8ff, count: 24 }, moon: false,
  },
  hon_don: {
    sky: [0x1a1204, 0x6a4a10, 0xf0c860], decor: 'void', decorColor: 0x4a3410, crystal: 0xffe08a,
    ambient: { kind: 'wisps', color: 0xffe08a, count: 22 }, moon: false,
  },
}

/** Bộ sinh số ngẫu nhiên có seed để bối cảnh cố định giữa các lần vẽ (và tuần hoàn khi lặp). */
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const shade = (c, k) => {
  const r = Math.round(((c >> 16) & 255) * k)
  const g = Math.round(((c >> 8) & 255) * k)
  const b = Math.round((c & 255) * k)
  return (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b)
}

/**
 * Vẽ MỘT chu kỳ bối cảnh rộng w tại độ dời ox (gọi hai lần: ox=0 và ox=w để cuộn vô tận).
 * groundY là mặt bệ đá; u là hệ số tỉ lệ.
 */
export function drawDecor(g, theme, ox, w, h, groundY, u) {
  const rnd = seeded(7919)
  const col = theme.decorColor
  const x0 = (frac) => ox + frac * w

  if (theme.decor === 'trees') {
    // Hai lớp cây: lớp xa mờ hơn, lớp gần đậm hơn
    for (const layer of [0, 1]) {
      const count = layer ? 6 : 9
      for (let i = 0; i < count; i++) {
        const x = x0((i + 0.2 + rnd() * 0.6) / count)
        const base = groundY + (layer ? 22 : 8) * u
        const th = (layer ? 120 : 85) * u * (0.8 + rnd() * 0.5)
        const c = shade(col, layer ? 0.7 : 1.1)
        g.rect(x - 3 * u, base - th * 0.3, 6 * u, th * 0.3).fill({ color: shade(c, 0.6), alpha: 0.95 })
        if (theme.shape === 'round') {
          for (let k = 0; k < 3; k++) {
            g.circle(x + (k - 1) * 14 * u, base - th * (0.55 + (k % 2) * 0.15), th * 0.26).fill({ color: c, alpha: 0.92 })
          }
        } else {
          for (let k = 0; k < 3; k++) {
            const wy = th * (0.3 + k * 0.22)
            const half = th * (0.3 - k * 0.07)
            g.poly([x - half, base - wy, x + half, base - wy, x, base - wy - th * 0.38]).fill({ color: c, alpha: 0.95 })
          }
        }
      }
    }
    return
  }

  if (theme.decor === 'cave') {
    // Nhũ đá trên trần, măng đá và tinh thể phát sáng dưới đất
    for (let i = 0; i < 10; i++) {
      const x = x0((i + rnd() * 0.8) / 10)
      const len = (36 + rnd() * 80) * u
      g.poly([x - 12 * u, 0, x + 12 * u, 0, x, len]).fill({ color: col, alpha: 0.96 })
    }
    for (let i = 0; i < 6; i++) {
      const x = x0((i + rnd() * 0.8) / 6)
      const hh = (24 + rnd() * 40) * u
      g.poly([x - 14 * u, h, x + 14 * u, h, x, h - hh]).fill({ color: col, alpha: 0.96 })
    }
    for (let i = 0; i < 4; i++) {
      const x = x0((i + 0.3 + rnd() * 0.4) / 4)
      const hh = (30 + rnd() * 30) * u
      const by = groundY + 20 * u
      g.poly([x - 7 * u, by, x - 2 * u, by - hh, x + 4 * u, by - hh * 0.8, x + 8 * u, by]).fill({ color: theme.crystal, alpha: 0.85 })
      g.poly([x - 2 * u, by - hh, x + 4 * u, by - hh * 0.8, x, by - hh * 0.4]).fill({ color: 0xffffff, alpha: 0.35 })
    }
    return
  }

  if (theme.decor === 'ice') {
    for (let i = 0; i < 11; i++) {
      const x = x0((i + rnd() * 0.8) / 11)
      const len = (28 + rnd() * 70) * u
      g.poly([x - 9 * u, 0, x + 9 * u, 0, x, len]).fill({ color: col, alpha: 0.8 })
      g.poly([x - 2 * u, 0, x + 9 * u, 0, x, len]).fill({ color: 0xffffff, alpha: 0.3 })
    }
    for (let i = 0; i < 5; i++) {
      const x = x0((i + 0.2 + rnd() * 0.6) / 5)
      const hh = (50 + rnd() * 70) * u
      const by = groundY + 14 * u
      g.poly([x - 16 * u, by, x - 8 * u, by - hh * 0.8, x, by - hh, x + 9 * u, by - hh * 0.75, x + 17 * u, by]).fill({ color: col, alpha: 0.85 })
      g.poly([x, by - hh, x + 9 * u, by - hh * 0.75, x + 17 * u, by, x + 2 * u, by]).fill({ color: shade(col, 0.7), alpha: 0.85 })
    }
    return
  }

  if (theme.decor === 'ghost') {
    // Trụ đá đổ nát, bia mộ
    for (let i = 0; i < 7; i++) {
      const x = x0((i + 0.2 + rnd() * 0.6) / 7)
      const by = groundY + 16 * u
      if (i % 3 === 0) {
        const hh = (80 + rnd() * 50) * u
        g.rect(x - 9 * u, by - hh, 18 * u, hh).fill({ color: col, alpha: 0.96 })
        g.poly([x - 9 * u, by - hh, x + 9 * u, by - hh, x + 3 * u, by - hh - 12 * u, x - 5 * u, by - hh - 6 * u]).fill({ color: col, alpha: 0.96 })
      } else {
        const hh = (30 + rnd() * 18) * u
        g.roundRect(x - 10 * u, by - hh, 20 * u, hh, 9 * u).fill({ color: shade(col, 1.4), alpha: 0.95 })
        g.rect(x - 1 * u, by - hh * 0.7, 2 * u, hh * 0.4).fill({ color: col, alpha: 0.8 })
      }
    }
    return
  }

  if (theme.decor === 'magma') {
    // Đá nhọn đen, khe nứt dung nham phát sáng
    for (let i = 0; i < 8; i++) {
      const x = x0((i + 0.1 + rnd() * 0.6) / 8)
      const hh = (50 + rnd() * 80) * u
      const by = groundY + 18 * u
      g.poly([x - 22 * u, by, x - 6 * u, by - hh, x + 4 * u, by - hh * 0.6, x + 20 * u, by]).fill({ color: col, alpha: 0.97 })
      g.moveTo(x - 4 * u, by).lineTo(x - 1 * u, by - hh * 0.5).lineTo(x - 5 * u, by - hh * 0.8)
      g.stroke({ width: 2 * u, color: theme.crystal, alpha: 0.9 })
    }
    g.rect(ox, groundY + 26 * u, w, h, 0).fill({ color: theme.crystal, alpha: 0.28 })
    return
  }

  // 'void': mảnh đá lơ lửng và khe nứt không gian
  for (let i = 0; i < 9; i++) {
    const x = x0((i + rnd() * 0.8) / 9)
    const y = h * (0.15 + rnd() * 0.6)
    const s = (8 + rnd() * 22) * u
    g.poly([x - s, y, x - s * 0.2, y - s * 0.9, x + s, y - s * 0.2, x + s * 0.4, y + s * 0.8]).fill({ color: col, alpha: 0.9 })
    g.poly([x - s, y, x - s * 0.2, y - s * 0.9, x, y]).fill({ color: theme.crystal, alpha: 0.25 })
  }
  const rx = x0(0.5)
  g.moveTo(rx, 0).lineTo(rx + 14 * u, h * 0.2).lineTo(rx - 10 * u, h * 0.4).lineTo(rx + 12 * u, h * 0.62).lineTo(rx - 6 * u, h * 0.85).lineTo(rx + 2 * u, h)
  g.stroke({ width: 2.5 * u, color: theme.crystal, alpha: 0.7 })
}
