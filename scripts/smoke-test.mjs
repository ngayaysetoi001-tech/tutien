// =====================================================================
// smoke-test.mjs - Kiểm tra nhanh logic game bằng Node (không cần trình duyệt)
// Chạy: npm run check  (hoặc: node scripts/smoke-test.mjs)
// =====================================================================
import assert from 'node:assert/strict'

// ---- Shim môi trường trình duyệt ----
const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}
// Hẹn giờ giả: thiên kiếp (setTimeout) được chạy tay để test không phải chờ
const timers = []
globalThis.setTimeout = (fn) => timers.push(fn)
globalThis.clearTimeout = () => { timers.length = 0 }
const drainTimers = () => { while (timers.length) timers.shift()() }

const { createPinia, setActivePinia } = await import('pinia')
const { useGameStore } = await import('../src/stores/gameStore.js')
const { SAVE_KEY, OFFLINE_CAP_SECONDS } = await import('../src/game/constants.js')
const { deserialize } = await import('../src/services/saveService.js')
const { fmt } = await import('../src/game/format.js')
const F = await import('../src/game/formulas.js')
const { ITEMS: ALL_ITEMS, MONSTERS: ALL_MONSTERS, DUNGEONS: ALL_DUNGEONS } = await import('../src/game/data.js')
const C = await import('../src/game/campaign.js')
const Decimal = (await import('break_infinity.js')).default

let passed = 0
const ok = (name, fn) => { fn(); passed++; console.log('  ✓', name) }
// keep=true: giữ LocalStorage (mô phỏng tải lại trang); mặc định xoá để test độc lập
// Truyện tự mở sẽ tạm dừng chiến đấu nên mặc định tắt trong test; test cốt truyện bật lại bằng s.checkStory = s.realCheckStory
const freshStore = (keep = false) => {
  if (!keep) mem.clear()
  setActivePinia(createPinia())
  const st = useGameStore()
  st.realCheckStory = st.checkStory
  st.checkStory = () => {}
  st.eventNext = 1e12 // không để kỳ ngộ ngẫu nhiên xen vào các test chung (test kỳ ngộ gọi triggerEvent trực tiếp)
  return st
}

console.log('Smoke test logic Tu Tiên')

// 1. Game mới
let g = freshStore()
g.init()
ok('init tạo game mới và ghi log', () => {
  assert.equal(g.ready, true)
  assert.equal(g.stageIdx, 0)
  assert.ok(g.log.length >= 1)
})

// 2. Linh khí thụ động
ok('tick cộng linh khí và linh thạch', () => {
  g.tick(10)
  assert.ok(g.exp.gt(0))
  assert.ok(g.spiritStones.gt(0))
})
ok('linh khí không vượt yêu cầu', () => {
  g.tick(1e6)
  assert.ok(g.exp.eq(g.requirement))
  assert.ok(g.isFull)
})

// 3. Đột phá thường
const realRandom = Math.random
ok('đột phá thành công lên tầng 2', () => {
  Math.random = () => 0 // luôn thành công
  g.breakthrough()
  assert.equal(g.stageIdx, 1)
  assert.ok(g.exp.eq(0))
})
ok('đột phá thất bại mất linh khí, không lên bậc', () => {
  g.tick(1e6)
  Math.random = () => 0.999 // luôn thất bại
  g.breakthrough()
  assert.equal(g.stageIdx, 1)
  assert.ok(g.exp.lt(g.requirement))
  assert.equal(g.stats.failures, 1)
})

// 4. Tỉ lệ đột phá
ok('tỉ lệ đột phá: 90% đầu, giảm dần, có sàn', () => {
  assert.equal(F.successRate(0), 0.9)
  assert.ok(F.successRate(10) < F.successRate(1))
  assert.equal(F.successRate(17), 0.4)
})

// 5. Luyện Khí 9 -> Trúc Cơ (không độ kiếp), Trúc Cơ Hậu -> Kim Đan (độ kiếp)
ok('Luyện Khí 9 -> Trúc Cơ không có thiên kiếp', () => {
  g.stageIdx = 8
  g.exp = g.requirement
  Math.random = () => 0
  g.breakthrough()
  assert.equal(g.stageIdx, 9)
  assert.equal(g.tribulation.active, false)
})
ok('Trúc Cơ Hậu -> Kim Đan kích hoạt Lôi Kiếp 3 đạo và vượt qua', () => {
  g.stageIdx = 11
  g.exp = g.requirement
  Math.random = () => 0 // sát thương thấp nhất, đột phá thành công
  g.breakthrough()
  assert.equal(g.tribulation.active, true)
  assert.equal(g.tribulation.total, 3)
  g.tick(100) // đang độ kiếp: không cộng linh khí
  assert.ok(g.exp.eq(g.requirement))
  drainTimers()
  assert.equal(g.tribulation.active, false)
  assert.equal(g.stageIdx, 12)
  assert.equal(g.stats.tribulations, 1)
})
ok('Lôi Kiếp thất bại khi khí huyết quá thấp', () => {
  g.stageIdx = 11
  g.exp = g.requirement
  g.bonus.hp = -g.combat.hp + 50 // chỉ còn 50 khí huyết
  Math.random = () => 0
  g.breakthrough()
  drainTimers()
  assert.equal(g.stageIdx, 11)
  assert.equal(g.tribulation.active, false)
  assert.ok(g.exp.lt(g.requirement))
  g.bonus.hp = 0
})
ok('bậc cuối cùng (Độ Kiếp Hậu Kỳ) không thể đột phá', () => {
  g.stageIdx = 32
  g.exp = g.requirement
  assert.equal(g.canBreakthrough, false)
})
Math.random = realRandom

// 6. Tụ Linh Trận
ok('nâng Tụ Linh Trận tiêu linh thạch và tăng tốc độ', () => {
  g.stageIdx = 0
  g.exp = new Decimal(0)
  g.spiritStones = new Decimal(1000)
  const rate = g.expRate
  g.upgradeArray()
  assert.equal(g.arrayLevel, 1)
  assert.ok(g.expRate.gt(rate))
  assert.ok(g.spiritStones.lt(1000))
})

// 7. Lưu / tải
ok('save -> load giữ nguyên dữ liệu (Decimal qua chuỗi)', () => {
  g.exp = new Decimal('1.5e40')
  g.stageIdx = 5
  g.save()
  const g2 = freshStore(true)
  g2.init()
  assert.equal(g2.stageIdx, 5)
  assert.equal(g2.arrayLevel, g.arrayLevel)
  assert.ok(g2.spiritStones.gt(0))
})

// 8. Offline progress
ok('offline cộng linh khí, chặn ở mức yêu cầu', () => {
  const s = freshStore()
  s.init()
  s.exp = new Decimal(0)
  s.save()
  const save = JSON.parse(mem.get(SAVE_KEY))
  save.savedAt = Date.now() - 3600 * 1000 // vắng mặt 1 giờ
  mem.set(SAVE_KEY, JSON.stringify(save))
  const s2 = freshStore(true)
  s2.init()
  assert.ok(s2.offlineReport)
  assert.ok(s2.offlineReport.exp.gt(0))
  assert.ok(s2.exp.lte(s2.requirement))
})
ok('offline tối đa 8 tiếng', () => {
  const r = F.offlineGain({
    seconds: Math.min(40 * 3600, OFFLINE_CAP_SECONDS),
    expRate: new Decimal(1),
    stonesRate: new Decimal(1),
    exp: new Decimal(0),
    requirement: new Decimal(1e12),
  })
  assert.ok(r.exp.eq(OFFLINE_CAP_SECONDS))
})

// 9. Nhập save lỗi
ok('deserialize từ chối dữ liệu hỏng', () => {
  assert.throws(() => deserialize(null, {}))
  assert.throws(() => deserialize({ version: 99, data: {} }, {}))
  assert.throws(() => deserialize({ version: 1 }, {}))
})

// 9b. Túi đồ, dùng đan, bán, luyện đan
const { useBattleStore } = await import('../src/stores/battleStore.js')
const { useUiStore: useUiStoreEarly } = await import('../src/stores/uiStore.js')
ok('luyện đan tiêu nguyên liệu, tạo đan, tăng kinh nghiệm', () => {
  const s = freshStore()
  s.init()
  s.addItem('herbs', 'linh_thao', 6)
  s.spiritStones = new Decimal(100)
  assert.equal(s.canCraft('tu_khi_dan'), true)
  const made = s.craft('tu_khi_dan', 2)
  assert.ok(made >= 2)
  assert.equal(s.itemCount('linh_thao'), 0)
  assert.equal(s.itemCount('tu_khi_dan'), made)
  assert.ok(s.alchemy.exp > 0 || s.alchemy.level > 1)
  assert.equal(s.canCraft('tu_khi_dan'), false) // hết nguyên liệu
  assert.equal(s.canCraft('pha_canh_dan'), false) // chưa đủ bậc/cấp
})
ok('dùng đan: linh khí, chỉ số vĩnh viễn giảm dần theo số lần dùng', () => {
  const s = freshStore()
  s.init()
  s.addItem('pills', 'tu_khi_dan', 1)
  s.addItem('pills', 'cuong_can_dan', 3)
  assert.equal(s.useItem('tu_khi_dan'), 1)
  assert.ok(s.exp.gt(0))
  s.useItem('cuong_can_dan', 1)
  const first = s.bonus.atk
  s.useItem('cuong_can_dan', 1)
  assert.ok(s.bonus.atk - first < first) // lần 2 yếu hơn lần 1
  assert.equal(s.usage.cuong_can_dan, 2)
})
ok('tàn quyển cần đủ 3 bản để lĩnh ngộ; bán vật phẩm nhận linh thạch', () => {
  const s = freshStore()
  s.init()
  s.addItem('scrolls', 'kiem_quyet', 2)
  assert.equal(s.useItem('kiem_quyet'), 0)
  s.addItem('scrolls', 'kiem_quyet', 1)
  assert.equal(s.useItem('kiem_quyet'), 1)
  assert.equal(s.bonus.atk, 6)
  s.addItem('ores', 'thiet_tinh', 5)
  const before = s.spiritStones
  assert.equal(s.sellItem('thiet_tinh', 5), 5)
  assert.ok(s.spiritStones.gt(before))
})
ok('Phá Cảnh Đan tăng tỉ lệ một lần; Hộ Kiếp Đan không cộng dồn lãng phí', () => {
  const s = freshStore()
  s.init()
  s.addItem('pills', 'pha_canh_dan', 2)
  const base = s.successChance
  assert.equal(s.useItem('pha_canh_dan', 2), 1) // buff đang có hiệu lực, không dùng thêm
  assert.ok(Math.abs(s.successChance - base - 0.1) < 1e-9)
  s.exp = s.requirement
  Math.random = () => 0
  s.breakthrough()
  assert.equal(s.buffs.success, 0)
  Math.random = realRandom
})

// 9c. Vượt Ải auto-battle
const runFor = (s, seconds) => { for (let t = 0; t < seconds * 10; t++) s.tick(0.1) }
ok('vượt ải: tự chiến đấu ngay ở ải 1, thắng liên tiếp thì tiến độ và thu hoạch tăng', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 10 // mạnh hơn nhiều so với ải đầu
  const b = useBattleStore()
  const stones = s.spiritStones
  runFor(s, 120)
  assert.ok(s.campaign.best >= 3, 'ải cao nhất ' + s.campaign.best)
  assert.equal(s.campaign.record, s.campaign.best)
  assert.ok(b.run.kills >= 3)
  assert.ok(s.spiritStones.gt(stones))
  assert.ok(s.stats.kills >= 3)
})
ok('tắt "Tự chiến đấu" thì không vào ải', () => {
  const s = freshStore()
  s.init()
  s.settings.autoRepeat = false
  const b = useBattleStore()
  runFor(s, 20)
  assert.equal(b.phase, 'idle')
  assert.equal(s.campaign.best, 0)
  s.settings.autoRepeat = true
  runFor(s, 1)
  assert.notEqual(b.phase, 'idle')
})
ok('yếu hơn ải -> thua, tích Kiên Trì, thử lại đúng ải đó và không tiến độ', () => {
  const s = freshStore()
  s.init()
  s.bonus.hp = -99 // chỉ còn 1 khí huyết: không chịu nổi đòn nào
  const b = useBattleStore()
  runFor(s, 60)
  assert.equal(s.campaign.best, 0)
  assert.equal(s.campaign.grit, 6, 'Kiên Trì tối đa sau nhiều lần thua')
  assert.equal(b.ai, 1)
  assert.ok(s.log.some((l) => l.text.includes('đánh bại')))
})
ok('Kiên Trì cộng chỉ số, xoá khi vượt ải mới', () => {
  const s = freshStore()
  s.init()
  const b = useBattleStore()
  assert.equal(b.gritMult(), 1)
  for (let i = 0; i < 10; i++) s.addGrit()
  assert.equal(s.campaign.grit, C.GRIT_MAX)
  assert.ok(Math.abs(b.gritMult() - (1 + C.GRIT_STEP * C.GRIT_MAX)) < 1e-9)
  assert.ok(b.playerStats().atk > s.combat.atk)
  s.recordAi(1)
  assert.equal(s.campaign.grit, 0)
  assert.equal(b.gritMult(), 1)
})
ok('vượt boss: tiến độ, kỷ lục và thưởng lần đầu; ải thường không thưởng thêm', () => {
  const s = freshStore()
  s.init()
  const stones = s.spiritStones
  assert.equal(s.recordAi(1), null)
  assert.ok(s.spiritStones.eq(stones))
  const bonus = s.recordAi(5)
  assert.ok(bonus && bonus.gt(0))
  assert.ok(s.spiritStones.gt(stones))
  assert.equal(s.campaign.best, 5)
  assert.equal(s.campaign.record, 5)
})
ok('thu nhập thụ động tăng theo ải cao nhất (linh khí và linh thạch)', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 10 // trần thu nhập theo bậc = ải 90
  const exp0 = s.expRate
  const st0 = s.stonesRate
  s.campaign.best = 20
  assert.ok(s.expRate.gt(exp0))
  assert.ok(s.stonesRate.gt(st0))
  const exp20 = s.expRate
  s.campaign.best = 40
  assert.ok(s.expRate.gt(exp20))
  assert.ok(s.expRate.gt(exp0.mul(1 + C.campaignExpBonus(40) - 0.01)))
  // trần theo bậc: kiếp mới (bậc thấp) có ải cao cũng không hưởng quá trần
  s.stageIdx = 0
  s.campaign.best = 200
  const capped = s.expRate
  s.campaign.best = C.INCOME_AI_BASE
  assert.ok(capped.eq(s.expRate), 'ải vượt trần không tăng thu nhập')
  assert.equal(C.incomeAi(200, 0), C.INCOME_AI_BASE)
  assert.equal(C.incomeAi(5, 0), 5)
  assert.equal(C.incomeAi(200, 10), C.INCOME_AI_BASE + 10 * C.INCOME_AI_PER_STAGE)
})
ok('nguyên liệu thụ động theo ải: ải 0 không có, có ải thì nhận được đúng nhóm', () => {
  const s = freshStore()
  s.init()
  assert.deepEqual(s.grantCampaignItems(3600), {})
  s.campaign.best = 35
  const got = s.grantCampaignItems(36000)
  assert.ok(Object.keys(got).length > 0)
  for (const id of Object.keys(got)) assert.ok(['herbs', 'ores'].includes(ALL_ITEMS[id].group))
})
ok('cày ải: chỉ chọn được ải đã vượt; thắng không tăng tiến độ', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  s.campaign.best = 3
  s.campaign.record = 3
  const b = useBattleStore()
  b.setFarm(9) // chưa vượt
  assert.equal(s.campaign.farm, null)
  assert.equal(b.targetAi(), 4)
  b.setFarm(2)
  assert.equal(b.targetAi(), 2)
  runFor(s, 40)
  assert.equal(s.campaign.best, 3)
  assert.equal(b.ai, 2)
  assert.ok(b.run.kills >= 2)
  b.setFarm(null)
  assert.equal(b.targetAi(), 4)
})
ok('Hồi Huyết Đan hồi khí huyết trong trận', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 4
  const b = useBattleStore()
  b.start()
  b.hp = 10
  s.addItem('pills', 'hoi_huyet_dan', 1)
  assert.equal(b.useHealPill(), true)
  assert.ok(b.hp > 10)
  assert.equal(s.itemCount('hoi_huyet_dan'), 0)
})
ok('độ kiếp dừng trận, qua độ kiếp thì tự đánh tiếp', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 11
  const b = useBattleStore()
  b.start()
  assert.equal(b.active, true)
  s.exp = s.requirement
  Math.random = () => 0
  s.breakthrough()
  assert.equal(s.tribulation.active, true)
  assert.equal(b.active, false)
  drainTimers()
  Math.random = realRandom
  runFor(s, 2)
  assert.equal(b.active, true)
})
ok('save/load giữ ải cao nhất, kỷ lục, Kiên Trì, ải đang cày; túi đồ, cấp luyện đan, kháng đan', () => {
  const s = freshStore()
  s.init()
  s.addItem('pills', 'duong_the_dan', 2)
  s.useItem('duong_the_dan', 1)
  s.alchemy.level = 4
  s.campaign = { best: 12, record: 15, grit: 2, farm: 7, milestone: 2 }
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.itemCount('duong_the_dan'), 1)
  assert.equal(s2.alchemy.level, 4)
  assert.deepEqual({ ...s2.campaign }, { best: 12, record: 15, grit: 2, farm: 7, milestone: 2 })
  assert.equal(s2.usage.duong_the_dan, 1)
  assert.ok(s2.bonus.hp > 0)
})
ok('save cũ (bí cảnh chọn tay) chuyển thành ải: thông quan = đủ chương, dở dang = số tầng', () => {
  const s = freshStore()
  s.init()
  s.save()
  const raw = JSON.parse(mem.get(SAVE_KEY))
  delete raw.data.campaign
  raw.data.dungeons = { hac_phong: { best: 6, clears: 3, grit: 0 }, linh_duoc: { best: 6, clears: 1, grit: 0 }, huyet_sat: { best: 4, clears: 0, grit: 2 } }
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.campaign.best, 24) // Huyết Sát (chương 3) tầng 4
  assert.equal(s2.campaign.record, 24)
  assert.equal(s2.campaign.farm, null)
  // dữ liệu ải hỏng bị chặn
  raw.data.campaign = { best: 'x', record: -5, grit: 99, farm: 1000 }
  delete raw.data.dungeons
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.campaign.best, 0)
  assert.equal(s3.campaign.grit, C.GRIT_MAX)
  assert.equal(s3.campaign.farm, null)
})
ok('offline: tiếp tục thử ải kế tiếp, báo cáo ải, nguyên liệu; tắt tự chiến đấu thì không leo', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 10
  s.campaign.best = 5
  s.save()
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.savedAt = Date.now() - 2 * 3600 * 1000
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s2 = freshStore(true)
  s2.init()
  const rep = s2.offlineReport.campaign
  assert.ok(rep, 'có báo cáo ải')
  assert.ok(rep.to > rep.from, 'leo được ải trong 2 giờ vắng mặt')
  assert.equal(s2.campaign.best, rep.to)
  assert.ok(s2.campaign.record >= rep.to)
  assert.ok(Object.keys(rep.items).length > 0)
  assert.ok(s2.stats.kills > 0)
  s2.settings.autoRepeat = false
  s2.offlineReport = null
  const before = s2.campaign.best
  s2.applyOffline(3600)
  assert.equal(s2.campaign.best, before)
  assert.equal(s2.offlineReport.campaign.to, before)
})

// =====================================================================
// Giai đoạn 2: ngũ hành, công pháp, trang bị, kỳ ngộ, thành tựu
// =====================================================================
const { elementMult } = await import('../src/game/elements.js')
const SK = await import('../src/game/skills.js')
const EQ = await import('../src/game/equipment.js')
const { on } = await import('../src/game/events.js')
const { ACHIEVEMENTS, achievementReward } = await import('../src/game/achievements.js')
const { RANDOM_EVENTS } = await import('../src/game/randomEvents.js')
const { serialize } = await import('../src/services/saveService.js')

ok('ngũ hành: Kim khắc Mộc, Mộc bị Kim khắc, hệ khác trung tính', () => {
  assert.equal(elementMult('kim', 'moc'), 1.2)
  assert.equal(elementMult('moc', 'kim'), 0.85)
  assert.equal(elementMult('kim', 'thuy'), 1)
  assert.equal(elementMult(undefined, 'kim'), 1)
})

ok('học công pháp: cần đủ tàn quyển, tự trang bị, thăng cấp tốn tàn quyển', () => {
  const s = freshStore()
  s.init()
  s.addItem('scrolls', SK.fragmentId('ngu_kiem'), 4)
  assert.equal(s.learnSkill('ngu_kiem'), false)
  s.addItem('scrolls', SK.fragmentId('ngu_kiem'), 1)
  assert.equal(s.learnSkill('ngu_kiem'), true)
  assert.equal(s.skills.owned.ngu_kiem, 1)
  assert.equal(s.skills.slots[0], 'ngu_kiem')
  assert.equal(s.itemCount(SK.fragmentId('ngu_kiem')), 0)
  assert.equal(s.upgradeSkill('ngu_kiem'), false) // chưa đủ 5 tàn quyển
  s.addItem('scrolls', SK.fragmentId('ngu_kiem'), 5)
  assert.equal(s.upgradeSkill('ngu_kiem'), true)
  assert.equal(s.skills.owned.ngu_kiem, 2)
})

ok('ô công pháp mở theo đại cảnh giới', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.skillSlots, 1)
  s.skills.owned.liet_hoa = 1
  assert.equal(s.equipSkill('liet_hoa', 1), false) // ô 2 chưa mở
  s.stageIdx = 9
  assert.equal(s.skillSlots, 2)
  assert.equal(s.equipSkill('liet_hoa', 1), true)
  s.stageIdx = 12
  assert.equal(s.skillSlots, 3)
})

ok('rèn trang bị: tiêu nguyên liệu, mặc vào tăng chỉ số, cường hoá, phân giải', () => {
  const s = freshStore()
  s.init()
  s.addItem('ores', 'thiet_tinh', 6)
  s.spiritStones = new Decimal(1000)
  const before = s.combat.atk
  const item = s.forge(0, 'weapon')
  assert.ok(item)
  assert.equal(s.itemCount('thiet_tinh'), 0)
  assert.equal(s.gear.bag.length, 1)
  assert.equal(s.canForge(0), false)
  s.equipGear(item.uid)
  const after = s.combat.atk
  assert.ok(after > before)
  assert.equal(s.enhanceGear(item.uid), true)
  assert.ok(s.combat.atk > after)
  assert.equal(s.sellGear(item.uid), false) // đang mặc, không phân giải được
  s.unequipGear('weapon')
  assert.equal(s.combat.atk, before)
  assert.equal(s.sellGear(item.uid), true)
  assert.equal(s.gear.bag.length, 0)
})

ok('trang bị pháp bảo tăng tốc độ linh khí; túi đầy tự phân giải', () => {
  const s = freshStore()
  s.init()
  const base = s.expRate
  const t = EQ.generateItem('trinket', 0)
  s.addGear(t)
  s.equipGear(t.uid)
  assert.ok(s.expRate.gt(base))
  for (let i = 0; i < EQ.BAG_LIMIT; i++) s.addGear(EQ.generateItem('armor', 0))
  assert.equal(s.gear.bag.length, EQ.BAG_LIMIT)
  const stones = s.spiritStones
  assert.equal(s.addGear(EQ.generateItem('armor', 0)), false)
  assert.ok(s.spiritStones.gt(stones))
})

ok('trận đánh: công pháp được thi triển, boss rơi trang bị, thống kê hạ quái', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 7
  s.element = 'kim'
  s.skills.owned.ngu_kiem = 3
  s.skills.owned.thanh_moc = 1
  s.skills.slots[0] = 'ngu_kiem'
  useUiStoreEarly().tab = 'battle' // hiệu ứng chỉ phát khi đang xem màn Vượt Ải
  const casts = []
  const edges = new Set()
  const off1 = on('battle-skill', (e) => casts.push(e.name))
  const off2 = on('battle-hit', (e) => edges.add(e.edge ?? 'none'))
  const b = useBattleStore()
  const realRnd = Math.random
  Math.random = () => 0.01 // luôn rơi trang bị ở boss
  s.campaign.best = 4 // ải kế tiếp là ải 5 (Tiểu Boss)
  s.campaign.record = 4
  runFor(s, 20)
  Math.random = realRnd
  off1()
  off2()
  assert.ok(casts.length >= 1, 'công pháp phải được thi triển')
  assert.ok(casts.every((n) => n === 'Ngự Kiếm Thuật'))
  assert.ok(s.campaign.best >= 5, 'phải vượt được ải 5')
  assert.ok(s.gear.bag.length >= 1, 'boss rơi trang bị')
  assert.ok(s.stats.kills >= 1 && s.stats.bossKills >= 1)
})

ok('lá chắn hấp thụ sát thương', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 4
  s.skills.owned.hau_tho = 1
  s.skills.slots[0] = 'hau_tho'
  const b = useBattleStore()
  b.start()
  b.castSkill('hau_tho', s.combat)
  assert.ok(b.shield > 0)
  const hp = b.hp
  b.shield = 1e9
  b.nextEnemy = 0
  b.enemyAct()
  assert.equal(b.hp, hp) // lá chắn nuốt hết sát thương
  b.retreat()
})

ok('kỳ ngộ: hiện hộp thoại, không dừng chiến đấu, chọn phương án, nhận kết quả', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 8
  const b = useBattleStore()
  b.start()
  s.triggerEvent()
  assert.ok(s.event)
  assert.equal(s.event.phase, 'choose')
  const evId = s.event.id
  const ev = RANDOM_EVENTS.find((e) => e.id === evId)
  assert.ok(ev.choices.length >= 1)
  const clock = b.clock
  s.tick(1)
  assert.ok(b.clock > clock, 'chiến đấu vẫn chạy khi kỳ ngộ đang chờ')
  s.chooseEvent(0)
  assert.equal(s.event.phase, 'result')
  assert.ok(s.event.resultText.length > 0)
  assert.equal(s.stats.events, 1)
  // kỳ ngộ có thể nối chuỗi: đi tiếp bằng phương án an toàn cho tới khi kết thúc
  for (let i = 0; i < 6 && s.event; i++) {
    if (s.event.phase === 'choose') s.chooseEvent(RANDOM_EVENTS.find((e) => e.id === s.event.id).safe)
    s.closeEvent()
  }
  assert.equal(s.event, null)

})

ok('kỳ ngộ bỏ ngỏ: tự chọn phương án an toàn sau 90 giây rồi đóng, ghi nhận vào thống kê', () => {
  const s = freshStore()
  s.init()
  for (const e of RANDOM_EVENTS) {
    assert.ok(Number.isInteger(e.safe) && e.choices[e.safe], 'thiếu phương án an toàn: ' + e.id)
    // phương án an toàn không được là giao chiến
    assert.ok(!e.choices[e.safe].fight, 'phương án an toàn không nên là giao chiến: ' + e.id)
  }
  s.triggerEvent()
  assert.ok(s.event)
  for (let i = 0; i < 80; i++) s.tick(1)
  assert.ok(s.event, 'chưa tới 90 giây')
  for (let i = 0; i < 15; i++) s.tick(1)
  assert.equal(s.event, null)
  assert.equal(s.stats.events, 1)
  assert.ok(s.log.some((l) => l.text.includes('an toàn')))
})

ok('mọi kỳ ngộ: xác suất các kết quả cộng đủ 1, hiệu ứng hợp lệ', () => {
  for (const ev of RANDOM_EVENTS) {
    for (const c of ev.choices) {
      if (c.fight) continue
      const sum = c.outcomes.reduce((n, o) => n + o.p, 0)
      assert.ok(Math.abs(sum - 1) < 1e-9, ev.id + ' xác suất ' + sum)
    }
  }
  // Chạy thử mọi phương án ở mọi bậc để chắc không ném lỗi
  for (const ev of RANDOM_EVENTS) {
    ev.choices.forEach((_, idx) => {
      const s = freshStore()
      s.init()
      s.stageIdx = 10
      s.event = { id: ev.id, phase: 'choose', resultText: '', effectsText: [] }
      s.chooseEvent(idx)
      assert.equal(s.event.phase, 'result')
    })
  }
})

ok('thành tựu: chưa đủ thì không nhận, đủ thì nhận thưởng từng mốc', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.claimAchievement('kills'), false)
  s.stats.kills = 60
  assert.equal(s.claimableCount, 1)
  const stones = s.spiritStones
  assert.equal(s.claimAchievement('kills'), true)
  assert.equal(s.achTier.kills, 1)
  assert.ok(s.spiritStones.gt(stones))
  assert.ok(s.bonus.atk > 0)
  assert.equal(s.claimAchievement('kills'), true) // mốc 50 cũng đã đủ? mốc 2 = 50
  assert.equal(s.achTier.kills, 2)
  assert.equal(s.claimAchievement('kills'), false) // mốc 3 = 200 chưa đủ
  for (const a of ACHIEVEMENTS) assert.ok(a.targets.every((t, i) => i === 0 || t > a.targets[i - 1]))
})

