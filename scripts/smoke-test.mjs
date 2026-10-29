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
ok('bậc cuối cùng (Hợp Thể Hậu Kỳ) không thể đột phá', () => {
  g.stageIdx = 26
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

// 9c. Bí Cảnh auto-battle
const runBattle = (s, b, maxSeconds = 600) => {
  for (let t = 0; t < maxSeconds * 10 && b.phase !== 'resting' && b.phase !== 'idle'; t++) s.tick(0.1)
}
ok('bí cảnh bị khoá khi chưa đủ bậc', () => {
  const s = freshStore()
  s.init()
  const b = useBattleStore()
  assert.equal(b.enter('huyet_sat'), false)
  assert.equal(b.active, false)
})
ok('vào Hắc Phong Cốc, thông quan, nhận linh thạch & vật phẩm & ghi tiến độ', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6 // mạnh hơn nhiều so với bậc chuẩn -> chắc thắng
  const b = useBattleStore()
  const stones = s.spiritStones
  assert.equal(b.enter('hac_phong'), true)
  assert.equal(b.phase, 'fighting')
  runBattle(s, b)
  assert.equal(b.phase, 'resting')
  assert.equal(b.lastResult, 'clear')
  assert.equal(b.run.kills, 6)
  assert.ok(s.spiritStones.gt(stones))
  assert.equal(s.dungeons.hac_phong.best, 6)
  assert.equal(s.dungeons.hac_phong.clears, 1)
  assert.ok(Object.keys(b.run.items).length > 0)
})
ok('tự động lặp vào lại sau khi nghỉ; tắt thì về idle', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  const b = useBattleStore()
  b.enter('hac_phong')
  runBattle(s, b)
  for (let t = 0; t < 100 && b.phase === 'resting'; t++) s.tick(0.1) // hết thời gian nghỉ
  assert.equal(b.phase, 'fighting') // autoRepeat mặc định bật
  b.retreat()
  assert.equal(b.phase, 'idle')
  s.settings.autoRepeat = false
  b.enter('hac_phong')
  runBattle(s, b)
  for (let t = 0; t < 100 && b.phase === 'resting'; t++) s.tick(0.1)
  assert.equal(b.phase, 'idle')
})
ok('yếu hơn bí cảnh -> tử trận, không mất vật phẩm đã nhặt', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 4
  s.bonus.hp = -300 // gần như không chịu nổi đòn nào
  const b = useBattleStore()
  b.enter('linh_duoc')
  runBattle(s, b)
  assert.equal(b.lastResult, 'dead')
  assert.equal(s.dungeons.linh_duoc.clears ?? 0, 0)
})
ok('Hồi Huyết Đan hồi khí huyết trong trận', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 4
  const b = useBattleStore()
  b.enter('linh_duoc')
  b.hp = 10
  s.addItem('pills', 'hoi_huyet_dan', 1)
  assert.equal(b.useHealPill(), true)
  assert.ok(b.hp > 10)
  assert.equal(s.itemCount('hoi_huyet_dan'), 0)
})
ok('độ kiếp tự rút lui khỏi bí cảnh', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 11
  const b = useBattleStore()
  b.enter('hac_phong')
  assert.equal(b.active, true)
  s.exp = s.requirement
  Math.random = () => 0
  s.breakthrough()
  assert.equal(s.tribulation.active, true)
  assert.equal(b.active, false)
  drainTimers()
  Math.random = realRandom
})
ok('save/load giữ túi đồ, tiến độ bí cảnh, cấp luyện đan, kháng đan', () => {
  const s = freshStore()
  s.init()
  s.addItem('pills', 'duong_the_dan', 2)
  s.useItem('duong_the_dan', 1)
  s.alchemy.level = 4
  s.recordFloor('hac_phong', 5)
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.itemCount('duong_the_dan'), 1)
  assert.equal(s2.alchemy.level, 4)
  assert.equal(s2.dungeons.hac_phong.best, 5)
  assert.equal(s2.usage.duong_the_dan, 1)
  assert.ok(s2.bonus.hp > 0)
})

