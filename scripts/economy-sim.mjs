// =====================================================================
// economy-sim.mjs - Mô phỏng kinh tế dài hạn bằng chính store của game.
//
// Một "người chơi tự động" chơi trên đồng hồ ảo (Date.now và setTimeout bị thay), thực hiện đủ
// các hoạt động: đột phá, Vượt Ải tự chiến đấu, luyện đan, rèn đồ, công pháp, tông môn + nhiệm vụ,
// đệ tử, Linh Điền, khoáng mạch, kỳ ngộ, truyện. Dùng để đo nhịp tiến triển.
//
// Chạy:  npm run econ                       (1 hạt giống, 1 kiếp)
//        node scripts/economy-sim.mjs --hours 60 --seeds 3 --rebirth
// Tuỳ chọn: --hours N (trần giờ ảo mỗi kiếp), --seeds N, --rebirth (chơi thêm các kiếp sau),
//   --goal N (bậc mục tiêu, mặc định 26), --no-pets / --no-dwell / --no-exped / --no-talent (tắt từng hệ thống để đo đóng góp),
//   --autobreak (bật tự động đột phá bậc nhỏ), --act N (bot chỉ hành động mỗi N giây ảo: 1800 = ghé 30 phút/lần),
//   --snap N (giây giữa hai dòng trạng thái), --no-exp-pills (không dùng Tụ Khí Đan)
// =====================================================================

// ---------- Môi trường giả ----------
const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf('--' + name)
  return i < 0 ? def : args[i + 1] && !args[i + 1].startsWith('--') ? Number(args[i + 1]) : true
}
const MAX_HOURS = opt('hours', 80)
const SEEDS = opt('seeds', 1)
const REBIRTH = args.includes('--rebirth')
const NO_COMBO = args.includes('--no-combo') // bot không tối ưu liên kích (đo mức tối thiểu)
const NO_EXP_PILLS = args.includes('--no-exp-pills') // bỏ qua Tụ Khí Đan để đo nhịp tự nhiên
const GOAL = opt('goal', 26) // bậc mục tiêu mỗi kiếp (mặc định Hợp Thể Hậu Kỳ để so với các lần đo cũ; 32 = Độ Kiếp Hậu Kỳ)
const OFF = (k) => args.includes('--no-' + k) // tắt từng hệ thống để đo đóng góp: --no-pets --no-dwell --no-exped --no-talent
const PATH = args.includes('--path') ? args[args.indexOf('--path') + 1] : 'kiem' // đạo lộ bot chọn khi đạt Trúc Cơ

const mem = new Map()
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }

let vt = 0 // thời gian ảo (ms)
const BASE = 1.7e12
const realNow = Date.now
Date.now = () => BASE + vt
const timers = []
globalThis.setTimeout = (fn, ms = 0) => {
  timers.push({ at: vt + ms, fn })
  return timers.length
}
globalThis.clearTimeout = () => { timers.length = 0 }
const runTimers = () => {
  for (let i = timers.length - 1; i >= 0; i--) {
    if (timers[i].at <= vt) {
      const { fn } = timers[i]
      timers.splice(i, 1)
      fn()
    }
  }
}