ok('thành tựu: mọi khoá thống kê đều ra số, thưởng hợp lệ; kỳ ngộ mới dùng đúng vật phẩm và quái có thật', () => {
  const s = freshStore()
  s.init()
  for (const a of ACHIEVEMENTS) {
    assert.ok(Number.isFinite(s.achievementValue(a.key)), 'khoá thống kê lỗi: ' + a.key)
    a.targets.forEach((_, tier) => assert.ok(achievementReward(a, tier).length >= 1))
  }
  s.stats.playSeconds = 3700
  assert.equal(s.achievementValue('playHours'), 1)
  const fxOf = (list) => list.flatMap((o) => o.effects)
  for (const ev of RANDOM_EVENTS) {
    assert.equal(new Set(RANDOM_EVENTS.filter((e) => e.id === ev.id)).size, 1, 'trùng id kỳ ngộ: ' + ev.id)
    for (const c of ev.choices) {
      const all = c.fight ? [c.win, c.lose] : c.outcomes
      if (c.fight) assert.ok(ALL_MONSTERS[c.fight.monster], 'quái không tồn tại: ' + c.fight.monster)
      for (const fx of fxOf(all)) if (fx.type === 'item') assert.ok(ALL_ITEMS[fx.id], 'vật phẩm không tồn tại: ' + fx.id)
    }
  }
})

ok('vượt ải: loại ải, chương, bối cảnh quay vòng, độ khó và thu nhập tăng đều', () => {
  assert.deepEqual([1, 4, 5, 9, 10, 15, 20, 100, 200].map(C.aiKind), ['normal', 'normal', 'mini', 'normal', 'big', 'mini', 'big', 'lord', 'lord'])
  assert.equal(C.chapterOf(10), 1)
  assert.equal(C.chapterOf(11), 2)
  assert.equal(C.themeOf(1).dungeon.id, ALL_DUNGEONS[0].id)
  assert.equal(C.themeOf(81).dungeon.id, ALL_DUNGEONS[0].id) // hết 8 chương thì quay vòng
  assert.equal(C.themeOf(81).round, 1)
  const hp = (n) => { const m = C.pickAiMonster(n, () => 0); return C.aiEnemyStats(n, m.tmpl, m.kind).hp }
  assert.ok(hp(10) > hp(9) * 2, 'Đại Boss phải mạnh hơn hẳn ải thường liền trước')
  assert.ok(hp(30) > hp(20) && hp(60) > hp(30) && hp(200) > hp(100))
  // boss lớn/chúa tể dùng boss của bối cảnh, tiểu boss dùng yêu thú thường
  assert.equal(C.pickAiMonster(10).id, C.themeOf(10).dungeon.boss)
  assert.ok(C.themeOf(5).dungeon.monsters.includes(C.pickAiMonster(5).id))
  // thu nhập tăng đơn điệu theo ải cao nhất
  assert.equal(C.campaignExpBonus(0), 0)
  assert.ok(C.campaignExpBonus(20) > C.campaignExpBonus(10))
  assert.ok(C.campaignStonesPerSecond(0).eq(0))
  assert.ok(C.campaignStonesPerSecond(50).gt(C.campaignStonesPerSecond(10)))
  assert.deepEqual(C.campaignItemsPerHour(0), [])
  for (const it of C.campaignItemsPerHour(35)) assert.ok(['herbs', 'ores'].includes(ALL_ITEMS[it.id].group) && it.perHour > 0)
  // thưởng lần đầu chỉ có ở boss
  assert.ok(C.firstClearStones(3).eq(0) && C.firstClearStones(5).gt(0) && C.firstClearStones(10).gt(C.firstClearStones(5)))
  // người chơi mạnh hơn thắng nhiều hơn; tử trận ở ải quá khó
  const weak = { hp: 100, atk: 10, def: 5, speed: 10 }
  const strong = { hp: 400, atk: 50, def: 30, speed: 14 }
  assert.ok(C.winChance(weak, 1, 60) > 0.6)
  assert.ok(C.winChance(weak, 80, 60) < 0.05)
  assert.ok(C.winChance(strong, 3, 60) >= C.winChance(weak, 3, 60))
})

ok('save/load giữ công pháp, trang bị đang mặc, thành tựu, hệ ngũ hành', () => {
  const s = freshStore()
  s.init()
  s.element = 'hoa'
  s.skills.owned.liet_hoa = 2
  s.skills.slots[0] = 'liet_hoa'
  const g = EQ.generateItem('weapon', 1)
  g.enh = 3
  s.addGear(g)
  s.equipGear(g.uid)
  s.achTier.kills = 2
  s.stats.events = 4
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.element, 'hoa')
  assert.equal(s2.skills.owned.liet_hoa, 2)
  assert.equal(s2.skills.slots[0], 'liet_hoa')
  assert.equal(s2.gear.bag[0].enh, 3)
  assert.equal(s2.gear.equipped.weapon, g.uid)
  assert.equal(s2.achTier.kills, 2)
  assert.equal(s2.stats.events, 4)
  assert.equal(s2.combat.atk, s.combat.atk)
})

ok('nhập save hỏng: bỏ trang bị/công pháp không hợp lệ thay vì sập', () => {
  const s = freshStore()
  s.init()
  const save = serialize(s)
  save.data.skills = { owned: { khong_ton_tai: 3, ngu_kiem: 99 }, slots: ['khong_ton_tai', 'ngu_kiem', 'ngu_kiem'] }
  save.data.gear = {
    bag: [{ uid: 'a', slot: 'sword', tier: 0, rarity: 0, enh: 0 }, { uid: 'b', slot: 'weapon', tier: 9, rarity: 0, enh: 0 }, { uid: 'c', slot: 'weapon', tier: 0, rarity: 0, enh: 999 }, null],
    equipped: { weapon: 'a', armor: 'c', trinket: null },
  }
  save.data.element = 'x'
  const patch = deserialize(save, { element: 'kim', spiritRoot: {}, name: 'n', createdAt: 1 })
  assert.deepEqual(Object.keys(patch.skills.owned), ['ngu_kiem'])
  assert.equal(patch.skills.owned.ngu_kiem, 5)
  assert.equal(patch.skills.slots[0], null)
  assert.equal(patch.gear.bag.length, 1)
  assert.equal(patch.gear.bag[0].enh, EQ.MAX_ENHANCE)
  assert.equal(patch.gear.equipped.weapon, null) // 'a' không tồn tại
  assert.equal(patch.gear.equipped.armor, null) // 'c' là vũ khí, sai ô
  assert.equal(patch.element, 'kim')
})

// =====================================================================
// Võ kỹ (chủ động) và Công pháp (bị động)
// =====================================================================
const AR = await import('../src/game/arts.js')
const { SHOP: SECT_SHOP } = await import('../src/game/sect.js')
const { on: onEvent } = await import('../src/game/events.js')

/** Cửa trận kiểm soát: bước vào ải, thay yêu thú bằng một mục tiêu trâu bò để đo hiệu ứng võ kỹ. */
const arena = (opts = {}) => {
  const s = freshStore()
  s.init()
  s.stageIdx = opts.stage ?? 10
  s.settings.autoHeal = false
  const b = useBattleStore()
  b.start()
  b.enemy.maxHp = 1e9
  b.enemy.hp = 1e9
  b.enemy.def = 0
  b.enemy.element = opts.enemyElement ?? 'tho'
  b.nextEnemy = 1e9 // địch đứng yên nếu không bị tác động
  b.nextPlayer = 1e9
  return { s, b }
}
const learn = (s, id) => { s.skills.owned[id] = 1 }

ok('võ kỹ: dữ liệu hợp lệ, có mô tả, có nguồn tàn quyển (rơi ở ải hoặc cửa hàng)', () => {
  const kinds = ['damage', 'dot', 'stun', 'execute', 'ultimate', 'heal', 'shield', 'haste', 'lifesteal', 'rage', 'reflect']
  const dropped = new Set(ALL_DUNGEONS.flatMap((d) => d.loot.map((l) => l.item)))
  for (const [id, sk] of Object.entries(SK.SKILLS)) {
    assert.ok(kinds.includes(sk.kind), id + ' kind')
    assert.ok(sk.cd > 0 && sk.power > 0 && ['kim', 'moc', 'thuy', 'hoa', 'tho'].includes(sk.element), id)
    assert.ok(['damage', 'haste', 'heal', 'shield'].includes(SK.visualKind(sk.kind)))
    assert.ok(SK.skillDesc(id, 3).length > 10)
    assert.ok(ALL_ITEMS[SK.fragmentId(id)], 'thiếu tàn quyển ' + id)
    assert.ok(dropped.has(SK.fragmentId(id)), 'không bí cảnh nào rơi ' + id)
    assert.ok(SECT_SHOP.some((e) => e.item === SK.fragmentId(id)), 'cửa hàng tông môn thiếu ' + id)
    if (['dot', 'stun', 'lifesteal', 'rage', 'reflect'].includes(sk.kind)) assert.ok(sk.seconds > 0, id + ' seconds')
  }
  assert.equal(SK.SKILLS.thien_ha.kind, 'ultimate')
  assert.ok(Object.keys(SK.SKILLS).length >= 12)
})

ok('ô võ kỹ: 4 ô (ô 4 mở ở Hóa Thần); tuyệt kỹ cần Nguyên Anh mới trang bị', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12 // Kim Đan
  assert.equal(s.skillSlots, 3)
  s.stageIdx = 18 // Hóa Thần
  assert.equal(s.skillSlots, 4)
  assert.equal(SK.MAX_SKILL_SLOTS, 5) // 4 theo cảnh giới + 1 của Pháp Tu
  s.stageIdx = 9 // Trúc Cơ: chưa đủ cho tuyệt kỹ
  s.skills.owned.thien_ha = 1
  assert.equal(SK.canEquip('thien_ha', s.realmIdx), false)
  assert.equal(s.equipSkill('thien_ha', 0), false)
  s.stageIdx = 15 // Nguyên Anh
  assert.equal(s.equipSkill('thien_ha', 0), true)
  // học tuyệt kỹ khi chưa đủ cảnh giới thì không tự trang bị
  const s2 = freshStore()
  s2.init()
  s2.addItem('scrolls', SK.fragmentId('thien_ha'), SK.LEARN_COST)
  assert.equal(s2.learnSkill('thien_ha'), true)
  assert.ok(!s2.skills.slots.includes('thien_ha'))
})

ok('võ kỹ Độc Chú: sát thương mỗi giây đến hết hạn, không sang yêu thú kế', () => {
  const { s, b } = arena()
  learn(s, 'doc_chu')
  Math.random = () => 0.5
  b.castSkill('doc_chu', s.combat)
  const hp0 = b.enemy.hp
  b.clock += 3.5
  b.processDot()
  const lost = hp0 - b.enemy.hp
  assert.ok(lost > 0)
  b.clock += 20 // quá hạn: không thêm sát thương
  b.processDot()
  const total = hp0 - b.enemy.hp
  assert.ok(Math.abs(total / lost - 2) < 0.01, 'đủ 6 nhịp (3 nhịp đầu + 3 nhịp sau), tỉ lệ ' + total / lost)
  b.dotUntil = b.clock + 100
  b.nextDot = b.clock
  b.spawnEnemy()
  assert.equal(b.dotUntil, 0, 'sang yêu thú mới thì hết độc')
  Math.random = realRandom
})

ok('võ kỹ Lôi Đình Chấn: gây sát thương và làm địch choáng (mất lượt ra đòn)', () => {
  const { s, b } = arena()
  learn(s, 'loi_dinh')
  b.nextEnemy = b.clock + 0.2
  b.castSkill('loi_dinh', s.combat)
  assert.ok(b.nextEnemy >= b.clock + SK.SKILLS.loi_dinh.seconds - 1e-9)
  assert.ok(b.enemy.hp < 1e9)
  // đang choáng thì readySkill không tung lại
  s.skills.slots[0] = 'loi_dinh'
  b.cd = {}
  assert.equal(b.readySkill(), null)
})

ok('võ kỹ Tuyệt Sát: gấp đôi sát thương khi địch dưới 30% khí huyết', () => {
  const { s, b } = arena()
  learn(s, 'tuyet_sat')
  const dmg = []
  const off = onEvent('battle-hit', (e) => e.skill && dmg.push(e.damage))
  useUiStoreEarly().tab = 'battle'
  Math.random = () => 0.5
  b.enemy.hp = b.enemy.maxHp
  b.castSkill('tuyet_sat', s.combat)
  b.enemy.hp = b.enemy.maxHp * 0.2
  b.castSkill('tuyet_sat', s.combat)
  Math.random = realRandom
  off()
  assert.equal(dmg.length, 2)
  assert.ok(Math.abs(dmg[1] / dmg[0] - 2) < 0.05, 'tỉ lệ ' + dmg[1] / dmg[0])
})

ok('võ kỹ Huyết Thực, Cuồng Bạo, Phản Chấn: hút máu, tăng công, phản sát thương', () => {
  const { s, b } = arena()
  for (const id of ['huyet_thuc', 'bao_nhan', 'phan_chan']) learn(s, id)
  // Cuồng Bạo
  const base = b.atkNow(s.combat)
  b.castSkill('bao_nhan', s.combat)
  assert.ok(b.atkNow(s.combat) > base * 1.3)
  b.clock += 100
  assert.equal(b.atkNow(s.combat), base, 'hết hạn thì về bình thường')
  // Huyết Thực
  b.hp = 10
  b.castSkill('huyet_thuc', s.combat)
  Math.random = () => 0.5
  b.basicAttack(s.combat)
  assert.ok(b.hp > 10, 'đòn đánh hồi máu')
  b.clock += 100
  const h = b.hp
  b.basicAttack(s.combat)
  assert.equal(b.hp, h, 'hết hạn thì không hút')
  // Phản Chấn
  b.hp = b.maxHp
  b.castSkill('phan_chan', s.combat)
  const ehp = b.enemy.hp
  b.nextEnemy = 0
  b.enemy.atk = 50
  b.enemyAct()
  assert.ok(b.enemy.hp < ehp, 'địch bị phản lại sát thương')
  Math.random = realRandom
})

ok('võ kỹ phản chấn có thể hạ gục địch; thắng thì không bị tính là thua', () => {
  const { s, b } = arena()
  learn(s, 'phan_chan')
  b.castSkill('phan_chan', s.combat)
  b.enemy.hp = 1
  b.enemy.atk = 50
  b.nextEnemy = 0
  const kills = s.stats.kills
  b.enemyAct()
  assert.equal(s.stats.kills, kills + 1)
  assert.equal(b.lastResult, 'win')
})

ok('Công pháp: dữ liệu hợp lệ, có nguồn tàn quyển (rơi từ boss, cửa hàng), mô tả', () => {
  const stats = ['exp', 'hp', 'atk', 'def', 'speed', 'stones', 'income', 'luck', 'elem', 'dao']
  for (const [id, art] of Object.entries(AR.ARTS)) {
    assert.ok(stats.includes(art.stat) && art.per > 0 && art.minAi >= 1, id)
    assert.ok(['kim', 'moc', 'thuy', 'hoa', 'tho'].includes(art.element))
    assert.ok(ALL_ITEMS[AR.artFragmentId(id)], 'thiếu tàn quyển ' + id)
    assert.ok(SECT_SHOP.some((e) => e.item === AR.artFragmentId(id)), 'cửa hàng thiếu ' + id)
    assert.ok(AR.artDesc(id, 5).startsWith('+'))
  }
  // một nhóm công pháp dùng được ngay từ ải đầu
  assert.ok(Object.values(AR.ARTS).filter((a) => a.minAi === 1).length >= 4)
  // mỗi chỉ số bị động đều có người dùng
  assert.deepEqual(new Set(Object.values(AR.ARTS).map((a) => a.stat)), new Set(stats))
  // trần: không công pháp đơn lẻ vượt +60% (kể cả cùng hệ tông môn)
  for (const id of Object.keys(AR.ARTS)) assert.ok(AR.artValue(id, AR.ART_MAX_LEVEL, AR.ARTS[id].element) <= 0.8)
})

ok('công pháp: học xong cộng chỉ số ngay (không cần ô), thăng cấp, tối đa', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.learnArt('thanh_tam'), false, 'chưa đủ tàn quyển')
  const base = s.artBonus.exp
  s.addItem('scrolls', AR.artFragmentId('thanh_tam'), AR.ART_LEARN_COST + AR.artUpgradeCost(1))
  assert.equal(s.learnArt('thanh_tam'), true)
  assert.ok(s.artBonus.exp > base, 'học xong là cộng ngay')
  assert.equal(s.learnArt('thanh_tam'), false, 'đã học rồi')
  const lv1 = s.artBonus.exp
  assert.equal(s.upgradeArt('thanh_tam'), true)
  assert.equal(s.arts.owned.thanh_tam, 2)
  assert.ok(s.artBonus.exp > lv1, 'lên cấp tăng thêm')
  assert.equal(s.upgradeArt('thanh_tam'), false, 'hết tàn quyển')
  assert.ok(!('slots' in s.arts), 'không còn ô công pháp')
  s.arts.owned.thanh_tam = AR.ART_MAX_LEVEL
  s.addItem('scrolls', AR.artFragmentId('thanh_tam'), 50)
  assert.equal(s.upgradeArt('thanh_tam'), false, 'đã tối đa')
})

ok('công pháp bị động: cộng vào khí huyết, công kích, phòng ngự, Thân pháp, linh khí, linh thạch, thu nhập ải, rơi đồ, khắc hệ, Đạo Vận', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 20
  s.campaign.best = 30
  const base = { combat: s.combat, exp: s.expRate, stones: s.stonesRate, luck: s.lootLuck, dao: s.daoPreview }
  const own = (id, lvl = 10) => { s.arts.owned[id] = lvl }
  own('cuong_the'); own('pha_quan'); own('kim_cang'); own('truy_phong')
  const c = s.combat
  assert.ok(c.hp > base.combat.hp * 1.15 && c.atk > base.combat.atk * 1.15 && c.def > base.combat.def * 1.15 && c.speed > base.combat.speed)
  own('thanh_tam')
  assert.ok(s.expRate.gt(base.exp.mul(1.1)))
  own('tu_bao')
  assert.ok(s.stonesRate.gt(base.stones.mul(1.2)))
  own('ho_phap')
  assert.ok(s.stonesRate.gt(base.stones) && s.expRate.gt(base.exp))
  own('thien_nhan')
  assert.ok(s.lootLuck > base.luck + 0.15)
  own('luan_hoi')
  assert.ok(s.daoPreview > base.dao)
  own('ngu_hanh')
  assert.ok(s.artElementMult('kim', 'moc') > 1.1, 'khắc hệ thì cộng thêm')
  assert.equal(s.artElementMult('moc', 'kim'), 1, 'không khắc thì không cộng')
  // chưa học thì không có tác dụng
  s.arts.owned = {}
  assert.ok(s.combat.hp === base.combat.hp)
  s.arts.owned = { cuong_the: 10, pha_quan: 10 }
  assert.ok(s.artBonus.hp > 0 && s.artBonus.atk > 0 && s.artBonus.def === 0 && s.artBonus.exp === 0)
})

ok('công pháp cùng hệ ngũ hành với tông môn được +50%', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 4
  s.arts.owned.cuong_the = 4 // hệ Mộc
  const plain = s.artBonus.hp
  s.joinSect('van_moc') // Vạn Mộc Cốc: hệ Mộc
  assert.ok(Math.abs(s.artBonus.hp - plain * 1.5) < 1e-9)
  s.joinSect('hau_tho') // đổi sang hệ Thổ: hết thưởng
  assert.ok(Math.abs(s.artBonus.hp - plain) < 1e-9)
})

ok('Công Pháp Tàn Quyển rơi từ Tiểu Boss trở lên theo ải, ải thường không rơi; luck tăng tỉ lệ', () => {
  assert.deepEqual(AR.rollArtDrops(3, 'normal', () => 0), [])
  assert.equal(AR.rollArtDrops(5, 'mini', () => 0.99).length, 0)
  const mini = AR.rollArtDrops(5, 'mini', () => 0)
  assert.equal(mini.length, 1)
  assert.ok(mini[0].id.startsWith('cp_') && mini[0].count >= 1)
  assert.ok(AR.rollArtDrops(10, 'big', () => 0.99).length === 1, 'Đại Boss luôn rơi')
  assert.ok(AR.rollArtDrops(100, 'lord', () => 0.5)[0].count >= 3)
  // chỉ rơi công pháp đã mở theo số ải
  for (let i = 0; i < 100; i++) {
    const [d] = AR.rollArtDrops(5, 'big', Math.random)
    assert.ok(AR.ARTS[d.id.slice(3)].minAi <= 5, 'rơi công pháp chưa mở: ' + d.id)
  }
  // may mắn tăng tỉ lệ: rng=0.6 > 0.5 không rơi, nhưng với luck 0.5 thì rơi
  assert.equal(AR.rollArtDrops(5, 'mini', () => 0.6).length, 0)
  assert.equal(AR.rollArtDrops(5, 'mini', () => 0.6, 0.5).length, 1)
})

ok('Công Pháp Tàn Quyển rơi thật khi hạ boss trong trận', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  s.campaign.best = 4 // ải kế tiếp là ải 5 (Tiểu Boss)
  const b = useBattleStore()
  b.start()
  const before = Object.keys(ALL_ITEMS).filter((id) => id.startsWith('cp_')).reduce((n, id) => n + s.itemCount(id), 0)
  Math.random = () => 0.01 // luôn rơi
  b.enemy.hp = 0
  b.onKill()
  Math.random = realRandom
  const after = Object.keys(ALL_ITEMS).filter((id) => id.startsWith('cp_')).reduce((n, id) => n + s.itemCount(id), 0)
  assert.ok(after > before, 'boss rơi công pháp tàn quyển')
})

ok('save/load giữ công pháp (cấp); loại công pháp lạ, cấp vượt trần; save cũ có ô trang bị vẫn tải được', () => {
  const s = freshStore()
  s.init()
  s.arts.owned = { thanh_tam: 4, pha_quan: 2 }
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.deepEqual({ ...s2.arts.owned }, { thanh_tam: 4, pha_quan: 2 })
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.arts = { owned: { thanh_tam: 99, khong_co: 3, pha_quan: -5 }, slots: ['thanh_tam', 'thanh_tam', 'khong_co'] }
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.arts.owned.thanh_tam, AR.ART_MAX_LEVEL)
  assert.equal(s3.arts.owned.pha_quan, 1)
  assert.ok(!('khong_co' in s3.arts.owned))
  assert.ok(!('slots' in s3.arts), 'bỏ ô trang bị của save cũ')
  // save cũ không có công pháp và chỉ 3 ô võ kỹ vẫn tải được
  delete raw.data.arts
  raw.data.skills = { owned: { ngu_kiem: 2 }, slots: ['ngu_kiem', null, null] }
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s4 = freshStore(true)
  s4.init()
  assert.deepEqual({ ...s4.arts.owned }, {})
  assert.equal(s4.skills.slots.length, SK.MAX_SKILL_SLOTS)
  assert.equal(s4.skills.slots[0], 'ngu_kiem')
})

ok('luân hồi giữ võ kỹ và công pháp; công pháp Luân Hồi Bí Điển tăng Đạo Vận nhận được', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 15
  s.skills.owned.ngu_kiem = 3
  s.arts.owned = { luan_hoi: 5, pha_quan: 2 }
  const plain = daoBase()
  assert.ok(s.daoPreview > plain, 'xem trước đã cộng thưởng')
  const gain = s.reincarnate()
  assert.equal(gain, s.reincarnation.dao)
  assert.ok(gain > plain)
  assert.equal(s.skills.owned.ngu_kiem, 3)
  assert.equal(s.arts.owned.luan_hoi, 5)
})
function daoBase() { return Math.round(3 * Math.pow(1.4, 15 - 9)) }

ok('thành tựu công pháp: tính theo tổng cấp công pháp', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.achievementValue('artLevels'), 0)
  s.arts.owned = { thanh_tam: 2, pha_quan: 3 }
  assert.equal(s.achievementValue('artLevels'), 5)
  assert.ok(ACHIEVEMENTS.some((a) => a.key === 'artLevels'))
})

// =====================================================================
// Đạo Lộ
// =====================================================================
const PH = await import('../src/game/paths.js')
const BT3 = await import('../src/game/battle.js')
const DS3 = await import('../src/game/disciples.js')

ok('đạo lộ: 5 đạo lộ, perk hợp lệ, mỗi đạo lộ có đúng một võ kỹ độc quyền và nguồn rơi', () => {
  assert.equal(PH.PATH_IDS.length, 5)
  const keys = Object.keys(PH.pathPerk(null))
  const dropped = new Set(ALL_DUNGEONS.flatMap((d) => d.loot.map((l) => l.item)))
  for (const [id, p] of Object.entries(PH.PATHS)) {
    for (const k of Object.keys(p.perk)) assert.ok(keys.includes(k), id + ' perk lạ: ' + k)
    assert.ok(p.perkText.length > 10 && p.desc.length > 10)
    const sk = SK.SKILLS[p.skill]
    assert.ok(sk && sk.path === id, id + ' võ kỹ độc quyền')
    assert.ok(dropped.has(SK.fragmentId(p.skill)), id + ' tàn quyển phải có nguồn rơi')
  }
  // mọi võ kỹ có path đều trỏ tới đạo lộ có thật và được đúng một đạo lộ nhận
  for (const [id, sk] of Object.entries(SK.SKILLS)) if (sk.path) assert.equal(PH.PATHS[sk.path].skill, id)
  assert.ok(Object.values(PH.pathPerk(null)).every((v) => v === 0))
})

ok('chọn đạo lộ: chỉ từ Trúc Cơ, một lần, luân hồi để chọn lại; save/load giữ, dữ liệu lạ bị loại', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.canChoosePath, false)
  assert.equal(s.choosePath('kiem'), false, 'chưa tới Trúc Cơ')
  s.stageIdx = 9
  assert.equal(s.canChoosePath, true)
  assert.equal(s.choosePath('khong_co'), false)
  assert.equal(s.choosePath('kiem'), true)
  assert.equal(s.path, 'kiem')
  assert.equal(s.canChoosePath, false)
  assert.equal(s.choosePath('the'), false, 'không đổi giữa kiếp')
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.path, 'kiem')
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.path = 'hack'
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.path, null)
  // luân hồi: đạo lộ về null, võ kỹ vẫn giữ
  s.stageIdx = 12
  s.skills.owned.van_kiem = 2
  s.reincarnate()
  assert.equal(s.path, null)
  assert.equal(s.skills.owned.van_kiem, 2)
  s.stageIdx = 9
  assert.equal(s.choosePath('tran'), true)
})

ok('võ kỹ độc quyền: sai đạo lộ không trang bị, đúng thì trang bị; chọn đạo lộ sau khi học thì tự trang bị', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 9
  s.skills.owned.van_kiem = 1
  assert.equal(SK.canEquip('van_kiem', s.realmIdx, null), false)
  assert.equal(s.equipSkill('van_kiem', 0), false)
  s.choosePath('the')
  assert.equal(s.equipSkill('van_kiem', 0), false, 'Thể Tu không dùng võ kỹ của Kiếm Tu')
  const t = freshStore()
  t.init()
  t.stageIdx = 9
  t.skills.owned.van_kiem = 1
  t.choosePath('kiem')
  assert.ok(t.skills.slots.includes('van_kiem'), 'đã học từ trước thì tự trang bị khi chọn')
  // đang trang bị mà sau luân hồi mất đạo lộ: không được tung
  const b = useBattleStore()
  t.path = null
  b.start()
  b.cd = {}
  assert.equal(b.readySkill(), null)
})

ok('tàn quyển võ kỹ độc quyền chỉ rơi cho đúng đạo lộ', () => {
  const dropFor = (path) => {
    const s = freshStore()
    s.init()
    s.stageIdx = 12
    s.path = path
    s.campaign.best = 14 // ải 15: Tiểu Boss của chương 2 (Linh Dược Sơn)
    const b = useBattleStore()
    b.start()
    b.enemy.hp = 0
    Math.random = () => 0.01
    b.onKill()
    Math.random = realRandom
    return s.itemCount(SK.fragmentId('van_kiem'))
  }
  assert.equal(dropFor('the'), 0)
  assert.equal(dropFor(null), 0)
  assert.ok(dropFor('kiem') >= 1)
})

ok('Kiếm Tu: +công kích, chí mạng mạnh hơn, +sát thương võ kỹ tấn công', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  const plain = s.combat.atk
  s.path = 'kiem'
  assert.ok(Math.abs(s.combat.atk / plain - 1.15) < 0.01)
  // hệ số chí mạng
  assert.equal(BT3.rollHit(100, 0, () => 0, 1, 1, 2.5).damage, Math.round(100 * 0.8 * 2.5))
  assert.equal(BT3.rollHit(100, 0, () => 0, 1, 1).damage, Math.round(100 * 0.8 * BT3.CRIT_MULT))
  // võ kỹ tấn công mạnh hơn
  const dmg = (path) => {
    const x = arena()
    x.s.path = path
    x.s.skills.owned.ngu_kiem = 1
    const hits = []
    const off = onEvent('battle-hit', (e) => e.skill && hits.push(e.damage))
    useUiStoreEarly().tab = 'battle'
    Math.random = () => 0.5
    x.b.enemy.def = 0
    x.b.castSkill('ngu_kiem', { ...x.s.combat, atk: 100 })
    Math.random = realRandom
    off()
    return hits[0]
  }
  assert.ok(dmg('kiem') / dmg(null) > 1.14 && dmg('kiem') / dmg(null) < 1.17)
})