// =====================================================================
// Giai đoạn 2: ngũ hành, công pháp, trang bị, kỳ ngộ, thành tựu
// =====================================================================
const { elementMult } = await import('../src/game/elements.js')
const SK = await import('../src/game/skills.js')
const EQ = await import('../src/game/equipment.js')
const { on } = await import('../src/game/events.js')
const { ACHIEVEMENTS, achievementReward } = await import('../src/game/achievements.js')
const { ITEMS: ALL_ITEMS, MONSTERS: ALL_MONSTERS } = await import('../src/game/data.js')
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
  const casts = []
  const edges = new Set()
  const off1 = on('battle-skill', (e) => casts.push(e.name))
  const off2 = on('battle-hit', (e) => edges.add(e.edge ?? 'none'))
  const b = useBattleStore()
  const realRnd = Math.random
  Math.random = () => 0.01 // luôn rơi trang bị ở boss
  b.enter('hac_phong')
  runBattle(s, b)
  Math.random = realRnd
  off1()
  off2()
  assert.ok(casts.length >= 1, 'công pháp phải được thi triển')
  assert.ok(casts.every((n) => n === 'Ngự Kiếm Thuật'))
  assert.equal(b.lastResult, 'clear')
  assert.ok(s.gear.bag.length >= 1, 'boss rơi trang bị')
  assert.ok(s.stats.kills >= 6 && s.stats.bossKills === 1)
})