function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const { createPinia, setActivePinia } = await import('pinia')
const { useGameStore } = await import('../src/stores/gameStore.js')
const { useBattleStore } = await import('../src/stores/battleStore.js')
const { STAGES, MAX_STAGE_IDX } = await import('../src/game/constants.js')
const { RECIPES, ITEMS } = await import('../src/game/data.js')
const { FORGE, SLOT_IDS, forgeCost } = await import('../src/game/equipment.js')
const { awakenOffer } = await import('../src/game/arts.js')
const { SKILLS, fragmentId, canEquip: canEquipSkill, COMBOS, STATUS_OF_ELEMENT } = await import('../src/game/skills.js')
const { ARTS } = await import('../src/game/arts.js')
const { CROPS, plotCount } = await import('../src/game/garden.js')
const { SECTS } = await import('../src/game/sect.js')
const { JOB_IDS } = await import('../src/game/disciples.js')
const { PERKS, perkCost } = await import('../src/game/reincarnation.js')
const { BUILDING_IDS } = await import('../src/game/dwelling.js')
const { PETS } = await import('../src/game/pets.js')
const { MISSION_IDS, MISSIONS } = await import('../src/game/expedition.js')
const { fmt } = await import('../src/game/format.js')
const Decimal = (await import('break_infinity.js')).default
const { on } = await import('../src/game/events.js')
// Đếm thất bại đột phá thường / thiên kiếp theo bậc (để thấy chỗ nghẽn)
const gate = {} // stageIdx -> { fail: n, trib: n, tribFail: n }
let curStore = null
const G = (i) => (gate[i] ??= { fail: 0, trib: 0, tribFail: 0 })
on('breakthrough-fail', () => { if (curStore && !curStore.tribulation.active) G(curStore.stageIdx).fail++ })
on('tribulation-start', () => { if (curStore) G(curStore.stageIdx).trib++ })
on('tribulation-end', ({ survived }) => { if (curStore && !survived) G(curStore.stageIdx).tribFail++ })

const DT = 1 // giây ảo mỗi nhịp
const SNAP = opt("snap", 3600) // giây ảo giữa hai ảnh chụp trạng thái
const ACT_EVERY = opt('act', 5) // bot hành động mỗi N giây ảo (--act 1800 = người chơi ghé 30 phút một lần)
const AUTO_BREAK = args.includes('--autobreak')

// ---------- Đếm nguồn linh khí (gỡ lỗi cân bằng) ----------
const expBySource = {}
function trackExp(s) {
  const orig = s.gainExp.bind(s)
  s.gainExp = (amount) => {
    const before = s.exp
    orig(amount)
    const gained = s.exp.sub(before).toNumber()
    if (gained <= 0) return
    const stack = String(new Error().stack).split('\n').join(' ').slice(0, 900)
    const src = /onKill/.test(stack) ? 'Vượt Ải (hạ quái)' : /applyEffects/.test(stack) ? 'phần thưởng (kỳ ngộ/nhiệm vụ/truyện/thành tựu)' : /useItem/.test(stack) ? 'đan dược' : 'thụ động (tick)'
    expBySource[src] = (expBySource[src] ?? 0) + gained
  }
}

// ---------- Đếm dòng linh thạch / Cống Hiến theo nguồn ----------
const flow = { income: {}, spend: {}, contrib: {} }
function trackFlow(s, b) {
  const wrap = (obj, name, label) => {
    const orig = obj[name].bind(obj)
    obj[name] = (...a) => {
      const before = s.spiritStones
      const r = orig(...a)
      const d = s.spiritStones.sub(before)
      if (d.gt(0)) flow.income[label] = (flow.income[label] ?? new Decimal(0)).add(d)
      else if (d.lt(0)) flow.spend[label] = (flow.spend[label] ?? new Decimal(0)).add(d.neg())
      return r
    }
  }
  wrap(b, 'onKill', 'Vượt Ải: hạ quái + thưởng ải')
  wrap(s, 'claimQuest', 'nhiệm vụ')
  wrap(s, 'collectDisciple', 'đệ tử')
  wrap(s, 'chooseEvent', 'kỳ ngộ')
  wrap(s, 'claimAchievement', 'thành tựu')
  wrap(s, 'sellItem', 'bán vật phẩm')
  wrap(s, 'sellGear', 'phân giải trang bị')
  wrap(s, 'upgradeArray', 'Tụ Linh Trận')
  wrap(s, 'craft', 'luyện đan')
  wrap(s, 'forge', 'rèn đồ')
  wrap(s, 'enhanceGear', 'cường hoá')
  wrap(s, 'recruit', 'thu đệ tử')
  wrap(s, 'levelUpDisciple', 'nâng đệ tử')
  wrap(s, 'plant', 'hạt giống')
  wrap(s, 'refreshQuests', 'làm mới nhiệm vụ')
  const oc = s.addContribution.bind(s)
  s.addContribution = (n) => {
    const got = oc(n)
    if (got) {
      const stack = String(new Error().stack)
      const src = /onKill/.test(stack) ? 'hạ boss' : /claimQuest/.test(stack) ? 'nhiệm vụ' : 'khác'
      flow.contrib[src] = (flow.contrib[src] ?? 0) + got
    }
    return got
  }
}