ok('Thể Tu: +khí huyết, +phòng ngự, hút máu nền mọi đòn đánh', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  const c0 = s.combat
  s.path = 'the'
  assert.ok(Math.abs(s.combat.hp / c0.hp - 1.15) < 0.01 && Math.abs(s.combat.def / c0.def - 1.15) < 0.02)
  const { s: arenaStore, b } = arena()
  arenaStore.path = 'the'
  b.hp = 10
  Math.random = () => 0.5
  b.basicAttack({ ...b.playerStats(), atk: 1000 })
  Math.random = realRandom
  assert.ok(b.hp > 10, 'đánh hút máu dù không có Huyết Thực')
})

ok('Pháp Tu: thêm 1 ô võ kỹ, hồi chiêu nhanh hơn 15%', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  const slots0 = s.skillSlots
  s.path = 'phap'
  assert.equal(s.skillSlots, slots0 + 1)
  s.stageIdx = 18
  assert.equal(s.skillSlots, SK.MAX_SKILL_SLOTS, '4 theo cảnh giới + 1 của Pháp Tu')
  s.skills.owned.ngu_kiem = 1
  const b = useBattleStore()
  b.start()
  b.clock = 100
  b.castSkill('ngu_kiem', s.combat)
  assert.ok(Math.abs(b.cd.ngu_kiem - 100 - SK.skillCooldown('ngu_kiem', 1) * 0.85) < 1e-9)
})

ok('Đan Sư: đan tăng chỉ số mạnh hơn 25%, luyện đan dễ ra gấp đôi hơn', () => {
  const eat = (path) => {
    const s = freshStore()
    s.init()
    s.stageIdx = 12
    s.path = path
    s.addItem('pills', 'cuong_can_dan', 1)
    s.useItem('cuong_can_dan', 1)
    return s.bonus.atk
  }
  assert.ok(Math.abs(eat('dan') / eat(null) - 1.25) < 1e-9)
  // tỉ lệ gấp đôi: rng ngay dưới ngưỡng cộng thêm 10%
  const s = freshStore()
  s.init()
  s.stageIdx = 9
  s.path = 'dan'
  s.alchemy.level = 1 // gốc 0%, Đan Sư +10%
  s.spiritStones = new Decimal(1e6)
  s.addItem('herbs', 'linh_thao', 30)
  Math.random = () => 0.05
  s.craft('tu_khi_dan', 3)
  Math.random = realRandom
  assert.equal(s.itemCount('tu_khi_dan'), 6, '0.05 < 10% nên cả 3 lần ra gấp đôi')
  const t = freshStore()
  t.init()
  t.stageIdx = 9
  t.spiritStones = new Decimal(1e6)
  t.addItem('herbs', 'linh_thao', 30)
  Math.random = () => 0.05
  t.craft('tu_khi_dan', 3)
  Math.random = realRandom
  assert.equal(t.itemCount('tu_khi_dan'), 3, 'không đạo lộ: không ra gấp đôi')
})

ok('Trận Pháp Sư: Tụ Linh Trận +15%, công pháp +15%, đệ tử +20%', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  s.arrayLevel = 20 // trận +200% gốc
  const base = s.expRate
  s.path = 'tran'
  // (1 + 0.1*20*1.15) / (1 + 0.1*20) = 3.3 / 3
  assert.ok(Math.abs(s.expRate.div(base).toNumber() - 3.3 / 3) < 1e-6)
  s.path = null
  s.arts.owned.pha_quan = 5
  const a0 = s.artBonus.atk
  s.path = 'tran'
  assert.ok(Math.abs(s.artBonus.atk / a0 - 1.15) < 1e-9)
  const d = { uid: 'x', name: 'A', element: 'kim', grade: 0, level: 1, job: 'herb', since: 0 }
  const o0 = DS3.outputPerHour(d, 12, {})
  const o1 = DS3.outputPerHour(d, 12, { bonus: 0.25 })
  assert.ok(Math.abs(o1.perHour / o0.perHour - 1.25) < 1e-9)
  assert.equal(s.discipleCtx().bonus, 0.2)
})

// =====================================================================
// Đặc tính yêu thú và kỹ năng boss
// =====================================================================
ok('đặc tính ải: cố định theo số ải, đúng quy tắc từng loại, hợp lệ', () => {
  for (const n of [1, 3, 7]) assert.deepEqual(C.aiMods(n), [], 'ải đầu không có đặc tính')
  let withTrait = 0
  for (let n = 8; n <= 400; n++) {
    const kind = C.aiKind(n)
    const mods = C.aiMods(n)
    assert.deepEqual(C.aiMods(n), mods, 'cố định theo số ải')
    assert.equal(new Set(mods).size, mods.length, 'không trùng')
    for (const m of mods) assert.ok(C.ENEMY_MODS[m], m)
    const skills = mods.filter((m) => C.ENEMY_MODS[m].kind === 'boss')
    const traits = mods.filter((m) => C.ENEMY_MODS[m].kind === 'trait')
    if (kind === 'normal') assert.ok(skills.length === 0 && traits.length <= 1)
    if (kind === 'mini') assert.ok(skills.length === 0 && traits.length <= 1)
    if (kind === 'big') assert.ok(skills.length === 1 && traits.length <= 1)
    if (kind === 'lord') assert.ok(skills.length === 2 && traits.length === 1)
    if (kind === 'normal' && mods.length) withTrait++
  }
  assert.ok(withTrait > 30 && withTrait < 150, 'khoảng 25% ải thường có đặc tính: ' + withTrait)
  assert.equal(C.aiMods(4).length, 0)
  // mỗi đặc tính và kỹ năng boss đều xuất hiện ở đâu đó
  const seen = new Set()
  for (let n = 1; n <= 600; n++) C.aiMods(n).forEach((m) => seen.add(m))
  assert.deepEqual([...seen].sort(), Object.keys(C.ENEMY_MODS).sort())
})

ok('đặc tính ảnh hưởng chỉ số thật; ước lượng tỉ lệ thắng tính cả hành vi (hồi sinh, tái sinh...)', () => {
  // tìm một ải thường có Giáp Dày, và một Đại Boss có kỹ năng
  let giap = 0
  for (let n = 8; n < 500 && !giap; n++) if (C.aiMods(n).includes('giap_day') && C.aiKind(n) === 'normal') giap = n
  assert.ok(giap)
  const { tmpl, kind } = C.pickAiMonster(giap, () => 0)
  const withMod = C.aiEnemyStats(giap, tmpl, kind)
  const saved = C.ENEMY_MODS.giap_day.stat
  assert.ok(withMod.def > 0 && saved.def === 1.6)
  // hành vi: forSim làm yêu thú "dày" hơn (hoặc đánh mạnh hơn)
  let big = 0
  for (let n = 10; n < 500 && !big; n += 10) if (C.aiMods(n).includes('tai_sinh')) big = n
  assert.ok(big)
  const m = C.pickAiMonster(big, () => 0)
  const plain = C.aiEnemyStats(big, m.tmpl, m.kind, null, false)
  const sim = C.aiEnemyStats(big, m.tmpl, m.kind, null, true)
  assert.ok(sim.hp > plain.hp * 1.2 && sim.hp < plain.hp * 1.4)
})

const modArena = (mods, stage = 12) => {
  const x = arena({ stage })
  x.b.enemy.mods = mods
  return x
}

ok('Hồi Sinh: gục lần đầu thì sống lại 40% khí huyết, lần hai thì chết', () => {
  const { s, b } = modArena(['hoi_sinh'])
  b.enemy.maxHp = 1000
  b.enemy.hp = 10
  b.hurtEnemy(500)
  assert.equal(b.enemy.hp, 400)
  assert.equal(b.enemy.revived, true)
  b.hurtEnemy(5000)
  assert.equal(b.enemy.hp, 0)
  b.enemy.hp = 5 // hạ lần cuối không hồi lại nữa
  b.hurtEnemy(5)
  assert.equal(b.enemy.hp, 0)
})

ok('Kháng Võ Kỹ giảm 30% sát thương võ kỹ và độc, không giảm đòn thường', () => {
  const { b } = modArena(['khang_vo_ky'])
  assert.equal(b.hurtEnemy(100, true), 70)
  assert.equal(b.hurtEnemy(100, false), 100)
  assert.equal(b.hurtEnemy(1, true), 1, 'tối thiểu 1')
})

ok('Hút Máu: mỗi đòn của yêu thú hồi cho nó 40% sát thương gây ra', () => {
  const { b } = modArena(['hut_mau'])
  b.enemy.maxHp = 1e9
  b.enemy.hp = 5e8
  b.enemy.atk = 400
  b.nextEnemy = 0
  const before = b.enemy.hp
  const hp = b.hp
  b.enemyAct()
  const dealt = hp - b.hp
  assert.ok(dealt > 0)
  assert.equal(b.enemy.hp - before, Math.round(dealt * 0.4))
})

ok('Nhát Chém Ngàn Cân: đòn thứ 4 gấp 2.5 lần', () => {
  const { b } = modArena(['nhat_chem'])
  b.enemy.atk = 200
  Math.random = () => 0.5
  const dmg = []
  for (let i = 0; i < 4; i++) {
    b.hp = b.maxHp
    b.nextEnemy = 0
    b.enemyAct()
    dmg.push(b.maxHp - b.hp)
  }
  Math.random = realRandom
  assert.ok(Math.abs(dmg[3] / dmg[0] - 2.5) < 0.1, 'tỉ lệ ' + dmg[3] / dmg[0])
  assert.ok(Math.abs(dmg[1] / dmg[0] - 1) < 0.05)
})

ok('Cuồng Hóa (dưới 40%) và Huyết Hồn Tái Sinh (dưới 50%) chỉ kích hoạt một lần', () => {
  const x = modArena(['cuong_hoa', 'tai_sinh'])
  const { b } = x
  b.enemy.maxHp = 1000
  b.enemy.hp = 1000
  b.enemy.atk = 100
  const spd = b.enemy.speed
  b.hurtEnemy(480) // còn 52%: chưa kích hoạt
  assert.equal(b.enemy.enraged, false)
  assert.equal(b.enemy.reborn, false)
  b.hurtEnemy(40) // 48% < 50%: tái sinh +25%
  assert.equal(b.enemy.reborn, true)
  assert.equal(b.enemy.hp, 480 + 250)
  b.hurtEnemy(500) // 23% < 40%: cuồng hóa
  assert.equal(b.enemy.enraged, true)
  assert.equal(b.enemy.atk, 135)
  assert.ok(Math.abs(b.enemy.speed / spd - 1.2) < 1e-9)
  b.hurtEnemy(1)
  assert.equal(b.enemy.atk, 135, 'không cuồng hóa lần hai')
  assert.equal(b.enemy.hp, 229, 'không tái sinh lần hai')
})

ok('trận thật: yêu thú có đặc tính xuất hiện đúng, ghi vào nhật ký, hạ được bình thường', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 20
  let n = 0
  for (let i = 8; i < 500 && !n; i++) if (C.aiKind(i) === 'normal' && C.aiMods(i).length) n = i
  s.campaign.best = n - 1
  const b = useBattleStore()
  b.start()
  assert.deepEqual(b.enemy.mods, C.aiMods(n))
  assert.ok(s.log.some((l) => l.text.includes('mang:')))
  b.enemy.hp = 0
  b.onKill()
  assert.equal(s.campaign.best, n)
})

// =====================================================================
// Dòng phụ, bộ trang bị, đồ Huyền Thoại
// =====================================================================
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length] }
const wear = (s, ...items) => { for (const it of items) { s.addGear(it); s.equipGear(it.uid) } }

ok('dòng phụ: số dòng theo độ hiếm, hợp ô, không trùng, giá trị trong khoảng, tăng theo phẩm cấp', () => {
  for (const slot of EQ.SLOT_IDS) {
    for (const rarity of [0, 1, 2, 3]) {
      const w = [0, 0, 0, 0]
      w[rarity] = 1
      for (let i = 0; i < 30; i++) {
        const it = EQ.generateItem(slot, 2, w)
        assert.equal(it.rarity, rarity)
        assert.equal(it.affixes.length, EQ.affixCount(rarity))
        assert.equal(new Set(it.affixes.map((a) => a.id)).size, it.affixes.length)
        for (const a of it.affixes) {
          const def = EQ.AFFIXES[a.id]
          assert.ok(def.slots.includes(slot), a.id + ' không hợp ô ' + slot)
          assert.ok(a.v >= def.min * (1 + 0.16) - 0.001 && a.v <= def.max * (1 + 0.16) + 0.001, // làm tròn 3 chữ số thập phân
             'giá trị ngoài khoảng ' + a.id + ' ' + a.v)
        }
      }
    }
  }
  const lo = EQ.rollAffixes('weapon', 0, 1, () => 0.999)[0].v
  const hi = EQ.rollAffixes('weapon', 7, 1, () => 0.999)[0].v
  assert.ok(hi > lo * 1.4, 'phẩm cấp cao dòng phụ mạnh hơn')
  assert.ok(EQ.affixText(EQ.generateItem('weapon', 0, [0, 0, 0, 1])).includes('%'))
  // mọi dòng phụ đều có ô hợp lệ và được ít nhất một ô dùng
  for (const id of EQ.AFFIX_IDS) assert.ok(EQ.AFFIXES[id].slots.length >= 1 && EQ.AFFIXES[id].slots.every((x) => EQ.SLOT_IDS.includes(x)))
})

ok('dòng phụ cộng vào chỉ số chiến đấu và thưởng khi mặc', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  const c0 = s.combat
  const w = { uid: 'w1', slot: 'weapon', tier: 0, rarity: 1, enh: 0, affixes: [{ id: 'atk', v: 0.1 }] }
  const a = { uid: 'a1', slot: 'armor', tier: 1, rarity: 1, enh: 0, affixes: [{ id: 'hp', v: 0.1 }] }
  const t = { uid: 't1', slot: 'trinket', tier: 2, rarity: 1, enh: 0, affixes: [{ id: 'crit', v: 0.05 }, { id: 'luck', v: 0.1 }] }
  const base = (item) => { const x = freshStore(); x.init(); x.stageIdx = 12; x.addGear({ ...item, affixes: [] }); x.equipGear(item.uid); return x.combat }
  wear(s, w)
  assert.ok(Math.abs(s.combat.atk / base(w).atk - 1.1) < 0.01)
  wear(s, a)
  assert.ok(Math.abs(s.combat.hp / base(a).hp - 1.1) < 0.02 || s.combat.hp > c0.hp)
  wear(s, t)
  assert.ok(Math.abs(s.gearPerk.crit - 0.05) < 1e-9 && Math.abs(s.lootLuck - 0.1) < 1e-9)
  assert.ok(Math.abs(s.battlePerk.crit - 0.05) < 1e-9)
  // mặc không đúng nghĩa thì không có: tháo đồ thì mất
  s.unequipGear('trinket')
  assert.equal(s.gearPerk.crit, 0)
})

ok('bộ trang bị: 2 món cùng phẩm cấp và 3 món cùng phẩm cấp nhận thưởng; khác phẩm cấp thì không', () => {
  const mk = (slot, tier) => ({ uid: slot + tier, slot, tier, rarity: 0, enh: 0, affixes: [] })
  const set = EQ.SETS[0]
  assert.equal(EQ.SETS.length, EQ.TIERS.length, 'mỗi phẩm cấp một bộ')
  for (const x of EQ.SETS) assert.ok(x.name && Object.keys(x.two).length && Object.keys(x.three).length)
  const none = EQ.gearPerks([mk('weapon', 0), mk('armor', 1), mk('trinket', 2)])
  assert.ok(Object.values(none).every((v) => v === 0))
  assert.equal(EQ.activeSets([mk('weapon', 0), mk('armor', 1), mk('trinket', 2)]).length, 0)
  const two = EQ.gearPerks([mk('weapon', 0), mk('armor', 0), mk('trinket', 3)])
  assert.ok(Math.abs(two.hp - set.two.hp) < 1e-9 && two.atk === 0)
  const three = EQ.gearPerks([mk('weapon', 0), mk('armor', 0), mk('trinket', 0)])
  assert.ok(Math.abs(three.hp - set.two.hp) < 1e-9 && Math.abs(three.atk - set.three.atk) < 1e-9 && Math.abs(three.def - set.three.def) < 1e-9)
  const act = EQ.activeSets([mk('weapon', 0), mk('armor', 0), mk('trinket', 0)])
  assert.equal(act.length, 1)
  assert.equal(act[0].pieces, 3)
  assert.ok(EQ.perkText(act[0].bonus).includes('%'))
  // trong game
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  const hp0 = s.combat.hp
  wear(s, mk('weapon', 0), mk('armor', 0))
  assert.equal(s.activeGearSets.length, 1)
  assert.ok(s.combat.hp > hp0)
})

ok('đồ Huyền Thoại: đúng ô, đặc hiệu cố định, tên và màu riêng, chỉ số gốc mạnh hơn', () => {
  for (const slot of EQ.SLOT_IDS) {
    const lg = EQ.generateLegend(slot, 5)
    assert.equal(EQ.LEGENDS[lg.legend].slot, slot)
    assert.equal(lg.affixes.length, 0)
    assert.ok(EQ.itemFullName(lg).startsWith('[Huyền Thoại]'))
    assert.equal(EQ.itemColor(lg), EQ.LEGEND_COLOR)
    const normal = { ...lg, legend: undefined, rarity: 3 }
    const st = EQ.itemStats(lg)
    const st0 = EQ.itemStats(normal)
    for (const k of Object.keys(st0)) if (k !== 'exp') assert.ok(st[k] >= st0[k], 'huyền thoại ' + k)
  }
  assert.equal(Object.keys(EQ.LEGENDS).length, 3)
  const perks = EQ.gearPerks([EQ.generateLegend('weapon', 0), EQ.generateLegend('armor', 0)])
  assert.ok(perks.extra > 0 && perks.thorns > 0 && perks.atk > 0 && perks.def > 0)
})

ok('Huyền Thoại: đánh thêm một đòn (Thanh Minh), phản sát thương (Vạn Cổ), giảm hồi chiêu có trần 50%', () => {
  const x = arena()
  wear(x.s, EQ.generateLegend('weapon', 0))
  assert.equal(x.s.battlePerk.extra, 0.25)
  const hits = []
  const off = onEvent('battle-hit', (e) => e.target === 'enemy' && !e.skill && hits.push(e.damage))
  useUiStoreEarly().tab = 'battle'
  Math.random = seq(0.9, 0.5, 0.1, 0.5, 0.5, 0.5, 0.5) // chí mạng không, phương sai, rồi xác suất đánh thêm 0.1 < 0.25
  x.b.nextPlayer = 0
  x.b.playerAct()
  Math.random = realRandom
  off()
  assert.equal(hits.length, 2, 'một đòn thường kèm một đòn đánh thêm')
  // phản sát thương
  const y = arena()
  wear(y.s, EQ.generateLegend('armor', 0))
  y.b.enemy.atk = 200
  y.b.nextEnemy = 0
  const hp = y.b.enemy.hp
  y.b.enemyAct()
  assert.ok(y.b.enemy.hp < hp, 'Vạn Cổ phản sát thương dù không có võ kỹ Phản Chấn')
  // trần giảm hồi chiêu 50%
  const z = freshStore()
  z.init()
  z.stageIdx = 12
  z.path = 'phap'
  wear(z, EQ.generateLegend('trinket', 0), { uid: 'sx', slot: 'weapon', tier: 0, rarity: 1, enh: 0, affixes: [{ id: 'skillDmg', v: 0.1 }] })
  z.gear.bag.find((it) => it.slot === 'trinket').affixes = [{ id: 'cd', v: 0.5 }]
  assert.ok(z.gearPerk.cd >= 0.15)
  assert.equal(z.battlePerk.cd, 0.5, 'hồi chiêu giảm tối đa 50%')
})

ok('Chúa Tể rơi đồ Huyền Thoại (tỉ lệ cao), ải thường và Đại Boss thì không', () => {
  const dropAt = (best, rnd) => {
    const s = freshStore()
    s.init()
    s.stageIdx = 24
    s.campaign.best = best
    const b = useBattleStore()
    b.start()
    b.enemy.hp = 0
    Math.random = () => rnd
    b.onKill()
    Math.random = realRandom
    return s.gear.bag.filter((it) => it.legend)
  }
  const lord = dropAt(99, 0.01) // ải 100: Chúa Tể, xác suất rơi + chọn Huyền Thoại
  assert.equal(lord.length, 1)
  assert.equal(dropAt(99, 0.7).length, 0, '0.7 >= 0.6: rơi đồ thường')
  assert.equal(dropAt(9, 0.01).length, 0, 'Đại Boss không rơi Huyền Thoại')
  assert.equal(dropAt(3, 0.01).length, 0)
})

ok('đổi dòng phụ: tốn linh thạch, giữ số dòng, không áp dụng cho Phàm / Huyền Thoại', () => {
  const s = freshStore()
  s.init()
  const it = EQ.generateItem('trinket', 2, [0, 0, 1, 0]) // Bảo: 2 dòng
  s.addGear(it)
  assert.equal(s.rerollAffixes(it.uid), false, 'chưa đủ linh thạch')
  s.spiritStones = new Decimal(1e9)
  const before = JSON.stringify(it.affixes)
  let changed = false
  for (let i = 0; i < 20 && !changed; i++) {
    assert.equal(s.rerollAffixes(it.uid), true)
    assert.equal(it.affixes.length, 2)
    if (JSON.stringify(it.affixes) !== before) changed = true
  }
  assert.ok(changed, 'dòng phụ đổi sau vài lần')
  const plain = EQ.generateItem('weapon', 0, [1, 0, 0, 0])
  s.addGear(plain)
  assert.equal(s.rerollAffixes(plain.uid), false, 'đồ Phàm không có dòng phụ')
  const lg = EQ.generateLegend('weapon', 0)
  s.addGear(lg)
  assert.equal(s.rerollAffixes(lg.uid), false)
  assert.ok(EQ.rerollCost({ tier: 4, rarity: 3 }).gt(EQ.rerollCost({ tier: 4, rarity: 1 })))
})

ok('save/load giữ dòng phụ và Huyền Thoại; loại dòng phụ lạ, sai ô, trùng, Huyền Thoại sai ô', () => {
  const s = freshStore()
  s.init()
  const a = EQ.generateItem('weapon', 1, [0, 0, 0, 1])
  const lg = EQ.generateLegend('armor', 2)
  s.addGear(a)
  s.addGear(lg)
  s.save()
  const s2 = freshStore(true)
  s2.init()
  const a2 = s2.gear.bag.find((x) => x.uid === a.uid)
  assert.deepEqual(a2.affixes, a.affixes)
  const lg2 = s2.gear.bag.find((x) => x.uid === lg.uid)
  assert.equal(lg2.legend, lg.legend)
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.gear.bag = [
    { uid: 'g1', slot: 'weapon', tier: 0, rarity: 3, enh: 0, affixes: [{ id: 'atk', v: 0.05 }, { id: 'atk', v: 0.06 }, { id: 'cd', v: 0.05 }, { id: 'khong_co', v: 1 }, { id: 'crit', v: 99 }] },
    { uid: 'g2', slot: 'weapon', tier: 0, rarity: 1, enh: 0, legend: 'van_co', affixes: [{ id: 'atk', v: 0.05 }] },
    { uid: 'g3', slot: 'armor', tier: 0, rarity: 3, enh: 0, legend: 'van_co', affixes: [{ id: 'atk', v: 0.05 }] },
    { uid: 'g4', slot: 'weapon', tier: 0, rarity: 0, enh: 0 },
  ]
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  const g1 = s3.gear.bag.find((x) => x.uid === 'g1')
  assert.deepEqual(g1.affixes.map((x) => x.id), ['atk', 'crit'], 'trùng, sai ô, lạ bị loại')
  assert.ok(g1.affixes.every((x) => x.v <= EQ.AFFIXES[x.id].max * 3 + 1e-9), 'giá trị bị chặn')
  assert.equal(s3.gear.bag.find((x) => x.uid === 'g2').legend, undefined, 'huyền thoại sai ô bị bỏ')
  const g3 = s3.gear.bag.find((x) => x.uid === 'g3')
  assert.equal(g3.legend, 'van_co')
  assert.deepEqual(g3.affixes, [], 'huyền thoại không có dòng phụ')
  assert.deepEqual(s3.gear.bag.find((x) => x.uid === 'g4').affixes, [], 'save cũ thiếu affixes vẫn tải được')
})

// =====================================================================
// Hiện dần hệ thống, mục tiêu kế tiếp, rương mốc ải
const QS6 = await import('../src/game/quests.js')
// =====================================================================
const SCR = await import('../src/game/screens.js')
const GOALS = await import('../src/game/goals.js')
const GUIDE = await import('../src/game/guide.js')

ok('mở khoá dần: game mới chỉ có 3 màn, các màn mở theo điều kiện, màn đã mở không khoá lại', () => {
  const s = freshStore()
  s.init()
  const ids = () => SCR.unlockedScreens(s).map((x) => x.id)
  assert.deepEqual(ids(), ['character', 'battle', 'settings'])
  s.stageIdx = 1
  assert.ok(['dwelling', 'garden', 'story'].every((x) => ids().includes(x)))
  assert.ok(!ids().includes('sect') && !ids().includes('skills'))
  s.stats.kills = 1
  assert.ok(ids().includes('achievements'))
  s.campaign.record = 5
  assert.ok(ids().includes('skills') && ids().includes('gear'))
  s.stageIdx = 2
  assert.ok(ids().includes('sect'))
  assert.ok(!ids().includes('disciples'))
  s.joinSect('van_moc')
  assert.ok(ids().includes('disciples'))
  assert.ok(!ids().includes('reincarnation'))
  s.stageIdx = 9
  assert.ok(ids().includes('reincarnation'))
  // sau luân hồi bậc về 0 nhưng vẫn giữ (đã từng đạt)
  s.stats.maxStage = 12
  s.stageIdx = 0
  assert.ok(ids().includes('reincarnation') && ids().includes('sect'))
  // đủ mọi màn khi mở hết
  const t = freshStore()
  t.init()
  t.stageIdx = 10; t.stats.maxStage = 10; t.stats.kills = 9; t.campaign.record = 10
  t.joinSect('van_moc'); t.addItem('herbs', 'linh_thao', 1)
  assert.equal(SCR.unlockedScreens(t).length, SCR.SCREENS.length)
  assert.equal(SCR.lockedScreens(t).length, 0)
})

ok('màn bị khoá có điều kiện hiển thị và tiến độ; mọi điều kiện đều trỏ tới màn có thật', () => {
  const s = freshStore()
  s.init()
  const locked = SCR.lockedScreens(s)
  assert.ok(locked.length >= 8)
  for (const l of locked) assert.ok(l.text.length > 5 && SCR.screenById(l.screen.id))
  for (const id of Object.keys(SCR.UNLOCKS)) assert.ok(SCR.screenById(id), id)
  s.stageIdx = 0
  assert.equal(locked.find((l) => l.screen.id === 'reincarnation').progress, 0)
  s.stageIdx = 5
  const p = SCR.lockedScreens(s).find((l) => l.screen.id === 'reincarnation').progress
  assert.ok(p > 0.5 && p < 1)
  // một màn không có trong bảng thì luôn mở
  assert.equal(SCR.screenUnlocked('character', s), true)
  assert.equal(SCR.screenUnlocked('settings', s), true)
})

ok('mọi gợi ý có tab đích đều trỏ tới màn đã mở (không dẫn tới màn bị khoá)', () => {
  const build = (stage) => {
    const s = freshStore()
    s.init()
    s.stageIdx = stage
    s.stats.maxStage = stage
    s.spiritStones = new Decimal(1e9)
    s.exp = s.requirement
    s.addItem('herbs', 'linh_thao', 9)
    s.addItem('scrolls', SK.fragmentId('liet_hoa'), 5)
    s.addItem('scrolls', AR.artFragmentId('thanh_tam'), 5)
    s.addGear(EQ.generateItem('armor', 0))
    return s
  }
  for (const stage of [0, 1, 2, 4, 9, 15, 25]) {
    const s = build(stage)
    for (const h of GUIDE.nextHints(s)) if (h.tab) assert.ok(SCR.screenUnlocked(h.tab, s), `gợi ý ${h.id} (bậc ${stage}) trỏ tới ${h.tab} đang khoá`)
  }
  // nhiệm vụ xong ở bậc rất thấp: tab Tông Môn phải đã mở để nhận
  const q = freshStore()
  q.init()
  const quest = q.quests[0]
  q.stats[QS6.templateById(quest.tpl).key] = (q.stats[QS6.templateById(quest.tpl).key] ?? 0) + quest.target + 9
  if (QS6.templateById(quest.tpl).key === 'aiRecord') q.campaign.record = quest.target + 9
  if (q.questDone(quest)) assert.ok(SCR.screenUnlocked('sect', q))
})

