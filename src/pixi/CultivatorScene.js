// =====================================================================
// CultivatorScene.js - Cảnh PixiJS (v8) nửa trên màn hình
//
// Toàn bộ hình ảnh được vẽ bằng Graphics/Texture sinh từ code (placeholder
// chất lượng cao); khi có asset ảnh thật chỉ cần thay thế các hàm
// các hàm trong art.js bằng Sprite/Spine mà không đổi API công khai.
//
// API công khai:
//   await scene.init(hostElement)          - tạo canvas, gắn vào host
//   scene.setState({ realmIdx, fill, particles })
//   scene.destroy()
// Hiệu ứng tạm thời được kích hoạt qua event bus (xem game/events.js).
// =====================================================================
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { on } from '../game/events.js'
import { REALMS } from '../game/constants.js'
import { THEMES, drawDecor } from './themes.js'
import { Vfx } from './vfx.js'
import * as ART from './art.js'

// ---- Bảng màu nền trời theo đại cảnh giới: [đỉnh, giữa, chân trời] ----
const SKY = [
  [0x0a1630, 0x1b3558, 0x4a7490], // Luyện Khí: bình minh xanh lạnh
  [0x08201f, 0x144a46, 0x4a8a74], // Trúc Cơ: sắc ngọc
  [0x2a1608, 0x6a3a14, 0xd28f45], // Kim Đan: hoàng hôn vàng
  [0x1a0c2e, 0x4a2670, 0xb2609f], // Nguyên Anh: tím huyền bí
  [0x2a0c1c, 0x7a2a52, 0xe08aa8], // Hóa Thần: hồng thẫm
  [0x08102a, 0x1a3070, 0x6a90e0], // Luyện Hư: lam hư không
  [0x2a2408, 0x7a6a1c, 0xf0dc7a], // Hợp Thể: kim quang
]


const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t

/** Trộn hai màu số 0xRRGGBB theo tỉ lệ t (0..1). */
function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
  return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t))
}
const css = (n) => '#' + n.toString(16).padStart(6, '0')

/** Texture gradient dọc từ canvas 2D (rẻ, không cần FillGradient của Pixi). */
function gradientTexture(colors, height) {
  const c = document.createElement('canvas')
  c.width = 2
  c.height = Math.max(2, Math.floor(height))
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, c.height)
  colors.forEach((col, i) => g.addColorStop(i / (colors.length - 1), css(col)))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)
  return Texture.from(c)
}

/** Texture quầng sáng tròn mờ dần (dùng cho aura, hạt, sao, trăng). */
function glowTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return Texture.from(c)
}

/** Vẽ một cánh sen / chiếc lá nhọn hai đầu tại (x,y), hướng `angle`, dài `len`. */
function leaf(g, x, y, angle, len, wid) {
  const pts = []
  const steps = 8
  const ca = Math.cos(angle), sa = Math.sin(angle)
  const put = (t, side) => {
    const lx = t * len
    const ly = side * wid * Math.sin(Math.PI * t)
    pts.push(x + lx * ca - ly * sa, y + lx * sa + ly * ca)
  }
  for (let i = 0; i <= steps; i++) put(i / steps, 1)
  for (let i = steps; i >= 0; i--) put(i / steps, -1)
  g.poly(pts)
}

export class CultivatorScene {
  constructor() {
    this.app = null
    this.destroyed = false
    this.unsubs = []
    this.time = 0
    // Trạng thái điều khiển từ bên ngoài
    this.realmIdx = 0
    this.fill = 0
    this.particlesOn = true
    // Trạng thái hiệu ứng nội bộ
    this.pose = 'meditate'
    this.storm = 0 // 0..1 độ u ám hiện tại
    this.stormTarget = 0
    this.shake = 0
    this.flash = 0
    this.auraBoost = 0
    this.hitFlash = 0
    this.spawnAcc = 0
    this.particles = []
    this.bolts = []
    this.rings = []
    this.layoutSize = { w: 0, h: 0 }
    // Chế độ chiến đấu
    this.mode = 'idle' // idle | battle
    this.px = 0 // vị trí x hiện tại của nhân vật (trượt mượt giữa giữa màn hình <-> bên trái)
    this.playerLunge = 0 // 0..1: nhân vật lao tới khi ra đòn
    this.enemyLunge = 0
    this.enemyHit = 0 // chớp đỏ khi trúng đòn
    this.enemyAppear = 0 // 0..1 hiện dần khi xuất hiện
    this.enemyDying = 0 // 1..0 mờ dần khi chết
    this.enemyBoss = false
    this.hasEnemy = false
    this.texts = []
    // Chủ đề bối cảnh theo bí cảnh, hạt khí quyển, bùa chú xoay quanh người
    this.theme = null
    this.ambient = []
    this.ambientCfg = null
    this.talismans = []
    // Nhân vật & bạn đồng hành
    this.weaponRarity = null // độ hiếm vũ khí đang cầm (null = kiếm mặc định)
    this.faceState = null
    this.foxTails = 0 // số đuôi của Bạch Linh (0 = chưa gặp)
    this.foxHop = 0
    this.enemyKind = 'golem'
  }