// ---------- Người chơi tự động ----------
function createBot(s, b) {
  let lastCollect = 0
  let lastGear = 0
  let forgeSlot = 0
  const pickSect = () => SECTS.find((x) => x.element === s.element) ?? SECTS[0]

  const playStory = () => {
    let guard = 0
    while (s.storyView && guard++ < 100) {
      const sc = s.storyCurrent()
      if (s.storyView.phase === 'result') s.storyAdvance()
      else if (sc?.input) s.storySetName('Bot')
      else if (sc?.choice) {
        const idx = sc.choice.options.findIndex((o) => s.optionAvailable(o))
        s.storyChoose(idx < 0 ? 0 : idx)
      } else s.storyAdvance()
    }
  }

  return function act(now) {
    s.offlineReport = null
    if (s.storyView) playStory()
    if (s.event) {
      s.chooseEvent(0)
      s.closeEvent()
    }
    if (s.tribulation.active) return

    // Đột phá, dùng đan hỗ trợ trước
    if (s.isFull && !s.isMaxStage) {
      if (s.nextTribulation && s.itemCount('ho_kiep_dan')) s.useItem('ho_kiep_dan')
      for (const id of ['thien_pha_dan', 'pha_canh_dan']) if (s.itemCount(id) && s.buffs.success < 0.01) s.useItem(id)
      s.breakthrough()
      if (s.tribulation.active) return
    }

    // Phần thưởng: rương mốc ải, điểm danh ngày, nhiệm vụ ngày, chọn 1 trong 3 phần thưởng boss
    while (s.milestoneClaimable) s.claimMilestone()
    if (s.daily.day && !s.daily.claimed) s.claimDaily()
    s.daily.tasks.forEach((t, i) => { if (!t.claimed && s.dailyTaskDone(t)) s.claimDailyTask(i) })
    if (s.bossChoice) {
      const order = ['exp', 'stat', 'art', 'skill', 'stones']
      const best = [...s.bossChoice.options].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))[0]
      s.chooseBossReward(s.bossChoice.options.indexOf(best))
    }

    // Thiên phú: ưu tiên loại mạnh nhất trong 3 lựa chọn
    if (s.talentPending && !OFF('talent')) {
      const pref = ['thien_linh', 'chien_than', 'linh_can', 'kiem_cot', 'thien_co', 'dan_dao']
      s.chooseTalent(pref.find((id) => s.talentOffer.includes(id)) ?? s.talentOffer[0])
    }
    // Công trình Động Phủ, linh thú, thám hiểm
    if (!OFF('dwell')) for (const id of BUILDING_IDS) while (s.upgradeBuilding(id) && s.spiritStones.gt(0));
    const petOrder = ['hoa_phuong', 'thanh_long', 'bang_ly', 'van_ho', 'kim_thiem', 'linh_hac', 'quy_giap', 'tieu_ho']
    for (const id of OFF('pets') ? [] : petOrder) {
      s.learnPet(id)
      if (s.pets.owned[id]) while (s.upgradePet(id));
    }
    const ownedPets = petOrder.filter((id) => s.pets.owned[id])
    for (let i = 0; i < s.petSlots && i < ownedPets.length; i++) if (s.pets.active[i] !== ownedPets[i]) s.equipPet(ownedPets[i], i)
    for (let i = s.expeditions.length - 1; i >= 0; i--) if (s.expeditionReady(s.expeditions[i])) s.claimExpedition(i)
    for (const mid of OFF('exped') ? [] : [...MISSION_IDS].reverse()) {
      if (s.expeditions.length >= s.expeditionSlotCount) break
      const idle = s.disciples.filter((d) => !d.away)
      if (s.stageIdx >= MISSIONS[mid].minStage && idle.length >= MISSIONS[mid].need) s.startExpedition(mid, idle.slice(0, Math.max(MISSIONS[mid].need, Math.min(idle.length, 3))).map((d) => d.uid))
    }

    // Đạo lộ: chọn ngay khi mở
    if (s.canChoosePath) s.choosePath(PATH)

    // Tông môn + nhiệm vụ
    if (!s.sect.id && s.stageIdx >= 4) s.joinSect(pickSect().id)
    for (const q of [...s.quests]) if (s.questDone(q)) s.claimQuest(q.uid)

    // Dùng đan vĩnh viễn / tàn quyển / đan linh khí
    for (const group of ['pills', 'scrolls']) {
      for (const id of Object.keys(s.inventory[group])) {
        const fx = ITEMS[id].effect
        if (!fx || fx.type === 'heal' || fx.type === 'buff') continue
        if (fx.type === 'exp' && (NO_EXP_PILLS || s.progress > 0.6)) continue
        s.useItem(id, 99)
      }
    }
    // Học & trang bị võ kỹ: ưu tiên chiêu tấn công theo sát thương trên hồi chiêu, rồi chiêu hỗ trợ
    const ATTACK = ['damage', 'dot', 'stun', 'execute', 'ultimate']
    const score = (id) => (ATTACK.includes(SKILLS[id].kind) ? 100 : 0) + SKILLS[id].power / SKILLS[id].cd
    for (const id of Object.keys(SKILLS)) {
      s.learnSkill(id)
      if (s.skills.owned[id]) while (s.upgradeSkill(id));
    }
    let owned = Object.keys(s.skills.owned).filter((id) => canEquipSkill(id, s.realmIdx, s.path)).sort((x, y) => score(y) - score(x))
    // Người chơi biết liên kích: chọn các chiêu đầu bảng, rồi xếp chiêu gây trạng thái trước chiêu ăn liên kích (cùng bộ khi có thể)
    if (!NO_COMBO) {
      const top = owned.slice(0, s.skillSlots)
      const feeds = (a, b) => ATTACK.includes(SKILLS[b].kind) && COMBOS.some((c) => c.element === SKILLS[b].element && c.status === STATUS_OF_ELEMENT[SKILLS[a].element])
      // Nếu trong kho có chiêu cung cấp trạng thái cho một chiêu đang gắn mà chưa được chọn, đổi chiêu yếu nhất lấy nó
      const missing = owned.slice(s.skillSlots).find((a) => ATTACK.includes(SKILLS[a].kind) && top.some((b) => b !== a && feeds(a, b)))
      if (missing && top.length >= s.skillSlots) top[top.length - 1] = missing
      top.sort((a, b) => (top.some((x) => x !== a && feeds(a, x)) ? 0 : 1) - (top.some((x) => x !== b && feeds(b, x)) ? 0 : 1))
      owned = [...top, ...owned.filter((x) => !top.includes(x))]
    }
    for (let i = 0; i < s.skillSlots && i < owned.length; i++) if (s.skills.slots[i] !== owned[i]) s.equipSkill(owned[i], i)
    // Học, thăng cấp công pháp bị động (ưu tiên linh khí, công, khí huyết, thu nhập ải...)
    const ART_ORDER = ['thanh_tam', 'ho_phap', 'pha_quan', 'cuong_the', 'kim_cang', 'tu_bao', 'truy_phong', 'thien_nhan', 'ngu_hanh', 'luan_hoi']
    for (const id of ART_ORDER) {
      s.learnArt(id)
      if (s.arts.owned[id]) while (s.upgradeArt(id));
      // Ngộ đạo khi đạt cấp tối đa: chọn đặc tính đầu tiên được chào
      if (s.arts.owned[id] >= 10 && !s.arts.awaken[id]) s.awakenArt(id, awakenOffer(id)[0])
    }
    // Nhánh tiến hoá võ kỹ cấp tối đa: Cường Lực
    for (const id of Object.keys(s.skills.owned)) if (s.skills.owned[id] >= 5 && s.skills.branch[id] == null) s.chooseBranch(id, 0)
    // Pháp Bảo: luyện hoá, nâng phẩm, gắn theo thứ tự ưu tiên
    const TR_ORDER = ['can_khon_dinh', 'that_tinh_kiem', 'ho_than_phu', 'huyet_sat_chau', 'van_loi_an', 'tinh_ha_binh', 'tu_linh_binh', 'huyen_vu_an', 'hon_nguyen_chung', 'phong_loi_phien', 'thien_co_la_ban']
    for (const id of TR_ORDER) {
      s.learnTreasure(id)
      if (s.treasures.owned[id]) while (s.upgradeTreasure(id));
    }
    const ownedTr = TR_ORDER.filter((id) => s.treasures.owned[id])
    for (let i = 0; i < s.treasureSlots && i < ownedTr.length; i++) if (s.treasures.slots[i] !== ownedTr[i]) s.equipTreasure(ownedTr[i], i)

    // Tụ Linh Trận: chi tối đa nửa số linh thạch mỗi lần
    for (let k = 0; k < 20 && s.spiritStones.gte(s.arrayCost.mul(2)); k++) s.upgradeArray()

    // Luyện đan: mọi công thức có thể
    for (const r of RECIPES) if (s.canCraft(r.id) && s.spiritStones.gte(s.stonesRate.mul(30))) s.craft(r.id, 5)

    // Rèn đồ định kỳ, mặc đồ tốt nhất, cường hoá khi dư dả
    if (now - lastGear > 300) {
      lastGear = now
      for (let tier = FORGE.length - 1; tier >= 0; tier--) {
        if (s.canForge(tier) && s.spiritStones.gte(forgeCost(tier).mul(3))) {
          s.forge(tier, SLOT_IDS[forgeSlot++ % SLOT_IDS.length])
          break
        }
      }
      for (const slot of SLOT_IDS) {
        const best = s.gear.bag.filter((it) => it.slot === slot).sort((x, y) => y.tier - x.tier || y.rarity - x.rarity || y.enh - x.enh)[0]
        if (best && s.gear.equipped[slot] !== best.uid) s.equipGear(best.uid)
        const worn = s.gear.bag.find((it) => it.uid === s.gear.equipped[slot])
        if (worn) while (s.enhanceGear(worn.uid) && s.spiritStones.gt(0) && worn.enh < 6);
      }
    }

    // Đệ tử
    if (s.disciples.length < s.discipleLimit) s.recruit()
    s.disciples.forEach((d, i) => {
      if (!d.job) s.assignJob(d.uid, JOB_IDS[i % JOB_IDS.length])
      if (s.spiritStones.gte(s.stonesRate.mul(600))) s.levelUpDisciple(d.uid)
    })
    // Linh Điền, khoáng mạch, thu hoạch đệ tử
    for (let i = 0; i < plotCount(s.stageIdx); i++) {
      s.harvest(i)
      if (!s.garden.plots[i]) {
        const crop = [...CROPS].reverse().find((c) => s.stageIdx >= c.minStage)
        if (crop) s.plant(i, crop.id)
      }
    }
    if (now - lastCollect > 600) {
      lastCollect = now
      s.collectMine()
      s.collectAllDisciples()
    }

    // Vượt Ải tự chạy trong tick (Tự chiến đấu mặc định bật); bot không cần làm gì thêm
  }
}