ok('mục tiêu kế tiếp: chọn tiến độ cao nhất; việc sẵn sàng (đột phá, rương mốc) lên đầu', () => {
  const s = freshStore()
  s.init()
  assert.ok(GOALS.goalList(s).some((g) => g.id === 'daily' && g.ready), 'ngày mới: điểm danh chờ nhận')
  assert.equal(GOALS.nextGoal(s).id, 'daily')
  s.claimDaily()
  const list = GOALS.goalList(s)
  assert.deepEqual(list.map((g) => g.id).sort(), ['boss', 'breakthrough', 'milestone', 'unlock'])
  for (const g of list) assert.ok(g.label.length > 5 && g.progress >= 0 && g.progress <= 1)
  const goal = GOALS.nextGoal(s)
  assert.ok(goal && goal.progress < 1)
  // ải: còn 1 ải tới Tiểu Boss -> tiến độ boss 0.8 cao nhất
  s.campaign.best = 4
  s.campaign.record = 4
  assert.equal(GOALS.nextGoal(s).id, 'boss')
  assert.ok(GOALS.nextGoal(s).label.includes('ải 5'))
  // linh khí đầy: đột phá sẵn sàng
  s.exp = s.requirement
  assert.equal(GOALS.nextGoal(s).id, 'breakthrough')
  assert.equal(GOALS.nextGoal(s).ready, true)
  // rương mốc sẵn sàng lên trên cả đột phá
  s.campaign.record = 10
  assert.equal(GOALS.nextGoal(s).id, 'milestone')
  assert.ok(GOALS.nextGoal(s).label.includes('Nhận'))
  // hết cảnh giới và hết mốc thì vẫn trả về một mục tiêu
  const t = freshStore()
  t.init()
  t.stageIdx = 32
  t.campaign.milestone = C.MILESTONES.length
  assert.ok(GOALS.nextGoal(t))
})

ok('rương mốc ải: chỉ nhận khi đạt mốc, theo thứ tự, thưởng vĩnh viễn, giữ khi luân hồi', () => {
  assert.equal(C.MILESTONES.length, 10)
  assert.ok(C.MILESTONES.every((m, i) => i === 0 || m.ai > C.MILESTONES[i - 1].ai))
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  assert.equal(s.milestoneClaimable, false)
  assert.equal(s.claimMilestone(), false)
  s.campaign.record = 9
  assert.equal(s.claimMilestone(), false)
  s.campaign.record = 10
  assert.equal(s.milestoneClaimable, true)
  const hp0 = s.bonus.hp
  const stones = s.spiritStones
  assert.equal(s.claimMilestone(), true)
  assert.equal(s.campaign.milestone, 1)
  assert.ok(s.bonus.hp > hp0 && s.spiritStones.gt(stones))
  assert.equal(s.claimMilestone(), false, 'mốc 25 chưa đạt')
  s.campaign.record = 60
  assert.equal(s.claimMilestone(), true)
  assert.equal(s.claimMilestone(), true)
  assert.equal(s.campaign.milestone, 3)
  assert.equal(s.claimMilestone(), false, 'mốc 75 chưa đạt')
  // luân hồi giữ rương đã nhận
  s.stageIdx = 12
  s.reincarnate()
  assert.equal(s.campaign.milestone, 3)
  assert.equal(s.campaign.best, 0)
  assert.equal(s.campaign.record, 60)
  // lưu và tải
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.campaign.milestone, 3)
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.campaign.milestone = 999
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.campaign.milestone, C.MILESTONES.length, 'số rương bị chặn tối đa')
})

ok('phần thưởng mốc ải: tăng dần, có công pháp tàn quyển hợp ải, +% linh khí mỗi 3 mốc', () => {
  let prev = null
  C.MILESTONES.forEach((m, i) => {
    const fx = C.milestoneReward(i)
    const stones = fx.find((e) => e.type === 'stones').base
    if (prev) assert.ok(stones > prev, 'linh thạch tăng dần')
    prev = stones
    assert.ok(fx.some((e) => e.type === 'stat'))
    const item = fx.find((e) => e.type === 'item')
    if (i === 0) assert.ok(!item)
    else {
      assert.ok(ALL_ITEMS[item.id], 'vật phẩm có thật')
      assert.ok(AR.ARTS[item.id.slice(3)].minAi <= m.ai, 'công pháp đã mở ở mốc này')
    }
    assert.equal(fx.some((e) => e.type === 'expBonus'), i % 3 === 2)
  })
})

ok('giao diện: màn đã ghé được ghi nhớ; lần đầu coi màn đang mở là đã thấy', () => {
  const s = freshStore()
  s.init()
  const ui = useUiStoreEarly()
  assert.equal(ui.legacySeen, true)
  assert.deepEqual({ ...ui.seen }, {})
  ui.go('battle')
  assert.equal(ui.seen.battle, true)
  ui.markSeen(['sect', 'gear'])
  assert.equal(ui.legacySeen, false)
  assert.ok(ui.seen.sect && ui.seen.gear)
  const saved = JSON.parse(mem.get('tutien-ui-v1'))
  assert.equal(saved.tab, 'battle')
  assert.ok(saved.seen.sect)
  // tải lại: giữ danh sách đã thấy
  setActivePinia(createPinia())
  const ui2 = useUiStoreEarly()
  assert.equal(ui2.legacySeen, false)
  assert.ok(ui2.seen.gear && ui2.seen.battle)
})

// =====================================================================
// Tự động hoá mở khoá dần, cường hoá luân hồi mới, Kiếp Thử Thách
// =====================================================================
const AUTO7 = await import('../src/game/automation.js')
const CH7 = await import('../src/game/challenges.js')
const RB7 = await import('../src/game/reincarnation.js')

ok('tự động hoá: dữ liệu hợp lệ, mặc định tắt, chỉ chạy khi đã mở khoá', () => {
  assert.equal(AUTO7.AUTOMATIONS.length, 6)
  for (const a of AUTO7.AUTOMATIONS) assert.ok(a.name && a.desc && a.text && a.need.value > 0, a.id)
  const s = freshStore()
  s.init()
  assert.deepEqual(Object.keys(s.settings.auto).sort(), [...AUTO7.AUTOMATION_IDS].sort())
  assert.ok(Object.values(s.settings.auto).every((v) => v === false))
  assert.ok(AUTO7.AUTOMATIONS.every((a) => !s.automationUnlocked(a.id)))
  // bật khi chưa mở khoá thì không chạy
  s.settings.auto.array = true
  s.stageIdx = 2
  s.spiritStones = new Decimal(1e12)
  s.runAutomation()
  assert.equal(s.arrayLevel, 0)
  // mở khoá (bậc 5) thì chạy
  s.stageIdx = 5
  s.runAutomation()
  assert.ok(s.arrayLevel > 0)
  assert.ok(s.spiritStones.gt(0), 'giữ lại khoảng nửa linh thạch')
})

ok('tự động hoá: điều kiện mở khoá theo ải, nhiệm vụ, bậc, thu hoạch, đan', () => {
  const s = freshStore()
  s.init()
  const A = (id) => AUTO7.automationById(id)
  s.campaign.record = 19
  assert.equal(AUTO7.automationUnlocked(A('equip'), s), false)
  s.campaign.record = 20
  assert.equal(AUTO7.automationUnlocked(A('equip'), s), true)
  s.campaign.record = 40
  assert.equal(AUTO7.automationUnlocked(A('salvage'), s), true)
  s.stats.questsDone = 10
  assert.equal(AUTO7.automationUnlocked(A('claim'), s), true)
  s.stats.harvests = 10
  assert.equal(AUTO7.automationUnlocked(A('collect'), s), true)
  s.stats.crafted = 25
  assert.equal(AUTO7.automationUnlocked(A('craft'), s), true)
  assert.equal(AUTO7.automationValue(A('craft'), s), 25)
  // luân hồi (bậc về 0) vẫn giữ mở khoá vì tính theo bậc cao nhất / ải kỷ lục
  s.stats.maxStage = 8
  s.stageIdx = 0
  assert.equal(AUTO7.automationUnlocked(A('array'), s), true)
})

ok('tự mặc đồ tốt nhất: chọn món điểm cao nhất mỗi ô, không đổi nếu đã tốt nhất', () => {
  const s = freshStore()
  s.init()
  s.campaign.record = 20
  s.settings.auto.equip = true
  const mk = (uid, slot, tier, rarity, enh = 0, affixes = []) => ({ uid, slot, tier, rarity, enh, affixes })
  s.addGear(mk('w1', 'weapon', 0, 0))
  s.addGear(mk('w2', 'weapon', 2, 1))
  s.addGear(mk('w3', 'weapon', 2, 3))
  s.addGear(mk('a1', 'armor', 1, 1))
  assert.equal(s.autoEquipBest(), 2)
  assert.equal(s.gear.equipped.weapon, 'w3')
  assert.equal(s.gear.equipped.armor, 'a1')
  assert.equal(s.gear.equipped.trinket, null)
  assert.equal(s.autoEquipBest(), 0)
  s.addGear(EQ.generateLegend('weapon', 0))
  assert.equal(s.autoEquipBest(), 1, 'Huyền Thoại vượt mọi thứ')
  assert.ok(EQ.gearScore(EQ.generateLegend('weapon', 0)) > EQ.gearScore(mk('x', 'weapon', 7, 3, 10, [1, 2, 3])))
  // chạy qua vòng tick tự động
  const t = freshStore()
  t.init()
  t.campaign.record = 20
  t.settings.auto.equip = true
  t.addGear(mk('g1', 'armor', 3, 2))
  runFor(t, 3)
  assert.equal(t.gear.equipped.armor, 'g1')
})

ok('tự nhận thưởng: nhiệm vụ xong, thành tựu, rương mốc; tự thu hoạch: Linh Điền, khoáng mạch', () => {
  const s = freshStore()
  s.init()
  s.stats.questsDone = 10
  s.settings.auto.claim = true
  const q = s.quests[0]
  const key = QS6.templateById(q.tpl).key
  if (key === 'aiRecord') s.campaign.record = q.target + 5
  else s.stats[key] = (s.stats[key] ?? 0) + q.target + 5
  s.campaign.record = Math.max(s.campaign.record, 30)
  s.stats.kills = 60
  const done = s.stats.questsDone
  s.runAutomation()
  assert.ok(s.stats.questsDone > done, 'nhiệm vụ đã nhận')
  assert.ok((s.achTier.kills ?? 0) >= 2, 'thành tựu đã nhận')
  assert.equal(s.campaign.milestone, 2, 'mốc ải 10 và 25 đã nhận')
  // thu hoạch
  const t = freshStore()
  t.init()
  t.stageIdx = 3
  t.stats.harvests = 10
  t.settings.auto.collect = true
  t.spiritStones = new Decimal(1e9)
  t.runAutomation() // gieo
  assert.ok(t.garden.plots.some((p) => p))
  t.garden.plots = t.garden.plots.map((p) => (p ? { ...p, readyAt: 0 } : p))
  const herbs = t.itemCount('linh_thao') + t.itemCount('huyet_sam')
  t.runAutomation() // thu, gieo lại
  assert.ok(t.itemCount('linh_thao') + t.itemCount('huyet_sam') > herbs)
  assert.ok(t.garden.plots.some((p) => p), 'gieo lại')
})

ok('tự luyện đan chọn công thức; tự phân giải chỉ đồ Phàm không mặc khi túi quá 30', () => {
  const s = freshStore()
  s.init()
  s.stats.crafted = 25
  s.settings.auto.craft = true
  s.settings.autoCraft = 'tu_khi_dan'
  s.addItem('herbs', 'linh_thao', 20)
  s.spiritStones = new Decimal(1e6)
  s.runAutomation()
  assert.ok(s.itemCount('tu_khi_dan') >= 1)
  s.settings.autoCraft = null
  const n = s.itemCount('tu_khi_dan')
  s.runAutomation()
  assert.equal(s.itemCount('tu_khi_dan'), n, 'chưa chọn công thức thì không luyện')
  const t = freshStore()
  t.init()
  t.campaign.record = 40
  t.settings.auto.salvage = true
  for (let i = 0; i < 35; i++) t.gear.bag.push({ uid: 'p' + i, slot: 'weapon', tier: 0, rarity: 0, enh: 0, affixes: [] })
  t.gear.bag.push({ uid: 'good', slot: 'weapon', tier: 0, rarity: 2, enh: 0, affixes: [] })
  t.gear.bag.push({ ...EQ.generateLegend('weapon', 0), uid: 'legend' })
  t.gear.equipped.weapon = 'p0'
  t.runAutomation()
  assert.equal(t.gear.bag.length, 30)
  assert.ok(t.gear.bag.some((x) => x.uid === 'p0'), 'đồ đang mặc được giữ')
  assert.ok(t.gear.bag.some((x) => x.uid === 'good') && t.gear.bag.some((x) => x.uid === 'legend'))
})

ok('save/load giữ cài đặt tự động hoá; bỏ khoá lạ và công thức lạ', () => {
  const s = freshStore()
  s.init()
  s.settings.auto.equip = true
  s.settings.auto.array = true
  s.settings.autoCraft = 'tu_khi_dan'
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.settings.auto.equip, true)
  assert.equal(s2.settings.auto.claim, false)
  assert.equal(s2.settings.autoCraft, 'tu_khi_dan')
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.settings.auto = { equip: 'yes', hack: true }
  raw.data.settings.autoCraft = 'khong_co'
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.ok(Object.values(s3.settings.auto).every((v) => v === false))
  assert.equal(s3.settings.autoCraft, null)
  assert.ok(!('hack' in s3.settings.auto))
})

ok('cường hoá luân hồi mới: Ải Lộ, Pháp Duyên, Võ Đạo, Khai Thiên có hiệu lực', () => {
  assert.ok(['ai_loc', 'cong_phap', 'vo_ky', 'khai_thien'].every((id) => RB7.perkById(id)))
  const s = freshStore()
  s.init()
  s.stageIdx = 0
  s.campaign.best = 100
  const base = s.expRate
  s.reincarnation.upgrades.ai_loc = 4
  assert.equal(s.incomeCapBonus, 20)
  assert.ok(s.expRate.gt(base), 'trần thu nhập cao hơn thì thu nhập cao hơn')
  assert.equal(C.incomeAi(100, 0, 20), C.INCOME_AI_BASE + 20)
  // Pháp Duyên
  s.stageIdx = 12
  s.arts.owned.pha_quan = 5
  const a0 = s.artBonus.atk
  s.reincarnation.upgrades.cong_phap = 4
  assert.ok(Math.abs(s.artBonus.atk / a0 - 1.2) < 1e-9)
  // Võ Đạo
  const sd0 = s.battlePerk.skillDmg
  s.reincarnation.upgrades.vo_ky = 6
  assert.ok(Math.abs(s.battlePerk.skillDmg - sd0 - 0.3) < 1e-9)
  // Khai Thiên
  const dao0 = s.daoPreview
  s.reincarnation.upgrades.khai_thien = 5
  assert.ok(s.daoPreview > dao0 * 1.4 && s.daoPreview < dao0 * 1.6)
  // các cường hoá có thể mua và lưu
  s.reincarnation.upgrades = {}
  s.reincarnation.dao = 1e6
  for (const id of ['ai_loc', 'cong_phap', 'vo_ky', 'khai_thien']) assert.equal(s.buyPerk(id), true)
})

ok('Kiếp Thử Thách: dữ liệu, chọn khi luân hồi, hoàn thành nhận Đạo Vận một lần mỗi kiếp, lần sau thưởng nhiều hơn', () => {
  for (const [id, c] of Object.entries(CH7.CHALLENGES)) assert.ok(c.name && c.desc && c.goalStage >= 9 && c.reward > 0, id)
  assert.equal(CH7.challengeReward('tinh_tam', 1), 200)
  assert.equal(CH7.challengeReward('tinh_tam', 3), 400)
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  s.reincarnate('tay_khong')
  assert.equal(s.challenge, 'tay_khong')
  assert.equal(s.challengeDone, false)
  const dao = s.reincarnation.dao
  s.stageIdx = 14
  assert.equal(s.checkChallenge(), false, 'chưa tới bậc mục tiêu')
  s.stageIdx = 15
  assert.equal(s.checkChallenge(), true)
  assert.equal(s.reincarnation.dao, dao + 150)
  assert.equal(s.reincarnation.challenges.tay_khong, 1)
  assert.equal(s.checkChallenge(), false, 'một lần mỗi kiếp')
  assert.equal(s.achievementValue('challengesDone'), 1)
  // kiếp sau cùng thử thách: thưởng +50%
  s.reincarnate('tay_khong')
  assert.equal(s.challengeDone, false)
  s.stageIdx = 15
  const dao2 = s.reincarnation.dao
  s.checkChallenge()
  assert.equal(s.reincarnation.dao, dao2 + 225)
  assert.equal(s.reincarnation.challenges.tay_khong, 2)
  // luân hồi không chọn: kiếp thường
  s.stageIdx = 12
  s.reincarnate()
  assert.equal(s.challenge, null)
  s.stageIdx = 12
  s.reincarnate('khong_co')
  assert.equal(s.challenge, null, 'id lạ bị bỏ')
})

ok('Kiếp Thử Thách Tịnh Tâm: không dùng được đan, tàn quyển lĩnh ngộ, đan hồi huyết', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  s.addItem('pills', 'cuong_can_dan', 2)
  s.addItem('pills', 'hoi_huyet_dan', 2)
  s.challenge = 'tinh_tam'
  assert.equal(s.useItem('cuong_can_dan', 1), 0)
  assert.equal(s.bonus.atk, 0)
  assert.equal(s.itemCount('cuong_can_dan'), 2)
  const b = useBattleStore()
  b.start()
  b.hp = 1
  assert.equal(b.useHealPill(), false)
  assert.equal(s.itemCount('hoi_huyet_dan'), 2)
  s.challenge = null
  assert.equal(s.useItem('cuong_can_dan', 1), 1)
})

ok('Kiếp Thử Thách Độc Hành: không tông môn, không đệ tử, công pháp vô hiệu', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  s.spiritStones = new Decimal(1e12)
  s.joinSect('van_moc')
  s.arts.owned.pha_quan = 5
  assert.ok(s.artBonus.atk > 0 && s.sectPerk.herb > 0)
  s.challenge = 'doc_hanh'
  assert.ok(Object.values(s.artBonus).every((v) => v === 0))
  assert.ok(Object.values(s.sectPerk).every((v) => v === 0))
  assert.equal(s.recruit(), null)
  s.sect.id = null
  assert.equal(s.joinSect('thien_kiem'), false)
})

ok('Kiếp Thử Thách Tay Không và Đơn Nhất: trang bị vô hiệu, chỉ một ô võ kỹ', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 18
  const c0 = s.combat
  s.addGear({ uid: 'x', slot: 'weapon', tier: 3, rarity: 3, enh: 5, affixes: [{ id: 'atk', v: 0.2 }] })
  s.equipGear('x')
  assert.ok(s.combat.atk > c0.atk)
  assert.ok(s.gearPerk.atk > 0)
  s.challenge = 'tay_khong'
  assert.equal(s.combat.atk, c0.atk)
  assert.ok(Object.values(s.gearPerk).every((v) => v === 0))
  assert.equal(s.activeGearSets.length, 0)
  s.challenge = 'don_nhat'
  assert.ok(s.skillSlots >= 1 && s.skillSlots === 1)
  s.challenge = null
  assert.ok(s.skillSlots > 1)
})

ok('save/load giữ Kiếp Thử Thách đang theo, đã xong, số lần hoàn thành; loại thử thách lạ', () => {
  const s = freshStore()
  s.init()
  s.challenge = 'don_nhat'
  s.challengeDone = true
  s.reincarnation.challenges = { tinh_tam: 2, don_nhat: 1 }
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.challenge, 'don_nhat')
  assert.equal(s2.challengeDone, true)
  assert.deepEqual({ ...s2.reincarnation.challenges }, { tinh_tam: 2, don_nhat: 1 })
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.challenge = 'hack'
  raw.data.reincarnation.challenges = { tinh_tam: -3, khong_co: 9, doc_hanh: 'x' }
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.challenge, null)
  assert.deepEqual({ ...s3.reincarnation.challenges }, {})
})

// =====================================================================
// Điểm danh ngày, nhiệm vụ ngày, chọn thưởng boss, chuỗi kỳ ngộ, thông báo
// =====================================================================
const DY = await import('../src/game/daily.js')
const BCH = await import('../src/game/bossChoice.js')
const NTF = await import('../src/services/notify.js')
const RE8 = await import('../src/game/randomEvents.js')
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime()

ok('ngày: khoá ngày theo giờ địa phương, hôm trước đúng, vòng 7 ngày', () => {
  assert.equal(DY.dayKey(at(2026, 3, 5)), '2026-03-05')
  assert.equal(DY.dayKey(at(2026, 12, 31, 23)), '2026-12-31')
  assert.equal(DY.previousDayKey(at(2026, 3, 1)), '2026-02-28')
  assert.equal(DY.previousDayKey(at(2026, 1, 1)), '2025-12-31')
  assert.deepEqual([0, 1, 6, 7, 8].map(DY.nextRewardDay), [1, 2, 7, 1, 2])
  for (let day = 1; day <= 7; day++) {
    const fx = DY.dailyReward(day, 'thanh_tam')
    assert.ok(fx.length >= 1 && fx.every((e) => ['stones', 'item', 'expBonus'].includes(e.type)))
    for (const e of fx) if (e.type === 'item') assert.ok(ALL_ITEMS[e.id], e.id)
  }
  assert.ok(DY.dailyReward(7, 'thanh_tam').some((e) => e.type === 'expBonus'))
  assert.ok(DY.dailyArtPool(0).length >= 1 && DY.dailyArtPool(100).length > DY.dailyArtPool(1).length)
})

ok('điểm danh: nhận một lần mỗi ngày, liên tiếp thì chuỗi tăng, bỏ lỡ một ngày thì về 0, ngày 7 thưởng lớn', () => {
  const s = freshStore()
  s.init()
  const base = at(2026, 6, 10)
  s.daily = DY.emptyDaily()
  assert.equal(s.ensureDaily(base), true)
  assert.equal(s.ensureDaily(base + 3600e3), false, 'cùng ngày thì giữ nguyên')
  assert.equal(s.daily.day, '2026-06-10')
  assert.equal(s.daily.streak, 0)
  assert.equal(s.dailyPending, true)
  const stones = s.spiritStones
  assert.equal(s.claimDaily(), true)
  assert.equal(s.claimDaily(), false, 'một lần mỗi ngày')
  assert.equal(s.daily.streak, 1)
  assert.ok(s.spiritStones.gt(stones))
  // ngày liên tiếp
  s.ensureDaily(at(2026, 6, 11))
  assert.equal(s.daily.streak, 1)
  assert.equal(s.daily.claimed, false)
  s.claimDaily()
  assert.equal(s.daily.streak, 2)
  // bỏ lỡ ngày 12, vào ngày 13: chuỗi về 0
  s.ensureDaily(at(2026, 6, 13))
  assert.equal(s.daily.streak, 0)
  // quên điểm danh ngày hôm trước (chưa nhận) cũng mất chuỗi
  s.claimDaily()
  s.ensureDaily(at(2026, 6, 14))
  assert.equal(s.daily.streak, 1)
  s.ensureDaily(at(2026, 6, 15)) // không nhận ngày 14
  assert.equal(s.daily.streak, 0)
  // chuỗi 7 ngày: ngày 7 thưởng lớn, ngày kế quay về ngày 1
  const t = freshStore()
  t.init()
  t.stageIdx = 5
  t.daily = DY.emptyDaily()
  for (let d = 1; d <= 7; d++) {
    t.ensureDaily(at(2026, 7, d))
    const bonus = t.bonus.exp
    t.claimDaily()
    if (d === 7) assert.ok(t.bonus.exp > bonus, 'ngày 7 cộng % linh khí')
  }
  assert.equal(t.daily.streak, 7)
  t.ensureDaily(at(2026, 7, 8))
  assert.equal(DY.nextRewardDay(t.daily.streak), 1)
})

ok('nhiệm vụ ngày: 3 nhiệm vụ khác nhau mỗi ngày, đo từ lúc bốc, nhận một lần, xong cả 3 thưởng thêm', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  s.daily = DY.emptyDaily()
  s.ensureDaily(at(2026, 8, 1))
  assert.equal(s.daily.tasks.length, DY.DAILY_TASK_COUNT)
  assert.equal(new Set(s.daily.tasks.map((t) => t.tpl)).size, DY.DAILY_TASK_COUNT)
  for (const t of s.daily.tasks) assert.ok(t.target >= 1 && !t.claimed && QS6.templateById(t.tpl))
  assert.equal(s.claimDailyTask(0), false, 'chưa làm xong')
  // làm xong từng nhiệm vụ rồi nhận
  const finish = (t) => {
    const key = QS6.templateById(t.tpl).key
    if (key === 'aiRecord') s.campaign.record += t.target
    else if (key === 'clears') s.campaign.record += t.target * 10
    else s.stats[key] = (s.stats[key] ?? 0) + t.target
  }
  const stones = s.spiritStones
  finish(s.daily.tasks[0])
  assert.equal(s.dailyTaskDone(s.daily.tasks[0]), true)
  assert.equal(s.claimDailyTask(0), true)
  assert.equal(s.claimDailyTask(0), false, 'một lần')
  assert.ok(s.spiritStones.gt(stones))
  assert.equal(s.daily.bonus, false)
  const pills = s.itemCount('hoi_huyet_dan')
  finish(s.daily.tasks[1])
  finish(s.daily.tasks[2])
  s.claimDailyTask(1)
  s.claimDailyTask(2)
  assert.equal(s.daily.bonus, true)
  assert.ok(s.itemCount('hoi_huyet_dan') >= pills + 5, 'xong cả 3: thưởng thêm')
  assert.equal(s.achievementValue('dailyTasks'), 3)
  // ngày mới: nhiệm vụ mới, tiến độ đo lại từ giá trị hiện tại
  s.ensureDaily(at(2026, 8, 2))
  assert.ok(s.daily.tasks.every((t) => !t.claimed && s.dailyProgress(t) === 0))
})

ok('save/load giữ điểm danh và nhiệm vụ ngày; loại ngày lạ, mẫu lạ, nhiều hơn 3 nhiệm vụ', () => {
  const s = freshStore()
  s.init()
  s.daily = { day: '2026-09-01', streak: 4, claimed: true, bonus: false, tasks: [{ tpl: 'kills', target: 5, start: 2, claimed: true }] }
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.daily.streak >= 0, true)
  // ngày đã qua: ensureDaily thay mới, nhưng save giữ nguyên chuỗi đã lưu cho lần sau
  const raw = JSON.parse(mem.get(SAVE_KEY))
  assert.equal(raw.data.daily.day.length, 10)
  raw.data.daily = { day: 'xx', streak: 5, claimed: true, tasks: [] }
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.daily.streak, 0, 'ngày hỏng thì làm lại từ đầu')
  raw.data.daily = {
    day: '2026-09-01', streak: -4, claimed: 'yes',
    tasks: [{ tpl: 'kills', target: 5, start: 2 }, { tpl: 'khong_co', target: 1 }, { tpl: 'harvest', target: 0, start: 'x' }, { tpl: 'craft', target: 3 }, { tpl: 'forge', target: 1 }],
  }
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s4 = freshStore(true)
  s4.init() // ngày 2026-09-01 đã cũ nên ensureDaily thay mới; kiểm tra bước tải trực tiếp qua deserialize
  const loaded = deserialize(raw, { element: 'kim', spiritRoot: { id: 'ngu', name: 'x', mult: 1 }, name: 'n', createdAt: 1 })
  assert.equal(loaded.daily.streak, 0)
  assert.equal(loaded.daily.claimed, false)
  assert.ok(loaded.daily.tasks.length <= DY.DAILY_TASK_COUNT)
  assert.ok(loaded.daily.tasks.every((t) => QS6.templateById(t.tpl) && t.target >= 1))
})

ok('chọn thưởng boss: 3 lựa chọn khác loại, hiệu lực hợp lệ, đúng đạo lộ, lớn dần theo boss', () => {
  for (const kind of ['mini', 'big', 'lord']) {
    for (let i = 0; i < 40; i++) {
      const opts = BCH.bossChoiceOptions({ n: 5 + i * 10, kind, path: i % 2 ? 'kiem' : null })
      assert.equal(opts.length, 3)
      assert.equal(new Set(opts.map((o) => o.id)).size, 3, 'ba loại khác nhau')
      for (const o of opts) {
        assert.ok(o.label.length > 5 && o.effects.length >= 1)
        for (const e of o.effects) {
          assert.ok(['stones', 'stat', 'item', 'expBonus'].includes(e.type))
          if (e.type === 'item') assert.ok(ALL_ITEMS[e.id], e.id)
        }
      }
    }
  }
  // võ kỹ độc quyền của đạo lộ khác không xuất hiện
  for (let i = 0; i < 200; i++) {
    for (const o of BCH.bossChoiceOptions({ n: 50, kind: 'big', path: 'the' })) {
      for (const e of o.effects) if (e.type === 'item' && e.id.startsWith('qk_')) {
        const sk = SK.SKILLS[e.id.slice(3)]
        assert.ok(!sk.path || sk.path === 'the', 'sai đạo lộ: ' + e.id)
      }
    }
  }
  const stones = (kind) => BCH.bossChoiceOptions({ n: 30, kind }, seq(0, 0, 0, 0, 0, 0)).find((o) => o.id === 'stones')?.effects[0].base
  const rngStones = (kind) => {
    for (let i = 0; i < 100; i++) {
      const o = BCH.bossChoiceOptions({ n: 30, kind }).find((x) => x.id === 'stones')
      if (o) return o.effects[0].base
    }
  }
  assert.ok(rngStones('lord') > rngStones('big') && rngStones('big') > rngStones('mini'))
})