ok('lá chắn hấp thụ sát thương', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 4
  s.skills.owned.hau_tho = 1
  s.skills.slots[0] = 'hau_tho'
  const b = useBattleStore()
  b.enter('linh_duoc')
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
  b.enter('hac_phong')
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
  s.closeEvent()
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
// Giai đoạn 3: cảnh giới mới, luân hồi, Linh Điền, khoáng mạch, farm offline
// =====================================================================
const RB = await import('../src/game/reincarnation.js')
const GD = await import('../src/game/garden.js')
const { STAGES, MAX_STAGE_IDX, TRIBULATIONS } = await import('../src/game/constants.js')
const { DUNGEONS, RECIPES, ITEMS, MONSTERS } = await import('../src/game/data.js')
const { simulateOfflineFarm } = await import('../src/game/battle.js')

ok('27 bậc tu vi, Hợp Thể là cuối; thiên kiếp cho từng đại cảnh giới (trừ Luyện Khí và Hợp Thể)', () => {
  assert.equal(STAGES.length, 27)
  assert.equal(MAX_STAGE_IDX, 26)
  assert.equal(STAGES[26].fullName, 'Hợp Thể Hậu Kỳ')
  for (const realm of [1, 2, 3, 4, 5]) assert.ok(TRIBULATIONS[realm], 'thiếu thiên kiếp cho đại cảnh giới ' + realm)
  assert.equal(TRIBULATIONS[0], undefined)
  assert.equal(TRIBULATIONS[6], undefined)
  for (const cfg of Object.values(TRIBULATIONS)) assert.ok(cfg.bolts >= 3 && cfg.bolts <= 9)
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

ok('farm offline: mô phỏng thu hoạch kỳ vọng, không vượt quá giới hạn hợp lý', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  const dungeon = DUNGEONS[0]
  const r = simulateOfflineFarm({ stats: s.combat, dungeon, seconds: 3600 })
  assert.ok(r.runs > 0)
  assert.ok(r.kills >= r.runs * 5 && r.kills <= r.runs * dungeon.floors + 1)
  assert.equal(r.bossKills, r.runs) // đủ mạnh nên mỗi lượt đều hạ boss
  assert.ok(r.stones.gt(0))
  assert.ok(r.items.linh_thao > 0)
  // hiệu suất 50%: một giờ không thể cho nhiều hơn số lượt chạy liên tục ngoài đời
  assert.ok(r.runs <= 3600 / r.avgRunTime)
  const none = simulateOfflineFarm({ stats: { ...s.combat, atk: 1, hp: 5 }, dungeon: DUNGEONS[4], seconds: 3600 })
  assert.equal(none.bossKills, 0)
})

ok('offline: đang farm khi thoát thì được cộng thu hoạch farm vào báo cáo', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 6
  const b = useBattleStore()
  assert.equal(b.enter('hac_phong'), true)
  s.save() // lưu cờ farming = true
  const raw = JSON.parse(mem.get(SAVE_KEY))
  assert.equal(raw.data.farming, true)
  raw.savedAt = Date.now() - 2 * 3600 * 1000
  mem.set(SAVE_KEY, JSON.stringify(raw))
  const stones = new Decimal(raw.data.spiritStones)
  const s2 = freshStore(true)
  s2.init()
  assert.ok(s2.offlineReport.farm, 'có báo cáo farm')
  assert.ok(s2.offlineReport.farm.kills > 0)
  assert.ok(s2.spiritStones.gt(stones))
  assert.ok(s2.stats.kills > 0)
  // tắt tự động lặp thì không farm
  s2.settings.autoRepeat = false
  s2.farming = true
  s2.offlineReport = null
  s2.applyOffline(3600)
  assert.equal(s2.offlineReport.farm, null)
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

ok('Kiên Trì: mỗi lần tử trận +1 điểm (tối đa), tăng chỉ số trong trận, hạ boss thì xoá', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 4
  const b = useBattleStore()
  b.dungeonId = 'linh_duoc'
  const base = s.combat
  assert.equal(b.gritMult(), 1)
  for (let i = 1; i <= 10; i++) s.addGrit('linh_duoc')
  assert.equal(s.dungeons.linh_duoc.grit, BT.GRIT_MAX)
  const k = 1 + BT.GRIT_STEP * BT.GRIT_MAX
  assert.ok(Math.abs(b.gritMult() - k) < 1e-9)
  const eff = b.playerStats()
  assert.equal(eff.atk, Math.round(base.atk * k))
  assert.equal(eff.hp, Math.round(base.hp * k))
  assert.equal(eff.speed, base.speed)
  s.recordClear('linh_duoc')
  assert.equal(s.dungeons.linh_duoc.grit, 0)
  assert.equal(b.gritMult(), 1)
})

ok('tử trận trong bí cảnh cộng Kiên Trì và lưu vào save', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 4
  s.bonus.hp = -300
  const b = useBattleStore()
  b.enter('linh_duoc')
  runBattle(s, b)
  assert.equal(b.lastResult, 'dead')
  assert.equal(s.dungeons.linh_duoc.grit, 1)
  s.save()
  const s2 = freshStore(true)
  s2.init()
  assert.equal(s2.dungeons.linh_duoc.grit, 1)
})

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
  if (QS.templateById(q.tpl).key === 'clears') s.dungeons.hac_phong = { best: 6, clears: q.target + 5, grit: 0 }
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
  if (QS.templateById(q.tpl).key === 'clears') s.dungeons.hac_phong = { best: 6, clears: q.target + 5, grit: 0 }
  s.claimQuest(q.uid)
  assert.ok(s.sect.contribution > 0)
  const done = s.quests[1]
  s.stats[QS.templateById(done.tpl).key] += done.target
  if (QS.templateById(done.tpl).key === 'clears') s.dungeons.hac_phong = { best: 6, clears: done.target + 50, grit: 0 }
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
  const b = useBattleStore()
  b.enter('hac_phong')
  runBattle(s, b)
  assert.equal(b.lastResult, 'clear')
  assert.ok(s.sect.contribution > 0)
  assert.equal(s.stats.bossKills, 1)
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
  s.dungeons.hac_phong = { best: 6, clears: 1, grit: 0 }
  assert.equal(s.chapterAvailable(STORY.CHAPTERS[2]), true)
  // sau luân hồi, bí cảnh bị xoá nhưng tu vi tối đa đã vượt xa thì không kẹt truyện
  s.dungeons = {}
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
  for (const d of DUNGEONS) s.dungeons[d.id] = { best: 6, clears: 1, grit: 0 }
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
  b.enter('hac_phong')
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

ok('linh khí hạ quái giảm dần khi tu vi vượt xa bí cảnh và nhỏ hơn hẳn sản lượng thụ động mỗi lượt', () => {
  const on = BAL.expRewardSeconds(3, false, 10, 10)
  const over3 = BAL.expRewardSeconds(3, false, 13, 10)
  assert.ok(over3 < on * 0.4)
  assert.ok(on <= 6, 'mỗi quái thường cho tối đa vài giây sản lượng')
  assert.ok(BAL.expRewardSeconds(6, true, 10, 10) <= 4 * 6)
  // tu vi thấp hơn bậc chuẩn không bị phạt
  assert.equal(BAL.expRewardSeconds(3, false, 5, 10), on)
})

ok('linh thạch, thưởng thông quan và Cống Hiến hạ boss đều giảm dần khi cày bí cảnh quá yếu', () => {
  const d = DUNGEONS[3]
  const tmpl = MONSTERS[d.monsters[0]]
  const on = BAL.stoneReward(d, tmpl, 3, d.power)
  const over = BAL.stoneReward(d, tmpl, 3, d.power + 4)
  assert.ok(over.lt(on.mul(0.5)))
  assert.ok(BAL.clearBonus(d, d.power + 4).lt(BAL.clearBonus(d, d.power).mul(0.5)))
  assert.ok(BAL.bossContribution(d, d.power + 5) < BAL.bossContribution(d, d.power))
  assert.ok(BAL.bossContribution(DUNGEONS[0], 0) >= 1)
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
  const tmpl = MONSTERS[d.monsters[0]]
  const kill = BAL.stoneReward(d, tmpl, 1, d.power)
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
  assert.deepEqual(ids(s), [])
  s.exp = s.requirement
  assert.equal(nextHints(s)[0].id, 'break')
  s.stageIdx = 11
  s.exp = s.requirement
  assert.equal(nextHints(s)[0].id, 'trib')
  assert.equal(nextHints(s)[0].tab, 'inventory')
})

ok('gợi ý: bí cảnh, Tụ Linh Trận, luyện đan, Linh Điền biến mất khi người chơi đã làm', () => {
  const s = freshStore()
  s.init()
  s.stageIdx = 1
  assert.ok(ids(s).includes('dungeon'))
  s.dungeons.hac_phong = { best: 1, clears: 0, grit: 0 }
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

ok('gợi ý: nhiệm vụ xong, thành tựu, tông môn, công pháp, trang bị, đệ tử, luân hồi', () => {
  const s = freshStore()
  s.init()
  s.stats.maxStage = 4
  s.stageIdx = 4
  s.dungeons.hac_phong = { best: 1, clears: 0, grit: 0 }
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
  if (QS.templateById(q.tpl).key === 'clears') s.dungeons.hac_phong = { best: 6, clears: q.target + 5, grit: 0 }
  assert.ok(ids(s).includes('quest'))
  s.stageIdx = 26
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
ok('màn hình: 13 màn, id duy nhất, chỉ Nhân Vật và Bí Cảnh có canvas', () => {
  assert.equal(SCREENS.length, 13)
  assert.equal(new Set(SCREENS.map((x) => x.id)).size, 13)
  assert.deepEqual(SCREENS.filter((x) => hasCanvas(x.id)).map((x) => x.id), ['character', 'battle'])
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

console.log(`\nTất cả ${passed} kiểm tra đã đạt.`)