// ---------- Chạy một kiếp ----------
function playLife(s, b, act, label, stageGoal = Math.min(GOAL, MAX_STAGE_IDX)) {
  const reached = {} // stageIdx -> giờ ảo (so với đầu kiếp) khi đạt
  const startVt = vt
  const startMax = s.stageIdx
  const snapshots = []
  let nextSnap = 0
  let failures0 = s.stats.failures
  for (let sec = 0; sec <= MAX_HOURS * 3600; sec += DT) {
    s.tick(DT)
    vt += DT * 1000
    runTimers()
    if (sec % ACT_EVERY === 0) act(sec)
    if (reached[s.stageIdx] === undefined && s.stageIdx > startMax) reached[s.stageIdx] = sec / 3600
    if (sec >= nextSnap) {
      nextSnap += SNAP
      snapshots.push({
        h: sec / 3600, stage: s.stage.fullName, stones: s.spiritStones, rate: s.expRate, arr: s.arrayLevel,
        rank: s.rankIdx, dis: s.disciples.length, gear: s.gear.bag.length, atk: s.combat.atk, hp: s.combat.hp, ai: s.campaign.best,
      })
    }
    if (s.stageIdx >= stageGoal && !s.tribulation.active) break
  }
  return { label, reached, snapshots, seconds: (vt - startVt) / 1000, failures: s.stats.failures - failures0 }
}