ok('chọn thưởng boss trong game: mở khi lần đầu hạ boss, không mở với ải thường hay ải đã vượt, chọn áp dụng, tự chọn sau 10 phút', () => {
  const kill = (best, ai) => {
    const s = freshStore()
    s.init()
    s.stageIdx = 20
    s.campaign.best = best
    const b = useBattleStore()
    b.start()
    assert.equal(b.ai, ai)
    b.enemy.hp = 0
    b.onKill()
    return s
  }
  assert.equal(kill(3, 4).bossChoice, null, 'ải thường không có')
  const s = kill(4, 5)
  assert.ok(s.bossChoice && s.bossChoice.n === 5 && s.bossChoice.kind === 'mini' && s.bossChoice.options.length === 3)
  assert.equal(GOALS.nextGoal(s).id === 'choice' || GOALS.goalList(s).some((g) => g.id === 'choice'), true)
  // đã vượt rồi (cày ải): không mở lại
  const f = freshStore()
  f.init()
  f.stageIdx = 20
  f.campaign.best = 10
  f.campaign.record = 10
  f.campaign.farm = 5
  const b = useBattleStore()
  b.start()
  b.enemy.hp = 0
  b.onKill()
  assert.equal(f.bossChoice, null)
  // chọn
  const opt = s.bossChoice.options[1]
  assert.equal(s.chooseBossReward(5), false)
  assert.equal(s.chooseBossReward(1), true)
  assert.equal(s.bossChoice, null)
  assert.ok(s.log.some((l) => l.text.includes('phần thưởng ải 5')))
  assert.ok(opt.effects.length >= 1)
  // lựa chọn cũ chưa chọn bị chốt phương án đầu khi có boss mới
  const t = kill(4, 5)
  const first = t.bossChoice.options[0]
  t.offerBossChoice(10, 'big')
  assert.equal(t.bossChoice.n, 10)
  assert.ok(t.log.some((l) => l.text.includes('Tự chọn')))
  // tự chọn sau 10 phút
  const u = kill(4, 5)
  u.settings.autoRepeat = false // dừng chiến đấu để không có boss mới chen vào
  useBattleStore().retreat()
  for (let i = 0; i < BCH.BOSS_CHOICE_SECONDS / 2 + 5; i++) u.tick(2)
  assert.equal(u.bossChoice, null)
  assert.ok(first.effects.length >= 1)
})

ok('chuỗi kỳ ngộ: bước nối có thật, chỉ xuất hiện qua chuỗi, phương án an toàn không nối, mọi chuỗi đều kết thúc', () => {
  const chainOnly = RE8.RANDOM_EVENTS.filter((e) => e.chainOnly)
  assert.ok(chainOnly.length >= 4)
  for (const e of chainOnly) assert.equal(e.weight, 0, e.id)
  const nexts = new Set()
  for (const e of RE8.RANDOM_EVENTS) {
    e.choices.forEach((c, idx) => {
      const outs = c.fight ? [c.win, c.lose] : c.outcomes
      for (const o of outs) if (o.next) {
        assert.ok(RE8.eventById(o.next), 'bước nối không tồn tại: ' + o.next)
        nexts.add(o.next)
        if (idx === e.safe) assert.fail('phương án an toàn không được nối chuỗi: ' + e.id)
      }
    })
  }
  for (const e of chainOnly) assert.ok(nexts.has(e.id), e.id + ' không có bước nào dẫn tới')
  // đi theo mọi nhánh không vòng lặp vô hạn
  const depth = (id, seen = 0) => {
    if (seen > 10) throw new Error('vòng lặp chuỗi')
    const e = RE8.eventById(id)
    let max = 0
    for (const c of e.choices) for (const o of c.fight ? [c.win, c.lose] : c.outcomes) if (o.next) max = Math.max(max, 1 + depth(o.next, seen + 1))
    return max
  }
  assert.ok(depth('co_mo_1') >= 2 && depth('ho_ly_1') >= 2)
  // không bốc ngẫu nhiên các bước chỉ nằm trong chuỗi
  const s = freshStore()
  s.init()
  s.stageIdx = 20
  for (let i = 0; i < 300; i++) {
    s.event = null
    s.triggerEvent()
    assert.ok(!RE8.eventById(s.event.id).chainOnly)
  }
})

ok('chuỗi kỳ ngộ chạy trong game: kết quả nối thì Tiếp tục mở bước kế, kết thúc thì đóng; bỏ ngỏ thì dừng ở phương án an toàn', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  s.event = { id: 'co_mo_1', phase: 'choose', resultText: '', effectsText: [], next: null }
  Math.random = () => 0.1 // outcome đầu (nối tiếp)
  s.chooseEvent(0)
  Math.random = realRandom
  assert.equal(s.event.phase, 'result')
  assert.equal(s.event.next, 'co_mo_2')
  s.closeEvent()
  assert.equal(s.event.id, 'co_mo_2')
  assert.equal(s.event.phase, 'choose')
  assert.ok(s.log.some((l) => l.text.includes('Kỳ ngộ tiếp nối')))
  // bước 2: nhánh an toàn kết thúc chuỗi
  s.chooseEvent(1)
  assert.equal(s.event.next, null)
  s.closeEvent()
  assert.equal(s.event, null)
  // bước nối thất bại không nối
  s.event = { id: 'co_mo_1', phase: 'choose', resultText: '', effectsText: [], next: null }
  Math.random = () => 0.99
  s.chooseEvent(0)
  Math.random = realRandom
  assert.equal(s.event.next, null)
  s.closeEvent()
  assert.equal(s.event, null)
  // bỏ ngỏ: tự chọn an toàn và dừng
  const t = freshStore()
  t.init()
  t.stageIdx = 6
  t.event = { id: 'ho_ly_1', phase: 'choose', resultText: '', effectsText: [], next: null }
  t.eventAge = 0
  for (let i = 0; i < 110; i++) t.tick(1)
  assert.equal(t.event, null)
  // chuỗi Hồ Ly đi hết đến phần thưởng cuối
  const u = freshStore()
  u.init()
  u.stageIdx = 6
  u.event = { id: 'ho_ly_1', phase: 'choose', resultText: '', effectsText: [], next: null }
  Math.random = () => 0.05
  u.chooseEvent(0); u.closeEvent()
  assert.equal(u.event.id, 'ho_ly_2')
  u.chooseEvent(0); u.closeEvent()
  assert.equal(u.event.id, 'ho_ly_3')
  const bonus = u.bonus.exp
  u.chooseEvent(0)
  Math.random = realRandom
  assert.ok(u.bonus.exp > bonus)
  assert.ok(u.itemCount('cp_cuong_the') >= 2)
  u.closeEvent()
  assert.equal(u.event, null)
})

ok('thông báo: không có API thì không lỗi; cài đặt thông báo lưu và tải', async () => {
  assert.equal(NTF.notifySupported(), false)
  assert.equal(await NTF.requestNotify(), 'unsupported')
  assert.doesNotThrow(() => NTF.notify('a', 'b'))
  const s = freshStore()
  s.init()
  assert.equal(s.settings.notify, false)
  s.settings.notify = true
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.settings.notify, true)
})

// =====================================================================
// Kho thời gian, tăng tốc, chế độ thiền định, giới hạn bộ nhớ
// =====================================================================
const CON9 = await import('../src/game/constants.js')

ok('kho thời gian: phần offline vượt giới hạn vào kho, tối đa 24 giờ; phần trong giới hạn không vào', () => {
  const s = freshStore()
  s.init()
  const cap = s.offlineCap
  s.offlineReport = null
  s.applyOffline(cap - 100)
  assert.equal(s.timeBank, 0)
  s.applyOffline(cap + 1000)
  assert.equal(s.timeBank, 1000)
  s.applyOffline(cap + 100 * 3600)
  assert.equal(s.timeBank, CON9.TIME_BANK_CAP, 'tối đa 24 giờ')
  s.addTimeBank(-5)
  s.addTimeBank(0)
  assert.equal(s.timeBank, CON9.TIME_BANK_CAP)
})

ok('kho thời gian: điểm danh ngày 7 thêm 1 giờ, xong 3 nhiệm vụ ngày thêm 30 phút', () => {
  const s = freshStore()
  s.init()
  s.daily = DY.emptyDaily()
  s.daily.streak = 6
  s.daily.day = '2026-05-01'
  s.daily.claimed = false
  s.claimDaily()
  assert.equal(s.timeBank, 3600)
  const t = freshStore()
  t.init()
  t.daily = { day: '2026-05-01', streak: 0, claimed: true, bonus: false, tasks: [] }
  for (let i = 0; i < 3; i++) t.daily.tasks.push({ tpl: 'kills', target: 1, start: 0, claimed: false })
  t.stats.kills = 5
  for (let i = 0; i < 3; i++) t.claimDailyTask(i)
  assert.equal(t.timeBank, DY.DAILY_BONUS_TIME)
})

ok('tăng tốc: bật thì chạy nhanh gấp 4 và tiêu 3 giây kho mỗi giây thật; tắt thì không tiêu; hết kho tự tắt', () => {
  const run = (warp, bank) => {
    const s = freshStore()
    s.init()
    s.spiritRoot = { ...s.spiritRoot, mult: 1 } // căn cốt ngẫu nhiên mỗi lần: cố định để so sánh
    s.settings.autoRepeat = false // chỉ đo tu luyện thụ động
    s.settings.warp = warp
    s.timeBank = bank
    const exp0 = s.exp
    for (let i = 0; i < 100; i++) s.warpTick(0.1) // 10 giây thật
    return { s, gained: s.exp.sub(exp0).toNumber() }
  }
  const off = run(false, 1000)
  const on = run(true, 1000)
  assert.equal(off.s.timeBank, 1000)
  assert.ok(Math.abs(on.gained / off.gained - 4) < 0.05, 'nhanh x4: ' + on.gained / off.gained)
  assert.ok(Math.abs(on.s.timeBank - (1000 - 30)) < 0.5, 'tiêu 3 giây mỗi giây thật')
  assert.equal(on.s.settings.warp, true)
  // kho ít: chạy một lúc rồi tự tắt, không âm
  const low = run(true, 5)
  assert.ok(low.s.timeBank >= 0 && low.s.timeBank < 0.1)
  assert.equal(low.s.settings.warp, false, 'hết kho thì tự tắt')
  assert.ok(low.gained > off.gained && low.gained < on.gained)
  // bật tăng tốc khi kho rỗng thì tự tắt ngay
  const none = run(true, 0)
  assert.equal(none.s.settings.warp, false)
  assert.ok(Math.abs(none.gained / off.gained - 1) < 0.02)
})

ok('kho thời gian lưu và tải, bị chặn trong khoảng hợp lệ; tăng tốc không được lưu', () => {
  const s = freshStore()
  s.init()
  s.timeBank = 4321
  s.settings.warp = true
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.timeBank, 4321)
  assert.equal(s2.settings.warp, false)
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.timeBank = 1e12
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.timeBank, CON9.TIME_BANK_CAP)
  raw.data.timeBank = -50
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s4 = freshStore(true)
  s4.init()
  assert.equal(s4.timeBank, 0)
})

ok('vòng lặp: bình thường tick mỗi bước; thiền định chỉ tick mỗi 0.5 giây; nghỉ lâu thì tính như offline', () => {
  const s = freshStore()
  s.init()
  const ui = useUiStoreEarly()
  const t0 = 1_000_000
  s.syncLoopClock(t0)
  assert.equal(s.loopStep(t0 + 100), true)
  assert.equal(s.loopStep(t0 + 200), true)
  // thiền định: bỏ qua các bước ngắn
  ui.meditate = true
  s.syncLoopClock(t0)
  const play = s.stats.playSeconds
  assert.equal(s.loopStep(t0 + 100), false)
  assert.equal(s.loopStep(t0 + 300), false)
  assert.equal(s.loopStep(t0 + 500), true)
  assert.ok(Math.abs(s.stats.playSeconds - play - 0.5) < 1e-9, 'tick gộp 0.5 giây')
  ui.meditate = false
  // nghỉ lâu hơn 5 giây: xử lý như offline
  s.syncLoopClock(t0)
  s.offlineReport = null
  assert.equal(s.loopStep(t0 + 60_000), true)
  assert.ok(s.offlineReport, 'có báo cáo offline')
})

ok('thiền định: hiệu ứng chiến đấu không phát; chiến đấu vẫn chạy bình thường', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 10
  const ui = useUiStoreEarly()
  ui.tab = 'battle'
  const hits = []
  const off = onEvent('battle-hit', (e) => hits.push(e.damage))
  const b = useBattleStore()
  runFor(s, 20)
  const loud = hits.length
  assert.ok(loud > 0, 'xem màn Vượt Ải thì có hiệu ứng')
  ui.meditate = true
  const kills = s.stats.kills
  runFor(s, 20)
  off()
  assert.equal(hits.length, loud, 'thiền định thì không phát hiệu ứng')
  assert.ok(s.stats.kills > kills, 'vẫn đánh và hạ yêu thú')
  ui.meditate = false
})

ok('bộ nhớ: để chạy nhiều giờ thì nhật ký, danh sách trang bị rơi, túi đồ đều bị chặn', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 24
  s.stats.maxStage = 24
  s.campaign.best = 0
  const b = useBattleStore()
  Math.random = () => 0.01 // luôn rơi đồ
  for (let i = 0; i < 400; i++) {
    b.run.gear.push('x')
    if (b.run.gear.length > 50) b.run.gear.shift()
  }
  assert.ok(b.run.gear.length <= 50)
  // chạy chiến đấu nhiều ải (rơi nhiều trang bị): danh sách rơi không vượt 50, nhật ký không vượt giới hạn
  s.settings.autoRepeat = true
  for (let t = 0; t < 4000; t++) s.tick(0.5)
  Math.random = realRandom
  assert.ok(b.run.gear.length <= 50, 'danh sách rơi ' + b.run.gear.length)
  assert.ok(s.log.length <= CON9.LOG_LIMIT, 'nhật ký ' + s.log.length)
  assert.ok(s.gear.bag.length <= EQ.BAG_LIMIT, 'túi trang bị ' + s.gear.bag.length)
  assert.ok(Object.keys(b.run.items).length < 200)
})

// =====================================================================
// Linh Thú đồng hành
// =====================================================================
const PT10 = await import('../src/game/pets.js')

ok('linh thú: dữ liệu hợp lệ, có Phách trong kho vật phẩm, cửa hàng và bảng rơi theo ải', () => {
  assert.ok(Object.keys(PT10.PETS).length >= 8)
  for (const [id, p] of Object.entries(PT10.PETS)) {
    assert.ok(p.name && p.text && p.minAi >= 1 && ['kim', 'moc', 'thuy', 'hoa', 'tho'].includes(p.element), id)
    assert.ok(Object.keys(p.perk).every((k) => k in PT10.ZERO_PET_PERK), id + ' khoá thưởng lạ')
    if (p.kind === 'hunter') assert.ok(p.power > 0 && p.interval > 0, id)
    if (p.kind === 'healer') assert.ok(p.heal > 0 && p.interval > 0, id)
    assert.ok(['hunter', 'healer', 'guard', 'lucky', 'scholar'].includes(p.kind))
    assert.ok(ALL_ITEMS[PT10.petFragmentId(id)], 'thiếu Phách ' + id)
    assert.ok(SECT_SHOP.some((e) => e.item === PT10.petFragmentId(id)), 'cửa hàng thiếu ' + id)
    assert.ok(PT10.petDesc(id, 3, 'kim').length > 10)
  }
  assert.ok(Object.values(PT10.PETS).filter((p) => p.minAi <= 5).length >= 2)
  assert.deepEqual([0, 3, 4, 8].map(PT10.petSlotCount), [1, 1, 2, 2])
  assert.ok(PT10.petLevelMult(10) > PT10.petLevelMult(1))
})

ok('linh thú: thu phục, nuôi lớn, ra trận theo ô mở (ô 2 ở Hóa Thần), không trùng, cấp tối đa', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.petSlots, 1)
  assert.equal(s.learnPet('tieu_ho'), false, 'chưa đủ Phách')
  s.addItem('scrolls', PT10.petFragmentId('tieu_ho'), PT10.PET_LEARN_COST + PT10.petUpgradeCost(1))
  s.addItem('scrolls', PT10.petFragmentId('linh_hac'), PT10.PET_LEARN_COST)
  assert.equal(s.learnPet('tieu_ho'), true)
  assert.equal(s.pets.active[0], 'tieu_ho')
  assert.equal(s.learnPet('tieu_ho'), false)
  assert.equal(s.learnPet('linh_hac'), true)
  assert.equal(s.pets.active[1], null, 'ô 2 chưa mở nên không tự cho ra trận')
  assert.deepEqual(s.activePets, ['tieu_ho'])
  assert.equal(s.equipPet('linh_hac', 1), false)
  assert.equal(s.equipPet('linh_hac', 0), true)
  assert.deepEqual(s.activePets, ['linh_hac'])
  assert.equal(s.pets.active.indexOf('tieu_ho'), -1)
  s.stageIdx = 18
  assert.equal(s.petSlots, 2)
  assert.equal(s.equipPet('tieu_ho', 1), true)
  assert.deepEqual(s.activePets, ['linh_hac', 'tieu_ho'])
  s.unequipPet(0)
  assert.deepEqual(s.activePets, ['tieu_ho'])
  assert.equal(s.upgradePet('tieu_ho'), true)
  assert.equal(s.pets.owned.tieu_ho, 2)
  assert.equal(s.upgradePet('tieu_ho'), false)
  s.pets.owned.tieu_ho = PT10.PET_MAX_LEVEL
  s.addItem('scrolls', PT10.petFragmentId('tieu_ho'), 99)
  assert.equal(s.upgradePet('tieu_ho'), false)
  assert.equal(s.achievementValue('petLevels'), PT10.PET_MAX_LEVEL + 1)
})

ok('thưởng bị động của linh thú: đúng khoá, cùng hệ +25%, gộp vào chỉ số, linh khí, rơi đồ, linh thạch', () => {
  const p = PT10.petPerks(['quy_giap'], { quy_giap: 4 }, 'kim')
  assert.ok(Math.abs(p.def - 0.03 * 4) < 1e-9 && Math.abs(p.thorns - 0.015 * 4) < 1e-9)
  const same = PT10.petPerks(['quy_giap'], { quy_giap: 4 }, 'tho')
  assert.ok(Math.abs(same.def - p.def * 1.25) < 1e-9)
  assert.deepEqual(PT10.petPerks([null, 'khong_co'], {}, 'kim'), { ...PT10.ZERO_PET_PERK })
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  s.element = 'kim'
  const c0 = s.combat
  const e0 = s.expRate
  const st0 = s.stonesRate
  const l0 = s.lootLuck
  s.pets.owned = { quy_giap: 5, van_ho: 5, kim_thiem: 5 }
  s.pets.active = ['quy_giap', null]
  assert.ok(s.combat.def > c0.def)
  s.stageIdx = 18 // ô 2
  s.pets.active = ['quy_giap', 'van_ho']
  assert.ok(s.expRate.gt(e0))
  s.pets.active = ['kim_thiem', 'van_ho']
  assert.ok(s.stonesRate.gt(st0) && s.lootLuck > l0)
  assert.ok(s.extraPerk.luck > 0 && s.extraPerk.exp > 0 && s.extraPerk.stones > 0)
  assert.ok(Math.abs(s.battlePerk.thorns - 0) < 1e-9, 'Kim Thiềm và Vân Hồ không phản sát thương')
  s.pets.active = ['quy_giap', null]
  assert.ok(s.battlePerk.thorns > 0)
  // chưa ra trận thì không có tác dụng
  s.pets.active = [null, null]
  assert.ok(Object.values(s.extraPerk).every((v) => v === 0))
})

ok('linh thú thợ săn cắn đúng chu kỳ và không dồn đòn khi lỡ nhịp; tiên hạc hồi khí huyết', () => {
  const x = arena()
  const { s, b } = x
  s.pets.owned = { tieu_ho: 3, linh_hac: 2 }
  s.pets.active = ['tieu_ho', null]
  s.element = 'tho'
  const hp0 = b.enemy.hp
  b.clock = 100
  b.processPets() // lần đầu chỉ đặt hẹn giờ
  assert.equal(b.enemy.hp, hp0)
  b.clock = 103
  b.processPets()
  assert.equal(b.enemy.hp, hp0, 'chưa tới 4 giây')
  b.clock = 104.1
  b.processPets()
  const bite = hp0 - b.enemy.hp
  assert.ok(bite > 0, 'cắn đúng nhịp')
  b.clock = 104.5
  b.processPets()
  assert.equal(hp0 - b.enemy.hp, bite, 'chưa tới nhịp kế')
  b.clock = 200 // lỡ nhịp rất lâu: chỉ cắn một lần
  b.processPets()
  assert.ok(Math.abs(hp0 - b.enemy.hp - bite * 2) < bite * 0.6 + 1, 'không dồn nhiều đòn')
  b.processPets()
  assert.ok(hp0 - b.enemy.hp < bite * 3.6)
  // tiên hạc
  s.pets.active = ['linh_hac', null]
  b.petNext = {}
  b.hp = 10
  b.clock = 300
  b.processPets()
  b.clock = 306
  b.processPets()
  assert.ok(b.hp > 10, 'tiên hạc hồi khí huyết')
  assert.ok(b.hp <= b.maxHp)
  // không có linh thú thì không làm gì
  s.pets.active = [null, null]
  const e = b.enemy.hp
  b.clock = 500
  b.processPets()
  b.clock = 600
  b.processPets()
  assert.equal(b.enemy.hp, e)
})

ok('linh thú hạ gục yêu thú: tính là hạ quái bình thường', () => {
  const { s, b } = arena()
  s.pets.owned = { hoa_phuong: 10 }
  s.pets.active = ['hoa_phuong', null]
  b.enemy.hp = 1
  b.enemy.maxHp = 1
  b.enemy.def = 0
  const kills = s.stats.kills
  b.clock = 10
  b.processPets()
  b.clock = 16
  b.processPets()
  assert.equal(s.stats.kills, kills + 1)
  assert.equal(b.lastResult, 'win')
})

ok('Linh Thú Phách rơi từ boss theo ải; ải thường không rơi; trong trận rơi thật', () => {
  assert.deepEqual(PT10.rollPetDrops(3, 'normal', () => 0), [])
  assert.equal(PT10.rollPetDrops(5, 'mini', () => 0.99).length, 0)
  const d = PT10.rollPetDrops(5, 'mini', () => 0)
  assert.ok(d.length === 1 && d[0].id.startsWith('ln_') && d[0].count >= 1)
  assert.equal(PT10.rollPetDrops(10, 'lord', () => 0.99).length, 1, 'Chúa Tể luôn rơi')
  for (let i = 0; i < 100; i++) {
    const [x] = PT10.rollPetDrops(5, 'big', Math.random)
    if (!x) continue
    assert.ok(PT10.PETS[x.id.slice(3)].minAi <= 5, 'rơi linh thú chưa mở: ' + x.id)
  }
  assert.equal(PT10.rollPetDrops(5, 'mini', () => 0.3).length, 0)
  assert.equal(PT10.rollPetDrops(5, 'mini', () => 0.3, 0.5).length, 1)
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  s.campaign.best = 99 // ải 100: Chúa Tể
  const b = useBattleStore()
  b.start()
  const count = () => Object.keys(ALL_ITEMS).filter((id) => id.startsWith('ln_')).reduce((n, id) => n + s.itemCount(id), 0)
  const before = count()
  b.enemy.hp = 0
  b.onKill()
  assert.ok(count() > before, 'Chúa Tể rơi Linh Thú Phách')
})

ok('save/load giữ linh thú; loại linh thú lạ, cấp vượt trần, ô trùng hoặc chưa thu phục; save cũ vẫn tải được', () => {
  const s = freshStore()
  s.init()
  s.pets = { owned: { tieu_ho: 4, linh_hac: 2 }, active: ['linh_hac', 'tieu_ho'] }
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.deepEqual({ ...s2.pets.owned }, { tieu_ho: 4, linh_hac: 2 })
  assert.deepEqual([...s2.pets.active], ['linh_hac', 'tieu_ho'])
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.pets = { owned: { tieu_ho: 99, khong_co: 3, quy_giap: -2 }, active: ['tieu_ho', 'tieu_ho', 'khong_co'] }
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.pets.owned.tieu_ho, PT10.PET_MAX_LEVEL)
  assert.equal(s3.pets.owned.quy_giap, 1)
  assert.ok(!('khong_co' in s3.pets.owned))
  assert.deepEqual([...s3.pets.active], ['tieu_ho', null], 'ô trùng bị loại')
  delete raw.data.pets
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s4 = freshStore(true)
  s4.init()
  assert.deepEqual({ ...s4.pets.owned }, {})
  assert.equal(s4.pets.active.length, PT10.MAX_PET_SLOTS)
  // luân hồi giữ linh thú
  s.stageIdx = 12
  s.reincarnate()
  assert.equal(s.pets.owned.tieu_ho, 4)
})

ok('gợi ý: đủ Linh Thú Phách thì nhắc thu phục', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  s.addItem('scrolls', PT10.petFragmentId('tieu_ho'), PT10.PET_LEARN_COST)
  assert.ok(GUIDE.nextHints(s).some((h) => h.id === 'pet'))
  s.learnPet('tieu_ho')
  assert.ok(!GUIDE.nextHints(s).some((h) => h.id === 'pet'))
})

// =====================================================================
// Công trình Động Phủ và thám hiểm của đệ tử
// =====================================================================
const DW = await import('../src/game/dwelling.js')
const EX = await import('../src/game/expedition.js')
const disc = (uid, over = {}) => ({ uid, name: 'Đệ ' + uid, element: 'kim', grade: 1, level: 3, job: 'herb', since: Date.now(), ...over })

ok('công trình động phủ: dữ liệu hợp lệ, giá tăng dần, cần bậc tu vi tăng theo cấp, thưởng gộp', () => {
  assert.equal(DW.BUILDING_IDS.length, 5)
  for (const [id, b] of Object.entries(DW.BUILDINGS)) {
    assert.ok(b.name && b.text && b.minStage >= 0, id)
    assert.ok(Object.keys(b.perk).every((k) => ['exp', 'double', 'arts', 'forge', 'atk', 'def'].includes(k)), id)
    assert.ok(DW.buildingCost(id, 5).gt(DW.buildingCost(id, 0)))
    assert.equal(DW.buildingNeedStage(id, 3), b.minStage + 3)
  }
  const none = DW.dwellingPerks(DW.emptyDwelling())
  assert.ok(Object.values(none).every((v) => v === 0))
  const p = DW.dwellingPerks({ linh_mach: 4, dien_vo: 2, luyen_khi: 1 })
  assert.ok(Math.abs(p.exp - 0.1) < 1e-9 && Math.abs(p.atk - 0.03) < 1e-9 && Math.abs(p.forge - 0.08) < 1e-9)
})

ok('nâng công trình: cần bậc tu vi, linh thạch, tối đa cấp 10; thưởng có hiệu lực; giữ khi luân hồi và lưu', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 0
  s.spiritStones = new Decimal(1e30)
  assert.equal(s.upgradeBuilding('linh_mach'), false, 'chưa đủ bậc tu vi')
  assert.equal(s.upgradeBuilding('khong_co'), false)
  s.stageIdx = 2
  assert.equal(s.upgradeBuilding('linh_mach'), true)
  assert.equal(s.dwelling.linh_mach, 1)
  assert.equal(s.upgradeBuilding('linh_mach'), false, 'cấp 2 cần bậc 3')
  const exp1 = s.expRate
  s.stageIdx = 12
  for (let i = 0; i < 12; i++) s.upgradeBuilding('linh_mach')
  assert.equal(s.dwelling.linh_mach, DW.BUILDING_MAX_LEVEL)
  assert.ok(s.expRate.gt(exp1))
  assert.ok(s.extraPerk.exp > 0.2)
  s.spiritStones = new Decimal(0)
  s.stageIdx = 12
  assert.equal(s.upgradeBuilding('dien_vo'), false, 'không đủ linh thạch')
  // thưởng cụ thể
  s.spiritStones = new Decimal(1e30)
  for (const id of ['dien_vo', 'tang_kinh', 'luyen_dan']) for (let i = 0; i < 3; i++) s.upgradeBuilding(id)
  assert.ok(s.extraPerk.atk > 0 && s.extraPerk.def > 0 && s.extraPerk.arts > 0 && s.extraPerk.double > 0)
  s.arts.owned.pha_quan = 5
  const a1 = s.artBonus.atk
  s.dwelling.tang_kinh = 0
  assert.ok(a1 > s.artBonus.atk, 'Tàng Kinh Các tăng hiệu quả công pháp')
  // luân hồi giữ, lưu và tải chặn cấp
  s.dwelling.dien_vo = 3
  s.stageIdx = 12
  s.reincarnate()
  assert.equal(s.dwelling.dien_vo, 3)
  s.save()
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.dwelling = { linh_mach: 99, dien_vo: -4, khong_co: 5 }
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.dwelling.linh_mach, DW.BUILDING_MAX_LEVEL)
  assert.equal(s2.dwelling.dien_vo, 0)
  assert.ok(!('khong_co' in s2.dwelling))
  delete raw.data.dwelling
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.deepEqual({ ...s3.dwelling }, DW.emptyDwelling(), 'save cũ không có công trình vẫn tải được')
})