  // ------------------------------------------------------------------
  // Khởi tạo / huỷ
  // ------------------------------------------------------------------
  async init(host) {
    const app = new Application()
    await app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    })
    // Component có thể đã bị huỷ trong lúc init bất đồng bộ
    if (this.destroyed) {
      app.destroy(true, { children: true, texture: true })
      return
    }
    this.app = app
    host.appendChild(app.canvas)
    app.canvas.style.display = 'block'

    this.glowTex = glowTexture()
    this.buildLayers()
    this.layout()
    this.setPose('meditate')
    this.bindEvents()

    app.renderer.on('resize', () => this.layout())
    app.ticker.add((ticker) => this.update(Math.min(ticker.deltaMS / 1000, 0.1)))
  }

  destroy() {
    this.destroyed = true
    this.unsubs.forEach((off) => off())
    this.unsubs = []
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true })
      this.app = null
    }
  }

  /**
   * Đồng bộ cảnh chiến đấu với store: dùng khi mở màn Bí Cảnh để thấy ngay đúng bí cảnh, tư thế và yêu thú hiện tại
   * (kể cả khi đã vào trận lúc canvas đang ẩn hoặc trận được khôi phục).
   */
  syncBattle({ active, dungeonId, enemy }) {
    if (!this.app) return
    if (active) {
      if (this.mode !== 'battle') {
        this.mode = 'battle'
        this.setPose('sword')
      }
      if (this.themeId !== dungeonId) {
        this.themeId = dungeonId
        this.setTheme(dungeonId)
      }
      if (enemy && (!this.hasEnemy || this.enemyKind !== enemy.kind || this.enemyBoss !== enemy.boss)) {
        this.spawnEnemy({ kind: enemy.kind, color: enemy.color, boss: enemy.boss })
        this.enemyAppear = 1
      }
    } else if (this.mode === 'battle') {
      this.mode = 'idle'
      this.themeId = null
      this.setTheme(null)
      this.setPose('meditate')
      if (this.hasEnemy) {
        this.hasEnemy = false
        this.enemyDying = 1
      }
    }
  }

  /** Canvas đang hiện (true) hay bị ẩn (false): khi ẩn chỉ vẽ 4 khung/giây để tiết kiệm pin. */
  setActive(active) {
    if (this.app) this.app.ticker.maxFPS = active ? 0 : 4
  }

  /** Cập nhật trạng thái từ store (gọi từ watcher của component). */
  setState({ realmIdx, fill, particles, weapon, companion }) {
    if (realmIdx !== undefined && realmIdx !== this.realmIdx) {
      this.realmIdx = realmIdx
      if (this.app) {
        this.rebuildSky()
        this.buildTalismans()
        this.redrawHero() // trang phục đổi theo cảnh giới
      }
    }
    if (weapon !== undefined && weapon !== this.weaponRarity) {
      this.weaponRarity = weapon
      if (this.app) this.redrawHero()
    }
    if (companion !== undefined) this.foxTails = companion
    if (fill !== undefined) this.fill = fill
    if (particles !== undefined) this.particlesOn = particles
  }

  // ------------------------------------------------------------------
  // Dựng các lớp (một lần)
  // ------------------------------------------------------------------
  buildLayers() {
    const stage = this.app.stage
    this.world = new Container() // lớp bị rung khi sấm sét
    stage.addChild(this.world)

    this.skySprite = new Sprite(Texture.EMPTY)
    this.starLayer = new Container()
    this.moonLayer = new Container()
    this.mountainLayers = [0, 1, 2].map(() => new Container())
    this.mountainGfx = this.mountainLayers.map(() => new Graphics())
    this.cloudLayer = new Container()
    this.magicLayer = new Container() // trận pháp dưới chân
    this.platformGfx = new Graphics()
    this.enemyPlatformGfx = new Graphics()
    this.enemyLayer = new Container()
    this.enemyGlow = new Sprite(this.glowTex) // quầng đỏ sau lưng boss
    this.enemyGfx = new Graphics()
    this.textLayer = new Container() // số sát thương bay lên
    this.auraLayer = new Container()
    this.char = new Container()
    this.bodyGfx = new Graphics()
    this.swordGfx = new Graphics()
    this.particleLayer = new Container()
    this.fxGfx = new Graphics() // vòng sóng đột phá
    this.boltLayer = new Container()
    this.stormLayer = new Container()
    this.darkGfx = new Graphics()
    this.flashGfx = new Graphics()
    this.decorLayer = new Container() // bối cảnh tiền cảnh của bí cảnh (cuộn chậm)
    this.decorGfx = new Graphics()
    this.ambientLayer = new Container() // tuyết / tro tàn / ma trơi...
    this.talismanLayer = new Container() // bùa chú xoay quanh người
    this.ribbonGfx = new Graphics() // dải lụa bay sau lưng
    this.faceGfx = new Graphics() // nét mặt (vẽ lại khi chớp mắt / sẵn sàng đột phá)
    this.heroFx = new Graphics() // hiệu ứng theo cảnh giới: thần hồn, vầng hào quang, sao...
    this.heroFx.blendMode = 'add'
    this.foxLayer = new Container() // Bạch Linh
    this.foxGfx = new Graphics()
    this.foxLayer.addChild(this.foxGfx)
    this.foxLayer.visible = false
    this.vfx = new Vfx(this) // hiệu ứng chiêu thức & đột phá

    this.decorLayer.addChild(this.decorGfx)
    this.mountainLayers.forEach((layer, i) => layer.addChild(this.mountainGfx[i]))
    this.char.addChild(this.heroFx, this.ribbonGfx, this.bodyGfx, this.faceGfx, this.swordGfx)
    this.enemyGlow.anchor.set(0.5)
    this.enemyGlow.blendMode = 'add'
    this.enemyGlow.tint = 0xff3030
    this.enemyGlow.position.set(0, -50)
    this.enemyGlow.scale.set(1.8)
    this.enemyLayer.addChild(this.enemyGlow, this.enemyGfx)
    this.enemyLayer.visible = false
    this.world.addChild(
      this.skySprite,
      this.starLayer,
      this.moonLayer,
      ...this.mountainLayers,
      this.decorLayer,
      this.cloudLayer,
      this.ambientLayer,
      this.stormLayer, // mây giông + lớp tối nằm dưới nhân vật để nhân vật vẫn sáng rõ
      this.darkGfx,
      this.magicLayer,
      this.platformGfx,
      this.foxLayer,
      this.enemyPlatformGfx,
      this.auraLayer,
      this.enemyLayer,
      this.char,
      this.talismanLayer,
      this.vfx.layer,
      this.particleLayer,
      this.fxGfx,
      this.boltLayer,
      this.textLayer,
    )
    stage.addChild(this.flashGfx) // chớp trắng không bị rung

    // Aura: 3 quầng sáng cộng hưởng + vòng trận pháp xoay
    this.auraSprites = [0, 1, 2].map(() => {
      const s = new Sprite(this.glowTex)
      s.anchor.set(0.5)
      s.blendMode = 'add'
      this.auraLayer.addChild(s)
      return s
    })
    this.magicRing = new Graphics()
    this.magicLayer.addChild(this.magicRing)
  }

  /** Dựng lại mọi thứ phụ thuộc kích thước màn hình. */
  layout() {
    if (!this.app) return
    const w = this.app.screen.width
    const h = this.app.screen.height
    if (w < 2 || h < 2) return
    this.layoutSize = { w, h }
    this.u = clamp(Math.min(w / 340, h / 300), 0.55, 1.7) // hệ số tỉ lệ nhân vật
    this.cx = w / 2
    this.groundY = h * 0.74

    this.rebuildSky()
    this.buildStars(w, h)
    this.buildMoon(w, h)
    this.buildClouds(w, h)
    this.buildStorm(w, h)
    this.buildPlatform()
    this.buildDecor()
    this.setAmbient(this.theme?.ambient)
    this.buildTalismans()

    this.darkGfx.clear().rect(0, 0, w, h).fill({ color: 0x02030a, alpha: 1 })
    this.flashGfx.clear().rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 1 })

    this.enemyX = w * 0.74
    this.px = this.targetPx()
    this.char.position.set(this.px, this.groundY - 10 * this.u)
    this.char.scale.set(this.u * 1.15)
    this.auraLayer.position.set(this.px, this.groundY - 70 * this.u)
    this.magicLayer.position.set(this.px, this.groundY + 4 * this.u)
    this.magicLayer.scale.set(this.u, this.u * 0.28)
    this.enemyPlatformGfx.x = this.enemyX
    this.enemyLayer.position.set(this.enemyX, this.groundY - 8 * this.u)
    this.drawMagicRing()
  }

  /** Vị trí x mong muốn của nhân vật: giữa màn hình khi tu luyện, bên trái khi chiến đấu. */
  targetPx() {
    return this.mode === 'battle' ? this.layoutSize.w * 0.27 : this.cx
  }

  rebuildSky() {
    const { w, h } = this.layoutSize
    if (!w) return
    const palette = this.currentPalette()
    const old = this.skySprite.texture
    this.skySprite.texture = gradientTexture(palette, h)
    this.skySprite.width = w
    this.skySprite.height = h
    if (old && old !== Texture.EMPTY) old.destroy(true)
    this.buildMountains(w, h) // màu núi phụ thuộc màu chân trời
    this.drawMagicRing()
  }

  buildStars(w, h) {
    this.starLayer.removeChildren().forEach((c) => c.destroy())
    this.stars = Array.from({ length: 46 }, () => {
      const s = new Sprite(this.glowTex)
      s.anchor.set(0.5)
      s.position.set(rand(0, w), rand(0, h * 0.5))
      const size = rand(0.06, 0.2)
      s.scale.set(size)
      s.blendMode = 'add'
      this.starLayer.addChild(s)
      return { sprite: s, base: size, phase: rand(0, 6.28), speed: rand(0.8, 2.2) }
    })
  }

  buildMoon(w, h) {
    this.moonLayer.removeChildren().forEach((c) => c.destroy())
    const mx = w * 0.78
    const my = h * 0.2
    const r = Math.min(w, h) * 0.075
    const halo = new Sprite(this.glowTex)
    halo.anchor.set(0.5)
    halo.position.set(mx, my)
    halo.scale.set((r * 5.5) / 128)
    halo.tint = 0xcfe3ff
    halo.alpha = 0.55
    halo.blendMode = 'add'
    const disc = new Graphics().circle(mx, my, r).fill({ color: 0xf3f6ff })
    disc.circle(mx - r * 0.3, my - r * 0.2, r * 0.22).fill({ color: 0xdbe3f5, alpha: 0.8 })
    disc.circle(mx + r * 0.35, my + r * 0.3, r * 0.16).fill({ color: 0xdbe3f5, alpha: 0.8 })
    this.moonLayer.addChild(halo, disc)
  }

  /** Vẽ 3 lớp núi tuần hoàn rộng 2W để cuộn parallax vô tận. */
  buildMountains(w, h) {
    const palette = this.currentPalette()
    const horizon = palette[2]
    const specs = [
      { base: h * 0.58, amp: h * 0.2, seed: 1.3, shade: 0.55, speed: 3 },
      { base: h * 0.68, amp: h * 0.17, seed: 4.1, shade: 0.72, speed: 7 },
      { base: h * 0.78, amp: h * 0.14, seed: 7.7, shade: 0.88, speed: 14 },
    ]
    this.mountainSpeeds = specs.map((s) => s.speed)
    specs.forEach((spec, i) => {
      const g = this.mountainGfx[i]
      g.clear()
      const steps = 64
      const pts = [0, h + 10]
      for (let k = 0; k <= steps * 2; k++) {
        const x = (k / steps) * w
        const p = (k / steps) * Math.PI * 2 // tuần hoàn theo w
        const peak =
          0.55 * Math.abs(Math.sin(p * 3 + spec.seed)) +
          0.3 * Math.abs(Math.sin(p * 7 + spec.seed * 2)) +
          0.15 * Math.abs(Math.sin(p * 13 + spec.seed * 3))
        pts.push(x, spec.base - spec.amp * peak)
      }
      pts.push(w * 2, h + 10)
      g.poly(pts).fill({ color: mix(horizon, 0x05070d, spec.shade) })
      this.mountainLayers[i].x = 0
    })
  }

  buildClouds(w, h) {
    this.cloudLayer.removeChildren().forEach((c) => c.destroy())
    this.clouds = Array.from({ length: 6 }, (_, i) => {
      const c = new Container()
      const g = new Graphics()
      const scale = rand(0.7, 1.5)
      for (let k = 0; k < 4; k++) {
        g.ellipse(k * 26 - 40, rand(-6, 6), rand(28, 46), rand(10, 18)).fill({ color: 0xffffff, alpha: 0.07 })
      }
      c.addChild(g)
      c.scale.set(scale * this.u)
      c.position.set(rand(0, w), h * (0.18 + (i / 6) * 0.5))
      this.cloudLayer.addChild(c)
      return { node: c, speed: rand(4, 14) }
    })
  }

  /** Mây giông phủ đỉnh màn hình, chỉ hiện khi độ kiếp (alpha điều khiển trong update). */
  buildStorm(w) {
    this.stormLayer.removeChildren().forEach((c) => c.destroy())
    const g = new Graphics()
    for (let i = 0; i < 14; i++) {
      g.ellipse(rand(-20, w + 20), rand(-10, 50) * this.u, rand(60, 130) * this.u, rand(24, 52) * this.u).fill({
        color: i % 2 ? 0x141826 : 0x1d2236,
        alpha: 0.9,
      })
    }
    this.stormLayer.addChild(g)
    this.stormLayer.alpha = 0
  }

  /** Bệ đá lơ lửng + toà sen dưới chân nhân vật. */
  buildPlatform() {
    this.drawPlatform(this.platformGfx, this.cx, this.u, true)
    this.drawPlatform(this.enemyPlatformGfx, 0, this.u * 0.8, false)
  }

  /** Vẽ bệ đá tại hoành độ x; `lotus` thêm toà sen cho nhân vật. */
  drawPlatform(g, x, u, lotus) {
    g.clear()
    const y = this.groundY
    // Thân đá phía dưới (hình nón ngược)
    g.poly([x - 78 * u, y, x + 78 * u, y, x + 46 * u, y + 34 * u, x + 14 * u, y + 62 * u, x - 20 * u, y + 40 * u, x - 52 * u, y + 28 * u]).fill({
      color: 0x2a3042,
    })
    g.poly([x + 78 * u, y, x + 46 * u, y + 34 * u, x + 14 * u, y + 62 * u, x + 30 * u, y + 20 * u]).fill({ color: 0x1b2030 })
    // Mặt bệ
    g.ellipse(x, y, 80 * u, 14 * u).fill({ color: 0x3a425a })
    g.ellipse(x, y - 1.5 * u, 72 * u, 11 * u).fill({ color: 0x4a546e })
    // Toà sen: hai lớp cánh
    const petals = (count, len, wid, color, alpha, yy) => {
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1)
        const ang = -Math.PI + 0.35 + t * (Math.PI - 0.7)
        leaf(g, x, yy, ang, len * u, wid * u)
        g.fill({ color, alpha })
      }
    }
    if (lotus) {
      petals(9, 60, 11, 0xe9b6d6, 0.9, y - 2 * u)
      petals(7, 46, 10, 0xffd8ea, 0.95, y - 4 * u)
    }
  }

  drawMagicRing() {
    const g = this.magicRing
    const color = REALMS[this.realmIdx]?.color ?? 0xffffff
    g.clear()
    g.circle(0, 0, 118).stroke({ width: 3, color, alpha: 0.65 })
    g.circle(0, 0, 96).stroke({ width: 1.5, color, alpha: 0.5 })
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.moveTo(Math.cos(a) * 96, Math.sin(a) * 96).lineTo(Math.cos(a) * 118, Math.sin(a) * 118)
      g.stroke({ width: 2, color, alpha: 0.6 })
      g.circle(Math.cos(a) * 107, Math.sin(a) * 107, 3).fill({ color, alpha: 0.7 })
    }
    // Bát quái đơn giản: tam giác lồng nhau
    for (let k = 0; k < 2; k++) {
      const pts = []
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + k * Math.PI
        pts.push(Math.cos(a) * 90, Math.sin(a) * 90)
      }
      g.poly(pts).stroke({ width: 1.5, color, alpha: 0.5 })
    }
  }

  // ------------------------------------------------------------------
  // Nhân vật chính (hình vẽ chi tiết nằm ở art.js)
  // ------------------------------------------------------------------
  setPose(pose) {
    this.pose = pose
    if (!this.app) return
    this.swordGfx.visible = pose === 'sword'
    this.redrawHero()
  }

  /** Vẽ lại thân, kiếm và mặt khi đổi tư thế / cảnh giới / vũ khí. */
  redrawHero() {
    this.bodyGfx.clear()
    this.swordGfx.clear()
    ART.drawHeroBody(this.bodyGfx, { pose: this.pose, realmIdx: this.realmIdx })
    if (this.pose === 'sword') {
      this.swordGfx.position.set(26, -133)
      ART.drawSword(this.swordGfx, { rarity: this.weaponRarity, trim: REALMS[this.realmIdx]?.color ?? 0x7fe3ff })
    }
    this.faceState = null // buộc vẽ lại mặt
    this.updateFace(this.time)
  }

  /** Mắt: nhắm khi thiền; sáng lên khi linh khí đầy (sẵn sàng đột phá); mở và chớp khi đứng. */
  updateFace(t) {
    let state
    if (this.pose === 'sword') state = t % 4.2 < 0.13 ? 'blink' : 'open'
    else state = this.fill >= 1 && !this.hasEnemy ? 'glow' : 'closed'
    if (state === this.faceState) return
    this.faceState = state
    this.faceGfx.clear()
    ART.drawHeroFace(this.faceGfx, { pose: this.pose, state, glowColor: REALMS[this.realmIdx]?.color ?? 0x7fe3ff })
  }

  /** Bạch Linh: ngồi cạnh bệ đá, nhún nhảy khi chủ ra đòn; số đuôi tăng theo tu vi. */
  updateFox(dt, t, bob) {
    if (this.foxTails <= 0) {
      this.foxLayer.visible = false
      return
    }
    this.foxLayer.visible = true
    this.foxHop = Math.max(0, this.foxHop - dt * 2.2)
    const battle = this.mode === 'battle'
    this.foxLayer.position.set(this.px - (battle ? 58 : 76) * this.u, this.groundY - 2 * this.u + bob * 0.4)
    this.foxLayer.scale.set(0.85 * this.u)
    this.foxGfx.clear()
    ART.drawFox(this.foxGfx, {
      t,
      tails: this.foxTails,
      hop: this.foxHop > 0 ? 1 - this.foxHop : 0,
      color: REALMS[this.realmIdx]?.color ?? 0x7fe3ff,
      happy: this.fill >= 1,
    })
  }

  // ------------------------------------------------------------------
  // Sự kiện từ game logic -> hiệu ứng hình ảnh
  // ------------------------------------------------------------------
  bindEvents() {
    this.unsubs.push(
      on('breakthrough-success', ({ realmChanged, stageName }) => {
        // Chờ một nhịp để watcher cập nhật realmIdx (màu hào quang mới) rồi mới phát cảnh đột phá
        this.vfx.later(0.05, () => this.vfx.breakthrough({ color: REALMS[this.realmIdx]?.color ?? 0xffffff, big: realmChanged, stageName }))
        this.setPose(this.pose) // vẽ lại để cập nhật màu viền theo cảnh giới
        this.burst(realmChanged ? 90 : 45)
        this.addRing(realmChanged ? 2 : 1)
        this.flash = realmChanged ? 0.7 : 0.35
        this.auraBoost = 1.6
      }),
      on('breakthrough-fail', () => {
        this.shake = Math.max(this.shake, 8)
        this.hitFlash = 1
        this.smoke(26)
      }),
      on('tribulation-start', () => {
        this.stormTarget = 1
        this.setPose('sword')
      }),
      on('tribulation-bolt', ({ hpRatio }) => {
        this.strikeLightning()
        this.flash = 0.9
        this.shake = 22
        this.hitFlash = 1
        this.burst(18)
        if (hpRatio <= 0) this.smoke(30)
      }),
      // Vượt Ải đánh liên tục kể cả khi đang ở màn khác: cảnh chỉ vẽ trận khi ở chế độ battle (do syncBattle bật theo màn hình)
      on('battle-enemy-spawn', (e) => this.mode === 'battle' && this.spawnEnemy(e)),
      on('battle-hit', (hit) => {
        if (this.mode !== 'battle') return
        if (hit.target === 'enemy') this.vfx.defer(() => this.onBattleHit(hit))
        else this.onBattleHit(hit)
      }),
      on('battle-skill', (ev) => {
        if (this.mode !== 'battle') return
        if (ev.kind === 'damage') this.playerLunge = 1
        this.spawnText(ev.name, this.px, this.groundY - 165 * this.u, css(ev.color), 16)
        this.vfx.castSkill(ev)
      }),
      on('battle-enemy-die', ({ boss }) => this.mode === 'battle' && this.vfx.defer(() => this.killEnemy(boss))),
      on('battle-heal', ({ amount }) => {
        if (this.mode !== 'battle') return
        this.spawnText('+' + amount, this.px, this.groundY - 150 * this.u, '#6dffb0', 20)
        this.burst(14, this.px, this.groundY - 70 * this.u, 0x6dffb0)
      }),
      on('battle-end', () => {
        // Thua hoặc tạm dừng: quái còn lại tan biến, vẫn ở cảnh chiến đấu nếu đang xem màn Vượt Ải
        if (this.mode === 'battle' && this.hasEnemy) {
          this.hasEnemy = false
          this.enemyDying = 1
        }
      }),
      on('tribulation-end', ({ survived }) => {
        this.stormTarget = 0
        this.setPose('meditate')
        if (survived) {
          this.burst(100)
          this.addRing(3)
        }
      }),
    )
  }

  // ------------------------------------------------------------------
  // Yêu thú & số sát thương (chế độ chiến đấu)
  // ------------------------------------------------------------------
  spawnEnemy({ kind, color, boss }) {
    this.enemyKind = kind
    this.enemyBoss = boss
    this.enemyColor = color
    this.hasEnemy = true
    this.enemyAppear = 0
    this.enemyDying = 0
    this.enemyHit = 0
    this.enemyLayer.visible = true
    this.enemyGlow.visible = boss
  }

  /** hit: { target, damage, crit, skill?, color?, edge? } - edge 'up'/'down' = lợi/hại về ngũ hành */
  onBattleHit({ target, damage, crit, skill, color, edge }) {
    const y = this.groundY - 110 * this.u
    const arrow = edge === 'up' ? '▲' : edge === 'down' ? '▼' : ''
    if (target === 'enemy') {
      if (!skill) {
        this.playerLunge = 1
        this.vfx.slashArc(!!crit)
      }
      this.foxHop = 1
      this.enemyHit = 1
      this.shake = Math.max(this.shake, crit || skill ? 7 : 3)
      const tint = skill ? css(color) : crit ? '#ffd36b' : '#ffffff'
      this.spawnText(damage + arrow, this.enemyX + rand(-12, 12), y, tint, crit || skill ? 28 : 20)
      this.burst(crit || skill ? 12 : 5, this.enemyX, this.groundY - 50 * this.u, skill ? color : crit ? 0xffd36b : 0xffffff)
    } else {
      this.enemyLunge = 1
      this.hitFlash = damage > 0 ? 1 : 0
      this.shake = Math.max(this.shake, damage > 0 ? 4 : 0)
      this.spawnText(damage > 0 ? '-' + damage + arrow : 'Chặn', this.px + rand(-12, 12), y, damage > 0 ? '#ff7b6b' : '#9ad1ff', 20)
    }
  }

  killEnemy(boss) {
    this.hasEnemy = false
    this.enemyDying = 1
    this.burst(boss ? 70 : 28, this.enemyX, this.groundY - 50 * this.u, this.enemyColor ?? 0xffffff)
    if (boss) {
      this.flash = Math.max(this.flash, 0.35)
      this.shake = Math.max(this.shake, 10)
    }
  }

  /** Số bay lên rồi mờ dần (sát thương, hồi máu). */
  spawnText(text, x, y, color, size) {
    const node = new Text({
      text,
      style: { fill: color, fontSize: size, fontWeight: '800', fontFamily: 'serif', stroke: { color: 0x000000, width: 4 } },
    })
    node.anchor.set(0.5)
    node.position.set(x, y)
    this.textLayer.addChild(node)
    this.texts.push({ node, life: 0, maxLife: 0.9, vx: rand(-14, 14), vy: -70 })
  }

  updateEnemy(dt, t, bob) {
    this.enemyLunge = Math.max(0, this.enemyLunge - dt * 3)
    this.enemyHit = Math.max(0, this.enemyHit - dt * 4)
    if (!this.enemyLayer.visible) return
    this.enemyGfx.clear()
    ART.drawEnemy(this.enemyGfx, this.enemyKind, this.enemyColor ?? 0xffffff, this.enemyBoss, t, this.enemyLunge)
    const size = (this.enemyBoss ? 1.45 : 0.98) * this.u
    if (this.hasEnemy) this.enemyAppear = Math.min(1, this.enemyAppear + dt * 3)
    else this.enemyDying = Math.max(0, this.enemyDying - dt * 2.2)
    const k = this.hasEnemy ? this.enemyAppear : this.enemyDying
    const lunge = Math.sin(Math.PI * this.enemyLunge) * 24 * this.u
    this.enemyLayer.visible = this.hasEnemy || this.enemyDying > 0
    this.enemyLayer.alpha = k
    this.enemyLayer.scale.set(-size * (0.85 + 0.15 * k), size * (0.85 + 0.15 * k)) // lật mặt sang trái
    this.enemyLayer.x = this.enemyX - lunge + this.enemyHit * 5
    this.enemyLayer.y = this.groundY - 8 * this.u + Math.sin(t * 1.3 + 1) * 2 * this.u + bob * 0.3
    this.enemyLayer.tint = this.enemyHit > 0 ? mix(0xffffff, 0xff4040, this.enemyHit) : 0xffffff
    this.enemyGlow.alpha = 0.55 + 0.25 * Math.sin(t * 3)
  }

  updateTexts(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const f = this.texts[i]
      f.life += dt
      f.node.x += f.vx * dt
      f.node.y += f.vy * dt
      f.vy += 40 * dt
      f.node.alpha = clamp(1 - (f.life / f.maxLife) ** 2, 0, 1)
      if (f.life >= f.maxLife) {
        f.node.destroy()
        this.texts.splice(i, 1)
      }
    }
  }

  // ------------------------------------------------------------------
  // Hạt (particle)
  // ------------------------------------------------------------------
  /** Hạt linh khí bay xoáy từ ngoài vào cơ thể. */
  spawnInward(count) {
    if (!this.particlesOn) return
    for (let i = 0; i < count && this.particles.length < 220; i++) {
      const color = i % 3 === 0 ? 0xffffff : REALMS[this.realmIdx]?.color ?? 0x7fe3ff
      this.addParticle({
        mode: 'in',
        angle: rand(0, Math.PI * 2),
        radius: rand(110, 210) * this.u,
        speed: rand(35, 85) * this.u,
        spin: rand(0.5, 1.6) * (Math.random() < 0.5 ? -1 : 1),
        size: rand(0.08, 0.2),
        color,
        life: 0,
        maxLife: 4,
      })
    }
  }

  /** Hạt nổ toả ra theo mọi hướng (đột phá / trúng lôi). */
  burst(count, x = this.px, y = this.groundY - 70 * this.u, tint) {
    const color = tint ?? REALMS[this.realmIdx]?.color ?? 0xffffff
    for (let i = 0; i < count && this.particles.length < 320; i++) {
      const a = rand(0, Math.PI * 2)
      const sp = rand(60, 260) * this.u
      this.addParticle({
        mode: 'out',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        size: rand(0.1, 0.28),
        color: i % 2 ? 0xffffff : color,
        life: 0,
        maxLife: rand(0.7, 1.5),
        gravity: 90,
      })
    }
  }

  /** Khói xám khi thất bại. */
  smoke(count) {
    for (let i = 0; i < count && this.particles.length < 320; i++) {
      this.addParticle({
        mode: 'out',
        x: this.px + rand(-30, 30) * this.u,
        y: this.groundY - rand(20, 90) * this.u,
        vx: rand(-40, 40),
        vy: rand(-60, -15),
        size: rand(0.25, 0.5),
        color: 0x444a5c,
        life: 0,
        maxLife: rand(1, 1.8),
        gravity: -10,
        normal: true,
      })
    }
  }

  addParticle(p) {
    const sprite = new Sprite(this.glowTex)
    sprite.anchor.set(0.5)
    sprite.tint = p.color
    sprite.blendMode = p.normal ? 'normal' : 'add'
    sprite.scale.set(p.size)
    this.particleLayer.addChild(sprite)
    p.sprite = sprite
    this.particles.push(p)
  }

  updateParticles(dt) {
    const center = { x: this.px, y: this.groundY - 70 * this.u }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += dt
      let dead = p.life >= p.maxLife
      if (p.mode === 'in') {
        p.radius -= p.speed * dt
        p.angle += p.spin * dt * (1 + (200 * this.u - p.radius) / (200 * this.u))
        p.sprite.position.set(center.x + Math.cos(p.angle) * p.radius, center.y + Math.sin(p.angle) * p.radius * 0.75)
        const fadeIn = clamp(p.life / 0.4, 0, 1)
        const fadeOut = clamp(p.radius / (40 * this.u), 0, 1)
        p.sprite.alpha = fadeIn * fadeOut
        if (p.radius < 6 * this.u) dead = true
      } else {
        p.vy += (p.gravity ?? 0) * dt
        p.sprite.x += p.vx * dt
        p.sprite.y += p.vy * dt
        p.sprite.alpha = (1 - p.life / p.maxLife) * (p.normal ? 0.5 : 1)
      }
      if (dead) {
        p.sprite.destroy()
        this.particles.splice(i, 1)
      }
    }
  }

  // ------------------------------------------------------------------
  // Sấm sét & vòng sóng
  // ------------------------------------------------------------------
  strikeLightning() {
    const { w } = this.layoutSize
    const targetX = this.cx + rand(-10, 10) * this.u
    const targetY = this.groundY - 120 * this.u
    const path = this.zigzag(clamp(targetX + rand(-60, 60), 20, w - 20), -10, targetX, targetY, 10, 38 * this.u)
    const g = new Graphics()
    const draw = (pts, width, color, alpha) => {
      g.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
      g.stroke({ width, color, alpha, join: 'round', cap: 'round' })
    }
    const branches = [path]
    for (let k = 0; k < 2; k++) {
      const from = path[Math.floor(rand(2, path.length - 3))]
      branches.push(this.zigzag(from.x, from.y, from.x + rand(-90, 90) * this.u, from.y + rand(60, 130) * this.u, 6, 20 * this.u))
    }
    branches.forEach((pts, i) => {
      const k = i === 0 ? 1 : 0.5
      draw(pts, 16 * k, 0x7fb2ff, 0.25)
      draw(pts, 7 * k, 0xbfd9ff, 0.6)
      draw(pts, 2.6 * k, 0xffffff, 1)
    })
    this.boltLayer.addChild(g)
    this.bolts.push({ g, life: 0, maxLife: 0.55 })
  }

  /** Đường gấp khúc ngẫu nhiên từ (x1,y1) tới (x2,y2). */
  zigzag(x1, y1, x2, y2, segments, jitter) {
    const pts = [{ x: x1, y: y1 }]
    for (let i = 1; i < segments; i++) {
      const t = i / segments
      pts.push({ x: lerp(x1, x2, t) + rand(-jitter, jitter), y: lerp(y1, y2, t) + rand(-jitter * 0.3, jitter * 0.3) })
    }
    pts.push({ x: x2, y: y2 })
    return pts
  }

  addRing(count) {
    for (let i = 0; i < count; i++) {
      this.rings.push({ r: 10 * this.u, delay: i * 0.25, alpha: 1, color: REALMS[this.realmIdx]?.color ?? 0xffffff })
    }
  }

  // ------------------------------------------------------------------
  // Vòng lặp cập nhật mỗi frame
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  // Chủ đề bí cảnh: trời, bối cảnh, hạt khí quyển
  // ------------------------------------------------------------------
  currentPalette() {
    return this.theme?.sky ?? SKY[this.realmIdx] ?? SKY[0]
  }

  /** Đổi chủ đề hình ảnh theo bí cảnh (null = về cảnh tu luyện). */
  setTheme(dungeonId) {
    const theme = dungeonId ? THEMES[dungeonId] ?? null : null
    if (theme === this.theme) return
    this.theme = theme
    this.moonLayer.visible = theme?.moon !== false
    this.starLayer.visible = theme?.stars !== false
    if (!this.layoutSize.w) return
    this.rebuildSky()
    this.buildDecor()
    this.setAmbient(theme?.ambient)
  }

  buildDecor() {
    const { w, h } = this.layoutSize
    const g = this.decorGfx
    g.clear()
    this.decorLayer.x = 0
    if (!this.theme || !w) return
    drawDecor(g, this.theme, 0, w, h, this.groundY, this.u)
    drawDecor(g, this.theme, w, w, h, this.groundY, this.u) // bản sao nối tiếp để cuộn vô tận
  }

  updateDecor(dt) {
    if (!this.theme) return
    const { w } = this.layoutSize
    this.decorLayer.x -= 10 * dt
    if (this.decorLayer.x <= -w) this.decorLayer.x += w
  }

  setAmbient(cfg) {
    this.ambientLayer.removeChildren().forEach((c) => c.destroy())
    this.ambient = []
    this.ambientCfg = cfg ?? null
    const { w, h } = this.layoutSize
    if (!cfg || !w) return
    const soft = cfg.kind === 'snow' || cfg.kind === 'leaves'
    for (let i = 0; i < cfg.count; i++) {
      const sprite = new Sprite(this.glowTex)
      sprite.anchor.set(0.5)
      sprite.tint = cfg.color
      sprite.blendMode = soft ? 'normal' : 'add'
      sprite.scale.set(cfg.kind === 'snow' ? rand(0.05, 0.11) : cfg.kind === 'leaves' ? rand(0.08, 0.14) : rand(0.08, 0.28))
      sprite.position.set(rand(0, w), rand(0, h))
      this.ambientLayer.addChild(sprite)
      this.ambient.push({ s: sprite, p: rand(0, 6.28), v: rand(0.6, 1.4) })
    }
  }

  updateAmbient(dt, t) {
    const cfg = this.ambientCfg
    if (!cfg) return
    const { w, h } = this.layoutSize
    for (const a of this.ambient) {
      const s = a.s
      switch (cfg.kind) {
        case 'snow':
          s.y += 34 * a.v * dt
          s.x += Math.sin(t * 0.8 + a.p) * 14 * dt - 6 * dt
          s.alpha = 0.85
          break
        case 'leaves':
          s.x -= 24 * a.v * dt
          s.y += 12 * a.v * dt + Math.sin(t * 2 + a.p) * 8 * dt
          s.alpha = 0.8
          break
        case 'embers':
          s.y -= 30 * a.v * dt
          s.x += Math.sin(t * 1.5 + a.p) * 12 * dt
          s.alpha = 0.5 + 0.5 * Math.sin(t * 6 + a.p)
          break
        case 'spores':
          s.y -= 10 * a.v * dt
          s.x += Math.sin(t * 0.7 + a.p) * 10 * dt
          s.alpha = 0.4 + 0.4 * Math.sin(t * 1.6 + a.p)
          break
        case 'wisps':
          s.x += Math.sin(t * 0.6 + a.p) * 22 * dt
          s.y -= 9 * a.v * dt
          s.alpha = 0.35 + 0.35 * Math.sin(t * 1.2 + a.p)
          break
        default:
          s.x -= 6 * a.v * dt
          s.alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 * a.v + a.p))
      }
      if (s.y > h + 8) s.y = -8
      else if (s.y < -8) s.y = h + 8
      if (s.x < -8) s.x = w + 8
      else if (s.x > w + 8) s.x = -8
    }
  }

  // ------------------------------------------------------------------
  // Nhân vật sống động: bùa chú xoay quanh người, dải lụa bay trong gió
  // ------------------------------------------------------------------
  /** Số lá bùa tăng theo đại cảnh giới (3 -> 8), màu theo hào quang. */
  buildTalismans() {
    this.talismanLayer.removeChildren().forEach((c) => c.destroy())
    this.talismans = []
    if (!this.app) return
    const n = Math.min(8, 3 + this.realmIdx)
    const color = REALMS[this.realmIdx]?.color ?? 0xffffff
    for (let i = 0; i < n; i++) {
      const node = new Container()
      const glow = new Sprite(this.glowTex)
      glow.anchor.set(0.5)
      glow.scale.set(0.5)
      glow.tint = color
      glow.blendMode = 'add'
      glow.alpha = 0.8
      const paper = new Graphics().roundRect(-5, -9, 10, 18, 2).fill({ color: 0xf4e2a8 }).rect(-1, -6, 2, 12).fill({ color: 0xc0392b })
      node.addChild(glow, paper)
      this.talismanLayer.addChild(node)
      this.talismans.push({ node, a: (i / n) * Math.PI * 2 })
    }
  }

  updateTalismans(t) {
    const u = this.u
    const spin = 0.7 + this.fill * 0.9
    const battle = this.mode === 'battle'
    const cy = this.groundY - (battle ? 92 : 76) * u
    for (const k of this.talismans) {
      const a = k.a + t * spin
      const depth = Math.sin(a) // >0: ở phía trước người
      k.node.x = this.px + Math.cos(a) * (battle ? 46 : 70) * u
      k.node.y = cy + depth * (battle ? 11 : 17) * u
      k.node.scale.set(u * (0.8 + 0.25 * depth))
      k.node.alpha = 0.55 + 0.45 * (depth * 0.5 + 0.5)
      k.node.rotation = Math.cos(a) * 0.4
    }
  }

  /** Dải lụa sau gáy bay theo gió, vẽ lại mỗi khung. */
  updateRibbon(t) {
    const g = this.ribbonGfx
    g.clear()
    const sword = this.pose === 'sword'
    const bx = -9
    const by = sword ? -112 : -86
    const color = REALMS[this.realmIdx]?.color ?? 0x7fe3ff
    const N = 12
    const top = []
    const bottom = []
    for (let i = 0; i <= N; i++) {
      const f = i / N
      const x = bx - f * (sword ? 62 : 54) - Math.sin(t * 2.2) * f * 6
      const y = by + f * (sword ? 10 : 16) + Math.sin(t * 3.1 + f * 5) * 7 * f
      const wd = 4.5 * (1 - f) + 0.6
      top.push(x, y - wd)
      bottom.unshift(y + wd)
      bottom.unshift(x)
    }
    g.poly([...top, ...bottom]).fill({ color, alpha: 0.85 })
  }

  update(dt) {
    if (!this.app || !this.layoutSize.w) return
    this.time += dt
    const t = this.time
    const { w } = this.layoutSize

    // Núi cuộn parallax
    this.mountainLayers.forEach((layer, i) => {
      layer.x -= this.mountainSpeeds[i] * dt
      if (layer.x <= -w) layer.x += w
    })
    // Mây trôi
    for (const c of this.clouds) {
      c.node.x += c.speed * dt
      if (c.node.x > w + 140) c.node.x = -140
    }
    // Sao nhấp nháy
    for (const s of this.stars) {
      s.sprite.alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
    }

    // Độ u ám khi độ kiếp (tiến dần tới mục tiêu)
    this.storm += (this.stormTarget - this.storm) * Math.min(1, dt * 1.6)
    this.darkGfx.alpha = this.storm * 0.55
    this.stormLayer.alpha = this.storm
    this.stormLayer.x = Math.sin(t * 0.3) * 12

    // Hít thở / lơ lửng của nhân vật
    const breathe = Math.sin(t * 1.6)
    const bob = Math.sin(t * 0.9) * 2.5 * this.u
    // Trượt ngang giữa màn hình (tu luyện) <-> bên trái (chiến đấu); lao tới khi ra đòn
    this.px += (this.targetPx() - this.px) * Math.min(1, dt * 4)
    this.playerLunge = Math.max(0, this.playerLunge - dt * 3.2)
    const lunge = Math.sin(Math.PI * this.playerLunge) * 26 * this.u
    this.char.x = this.px + lunge
    this.char.rotation = Math.sin(Math.PI * this.playerLunge) * 0.1 // nghiêng người khi chém
    this.auraLayer.x = this.px
    this.magicLayer.x = this.px
    this.platformGfx.x = this.px - this.cx
    this.updateEnemy(dt, t, bob)
    this.updateFox(dt, t, bob)
    this.updateTexts(dt)
    this.char.y = this.groundY - 10 * this.u + bob
    const poseScale = this.pose === 'sword' ? 0.88 : 1 // tư thế đứng cao hơn nên thu nhỏ để vừa khung
    this.char.scale.set(this.u * 1.15 * poseScale, this.u * 1.15 * poseScale * (1 + breathe * 0.012))
    this.platformGfx.y = bob * 0.4
    if (this.pose === 'sword') {
      this.swordGfx.rotation =
        Math.sin(t * 3) * 0.05 + (this.storm > 0.5 ? Math.sin(t * 17) * 0.015 : 0) + Math.sin(Math.PI * this.playerLunge) * 1.2
    }
    // Chớp đỏ khi trúng lôi / thất bại
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.5)
    this.char.tint = this.hitFlash > 0 ? mix(0xffffff, 0xff6a5a, this.hitFlash) : 0xffffff

    // Aura: pulse theo tiến độ tu vi, bùng sáng khi bấm Tụ Khí
    this.auraBoost = Math.max(0, this.auraBoost - dt * 1.6)
    const color = REALMS[this.realmIdx]?.color ?? 0xffffff
    const strength = 0.35 + this.fill * 0.55 + this.auraBoost * 0.5
    this.auraSprites.forEach((s, i) => {
      const pulse = 1 + 0.08 * Math.sin(t * (1.4 + i * 0.5) + i)
      s.tint = i === 2 ? 0xffffff : color
      s.scale.set((2.2 + i * 1.4) * this.u * (1 + this.auraBoost * 0.25) * pulse) // texture glow 128px
      s.alpha = clamp(strength * (0.55 - i * 0.14), 0, 1)
    })
    this.magicRing.rotation += dt * (0.25 + this.fill * 0.5)
    this.magicLayer.alpha = this.pose === 'sword' ? 0.35 : 0.5 + this.fill * 0.5

    // Sinh hạt linh khí vào người: tốc độ tăng theo mức tu vi
    if (this.particlesOn && this.pose === 'meditate') {
      this.spawnAcc += dt * (8 + this.fill * 26)
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1
        this.spawnInward(1)
      }
    }
    this.updateParticles(dt)
    this.updateDecor(dt)
    this.updateAmbient(dt, t)
    this.updateTalismans(t)
    this.updateRibbon(t)
    this.updateFace(t)
    this.heroFx.clear()
    ART.drawHeroFx(this.heroFx, { t, realmIdx: this.realmIdx, pose: this.pose, fill: this.fill, color: REALMS[this.realmIdx]?.color ?? 0xffffff })
    this.vfx.update(dt)

    // Vòng sóng đột phá
    const rg = this.fxGfx
    rg.clear()
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]
      if (ring.delay > 0) {
        ring.delay -= dt
        continue
      }
      ring.r += 320 * this.u * dt
      ring.alpha -= dt * 0.8
      if (ring.alpha <= 0) {
        this.rings.splice(i, 1)
        continue
      }
      rg.ellipse(this.px, this.groundY - 60 * this.u, ring.r, ring.r * 0.75).stroke({
        width: 4 * this.u,
        color: ring.color,
        alpha: ring.alpha,
      })
    }

    // Tia sét mờ dần
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]
      b.life += dt
      b.g.alpha = Math.max(0, 1 - b.life / b.maxLife) * (Math.random() < 0.3 ? 0.5 : 1) // nhấp nháy
      if (b.life >= b.maxLife) {
        b.g.destroy()
        this.bolts.splice(i, 1)
      }
    }

    // Chớp sáng toàn màn hình + rung màn hình
    this.flash = Math.max(0, this.flash - dt * 2.2)
    this.flashGfx.alpha = this.flash
    this.shake = Math.max(0, this.shake - dt * 28)
    const rumble = this.storm > 0.6 ? 1.2 : 0
    const amp = this.shake + rumble
    this.world.position.set(amp ? rand(-amp, amp) : 0, amp ? rand(-amp, amp) : 0)
  }
}