function report(res, s) {
  console.log(`\n=== ${res.label} ===`)
  const stages = Object.keys(res.reached).map(Number).sort((a, b) => a - b)
  let prev = 0
  console.log('Bậc'.padEnd(20) + 'Đạt lúc (giờ ảo)'.padEnd(20) + 'Mất (phút)')
  for (const i of stages) {
    const h = res.reached[i]
    console.log(STAGES[i].fullName.padEnd(20) + h.toFixed(2).padEnd(20) + ((h - prev) * 60).toFixed(1))
    prev = h
  }
  console.log(`Thất bại đột phá/độ kiếp: ${res.failures}`)
  console.log('\nGiờ  Cảnh giới            Linh thạch  Linh khí/s  Trận  Bậc TM  ĐT  Đồ   Công    Khí huyết    Ải')
  for (const x of res.snapshots.filter((_, i) => i % Math.max(1, Math.floor(res.snapshots.length / 16)) === 0)) {
    console.log(
      `${x.h.toFixed(2).padStart(5)}  ${x.stage.padEnd(19)} ${fmt(x.stones).padStart(10)}  ${fmt(x.rate).padStart(10)}  ${String(x.arr).padStart(4)}  ${String(x.rank).padStart(5)}  ${String(x.dis).padStart(2)}  ${String(x.gear).padStart(3)}  ${String(x.atk).padStart(6)}  ${String(x.hp).padStart(8)}  ${String(x.ai).padStart(5)}`,
    )
  }
  const total = Object.values(expBySource).reduce((a, b) => a + b, 0)
  console.log('\nNguồn linh khí (tỉ lệ % tổng linh khí nhận):')
  for (const [k, v] of Object.entries(expBySource).sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(48) + ((v / total) * 100).toFixed(1) + '%')
  for (const k of Object.keys(expBySource)) delete expBySource[k]
  // Phân rã hệ số tăng cường linh khí/giây so với tốc độ gốc của bậc
  const base = Math.pow(1.5, s.stageIdx)
  const gearExp = s.gearStats.exp
  console.log(
    `
Hệ số tăng cường linh khí: tổng x${(s.expRate.toNumber() / base).toFixed(1)} = căn cốt x${s.spiritRoot.mult} | trận x${(1 + 0.1 * s.arrayLevel).toFixed(1)} | thưởng vĩnh viễn (đan, tàn quyển, thành tựu...) +${(s.bonus.exp * 100).toFixed(0)}% | trang bị +${(gearExp * 100).toFixed(0)}% | tông môn +${(s.sectPerk.exp * 100).toFixed(0)}% | Tu Chất x${(1 + 0.1 * (s.reincarnation.upgrades.tu_chat ?? 0)).toFixed(1)}`,
  )
  console.log(`Thưởng vĩnh viễn: ${JSON.stringify(Object.fromEntries(Object.entries(s.bonus).map(([k, v]) => [k, Math.round(v * 100) / 100])))}`)
  console.log('\nCửa ải theo bậc (đột phá thường thất bại / vào thiên kiếp / thiên kiếp thất bại):')
  for (const [i, v] of Object.entries(gate)) if (v.fail + v.trib + v.tribFail > 0) console.log('  ' + STAGES[i].fullName.padEnd(22) + String(v.fail).padStart(3) + ' /' + String(v.trib).padStart(3) + ' /' + String(v.tribFail).padStart(3))
  for (const k of Object.keys(gate)) delete gate[k]
  const hrs = res.seconds / 3600
  const table = (title, obj) => {
    console.log('\n' + title)
    for (const [k, v] of Object.entries(obj).sort((a, b) => (b[1].toNumber?.() ?? b[1]) - (a[1].toNumber?.() ?? a[1]))) {
      console.log('  ' + k.padEnd(34) + fmt(v).padStart(10) + '  (' + fmt(v.div ? v.div(hrs) : v / hrs) + '/giờ)')
    }
  }
  table('Linh thạch thu vào:', flow.income)
  table('Linh thạch chi ra:', flow.spend)
  table('Cống Hiến theo nguồn:', flow.contrib)
  flow.income = {}
  flow.spend = {}
  flow.contrib = {}
  console.log(`Tổng: ${(res.seconds / 3600).toFixed(1)} giờ ảo, kết thúc ở ${s.stage.fullName}, Cống Hiến tổng ${s.sect.total}, nhiệm vụ xong ${s.stats.questsDone}, boss hạ ${s.stats.bossKills}, ải cao nhất ${s.campaign.best}`)
}