ok('Luyện Khí Phòng làm rèn ra đồ hiếm hơn; Luyện Đan Phòng tăng tỉ lệ luyện gấp đôi', () => {
  const avgRarity = (level) => {
    const s = freshStore()
    s.init()
    s.stageIdx = 5
    s.dwelling.luyen_khi = level
    let total = 0
    const n = 4000
    for (let i = 0; i < n; i++) {
      const weights = EQ.FORGE_RARITY_WEIGHTS.map((w, k) => (k === 0 ? w : w * (1 + s.extraPerk.forge)))
      total += EQ.generateItem('weapon', 0, weights).rarity
    }
    return total / n
  }
  assert.ok(avgRarity(10) > avgRarity(0) + 0.1)
  // thật trong game: rèn bằng store
  const s = freshStore()
  s.init()
  s.stageIdx = 5
  s.dwelling.luyen_khi = 10
  assert.ok(Math.abs(s.extraPerk.forge - 0.8) < 1e-9)
  s.addItem('ores', 'thiet_tinh', 50)
  s.spiritStones = new Decimal(1e9)
  const item = s.forge(0, 'weapon')
  assert.ok(item && s.gear.bag.length === 1)
  // Luyện Đan Phòng: rng 0.05 dưới ngưỡng cộng thêm 15% (cấp 10 x 1.5%)
  const t = freshStore()
  t.init()
  t.stageIdx = 9
  t.dwelling.luyen_dan = 10
  t.spiritStones = new Decimal(1e6)
  t.addItem('herbs', 'linh_thao', 30)
  Math.random = () => 0.1
  t.craft('tu_khi_dan', 3)
  Math.random = realRandom
  assert.equal(t.itemCount('tu_khi_dan'), 6)
})

ok('thám hiểm: dữ liệu hợp lệ, số chỗ theo cấp bậc tông môn, xác suất tăng theo sức mạnh và có trần', () => {
  assert.equal(EX.MISSION_IDS.length, 5)
  for (const [id, m] of Object.entries(EX.MISSIONS)) {
    assert.ok(m.name && m.seconds > 0 && m.need >= 1 && m.need <= EX.MAX_PARTY && m.diff > 0 && m.stones > 0, id)
  }
  const secs = EX.MISSION_IDS.map((id) => EX.MISSIONS[id].seconds)
  assert.ok(secs.every((v, i) => i === 0 || v > secs[i - 1]), 'nhiệm vụ sau dài hơn')
  assert.deepEqual([0, 1, 2, 4, 5].map(EX.expeditionSlots), [1, 1, 2, 3, 3])
  assert.ok(EX.successChance(2, 2) > EX.successChance(1, 2))
  assert.ok(EX.successChance(0.01, 5) >= 0.1 && EX.successChance(1e9, 5) <= 0.95)
  const weak = [disc('a', { grade: 0, level: 1 })]
  const strong = [disc('a', { grade: 3, level: 15 }), disc('b', { grade: 2, level: 10 })]
  assert.ok(EX.partyPower(strong) > EX.partyPower(weak) * 5)
  assert.ok(EX.partyPower([disc('a', { element: 'kim' })], 'kim') > EX.partyPower([disc('a', { element: 'kim' })], 'moc'), 'cùng hệ tông môn mạnh hơn')
})

ok('phần thưởng thám hiểm: thất bại chỉ còn 25% linh thạch và thảo dược; thành công có tàn quyển hiếm hợp ải và đạo lộ', () => {
  const m = EX.MISSIONS.vuc
  const ok1 = EX.missionEffects(m, 20, true, { record: 100, path: 'kiem' })
  const bad = EX.missionEffects(m, 20, false, { record: 100, path: 'kiem' })
  assert.equal(bad.length, 2)
  assert.ok(Math.abs(bad[0].base - m.stones * 0.25) < 1e-9)
  assert.ok(ok1[0].base > bad[0].base * 3)
  assert.ok(ok1.some((e) => e.id?.startsWith('cp_')) && ok1.some((e) => e.id?.startsWith('ln_')) && ok1.some((e) => e.id?.startsWith('qk_')))
  for (const e of ok1) if (e.type === 'item') assert.ok(ALL_ITEMS[e.id], e.id)
  for (let i = 0; i < 100; i++) {
    for (const e of EX.missionEffects(m, 20, true, { record: 20, path: 'the' })) {
      if (e.id?.startsWith('qk_')) { const sk = SK.SKILLS[e.id.slice(3)]; assert.ok(!sk.path || sk.path === 'the', e.id) }
      if (e.id?.startsWith('cp_')) assert.ok(AR.ARTS[e.id.slice(3)].minAi <= 20, e.id)
      if (e.id?.startsWith('ln_')) assert.ok(PT10.PETS[e.id.slice(3)].minAi <= 20, e.id)
    }
  }
  const easy = EX.missionEffects(EX.MISSIONS.rung, 0, true, { record: 1 })
  assert.ok(!easy.some((e) => e.id?.startsWith('cp_') || e.id?.startsWith('ln_')), 'nhiệm vụ dễ không có tàn quyển hiếm')
})

ok('cử đệ tử thám hiểm: điều kiện, đệ tử tạm bỏ việc, về nhận thưởng và trở lại việc cũ', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 3
  const t0 = 1_000_000_000_000
  s.disciples = [disc('a', { since: t0 }), disc('b', { since: t0, job: 'ore' }), disc('c', { since: t0, job: null })]
  assert.equal(s.expeditionSlotCount, 1)
  assert.equal(s.startExpedition('khong_co', ['a'], t0), false)
  assert.equal(s.startExpedition('mach', ['a'], t0), false, 'cần ít nhất 2 đệ tử')
  assert.equal(s.startExpedition('thu', ['a', 'b', 'c'], t0), false, 'chưa đủ bậc tu vi')
  assert.equal(s.startExpedition('rung', ['a', 'a', 'khong_co'], t0), true)
  assert.equal(s.disciples[0].away, true)
  assert.equal(s.disciples[0].job, null)
  assert.equal(s.disciples[0].prevJob, 'herb')
  assert.equal(s.startExpedition('rung', ['b'], t0), false, 'hết chỗ (1 chỗ)')
  assert.equal(s.assignJob('a', 'ore', t0), false, 'đang thám hiểm không đổi việc')
  assert.equal(s.dismissDisciple('a'), false)
  assert.equal(s.claimExpedition(0, t0 + 1000), null, 'chưa đủ giờ')
  assert.equal(s.expeditionReady(s.expeditions[0], t0 + EX.MISSIONS.rung.seconds * 1000), true)
  // thành công
  const stones = s.spiritStones
  Math.random = () => 0.0
  const res = s.claimExpedition(0, t0 + EX.MISSIONS.rung.seconds * 1000)
  Math.random = realRandom
  assert.equal(res.success, true)
  assert.ok(s.spiritStones.gt(stones))
  assert.equal(s.expeditions.length, 0)
  assert.equal(s.disciples[0].away, false)
  assert.equal(s.disciples[0].job, 'herb')
  assert.equal(s.disciples[0].prevJob, undefined)
  assert.equal(s.stats.expeditions, 1)
  assert.equal(s.achievementValue('expeditionsDone'), 1)
  // thất bại: ít hơn, không tính thành tựu
  s.startExpedition('rung', ['b'], t0)
  Math.random = () => 0.999
  const fail = s.claimExpedition(0, t0 + 1e9)
  Math.random = realRandom
  assert.equal(fail.success, false)
  assert.equal(s.stats.expeditions, 1)
  assert.equal(s.disciples[1].job, 'ore', 'về lại việc cũ')
})

ok('thám hiểm: nhiều chỗ khi bậc tông môn cao, đệ tử đang đi không đi hai nơi, thành công cộng Cống Hiến', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  s.joinSect('van_moc')
  s.sect.total = 10000 // Phó Chưởng Môn
  assert.equal(s.expeditionSlotCount, 3)
  const t0 = 2_000_000_000_000
  s.disciples = ['a', 'b', 'c', 'd', 'e'].map((u) => disc(u, { since: t0 }))
  assert.equal(s.startExpedition('rung', ['a'], t0), true)
  assert.equal(s.startExpedition('rung', ['a'], t0), false, 'a đang đi')
  assert.equal(s.startExpedition('mach', ['b', 'c'], t0), true)
  assert.equal(s.startExpedition('mo', ['d', 'e'], t0), true)
  assert.equal(s.expeditions.length, 3)
  assert.equal(s.startExpedition('rung', ['d'], t0), false, 'hết 3 chỗ')
  const contrib = s.sect.contribution
  Math.random = () => 0
  s.claimExpedition(0, t0 + 1e9)
  Math.random = realRandom
  assert.ok(s.sect.contribution > contrib)
  assert.equal(s.expeditions.length, 2)
  // đoàn quá 5 người
  s.disciples = ['a', 'b', 'c', 'd', 'e', 'f'].map((u) => disc(u))
  s.expeditions = []
  s.disciples.forEach((d) => { d.away = false })
  assert.equal(s.startExpedition('mach', ['a', 'b', 'c', 'd', 'e', 'f'], t0), false, 'tối đa ' + EX.MAX_PARTY)
  // thử thách Độc Hành: không đệ tử
  s.challenge = 'doc_hanh'
  assert.equal(s.startExpedition('rung', ['a'], t0), false)
})

ok('save/load thám hiểm: giữ đoàn, đệ tử đang đi, việc cũ; loại nhiệm vụ lạ, đệ tử lạ hoặc trùng; chạy được khi đã quá giờ', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  const t0 = Date.now() - 3 * 3600 * 1000
  s.disciples = [disc('a', { since: t0 }), disc('b', { since: t0, job: 'guard' }), disc('c', { since: t0 })]
  s.startExpedition('mach', ['a', 'b'], t0)
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.expeditions.length, 1)
  assert.deepEqual([...s2.expeditions[0].uids], ['a', 'b'])
  const da = s2.disciples.find((d) => d.uid === 'a')
  assert.equal(da.away, true)
  assert.equal(da.prevJob, 'herb')
  assert.equal(da.job, null)
  assert.equal(s2.disciples.find((d) => d.uid === 'c').away, undefined)
  assert.equal(s2.expeditionReady(s2.expeditions[0]), true, '3 giờ trôi qua nên đã xong')
  const res = s2.claimExpedition(0)
  assert.ok(res)
  assert.equal(s2.disciples.find((d) => d.uid === 'b').job, 'guard')
  // dữ liệu hỏng
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.expeditions = [
    { id: 'khong_co', uids: ['a'], since: 1 },
    { id: 'rung', uids: ['a', 'khong_co', 'a'], since: 5 },
    { id: 'rung', uids: ['a', 'c'], since: 6 },
    { id: 'mach', uids: ['x'], since: 7 },
  ]
  raw.data.disciples[2].away = true // cờ "đang đi" mà không có thám hiểm nào: phải bị xoá
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.expeditions.length, 2)
  assert.deepEqual([...s3.expeditions[0].uids], ['a'])
  assert.deepEqual([...s3.expeditions[1].uids], ['c'], 'a chỉ thuộc một đoàn')
  assert.equal(s3.disciples.find((d) => d.uid === 'b').away, undefined)
  assert.equal(s3.expeditions[0].seconds, EX.MISSIONS.rung.seconds)
  // save cũ không có thám hiểm vẫn tải được
  delete raw.data.expeditions
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s4 = freshStore(true)
  s4.init()
  assert.deepEqual(s4.expeditions, [])
})

// =====================================================================
// Thiên Phú
// =====================================================================
const TL = await import('../src/game/talents.js')

ok('thiên phú: dữ liệu hợp lệ, khoá thưởng thuộc extraPerk, đủ 3 độ hiếm, thưởng mạnh dần theo độ hiếm', () => {
  const extraKeys = ['atk', 'hp', 'def', 'speed', 'crit', 'cd', 'thorns', 'luck', 'stones', 'exp', 'arts', 'disciple', 'dao', 'pill', 'double']
  assert.ok(TL.TALENT_IDS.length >= 12)
  for (const [id, t] of Object.entries(TL.TALENTS)) {
    assert.ok(t.name && t.text && [0, 1, 2].includes(t.grade), id)
    assert.ok(Object.keys(t.perk).length >= 1 && Object.keys(t.perk).every((k) => extraKeys.includes(k)), id + ' khoá lạ')
  }
  for (const g of [0, 1, 2]) assert.ok(Object.values(TL.TALENTS).some((t) => t.grade === g))
  const total = (g) => {
    const list = Object.values(TL.TALENTS).filter((t) => t.grade === g)
    return list.reduce((n, t) => n + Object.values(t.perk).reduce((a, b) => a + b, 0), 0) / list.length
  }
  assert.ok(total(1) > total(0) && total(2) > total(1))
  assert.deepEqual(TL.talentPerk(null), {})
  assert.deepEqual(TL.talentPerk('linh_can'), { exp: 0.15 })
})

ok('bốc thiên phú: 3 thiên phú khác nhau, độ hiếm cao ít gặp hơn', () => {
  const count = { 0: 0, 1: 0, 2: 0 }
  for (let i = 0; i < 2000; i++) {
    const offer = TL.rollTalentOffer()
    assert.equal(offer.length, TL.TALENT_OFFER_SIZE)
    assert.equal(new Set(offer).size, offer.length)
    for (const id of offer) count[TL.TALENTS[id].grade]++
  }
  // mỗi thiên phú thường xuất hiện nhiều hơn mỗi thiên phú cực hiếm
  const per = (g) => count[g] / Object.values(TL.TALENTS).filter((t) => t.grade === g).length
  assert.ok(per(0) > per(1) && per(1) > per(2), JSON.stringify(count))
  assert.equal(TL.rollTalentOffer(() => 0.99).length, 3, 'rng cực đại vẫn bốc đủ')
})

ok('thiên phú trong game: game mới có 3 lựa chọn, chọn một lần, thưởng có hiệu lực, không còn lựa chọn sau khi chọn', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.talentOffer.length, 3)
  assert.equal(s.talentPending, true)
  assert.equal(s.chooseTalent('khong_co'), false)
  const outside = TL.TALENT_IDS.find((id) => !s.talentOffer.includes(id))
  assert.equal(s.chooseTalent(outside), false, 'chỉ chọn trong các lựa chọn đang có')
  const base = { exp: s.expRate, combat: s.combat }
  s.talentOffer = ['linh_can', 'kiem_cot', 'phu_quy']
  assert.equal(s.chooseTalent('linh_can'), true)
  assert.equal(s.talent, 'linh_can')
  assert.deepEqual(s.talentOffer, [])
  assert.equal(s.talentPending, false)
  assert.equal(s.chooseTalent('kiem_cot'), false, 'không đổi sau khi chọn')
  assert.ok(s.expRate.gt(base.exp.mul(1.1)))
  assert.equal(s.rerollTalents(), false, 'đã chọn thì không bốc lại')
  // từng loại thưởng
  const probe = (id, check) => {
    const t = freshStore()
    t.init()
    t.stageIdx = 10
    const b0 = { combat: t.combat, stones: t.stonesRate, luck: t.lootLuck, dao: t.daoPreview, arts: 0 }
    t.talentOffer = [id]
    t.chooseTalent(id)
    check(t, b0)
  }
  probe('kiem_cot', (t, b) => assert.ok(t.combat.atk > b.combat.atk && t.battlePerk.crit > 0))
  probe('thiet_cot', (t, b) => assert.ok(t.combat.hp > b.combat.hp && t.combat.def > b.combat.def))
  probe('phu_quy', (t, b) => assert.ok(t.stonesRate.gt(b.stones)))
  probe('van_may', (t, b) => assert.ok(t.lootLuck > b.luck))
  probe('thien_co', (t, b) => assert.ok(t.daoPreview > b.dao))
  probe('than_nhe', (t, b) => assert.ok(t.combat.speed > b.combat.speed && t.battlePerk.cd > 0))
  probe('bat_khuat', (t) => assert.ok(t.battlePerk.thorns > 0))
  probe('tong_su', (t) => assert.ok(t.discipleCtx().bonus > 0))
  probe('dan_dao', (t) => assert.ok(t.extraPerk.pill > 0 && t.extraPerk.double > 0))
  probe('tri_tue', (t) => {
    t.arts.owned.pha_quan = 5
    const a1 = t.artBonus.atk
    t.talent = null
    assert.ok(a1 > t.artBonus.atk)
  })
})

ok('đổi bộ thiên phú tốn Đạo Vận, chỉ khi chưa chọn', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.rerollTalents(), false, 'chưa có Đạo Vận')
  s.reincarnation.dao = 10
  assert.equal(s.rerollTalents(), true)
  assert.equal(s.reincarnation.dao, 10 - TL.TALENT_REROLL_COST)
  assert.equal(s.talentOffer.length, 3)
  s.reincarnation.dao = 2
  assert.equal(s.rerollTalents(), false)
})

ok('luân hồi: thiên phú đã chọn mất, bốc bộ mới cho kiếp sau; save/load giữ thiên phú và lựa chọn, chặn dữ liệu lạ', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 12
  s.talentOffer = ['linh_can']
  s.chooseTalent('linh_can')
  s.reincarnate()
  assert.equal(s.talent, null)
  assert.equal(s.talentOffer.length, 3)
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.deepEqual([...s2.talentOffer], [...s.talentOffer])
  s2.talentOffer = ['kiem_cot', 'phu_quan', 'van_may']
  s2.chooseTalent('kiem_cot')
  s2.save()
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.talent, 'kiem_cot')
  assert.deepEqual(s3.talentOffer, [])
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.talent = 'hack'
  raw.data.talentOffer = ['linh_can', 'linh_can', 'khong_co', 'phu_quy', 'van_may', 'kiem_cot']
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s4 = freshStore(true)
  s4.init()
  assert.equal(s4.talent, null)
  assert.deepEqual([...s4.talentOffer], ['linh_can', 'phu_quy', 'van_may'], 'trùng và lạ bị loại, tối đa 3')
  // save cũ không có thiên phú: game bốc lựa chọn mới
  delete raw.data.talent
  delete raw.data.talentOffer
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s5 = freshStore(true)
  s5.init()
  assert.equal(s5.talentOffer.length, 3)
})

// =====================================================================
// Giai đoạn 3: cảnh giới mới, luân hồi, Linh Điền, khoáng mạch, farm offline
// =====================================================================
const RB = await import('../src/game/reincarnation.js')
const GD = await import('../src/game/garden.js')
const { STAGES, MAX_STAGE_IDX, TRIBULATIONS } = await import('../src/game/constants.js')
const { DUNGEONS, RECIPES, ITEMS, MONSTERS } = await import('../src/game/data.js')

ok('33 bậc tu vi, Độ Kiếp là cuối; thiên kiếp cho từng đại cảnh giới (trừ Luyện Khí và Độ Kiếp)', () => {
  assert.equal(STAGES.length, 33)
  assert.equal(MAX_STAGE_IDX, 32)
  assert.equal(STAGES[26].fullName, 'Hợp Thể Hậu Kỳ')
  assert.equal(STAGES[27].fullName, 'Đại Thừa Sơ Kỳ')
  assert.equal(STAGES[32].fullName, 'Độ Kiếp Hậu Kỳ')
  for (const realm of [1, 2, 3, 4, 5, 6, 7]) assert.ok(TRIBULATIONS[realm], 'thiếu thiên kiếp cho đại cảnh giới ' + realm)
  assert.equal(TRIBULATIONS[0], undefined)
  assert.equal(TRIBULATIONS[8], undefined)
  for (const cfg of Object.values(TRIBULATIONS)) assert.ok(cfg.bolts >= 3 && cfg.bolts <= 12)
  const bolts = (r) => TRIBULATIONS[r].base
  assert.ok(bolts(7) > bolts(6) && bolts(6) > bolts(5), 'thiên kiếp mạnh dần')
})

ok('dữ liệu nội dung nhất quán: vật phẩm, công thức, bí cảnh, trang bị mới', () => {
  for (const r of RECIPES) {
    assert.ok(ITEMS[r.id], 'đan ' + r.id)
    for (const id of Object.keys(r.ingredients)) assert.ok(ITEMS[id], 'nguyên liệu ' + id)
  }
  for (const d of DUNGEONS) {
    assert.ok(MONSTERS[d.boss].boss)
    for (const m of d.monsters) assert.ok(MONSTERS[m])
    for (const l of d.loot) assert.ok(ITEMS[l.item], 'rơi ' + l.item)
  }
  assert.equal(EQ.TIERS.length, DUNGEONS.length)
  assert.equal(EQ.FORGE.length, DUNGEONS.length)
  for (const f of EQ.FORGE) for (const id of Object.keys(f.ingredients)) assert.ok(ITEMS[id])
  for (const c of GD.CROPS) assert.ok(ITEMS[c.id])
})

ok('Nguyên Anh Hậu -> Hóa Thần kích hoạt thiên kiếp 9 đạo', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 17
  s.exp = s.requirement
  Math.random = () => 0
  s.breakthrough()
  assert.equal(s.tribulation.active, true)
  assert.equal(s.tribulation.total, 9)
  drainTimers()
  Math.random = realRandom
  assert.ok([17, 18].includes(s.stageIdx))
})

ok('luân hồi: cần Trúc Cơ, nhận Đạo Vận, đặt lại tiến trình nhưng giữ công pháp/trang bị', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.canReincarnate, false)
  assert.equal(s.reincarnate(), 0)
  s.stageIdx = 12
  s.arrayLevel = 7
  s.bonus.atk = 50
  s.spiritStones = new Decimal(999)
  s.addItem('herbs', 'linh_thao', 5)
  s.skills.owned.ngu_kiem = 2
  const g1 = EQ.generateItem('weapon', 0)
  s.addGear(g1)
  s.alchemy.level = 6
  const expected = RB.daoGain(12)
  assert.equal(expected, Math.floor(3 * Math.pow(1.4, 3)))
  assert.equal(s.reincarnate(), expected)
  assert.equal(s.stageIdx, 0)
  assert.equal(s.arrayLevel, 0)
  assert.equal(s.bonus.atk, 0)
  assert.ok(s.spiritStones.eq(0))
  assert.equal(s.itemCount('linh_thao'), 0)
  assert.equal(s.reincarnation.dao, expected)
  assert.equal(s.reincarnation.count, 1)
  assert.equal(s.stats.reincarnations, 1)
  assert.equal(s.skills.owned.ngu_kiem, 2)
  assert.equal(s.gear.bag.length, 1)
  assert.equal(s.alchemy.level, 6)
  assert.equal(s.stats.maxStage, 0)
})

ok('cường hoá Đạo Vận: mua tốn Đạo Vận, tăng linh khí / chỉ số / rơi đồ / giờ offline / Tụ Linh Trận khởi đầu', () => {
  const s = freshStore()
  s.init()
  s.reincarnation.dao = 1000
  const rate = s.expRate
  const atk = s.combat.atk
  assert.equal(s.buyPerk('tu_chat'), true)
  assert.ok(s.expRate.gt(rate))
  s.buyPerk('than_the')
  assert.ok(s.combat.atk > atk)
  s.buyPerk('phuc_duyen')
  assert.ok(Math.abs(s.lootLuck - 0.1) < 1e-9)
  s.buyPerk('bi_quan')
  assert.equal(s.offlineCap, OFFLINE_CAP_SECONDS + 3600)
  s.buyPerk('tuc_hue')
  s.stageIdx = 9
  s.reincarnate()
  assert.equal(s.arrayLevel, 3)
  assert.ok(s.reincarnation.dao < 1000 + RB.daoGain(9))
  // Hết Đạo Vận hoặc đủ cấp tối đa thì không mua được
  s.reincarnation.dao = 0
  assert.equal(s.buyPerk('tu_chat'), false)
  s.reincarnation.dao = 1e9
  for (let i = 0; i < 40; i++) s.buyPerk('thien_menh')
  assert.equal(s.reincarnation.upgrades.thien_menh, 4)
})

ok('Thiên Mệnh tối đa: căn cốt kiếp sau luôn là Thiên Linh Căn', () => {
  const s = freshStore()
  s.init()
  s.reincarnation.upgrades.thien_menh = 4
  for (let i = 0; i < 20; i++) {
    s.stageIdx = 9
    s.reincarnate()
    assert.equal(s.spiritRoot.id, 'thien')
  }
})

ok('Linh Điền: trồng tốn linh thạch, chưa chín thì không thu, chín thì nhận thảo dược', () => {
  const s = freshStore()
  s.init()
  s.spiritStones = new Decimal(100)
  assert.equal(GD.plotCount(0), 2)
  assert.equal(GD.plotCount(24), 6)
  assert.equal(s.plant(2, 'linh_thao'), false) // luống 3 chưa mở
  assert.equal(s.plant(0, 'tu_van_thao'), false) // chưa đủ bậc
  assert.equal(s.plant(0, 'linh_thao'), true)
  assert.equal(s.plant(0, 'linh_thao'), false) // luống đã có cây
  assert.ok(s.spiritStones.lt(100))
  assert.equal(s.harvest(0), 0) // chưa chín
  const later = Date.now() + 301 * 1000
  const n = s.harvest(0, later)
  assert.ok(n >= 4 && n <= 6)
  assert.equal(s.itemCount('linh_thao'), n)
  assert.equal(s.garden.plots[0], null)
  assert.equal(s.stats.harvests, 1)
  s.plant(0, 'linh_thao')
  s.plant(1, 'linh_thao')
  assert.equal(s.harvestAll(later + 400 * 1000), 2)
})

ok('khoáng mạch: tích luỹ theo giờ thật, tối đa 8 giờ, thu về túi', () => {
  const s = freshStore()
  s.init()
  const t0 = s.mineAt
  assert.equal(s.collectMine(t0 + 60 * 1000), 0) // chưa đủ 1 quặng
  const n = s.collectMine(t0 + 3600 * 1000)
  assert.equal(n, 20)
  assert.equal(s.itemCount('thiet_tinh'), 20)
  assert.equal(GD.mineAmount(0, 100 * 3600), 20 * 8) // chặn ở 8 giờ
  assert.equal(GD.mineInfo(24).ore, 'hon_don_tinh')
  s.stageIdx = 10
  assert.equal(GD.mineInfo(s.stageIdx).ore, 'huyen_thiet')
})

ok('save/load giữ Đạo Vận, cường hoá, Linh Điền, mốc khoáng mạch, bậc cao nhất', () => {
  const s = freshStore()
  s.init()
  s.reincarnation = { count: 2, dao: 17, totalDao: 40, upgrades: { tu_chat: 3, khong_co: 9 } }
  s.stats.maxStage = 14
  s.spiritStones = new Decimal(100)
  s.plant(1, 'linh_thao')
  s.mineAt = Date.now() - 5000
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.reincarnation.dao, 17)
  assert.equal(s2.reincarnation.count, 2)
  assert.deepEqual(s2.reincarnation.upgrades, { tu_chat: 3 }) // cường hoá lạ bị loại
  assert.equal(s2.stats.maxStage, 14)
  assert.equal(s2.garden.plots[1].crop, 'linh_thao')
  assert.equal(s2.garden.plots.length, GD.MAX_PLOTS)
  assert.ok(Math.abs(s2.mineAt - s.mineAt) < 1)
})

// =====================================================================
// Làm mềm độ khó: Kiên Trì, độ lệch chỉ số yêu thú
// =====================================================================
const BT = await import('../src/game/battle.js')

ok('chỉ số yêu thú: không rng thì cố định, có rng thì lệch trong ±ENEMY_SPREAD', () => {
  const d = DUNGEONS[1]
  const tmpl = MONSTERS[d.monsters[0]]
  const fixed = BT.enemyStats(d, tmpl, 3)
  assert.deepEqual(BT.enemyStats(d, tmpl, 3), fixed)
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < 400; i++) {
    const e = BT.enemyStats(d, tmpl, 3, Math.random)
    lo = Math.min(lo, e.hp / fixed.hp)
    hi = Math.max(hi, e.hp / fixed.hp)
    assert.equal(e.def, fixed.def)
  }
  assert.ok(lo >= 1 - BT.ENEMY_SPREAD - 0.01 && hi <= 1 + BT.ENEMY_SPREAD + 0.01)
  assert.ok(hi - lo > BT.ENEMY_SPREAD) // thực sự có dao động
})

// =====================================================================
// Hình ảnh & âm thanh: chủ đề bí cảnh, cài đặt âm thanh
// =====================================================================
const AUD = await import('../src/game/audio.js')
const { THEMES } = await import('../src/pixi/themes.js')

ok('âm thanh: không có trình duyệt thì mọi hàm là no-op, không ném lỗi', () => {
  assert.equal(AUD.initAudio(), false)
  AUD.unlockAudio()
  AUD.setAudioPrefs({ sfx: false, music: false })
  AUD.setMusicMode('battle')
  for (const fn of Object.values(AUD.sfx)) fn()
})

ok('mỗi bí cảnh đều có chủ đề hình ảnh hợp lệ', () => {
  for (const d of DUNGEONS) {
    const th = THEMES[d.id]
    assert.ok(th, 'thiếu chủ đề ' + d.id)
    assert.equal(th.sky.length, 3)
    assert.ok(['trees', 'cave', 'ice', 'ghost', 'magma', 'void'].includes(th.decor))
    assert.ok(['leaves', 'spores', 'embers', 'snow', 'wisps', 'stars'].includes(th.ambient.kind))
  }
})

ok('cài đặt âm thanh/nhạc mặc định bật và được lưu', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.settings.sound, true)
  assert.equal(s.settings.music, true)
  s.settings.music = false
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.settings.music, false)
  assert.equal(s2.settings.sound, true)
})

// =====================================================================
// Chiều sâu lối chơi: tông môn, nhiệm vụ, đệ tử
// =====================================================================
const SC = await import('../src/game/sect.js')
const QS = await import('../src/game/quests.js')
const DS = await import('../src/game/disciples.js')

ok('tông môn: gia nhập, đặc quyền theo hệ, chỉ nhận Cống Hiến khi đã có tông môn', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.addContribution(50), 0)
  const atk = s.combat.atk
  assert.equal(s.joinSect('thien_kiem'), true)
  assert.ok(s.combat.atk > atk, 'Thiên Kiếm Tông tăng công kích')
  assert.equal(s.joinSect('thien_kiem'), false)
  assert.equal(s.addContribution(50), 50)
  assert.equal(s.sect.contribution, 50)
  assert.equal(s.rankIdx, 0)
  s.addContribution(60)
  assert.equal(s.rankIdx, 1) // 110 tổng >= 100
  // Tăng cấp bậc làm đặc quyền mạnh hơn
  assert.ok(s.sectPerk.atk > 0.1)
})

ok('tông môn: mỗi hệ có đặc quyền đúng loại (exp, hp/def, kỹ năng, thảo dược)', () => {
  const s = freshStore()
  s.init()
  const rate = s.expRate
  s.joinSect('nguyet_thuy')
  assert.ok(s.expRate.gt(rate))
  const hp = s.combat.hp
  s.joinSect('hau_tho')
  assert.ok(s.combat.hp > hp)
  s.joinSect('xich_viem')
  assert.ok(s.sectPerk.skill > 0)
  s.joinSect('van_moc')
  assert.ok(s.sectPerk.herb > 0)
})

ok('tông môn: đổi tông môn mất 50% Cống Hiến; cửa hàng cần cấp bậc và Cống Hiến', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.buyShop('hoi_huyet'), false) // chưa có tông môn
  s.joinSect('van_moc')
  s.addContribution(30)
  assert.equal(s.buyShop('duong_the'), false) // cần Nội Môn (rank 1)
  assert.equal(s.buyShop('hoi_huyet'), true)
  assert.equal(s.itemCount('hoi_huyet_dan'), 3)
  assert.equal(s.sect.contribution, 30 - 8)
  s.addContribution(100) // đủ Nội Môn
  assert.equal(s.buyShop('duong_the'), true)
  const before = s.sect.contribution
  s.joinSect('hau_tho')
  assert.equal(s.sect.contribution, Math.floor(before * (1 - SC.SWITCH_PENALTY)))
  assert.equal(s.sect.id, 'hau_tho')
  for (const e of SC.SHOP) assert.ok(ITEMS[e.item], 'cửa hàng bán vật phẩm không tồn tại: ' + e.item)
})

ok('nhiệm vụ: bảng đủ 4 nhiệm vụ khác mẫu, tiến độ đo từ lúc nhận, nhận thưởng thì có nhiệm vụ mới', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.quests.length, QS.BOARD_SIZE)
  assert.equal(new Set(s.quests.map((q) => q.tpl)).size, QS.BOARD_SIZE)
  const q = s.quests[0]
  assert.equal(s.questProgress(q), 0)
  assert.equal(s.claimQuest(q.uid), false)
  s.stats[QS.templateById(q.tpl).key] += q.target // giả lập đã làm đủ
  if (QS.templateById(q.tpl).key === 'aiRecord') s.campaign.record = q.target + 5
  assert.equal(s.questDone(q), true)
  const stones = s.spiritStones
  assert.equal(s.claimQuest(q.uid), true)
  assert.ok(s.spiritStones.gt(stones))
  assert.equal(s.quests.length, QS.BOARD_SIZE)
  assert.ok(!s.quests.some((x) => x.uid === q.uid))
  assert.equal(s.stats.questsDone, 1)
})

ok('nhiệm vụ: thưởng Cống Hiến cho người có tông môn; làm mới tốn linh thạch, giữ nhiệm vụ đã xong', () => {
  const s = freshStore()
  s.init()
  s.joinSect('van_moc')
  const q = s.quests[0]
  s.stats[QS.templateById(q.tpl).key] += q.target
  if (QS.templateById(q.tpl).key === 'aiRecord') s.campaign.record = q.target + 5
  s.claimQuest(q.uid)
  assert.ok(s.sect.contribution > 0)
  const done = s.quests[1]
  s.stats[QS.templateById(done.tpl).key] += done.target
  if (QS.templateById(done.tpl).key === 'aiRecord') s.campaign.record = done.target + 50
  s.spiritStones = new Decimal(0)
  assert.equal(s.refreshQuests(), false) // chưa đủ linh thạch
  s.spiritStones = new Decimal(1e6)
  assert.equal(s.refreshQuests(), true)
  assert.ok(s.quests.some((x) => x.uid === done.uid), 'nhiệm vụ đã xong được giữ lại')
  assert.equal(s.quests.length, QS.BOARD_SIZE)
  assert.ok(s.spiritStones.lt(1e6))
})

ok('nhiệm vụ: mục tiêu tăng theo tu vi, độ khó cao thưởng nhiều hơn', () => {
  const tpl = QS.templateById('kills')
  assert.ok(QS.questTarget(tpl, 0, 20) > QS.questTarget(tpl, 0, 0))
  assert.ok(QS.questTarget(tpl, 2, 5) > QS.questTarget(tpl, 0, 5))
  assert.ok(QS.questReward(2, 5).contribution > QS.questReward(0, 5).contribution)
  assert.ok(QS.questReward(2, 5, () => 0).effects.some((e) => e.type === 'item'))
  assert.ok(!QS.questReward(0, 5).effects.some((e) => e.type === 'item'))
})

ok('luân hồi làm mới nhiệm vụ nhưng giữ tông môn và đệ tử', () => {
  const s = freshStore()
  s.init()
  s.joinSect('thien_kiem')
  s.addContribution(70)
  s.stageIdx = 10
  s.spiritStones = new Decimal(1e9)
  s.recruit()
  const oldUids = s.quests.map((q) => q.uid)
  s.reincarnate()
  assert.equal(s.sect.id, 'thien_kiem')
  assert.equal(s.sect.total, 70)
  assert.equal(s.disciples.length, 1)
  assert.equal(s.quests.length, QS.BOARD_SIZE)
  assert.ok(s.quests.every((q) => !oldUids.includes(q.uid)))
})

ok('đệ tử: thu nhận tốn linh thạch tăng dần, giới hạn theo tông môn', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.discipleLimit, 2)
  assert.equal(s.recruit(), null) // không đủ linh thạch
  s.spiritStones = new Decimal(1e12)
  const c0 = DS.recruitCost(s.stageIdx, 0)
  const c1 = DS.recruitCost(s.stageIdx, 1)
  assert.ok(c1.gt(c0))
  assert.ok(s.recruit())
  assert.ok(s.recruit())
  assert.equal(s.recruit(), null) // đã đủ 2
  s.joinSect('hau_tho')
  assert.equal(s.discipleLimit, 3)
  assert.ok(s.recruit())
})

ok('đệ tử: giao việc, tích luỹ theo giờ thật, thu hoạch giữ phần lẻ, chặn 8 giờ', () => {
  const s = freshStore()
  s.init()
  s.spiritStones = new Decimal(1e12)
  const d = s.recruit()
  const t0 = d.since
  assert.equal(s.assignJob(d.uid, 'herb', t0), true)
  assert.equal(s.collectDisciple(d.uid, t0 + 60 * 1000), false) // 1 phút: chưa đủ 1 thảo dược
  const per = DS.outputPerHour(d, s.stageIdx, s.discipleCtx()).perHour
  const hours = 3
  assert.equal(s.collectDisciple(d.uid, t0 + hours * 3600 * 1000), true)
  const got = s.itemCount('linh_thao')
  assert.equal(got, Math.floor(per * hours))
  // phần lẻ vẫn còn: mốc since lùi lại thay vì về "bây giờ"
  assert.ok(d.since <= t0 + hours * 3600 * 1000)
  assert.ok(DS.pending(d, s.stageIdx, s.discipleCtx(), t0 + hours * 3600 * 1000).amount < 1)
  // chặn 8 giờ
  s.assignJob(d.uid, 'herb', t0)
  const r = DS.collectResult(d, s.stageIdx, s.discipleCtx(), t0 + 100 * 3600 * 1000)
  assert.equal(r.amount, Math.floor(per * 8))
})

ok('đệ tử: Trấn Thủ thu linh thạch, Khai Khoáng thu quặng hợp bậc, đổi việc chốt sản lượng cũ', () => {
  const s = freshStore()
  s.init()
  s.spiritStones = new Decimal(1e12)
  const d = s.recruit()
  const t0 = d.since
  s.assignJob(d.uid, 'guard', t0)
  const before = s.spiritStones
  assert.equal(s.collectDisciple(d.uid, t0 + 3600 * 1000), true)
  assert.ok(s.spiritStones.gt(before))
  s.assignJob(d.uid, 'ore', t0 + 3600 * 1000)
  assert.equal(s.collectDisciple(d.uid, t0 + 3 * 3600 * 1000), true)
  assert.ok(s.itemCount('thiet_tinh') > 0)
  // đổi việc sau 2 giờ làm quặng: thu phần quặng trước khi đổi
  const ore = s.itemCount('thiet_tinh')
  s.assignJob(d.uid, 'herb', t0 + 5 * 3600 * 1000)
  assert.ok(s.itemCount('thiet_tinh') > ore)
})

ok('đệ tử: phẩm cấp, cấp độ và cùng hệ tông môn tăng sản lượng; nâng cấp có trần theo tu vi', () => {
  const s = freshStore()
  s.init()
  const base = { uid: 'x', name: 'A', element: 'kim', grade: 0, level: 1, job: 'herb', since: 0 }
  const lv5 = DS.discipleMult({ ...base, level: 5 }, null)
  assert.ok(lv5 > DS.discipleMult(base, null))
  assert.ok(DS.discipleMult({ ...base, grade: 3 }, null) > DS.discipleMult(base, null))
  assert.ok(DS.discipleMult(base, 'kim') > DS.discipleMult(base, 'hoa')) // cùng hệ +10%
  // nâng cấp
  s.spiritStones = new Decimal(1e12)
  const d = s.recruit()
  assert.equal(s.levelUpDisciple(d.uid), true)
  assert.equal(d.level, 2)
  while (s.levelUpDisciple(d.uid));
  assert.equal(d.level, DS.levelCap(s.stageIdx))
  assert.equal(s.levelUpDisciple(d.uid), false)
})

ok('đệ tử: save/load giữ đệ tử và mốc thời gian (tích luỹ cả khi offline)', () => {
  const s = freshStore()
  s.init()
  s.spiritStones = new Decimal(1e12)
  const d = s.recruit()
  s.assignJob(d.uid, 'herb', Date.now() - 4 * 3600 * 1000)
  s.joinSect('van_moc')
  s.addContribution(33)
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.disciples.length, 1)
  assert.equal(s2.disciples[0].job, 'herb')
  assert.equal(s2.sect.id, 'van_moc')
  assert.equal(s2.sect.contribution, 33)
  assert.equal(s2.quests.length, QS.BOARD_SIZE)
  assert.ok(DS.pending(s2.disciples[0], s2.stageIdx, s2.discipleCtx(), Date.now()).amount >= 1)
})

ok('nhập save hỏng: bỏ tông môn / nhiệm vụ / đệ tử không hợp lệ', () => {
  const s = freshStore()
  s.init()
  const save = serialize(s)
  save.data.sect = { id: 'khong_co', contribution: -5, total: 'x' }
  save.data.quests = [{ uid: 'a', tpl: 'khong_co', tier: 0, target: 1, start: 0 }, { uid: 'b', tpl: 'kills', tier: 9, target: 1, start: 0 }, { uid: 'c', tpl: 'kills', tier: 1, target: 8, start: 3 }, null]
  save.data.disciples = [{ uid: 'd1', name: 'Hợp lệ', element: 'kim', grade: 1, level: 999, job: 'khong_co', since: 5 }, { uid: 'd2', element: 'x', grade: 0 }, { uid: 'd1', element: 'kim', grade: 0 }]
  const patch = deserialize(save, { element: 'kim', spiritRoot: {}, name: 'n', createdAt: 1 })
  assert.equal(patch.sect.id, null)
  assert.equal(patch.sect.contribution, 0)
  assert.deepEqual(patch.quests.map((q) => q.uid), ['c'])
  assert.equal(patch.disciples.length, 1)
  assert.equal(patch.disciples[0].level, DS.MAX_LEVEL)
  assert.equal(patch.disciples[0].job, null)
})

ok('hạ boss cộng Cống Hiến cho tông môn; công pháp sát thương mạnh hơn với Xích Viêm Môn', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 7
  s.joinSect('xich_viem')
  s.skills.owned.liet_hoa = 1
  s.skills.slots[0] = 'liet_hoa'
  s.campaign.best = 4
  s.campaign.record = 4
  runFor(s, 20)
  assert.ok(s.campaign.best >= 5)
  assert.ok(s.sect.contribution > 0)
  assert.ok(s.stats.bossKills >= 1)
})

// =====================================================================
// Cốt truyện & Điển Tịch
// =====================================================================
const STORY = await import('../src/game/story.js')
const LOREM = await import('../src/game/lore.js')

/** Chơi hết trình đọc truyện đang mở: luôn chọn phương án đầu tiên dùng được (hoặc `pick` nếu có). */
function playStory(s, { name = 'Tiểu Hạc', pick = null } = {}) {
  let guard = 0
  const texts = []
  while (s.storyView && guard++ < 200) {
    const sc = s.storyCurrent()
    if (s.storyView.phase === 'result') {
      s.storyAdvance()
    } else if (sc.input) {
      s.storySetName(name)
    } else if (sc.choice) {
      const idx = pick && pick[sc.choice.prompt.slice(0, 20)] !== undefined ? pick[sc.choice.prompt.slice(0, 20)] : sc.choice.options.findIndex((o) => s.optionAvailable(o))
      assert.ok(s.storyChoose(idx), 'chọn được phương án')
    } else {
      texts.push(sc.speaker ? sc.speaker + ': ' + sc.text : sc.text)
      s.storyAdvance()
    }
  }
  assert.ok(guard < 200, 'truyện phải kết thúc')
  return texts
}
const enableStory = (s) => { s.checkStory = s.realCheckStory }

ok('dữ liệu cốt truyện nhất quán: cảnh, lựa chọn, hiệu ứng, cờ, điển tịch, bí cảnh', () => {
  const effectTypes = ['exp', 'expLoss', 'stones', 'item', 'stat', 'expBonus']
  const setFlags = new Set()
  for (const ch of [...STORY.CHAPTERS, ...STORY.EXTRAS]) for (const sc of ch.scenes) for (const o of sc.choice?.options ?? []) if (o.flag) setFlags.add(o.flag)
  let prevMin = -1
  assert.equal(STORY.CHAPTERS.length, 11)
  assert.equal(STORY.CHAPTERS.filter((c) => c.id.startsWith('ch')).length, 11)
  for (const ch of STORY.CHAPTERS) {
    assert.ok(ch.title && ch.hint && ch.scenes.length >= 3, ch.id)
    assert.ok(ch.minStage >= prevMin, 'chương phải xếp theo bậc ' + ch.id)
    prevMin = ch.minStage
    if (ch.needClear) assert.ok(DUNGEONS.some((d) => d.id === ch.needClear), ch.needClear)
    for (const id of ch.unlock ?? []) assert.ok(LOREM.loreById(id), 'mục điển tịch không tồn tại: ' + id)
    for (const fx of ch.reward ?? []) { assert.ok(effectTypes.includes(fx.type)); if (fx.type === 'item') assert.ok(ITEMS[fx.id]) }
    for (const sc of ch.scenes) {
      assert.ok(sc.text || sc.choice, ch.id)
      for (const f of [].concat(sc.if ?? [], sc.unless ?? [])) assert.ok(setFlags.has(f), `cờ ${f} chưa từng được đặt (${ch.id})`)
      for (const o of sc.choice?.options ?? []) {
        assert.ok(o.label && o.result, ch.id)
        if (o.requires?.flag) assert.ok(setFlags.has(o.requires.flag))
        if (o.ending) assert.ok(STORY.ENDINGS[o.ending])
        for (const fx of o.effects ?? []) { assert.ok(effectTypes.includes(fx.type)); if (fx.type === 'item') assert.ok(ITEMS[fx.id]) }
      }
    }
  }
})

ok('điển tịch: mục nào cũng có điều kiện mở hợp lệ, id duy nhất, phân loại đúng', () => {
  const ids = new Set()
  const chapterUnlocks = new Set(STORY.CHAPTERS.flatMap((c) => c.unlock ?? []).concat(STORY.EXTRAS.flatMap((c) => c.unlock ?? [])))
  for (const e of LOREM.LORE) {
    assert.ok(!ids.has(e.id), 'trùng id ' + e.id)
    ids.add(e.id)
    assert.ok(LOREM.LORE_CATS.includes(e.cat), e.id)
    assert.ok(e.title && e.text.length > 40, e.id)
    assert.ok(e.auto || chapterUnlocks.has(e.id), 'mục không có cách mở: ' + e.id)
    if (!e.auto) assert.ok(e.hint, 'mục mở bằng chương cần gợi ý: ' + e.id)
    if (e.auto?.dungeon) assert.ok(DUNGEONS.some((d) => d.id === e.auto.dungeon))
  }
})

ok('chương mở đầu tự bật khi bắt đầu game; nhập tên, chọn động cơ, nhận thưởng', () => {
  const s = freshStore()
  s.init()
  enableStory(s)
  s.checkStory()
  assert.ok(s.storyView, 'chương 0 tự mở')
  assert.equal(s.storyView.id, 'ch0')
  playStory(s, { name: 'Vân Du' })
  assert.equal(s.storyView, null)
  assert.equal(s.name, 'Vân Du')
  assert.equal(s.story.done, 1)
  assert.ok(s.story.flags.motive_life)
  assert.ok(s.story.lore.char_thanh_hu)
  assert.ok(s.itemCount('tu_khi_dan') >= 2)
  s.checkStory()
  assert.equal(s.storyView, null, 'chương kế chưa đủ điều kiện')
})

ok('cổng chương: cần đủ bậc; chương bí cảnh cần thông quan', () => {
  const s = freshStore()
  s.init()
  s.story.done = 1
  assert.equal(s.chapterAvailable(STORY.CHAPTERS[1]), false)
  s.stageIdx = 3
  assert.equal(s.chapterAvailable(STORY.CHAPTERS[1]), true)
  s.story.done = 2
  s.stageIdx = 5
  assert.equal(s.chapterAvailable(STORY.CHAPTERS[2]), false)
  assert.match(s.chapterLock(STORY.CHAPTERS[2]), /Hắc Phong/)
  s.campaign.record = 10 // vượt chương 1 (Hắc Phong Cốc)
  assert.equal(s.chapterAvailable(STORY.CHAPTERS[2]), true)
  // sau luân hồi, bí cảnh bị xoá nhưng tu vi tối đa đã vượt xa thì không kẹt truyện
  s.campaign.record = 0
  s.stats.maxStage = 12
  assert.equal(s.chapterAvailable(STORY.CHAPTERS[2]), false, 'chưa luân hồi thì vẫn phải thông quan')
  s.stats.reincarnations = 1
  assert.equal(s.chapterAvailable(STORY.CHAPTERS[2]), true)
})

ok('cảnh có điều kiện cờ: chỉ hiện đúng nhánh đối thủ', () => {
  const s = freshStore()
  s.init()
  const run = (flag) => {
    s.story.flags = { [flag]: true }
    s.story.done = 5
    s.stageIdx = 12
    s.startStory('ch5')
    const texts = playStory(s)
    return texts.filter((t) => t.startsWith('Mặc Vô Ngân:'))
  }
  const friend = run('rival_friend')
  const cold = run('rival_cold')
  assert.equal(friend.length, 1)
  assert.equal(cold.length, 1)
  assert.notEqual(friend[0], cold[0])
})

ok('lựa chọn: đặt cờ, chỉnh Nhân Tâm, thưởng chỉ số; phương án bị khoá khi thiếu điều kiện', () => {
  const s = freshStore()
  s.init()
  s.startStory('ch4')
  let sc = s.storyCurrent()
  while (!sc.choice) { s.storyAdvance(); sc = s.storyCurrent() }
  const hp = s.bonus.hp
  assert.ok(s.storyChoose(0))
  assert.ok(s.story.flags.spared_child)
  assert.equal(s.story.align, 2)
  assert.ok(s.bonus.hp > hp)
  assert.equal(s.storyChoose(1), false, 'không chọn lại khi đang xem kết quả')
  s.storyView = null
  // Kết cục Siêu Thoát cần Nhân Tâm >= 4 và ký ức
  const ch = STORY.CHAPTERS[10]
  const opt = ch.scenes.find((x) => x.choice).choice.options[2]
  s.story.align = 3
  s.story.flags = { memory_accepted: true }
  assert.equal(s.optionAvailable(opt), false)
  assert.match(s.optionLock(opt), /Nhân Tâm/)
  s.story.align = 4
  assert.equal(s.optionAvailable(opt), true)
  s.story.flags = {}
  assert.equal(s.optionAvailable(opt), false)
})

ok('chơi trọn 11 chương (mở đầu + 10): kết cục, danh hiệu, điển tịch, thành tựu thưởng', () => {
  const s = freshStore()
  s.init()
  enableStory(s)
  s.stageIdx = 26
  s.stats.maxStage = 26
  s.campaign.record = DUNGEONS.length * 10
  for (let i = 0; i < 14 && s.story.done < 11; i++) {
    s.checkStory()
    assert.ok(s.storyView, 'chương ' + s.story.done + ' phải tự mở')
    playStory(s)
  }
  assert.equal(s.story.done, 11)
  assert.equal(s.story.ending, 'guardian')
  assert.equal(s.story.title, 'Thủ Hộ Giả')
  assert.ok(s.story.lore.world_ket_cuc)
  assert.ok(s.loreUnread > 0)
  // chương chuyển thế chỉ mở sau khi luân hồi
  s.checkStory()
  assert.equal(s.storyView, null)
})

ok('kết cục Siêu Thoát: đủ Nhân Tâm và ký ức thì chọn được và nhận danh hiệu', () => {
  const s = freshStore()
  s.init()
  s.story.done = 10
  s.story.align = 6
  s.story.flags = { memory_accepted: true }
  s.stageIdx = 26
  s.startStory('ch10')
  playStory(s, { pick: { 'Ba con đường mở ra t': 2 } })
  assert.equal(s.story.ending, 'ascend')
  assert.equal(s.story.title, 'Tân Đạo Tổ')
  assert.equal(s.story.done, 11)
})

ok('đọc lại chương: không thưởng, không đổi cờ, không tăng tiến độ', () => {
  const s = freshStore()
  s.init()
  s.story.done = 3
  s.story.flags = { motive_life: true }
  assert.equal(s.startStory('ch5', true), false, 'chưa đọc tới thì không đọc lại được')
  assert.equal(s.startStory('ch0', true), true)
  const stones = s.spiritStones
  const name = s.name
  playStory(s, { name: 'KhacTen' })
  assert.equal(s.name, name)
  assert.ok(s.spiritStones.eq(stones))
  assert.equal(s.story.done, 3)
  assert.deepEqual(Object.keys(s.story.flags), ['motive_life'])
})

ok('chương phụ Chuyển Thế chỉ mở sau luân hồi và chỉ một lần', () => {
  const s = freshStore()
  s.init()
  enableStory(s)
  s.story.done = 99 // coi như đã hết truyện chính
  s.checkStory()
  assert.equal(s.storyView, null)
  s.stageIdx = 10
  s.reincarnate()
  s.checkStory()
  assert.equal(s.storyView?.id, 'rebirth')
  playStory(s)
  assert.ok(s.story.extras.rebirth)
  s.checkStory()
  assert.equal(s.storyView, null)
  assert.equal(s.chapterDone('rebirth'), true)
})

ok('truyện đang mở tạm dừng chiến đấu và kỳ ngộ; xong thì chạy lại', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 8
  const b = useBattleStore()
  b.start()
  const clock = b.clock
  s.startStory('ch0')
  for (let i = 0; i < 50; i++) s.tick(0.1)
  assert.equal(b.clock, clock, 'chiến đấu bị dừng')
  s.triggerEvent()
  assert.equal(s.event, null, 'không bật kỳ ngộ khi đang đọc truyện')
  s.storyView = null
  for (let i = 0; i < 10; i++) s.tick(0.1)
  assert.ok(b.clock > clock)
})

ok('Điển Tịch: mục mở theo bậc/bí cảnh/tông môn/chương; đánh dấu đã đọc', () => {
  const s = freshStore()
  s.init()
  const by = (id) => LOREM.loreById(id)
  assert.equal(s.loreUnlocked(by('realm_luyen_khi')), true)
  assert.equal(s.loreUnlocked(by('realm_kim_dan')), false)
  s.stats.maxStage = 12
  assert.equal(s.loreUnlocked(by('realm_kim_dan')), true)
  assert.equal(s.loreUnlocked(by('dungeon_hac_phong')), true) // tu vi đã vượt xa bậc chuẩn
  assert.equal(s.loreUnlocked(by('dungeon_ma_uyen')), false)
  assert.equal(s.loreUnlocked(by('sect_join')), false)
  s.joinSect('van_moc')
  assert.equal(s.loreUnlocked(by('sect_join')), true)
  assert.equal(s.loreUnlocked(by('char_thanh_hu')), false)
  s.story.lore.char_thanh_hu = true
  assert.equal(s.loreUnlocked(by('char_thanh_hu')), true)
  const unread = s.loreUnread
  s.markLoreSeen('char_thanh_hu')
  assert.equal(s.loreUnread, unread - 1)
  s.story.flags.spared_child = true
  assert.equal(s.loreUnlocked(by('char_a_tu')), true)
})

ok('lời dẫn cảnh giới xuất hiện khi lên đại cảnh giới', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 8
  s.exp = s.requirement
  Math.random = () => 0
  s.breakthrough()
  Math.random = realRandom
  assert.equal(s.stageIdx, 9)
  assert.ok(s.log.some((l) => l.text.startsWith('Trúc Cơ:')))
})

ok('save/load giữ cốt truyện; save hỏng bị lọc', () => {
  const s = freshStore()
  s.init()
  s.story.done = 4
  s.story.flags = { spared_child: true, rival_friend: true }
  s.story.align = 3
  s.story.lore = { char_thanh_hu: true }
  s.story.seen = { char_thanh_hu: true }
  s.story.ending = 'ascend'
  s.story.title = 'Tân Đạo Tổ'
  s.name = 'Lưu Tên'
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.story.done, 4)
  assert.equal(s2.story.flags.spared_child, true)
  assert.equal(s2.story.align, 3)
  assert.equal(s2.story.seen.char_thanh_hu, true)
  assert.equal(s2.story.title, 'Tân Đạo Tổ')
  assert.equal(s2.name, 'Lưu Tên')
  const save = serialize(s)
  save.data.story = { done: 999, flags: { ok_flag: true, 'BAD FLAG': true, x: 'yes' }, align: 500, extras: { khong_co: true, rebirth: true }, seen: { khong_co: true }, lore: { khong_co: true }, ending: 'ma_quai', title: 'Giả mạo' }
  const patch = deserialize(save, { element: 'kim', spiritRoot: {}, name: 'n', createdAt: 1 })
  assert.equal(patch.story.done, STORY.CHAPTERS.length)
  assert.deepEqual(Object.keys(patch.story.flags), ['ok_flag'])
  assert.equal(patch.story.align, 20)
  assert.deepEqual(Object.keys(patch.story.extras), ['rebirth'])
  assert.deepEqual(patch.story.lore, {})
  assert.equal(patch.story.ending, null)
  assert.equal(patch.story.title, null)
})