/** Mua cường hoá Đạo Vận rẻ nhất / hợp lý nhất. */
function spendDao(s) {
  const order = ['tu_chat', 'than_the', 'tuc_hue', 'phuc_duyen', 'bi_quan', 'thien_menh']
  let bought = true
  while (bought) {
    bought = false
    for (const id of order) {
      const lv = s.reincarnation.upgrades[id] ?? 0
      const perk = PERKS.find((p) => p.id === id)
      if (lv < perk.max && s.reincarnation.dao >= perkCost(perk, lv) && lv < (id === 'thien_menh' ? 4 : 12)) {
        s.buyPerk(id)
        bought = true
        break
      }
    }
  }
}

// ---------- Chương trình chính ----------
for (let seed = 1; seed <= SEEDS; seed++) {
  Math.random = seededRandom(seed * 7919)
  mem.clear()
  vt = 0
  timers.length = 0
  setActivePinia(createPinia())
  const s = useGameStore()
  const b = useBattleStore()
  s.init()
  curStore = s
  s.eventNext = 200 // kỳ ngộ đều đặn như người chơi thật
  s.settings.autoBreak = AUTO_BREAK
  trackExp(s)
  trackFlow(s, b)
  const act = createBot(s, b)
  const res = playLife(s, b, act, `Hạt giống ${seed} - kiếp 1`)
  report(res, s)

  if (REBIRTH) {
    let life = 1
    while (life < 4 && s.stageIdx >= 9) {
      const reached = s.stageIdx
      const gain = s.reincarnate()
      spendDao(s)
      life++
      console.log(`\n>>> Luân hồi từ bậc ${STAGES[reached].fullName}: +${gain} Đạo Vận, cường hoá: ${JSON.stringify(s.reincarnation.upgrades)}`)
      const r2 = playLife(s, b, createBot(s, b), `Hạt giống ${seed} - kiếp ${life}`, Math.min(MAX_STAGE_IDX, reached))
      report(r2, s)
    }
  }
}
Date.now = realNow