// =====================================================================
// Hình vẽ nhân vật & yêu thú (Graphics giả ghi lại lệnh vẽ)
// =====================================================================
const ART = await import('../src/pixi/art.js')
const makeGfx = () => {
  const calls = []
  const proxy = new Proxy(function () {}, {
    get: (_, name) => (name === 'calls' ? calls : (...args) => { calls.push([name, args]); return proxy }),
  })
  return proxy
}
const finite = (calls) => calls.every(([, args]) => args.every((a) => typeof a !== 'number' || Number.isFinite(a)))

ok('mọi kiểu quái trong dữ liệu đều có hình vẽ riêng', () => {
  const used = new Set(Object.values(MONSTERS).map((m) => m.kind))
  for (const k of used) assert.ok(ART.ENEMY_KINDS.includes(k), 'chưa có hình cho kiểu ' + k)
  // mỗi kiểu hình đều được dùng ít nhất một lần (không có hình thừa)
  for (const k of ART.ENEMY_KINDS) assert.ok(used.has(k), 'kiểu hình không dùng: ' + k)
  assert.ok(ART.ENEMY_KINDS.length >= 13)
})

ok('vẽ yêu thú: mọi kiểu, boss/thường, mọi mức tấn công, nhiều thời điểm đều ra lệnh vẽ hợp lệ', () => {
  for (const kind of ART.ENEMY_KINDS) {
    for (const boss of [false, true]) {
      for (const atk of [0, 0.5, 1]) {
        for (const t of [0, 0.37, 1.9, 7.3]) {
          const g = makeGfx()
          ART.drawEnemy(g, kind, 0x7a8399, boss, t, atk)
          assert.ok(g.calls.length >= 8, `${kind} vẽ quá ít (${g.calls.length})`)
          assert.ok(finite(g.calls), `${kind} có toạ độ không hợp lệ`)
        }
      }
    }
  }
  const g = makeGfx()
  ART.drawEnemy(g, 'khong_biet', 0xffffff, false, 1, 0) // kiểu lạ dùng hình mặc định
  assert.ok(g.calls.length > 0)
})

ok('hoạt ảnh quái: tấn công làm hình đổi so với lúc nghỉ', () => {
  for (const kind of ART.ENEMY_KINDS) {
    const rest = makeGfx()
    const hit = makeGfx()
    ART.drawEnemy(rest, kind, 0x7a8399, false, 1, 0)
    ART.drawEnemy(hit, kind, 0x7a8399, false, 1, 1)
    assert.notDeepEqual(rest.calls, hit.calls, kind + ' không đổi hình khi tấn công')
    const later = makeGfx()
    ART.drawEnemy(later, kind, 0x7a8399, false, 2.3, 0)
    assert.notDeepEqual(rest.calls, later.calls, kind + ' không có hoạt ảnh chờ')
  }
})

ok('nhân vật: trang phục mỗi đại cảnh giới khác nhau, vẽ đủ tư thế, mặt, kiếm và hiệu ứng', () => {
  assert.equal(ART.SKINS.length, 7)
  const bodies = new Set()
  for (let realm = 0; realm < 7; realm++) {
    for (const pose of ['meditate', 'sword']) {
      const b = makeGfx()
      ART.drawHeroBody(b, { pose, realmIdx: realm })
      assert.ok(b.calls.length > 20 && finite(b.calls))
      bodies.add(JSON.stringify(b.calls))
      for (const state of ['closed', 'open', 'glow', 'blink']) {
        const f = makeGfx()
        ART.drawHeroFace(f, { pose, state, glowColor: 0x7fe3ff })
        assert.ok(f.calls.length > 3 && finite(f.calls))
      }
      for (const fill of [0, 1]) {
        const fx = makeGfx()
        ART.drawHeroFx(fx, { t: 1.3, realmIdx: realm, pose, fill, color: 0xffffff })
        assert.ok(finite(fx.calls))
      }
    }
  }
  assert.equal(bodies.size, 14, 'mỗi (cảnh giới, tư thế) có hình riêng')
  // cảnh giới cao có hiệu ứng, Luyện Khí chưa đủ tu vi thì không
  const none = makeGfx()
  ART.drawHeroFx(none, { t: 1, realmIdx: 0, pose: 'meditate', fill: 0, color: 1 })
  assert.equal(none.calls.length, 0)
  const high = makeGfx()
  ART.drawHeroFx(high, { t: 1, realmIdx: 6, pose: 'meditate', fill: 0, color: 1 })
  assert.ok(high.calls.length > 20)
  // sẵn sàng đột phá thì có hào quang
  const ready = makeGfx()
  ART.drawHeroFx(ready, { t: 1, realmIdx: 0, pose: 'meditate', fill: 1, color: 1 })
  assert.ok(ready.calls.length > 0)
})

ok('kiếm đổi hình theo độ hiếm; mắt sáng khác mắt nhắm', () => {
  const shapes = new Set()
  for (const rarity of [null, 0, 1, 2, 3]) {
    const s = makeGfx()
    ART.drawSword(s, { rarity, trim: 0x7fe3ff })
    assert.ok(finite(s.calls))
    shapes.add(JSON.stringify(s.calls))
  }
  assert.ok(shapes.size >= 4, 'độ hiếm khác nhau cho kiếm khác nhau')
  const closed = makeGfx()
  const glow = makeGfx()
  ART.drawHeroFace(closed, { pose: 'meditate', state: 'closed' })
  ART.drawHeroFace(glow, { pose: 'meditate', state: 'glow', glowColor: 0xffd36b })
  assert.notDeepEqual(closed.calls, glow.calls)
})

ok('Bạch Linh: vẽ được với 1..9 đuôi, nhún nhảy, nhiều đuôi thì nhiều nét hơn', () => {
  let prev = 0
  for (let tails = 1; tails <= 9; tails++) {
    const g = makeGfx()
    ART.drawFox(g, { t: 2.1, tails, hop: 0.5, color: 0x7fe3ff })
    assert.ok(finite(g.calls))
    assert.ok(g.calls.length > prev, 'thêm đuôi phải thêm nét vẽ')
    prev = g.calls.length
  }
  const a = makeGfx()
  const b = makeGfx()
  ART.drawFox(a, { t: 1, tails: 3, hop: 0 })
  ART.drawFox(b, { t: 1, tails: 3, hop: 0.5 })
  assert.notDeepEqual(a.calls, b.calls)
})

// =====================================================================
// Cân bằng kinh tế: các "hàng rào" bảo vệ nhịp tiến triển (xem npm run econ)
// =====================================================================
const BAL = await import('../src/game/battle.js')
const { BALANCE, SPIRIT_ROOTS } = await import('../src/game/constants.js')

ok('nhịp gốc: cả game không tăng cường mất ít nhất 150 giờ (chống làm game quá nhanh vô tình; tổng tăng cường thực tế xem npm run econ)', () => {
  let seconds = 0
  for (let i = 0; i < MAX_STAGE_IDX; i++) {
    const rate = F.expPerSecond({ arrayLevel: 0, rootMult: 1, stageIdx: i, expBonus: 0 })
    seconds += F.stageRequirement(i).div(rate).toNumber()
  }
  assert.ok(seconds / 3600 > 150, `nhịp gốc chỉ ${(seconds / 3600).toFixed(0)} giờ`)
  })

ok('kháng đan: tổng hiệu quả cộng dồn của một loại đan là hữu hạn dù uống bao nhiêu', () => {
  assert.equal(F.usageFactor(0), 1)
  assert.ok(F.usageFactor(10) < F.usageFactor(5))
  let total = 0
  for (let i = 0; i < 5000; i++) total += F.usageFactor(i)
  assert.ok(total < 15, 'tổng cộng dồn ' + total.toFixed(1))
  const s = freshStore()
  s.init()
  s.addItem('pills', 'cuong_can_dan', 300)
  s.useItem('cuong_can_dan', 300)
  assert.ok(s.bonus.atk < 4 * 15 + 1, 'Cường Cân Đan không được vượt tổng hữu hạn: ' + s.bonus.atk)
  assert.ok(s.bonus.atk > 4 * 10)
})

ok('Tụ Linh Trận tăng tuyến tính (+10% mỗi cấp) và đắt dần để không vượt tầm kiểm soát', () => {
  const base = F.expPerSecond({ arrayLevel: 0, rootMult: 1, stageIdx: 5, expBonus: 0 })
  const l10 = F.expPerSecond({ arrayLevel: 10, rootMult: 1, stageIdx: 5, expBonus: 0 })
  const l40 = F.expPerSecond({ arrayLevel: 40, rootMult: 1, stageIdx: 5, expBonus: 0 })
  assert.ok(Math.abs(l10.div(base).toNumber() - 2) < 1e-9)
  assert.ok(Math.abs(l40.div(base).toNumber() - 5) < 1e-9)
  assert.ok(F.arrayUpgradeCost(40).div(F.arrayUpgradeCost(10)).toNumber() > 1e4)
})

ok('căn cốt: biên độ tốc độ giữa kiếp may nhất và kém nhất không quá 2.5 lần', () => {
  const ms = SPIRIT_ROOTS.map((r) => r.mult)
  assert.ok(Math.max(...ms) / Math.min(...ms) <= 2.5)
})

ok('nhiệm vụ và thành tựu theo ải: mẫu "Vượt thêm ải" đo kỷ lục, thành tựu Vượt Ải theo kỷ lục, nhiệm vụ cũ bị loại khi tải', () => {
  const s = freshStore()
  s.init()
  assert.equal(s.achievementValue('aiRecord'), 0)
  s.campaign.record = 35
  assert.equal(s.achievementValue('aiRecord'), 35)
  const ach = ACHIEVEMENTS.find((a) => a.id === 'clears')
  assert.equal(ach.key, 'aiRecord')
  assert.equal(s.achievementClaimable(ach), true)
  assert.equal(s.claimAchievement('clears'), true)
  assert.equal(s.claimAchievement('clears'), true) // mỗi lần nhận một mốc: mốc 10 rồi mốc 30
  assert.equal(s.achTier.clears, 2) // mốc 60 chưa đủ
  assert.equal(s.claimAchievement('clears'), false)
  // mẫu nhiệm vụ
  const tpl = QS.templateById('ai')
  assert.equal(tpl.key, 'aiRecord')
  assert.ok(!QS.templateById('clears'), 'mẫu thông quan bí cảnh đã bỏ')
  const quest = { uid: 'qx', tpl: 'ai', tier: 0, target: 3, start: s.achievementValue('aiRecord') }
  s.quests = [quest]
  assert.equal(s.questDone(quest), false)
  s.campaign.record += 3
  assert.equal(s.questDone(quest), true)
  // nhiệm vụ cũ (mẫu 'clears' hoặc 'click') trong save bị lọc, bảng được bù đủ
  s.quests = [quest, { uid: 'old1', tpl: 'clears', tier: 0, target: 1, start: 0 }, { uid: 'old2', tpl: 'click', tier: 0, target: 25, start: 0 }]
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.ok(!s2.quests.some((q) => q.tpl === 'clears' || q.tpl === 'click'))
  assert.equal(s2.quests.length, QS.BOARD_SIZE)
})

ok('Vượt Ải: thưởng linh khí và linh thạch giảm dần khi cày ải quá yếu so với tu vi, không giảm khi tu vi thấp hơn', () => {
  const n = 7 // bậc tương đương = 3
  const on = C.aiExpSeconds(n, 'normal', 3)
  assert.ok(on <= 6, 'mỗi quái thường cho tối đa vài giây sản lượng')
  assert.equal(C.aiExpSeconds(n, 'normal', 3 + C.OVERLEVEL_GRACE), on, 'chưa vượt ngưỡng ân hạn thì chưa giảm')
  assert.ok(C.aiExpSeconds(n, 'normal', 3 + C.OVERLEVEL_GRACE + 3) < on * 0.4)
  assert.equal(C.aiExpSeconds(n, 'normal', 0), on)
  const stone = C.aiStoneReward(n, 'normal', 3)
  assert.ok(C.aiStoneReward(n, 'normal', 3 + C.OVERLEVEL_GRACE + 4).lt(stone.mul(0.5)))
  assert.ok(C.aiStoneReward(n, 'mini', 3).gt(stone.mul(2)), 'boss thưởng nhiều hơn quái thường')
  assert.ok(C.aiContribution(1, 'normal') === 0 && C.aiContribution(5, 'mini') >= 1 && C.aiContribution(100, 'lord') > C.aiContribution(10, 'big'))
})

ok('trần phần thưởng linh khí: kỳ ngộ không vượt 0.8% yêu cầu, Tụ Khí Đan giảm dần khi dùng liên tiếp', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 10
  s.arrayLevel = 50 // sản lượng lớn để thử trần
  s.exp = new Decimal(0)
  s.applyEffects([{ type: 'exp', seconds: 1e9 }])
  assert.ok(s.exp.lte(s.requirement.mul(BALANCE.rewardExpCap * 1.0001)))
  // dùng liên tiếp 8 viên trong một bậc: tổng không quá ~25% yêu cầu
  s.exp = new Decimal(0)
  s.addItem('pills', 'tu_khi_dan', 8)
  let prev = new Decimal(0)
  const gains = []
  for (let i = 0; i < 8; i++) {
    s.useItem('tu_khi_dan')
    gains.push(s.exp.sub(prev).toNumber())
    prev = s.exp
  }
  assert.ok(gains[1] < gains[0] && gains[7] < gains[2], 'hiệu quả giảm dần')
  assert.ok(s.exp.lte(s.requirement.mul(0.3)), 'tổng 8 viên vượt 30% yêu cầu')
  // đột phá làm mới bộ đếm
  s.exp = s.requirement
  Math.random = () => 0
  s.breakthrough()
  Math.random = realRandom
  if (!s.tribulation.active) assert.equal(s.expPillUses, 0)
  drainTimers()
})

ok('đệ tử Trấn Thủ cho lượng linh thạch tương đương hàng chục lần hạ quái mỗi giờ (có ý nghĩa kinh tế)', () => {
  const d = DUNGEONS[2]
  const kill = C.aiStoneReward(2 * d.power + 1, 'normal', d.power) // ải cùng bậc với bậc đệ tử đang trấn thủ
  const disc = { uid: 'x', name: 'A', element: 'kim', grade: 0, level: 1, job: 'guard', since: 0 }
  const out = DS.outputPerHour(disc, d.power, {})
  assert.equal(out.kind, 'stones')
  const killsPerHour = out.perHour.div(kill).toNumber()
  assert.ok(killsPerHour >= 30 && killsPerHour <= 150, `tương đương ${killsPerHour.toFixed(0)} lần hạ quái/giờ`)
  const herb = DS.outputPerHour({ ...disc, job: 'herb' }, 0, {})
  assert.ok(herb.perHour >= 10)
})

ok('tự động đột phá: chỉ đột phá bậc nhỏ, dừng lại trước thiên kiếp', () => {
  const s = freshStore()
  s.init()
  s.settings.autoBreak = true
  Math.random = () => 0
  s.exp = s.requirement
  s.tick(0.1)
  assert.equal(s.stageIdx, 1, 'tự đột phá bậc nhỏ')
  s.stageIdx = 11 // Trúc Cơ Hậu Kỳ -> Kim Đan cần thiên kiếp
  s.exp = s.requirement
  s.tick(0.1)
  assert.equal(s.stageIdx, 11)
  assert.equal(s.tribulation.active, false)
  s.settings.autoBreak = false
  s.stageIdx = 2
  s.exp = s.requirement
  s.tick(0.1)
  assert.equal(s.stageIdx, 2, 'tắt tuỳ chọn thì không tự đột phá')
  Math.random = realRandom
  // lưu được tuỳ chọn
  s.settings.autoBreak = true
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.settings.autoBreak, true)
})

// =====================================================================
// Gợi ý việc nên làm (guide.js) - rút ra từ lần chơi thử
// =====================================================================
const { nextHints } = await import('../src/game/guide.js')
const fragmentId = SK.fragmentId
const { SCREENS, DEFAULT_SCREEN, hasCanvas } = await import('../src/game/screens.js')
const TAB_IDS = SCREENS.map((x) => x.id)
const ids = (s) => nextHints(s).map((h) => h.id)

ok('gợi ý: game mới chưa có gợi ý thừa; đủ linh khí thì nhắc đột phá, có thiên kiếp thì nhắc chuẩn bị', () => {
  const s = freshStore()
  s.init()
  assert.ok(ids(s).includes('talent'), 'game mới nhắc chọn thiên phú')
  s.chooseTalent(s.talentOffer[0])
  assert.deepEqual(ids(s), [])
  s.exp = s.requirement
  assert.equal(nextHints(s)[0].id, 'break')
  s.stageIdx = 11
  s.exp = s.requirement
  assert.equal(nextHints(s)[0].id, 'trib')
  assert.equal(nextHints(s)[0].tab, 'inventory')
})

ok('gợi ý: Vượt Ải, Tụ Linh Trận, luyện đan, Linh Điền biến mất khi người chơi đã làm', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 1
  assert.ok(!ids(s).includes('dungeon'), 'Tự chiến đấu mặc định bật nên không cần nhắc')
  s.settings.autoRepeat = false
  assert.ok(ids(s).includes('dungeon'))
  s.settings.autoRepeat = true
  assert.ok(!ids(s).includes('dungeon'))
  s.spiritStones = new Decimal(500)
  assert.ok(ids(s).includes('array'))
  assert.ok(ids(s).includes('garden'))
  s.upgradeArray()
  assert.ok(!ids(s).includes('array'))
  s.addItem('herbs', 'linh_thao', 6)
  assert.ok(ids(s).includes('craft'))
  s.craft('tu_khi_dan', 1)
  assert.ok(!ids(s).includes('craft'))
  s.plant(0, 'linh_thao')
  assert.ok(!ids(s).includes('garden'))
})

ok('gợi ý: đủ tàn quyển công pháp thì nhắc học', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 2
  s.addItem('scrolls', AR.artFragmentId('thanh_tam'), AR.ART_LEARN_COST)
  assert.ok(ids(s).includes('art'))
  s.learnArt('thanh_tam')
  assert.ok(!ids(s).includes('art'))
})

ok('gợi ý: nhắc chọn đạo lộ khi đạt Trúc Cơ, hết nhắc sau khi chọn', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 5
  assert.ok(!ids(s).includes('path'))
  s.stageIdx = 9
  assert.ok(ids(s).includes('path'))
  s.choosePath('tran')
  assert.ok(!ids(s).includes('path'))
})

ok('gợi ý: nhiệm vụ xong, thành tựu, tông môn, công pháp, trang bị, đệ tử, luân hồi', () => {
  const s = freshStore()
  s.init()
  s.stats.maxStage = 4
  s.stageIdx = 4
  assert.ok(ids(s).includes('sect'))
  s.joinSect('van_moc')
  assert.ok(!ids(s).includes('sect'))
  s.addItem('scrolls', fragmentId('ngu_kiem'), 5)
  assert.ok(ids(s).includes('skill'))
  s.learnSkill('ngu_kiem')
  assert.ok(!ids(s).includes('skill'))
  const it = EQ.generateItem('weapon', 0)
  s.addGear(it)
  assert.ok(ids(s).includes('gear'))
  s.equipGear(it.uid)
  assert.ok(!ids(s).includes('gear'))
  s.spiritStones = new Decimal(1e9)
  assert.ok(ids(s).includes('disciple'))
  s.recruit()
  assert.ok(!ids(s).includes('disciple'))
  s.stats.kills = 99
  s.stats.kills = 99
  s.stats.kills = 10
  const q = s.quests[0]
  s.stats[QS.templateById(q.tpl).key] += q.target
  if (QS.templateById(q.tpl).key === 'aiRecord') s.campaign.record = q.target + 5
  assert.ok(ids(s).includes('quest'))
  s.stageIdx = 32
  s.exp = s.requirement
  assert.ok(ids(s).includes('reborn'))
})

ok('gợi ý: mọi gợi ý trỏ tới tab có thật, có nội dung và id duy nhất', () => {
  const s = freshStore()
  s.init()
  // Dựng trạng thái thoả gần hết điều kiện để lấy được nhiều gợi ý cùng lúc
  s.stageIdx = 25
  s.stats.maxStage = 25
  s.exp = s.requirement
  s.spiritStones = new Decimal(1e9)
  s.addItem('herbs', 'linh_thao', 9)
  s.addItem('scrolls', fragmentId('liet_hoa'), 5)
  s.addGear(EQ.generateItem('armor', 0))
  const hints = nextHints(s)
  assert.ok(hints.length >= 4)
  assert.equal(new Set(hints.map((h) => h.id)).size, hints.length)
  for (const h of hints) {
    assert.ok(h.text.length > 10)
    if (h.tab) assert.ok(TAB_IDS.includes(h.tab), 'tab không tồn tại: ' + h.tab)
  }
  // thứ tự ưu tiên: đột phá luôn đứng đầu
  assert.ok(['break', 'trib'].includes(hints[0].id))
})

// 10. Định dạng số lớn
ok('fmt rút gọn số lớn', () => {
  assert.equal(fmt(12), '12')
  assert.equal(fmt(1234), '1.23K')
  assert.equal(fmt(new Decimal('5e30')), '5.00No')
  assert.match(fmt(new Decimal('1e100')), /e100$/)
})

// =====================================================================
// Màn hình theo tab (screens.js + uiStore)
// =====================================================================
const { useUiStore } = await import('../src/stores/uiStore.js')
ok('màn hình: 15 màn thuộc 5 nhóm, id duy nhất, chỉ Nhân Vật và Bí Cảnh có canvas', () => {
  assert.equal(SCREENS.length, 15)
  assert.equal(new Set(SCREENS.map((x) => x.id)).size, 15)
  assert.ok(SCREENS.every((x) => SCR.GROUPS.some((g) => g.id === x.group)), 'mỗi màn thuộc một nhóm có thật')
  assert.equal(SCR.GROUPS.length, 5)
  assert.deepEqual(SCREENS.filter((x) => hasCanvas(x.id)).map((x) => x.id), ['character', 'battle'])
  const s0 = freshStore(); s0.init()
  assert.deepEqual(SCR.unlockedGroups(s0).map((g) => g.id), ['tuluyen', 'vuotai', 'them'], 'game mới chỉ có 3 nhóm')
  assert.equal(SCR.groupOf('skills'), 'tuluyen')
  assert.equal(DEFAULT_SCREEN, 'character')
})
ok('uiStore: chuyển màn, bỏ qua id sai, ghi nhớ màn cuối', () => {
  setActivePinia(createPinia())
  const ui = useUiStore()
  assert.equal(ui.tab, 'character')
  assert.equal(ui.hasCanvas, true)
  ui.go('skills')
  assert.equal(ui.tab, 'skills')
  assert.equal(ui.hasCanvas, false)
  ui.go('khong_co')
  assert.equal(ui.tab, 'skills')
  ui.go('battle')
  assert.equal(ui.hasCanvas, true)
  setActivePinia(createPinia())
  assert.equal(useUiStore().tab, 'battle')
})

// =====================================================================
// Đại Thừa và Độ Kiếp (cảnh giới sau Hợp Thể)
// =====================================================================
ok('cảnh giới mới: yêu cầu đột phá tăng chậm hơn sau Hợp Thể nhưng vẫn tăng đều, thiên kiếp đúng bậc cuối đại cảnh giới', () => {
  const req = (i) => F.stageRequirement(i)
  for (let i = 1; i <= MAX_STAGE_IDX; i++) assert.ok(req(i).gt(req(i - 1)), 'yêu cầu tăng đều ở bậc ' + i)
  const before = req(26).div(req(25)).toNumber()
  const after = req(27).div(req(26)).toNumber()
  assert.ok(Math.abs(before - BALANCE.requirementGrowth) < 1e-6)
  assert.ok(Math.abs(after - BALANCE.postRequirementGrowth) < 1e-6)
  assert.ok(after < before)
  // thời gian mỗi bậc (không tăng cường) không phình vô lý ở các bậc cuối
  const t = (i) => req(i).div(F.expPerSecond({ arrayLevel: 0, rootMult: 1, stageIdx: i, expBonus: 0 })).toNumber()
  assert.ok(t(32) / t(26) < 3, 'sáu bậc cuối chỉ chậm thêm vài lần: ' + (t(32) / t(26)).toFixed(2))
  assert.equal(F.isMajorBreakthrough(26), true, 'Hợp Thể Hậu Kỳ nay còn đột phá được')
  assert.equal(F.isMajorBreakthrough(29), true, 'Đại Thừa Hậu Kỳ sang Độ Kiếp có thiên kiếp')
  assert.equal(F.isMajorBreakthrough(28), false)
  assert.equal(F.isMajorBreakthrough(32), false, 'bậc cuối không còn đột phá')
  assert.equal(F.tribulationFor(26).name, TRIBULATIONS[6].name)
  assert.equal(F.tribulationFor(29).name, TRIBULATIONS[7].name)
})

ok('đột phá từ Hợp Thể Hậu Kỳ lên Đại Thừa: phải độ thiên kiếp, qua thì lên bậc mới và đổi cảnh giới', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 26
  s.stats.maxStage = 26
  s.bonus.hp = 1e9 // trụ vững mọi đạo lôi
  s.bonus.def = 1e6
  s.exp = s.requirement
  assert.ok(s.nextTribulation, 'có thiên kiếp ở bậc này')
  assert.equal(s.nextStageName, 'Đại Thừa Sơ Kỳ')
  Math.random = () => 0
  s.breakthrough()
  assert.equal(s.tribulation.active, true)
  drainTimers()
  Math.random = realRandom
  assert.equal(s.stageIdx, 27)
  assert.equal(s.stage.realmName, 'Đại Thừa')
  assert.equal(s.realmIdx, 7)
  assert.equal(s.isMaxStage, false)
  // mở khoá điển tịch theo bậc
  assert.ok(s.loreUnlocked(LOREM.loreById('realm_dai_thua')))
  assert.ok(!s.loreUnlocked(LOREM.loreById('realm_do_kiep')))
  s.stats.maxStage = 30
  assert.ok(s.loreUnlocked(LOREM.loreById('realm_do_kiep')))
})

ok('đạt Độ Kiếp Hậu Kỳ là cực hạn; save giữ bậc mới và chặn bậc vượt quá; cảnh giới mới có lời dẫn và thưởng ô', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = MAX_STAGE_IDX
  s.exp = s.requirement
  assert.equal(s.isMaxStage, true)
  assert.equal(s.canBreakthrough, false)
  assert.equal(s.nextStageName, null)
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.stageIdx, MAX_STAGE_IDX)
  const raw = JSON.parse(mem.get(SAVE_KEY))
  raw.data.stageIdx = 999
  raw.data.stats.maxStage = 999
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const s3 = freshStore(true)
  s3.init()
  assert.equal(s3.stageIdx, MAX_STAGE_IDX)
  assert.equal(s3.stats.maxStage, MAX_STAGE_IDX)
  assert.equal(STORY.REALM_FLAVOR.length, CON9.REALMS?.length ?? 9)
  for (let i = 1; i < STORY.REALM_FLAVOR.length; i++) assert.ok(STORY.REALM_FLAVOR[i].length > 20)
  assert.equal(s3.skillSlots >= 4, true)
  assert.equal(s3.petSlots, 2)
})

ok('trang bị rơi ở vòng ải thứ hai trở đi luôn là phẩm cấp cao nhất, vòng đầu theo bối cảnh', () => {
  assert.equal(C.gearTierOf(1), 0)
  assert.equal(C.gearTierOf(15), 1)
  assert.equal(C.gearTierOf(80), 7)
  assert.equal(C.gearTierOf(81), 7, 'vòng 2 không rơi đồ phẩm cấp thấp')
  assert.equal(C.gearTierOf(200), 7)
  assert.equal(C.gearTierOf(500), 7)
  // trong trận
  const s = freshStore()
  s.init()
  s.stageIdx = 30
  s.campaign.best = 99 // ải 100: Chúa Tể (vòng 2)
  const b = useBattleStore()
  b.start()
  b.enemy.hp = 0
  Math.random = () => 0.01
  b.onKill()
  Math.random = realRandom
  assert.ok(s.gear.bag.length >= 1)
  assert.ok(s.gear.bag.every((it) => it.tier === 7), 'toàn phẩm cấp cao nhất')
})

ok('nhân vật Đại Thừa và Độ Kiếp vẽ được và có hiệu ứng riêng so với Hợp Thể', () => {
  const calls = (realm) => {
    const fx = makeGfx()
    ART.drawHeroFx(fx, { t: 2.1, realmIdx: realm, pose: 'meditate', fill: 0, color: 0xffffff })
    assert.ok(finite(fx.calls))
    return fx.calls.length
  }
  assert.ok(calls(7) > calls(6), 'Đại Thừa nhiều nét hơn Hợp Thể')
  assert.equal(calls(8), calls(7))
  for (const realm of [7, 8]) {
    const b = makeGfx()
    ART.drawHeroBody(b, { pose: 'sword', realmIdx: realm })
    assert.ok(b.calls.length > 20 && finite(b.calls))
  }
})

console.log(`\nTất cả ${passed} kiểm tra đã đạt.`)
