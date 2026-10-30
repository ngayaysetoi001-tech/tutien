// =====================================================================
// saveService.js - Lưu / tải / xuất / nhập savegame
//  * LocalStorage: tự động lưu (store gọi mỗi 5 giây)
//  * Export: tải file .json   * Import: nạp file .json (có kiểm tra hợp lệ)
// Decimal được lưu dưới dạng chuỗi để JSON không mất độ chính xác.
// =====================================================================
import Decimal from 'break_infinity.js'
import { MAX_STAGE_IDX, SAVE_KEY, SAVE_VERSION, SPIRIT_ROOTS, TIME_BANK_CAP } from '../game/constants.js'
import { DUNGEONS, ITEMS, RECIPES } from '../game/data.js'
import { AIS_PER_CHAPTER, GRIT_MAX, MILESTONES } from '../game/campaign.js'
import { ELEMENTS } from '../game/elements.js'
import { ARTS, ART_MAX_LEVEL, awakenOffer } from '../game/arts.js'
import { MAX_PET_SLOTS, PETS, PET_MAX_LEVEL } from '../game/pets.js'
import { MAX_PARTY, MISSIONS } from '../game/expedition.js'
import { BUILDINGS, BUILDING_IDS, BUILDING_MAX_LEVEL } from '../game/dwelling.js'
import { LEGACY_PATH, PATHS } from '../game/paths.js'
import { TREE_SKILLS, treeMaxLevel } from '../game/skilltree.js'
import { MAX_TREASURE_SLOTS, TREASURES, TREASURE_MAX_TIER } from '../game/treasures.js'
import { AFFIXES, BAG_LIMIT, LEGENDS, MAX_AFFIXES, MAX_ENHANCE, RARITIES, SLOTS, TIERS } from '../game/equipment.js'
import { ACHIEVEMENTS } from '../game/achievements.js'
import { PERKS } from '../game/reincarnation.js'
import { AUTOMATION_IDS } from '../game/automation.js'
import { CHALLENGES } from '../game/challenges.js'
import { DAILY_TASK_COUNT, emptyDaily } from '../game/daily.js'
import { TALENTS, TALENT_OFFER_SIZE } from '../game/talents.js'
import { CROPS, MAX_PLOTS } from '../game/garden.js'
import { sectById } from '../game/sect.js'
import { TIERS as QUEST_TIERS, templateById } from '../game/quests.js'
import { GRADES, JOBS, MAX_LEVEL } from '../game/disciples.js'
import { CHAPTERS, ENDINGS, EXTRAS } from '../game/story.js'
import { LORE } from '../game/lore.js'

/** Trích phần dữ liệu cần lưu từ state của store -> object JSON thuần. */
/** Id 13 võ kỹ chung của phiên bản cũ (chỉ để chuyển đổi save). */
const LEGACY_SKILL_IDS = ['ngu_kiem', 'liet_hoa', 'huyen_bang', 'thanh_moc', 'hau_tho', 'phong_loi', 'doc_chu', 'loi_dinh', 'tuyet_sat', 'huyet_thuc', 'bao_nhan', 'phan_chan', 'thien_ha']

export function serialize(state, now = Date.now()) {
  return {
    version: SAVE_VERSION,
    savedAt: now,
    data: {
      name: state.name,
      createdAt: state.createdAt,
      spiritRootId: state.spiritRoot.id,
      stageIdx: state.stageIdx,
      exp: state.exp.toString(),
      spiritStones: state.spiritStones.toString(),
      arrayLevel: state.arrayLevel,
      bonus: { ...state.bonus },
      inventory: JSON.parse(JSON.stringify(state.inventory)),
      stats: { ...state.stats },
      settings: { ...state.settings },
      buffs: { ...state.buffs },
      alchemy: { ...state.alchemy },
      usage: { ...state.usage },
      campaign: { ...state.campaign },
      element: state.element,
      skills: JSON.parse(JSON.stringify(state.skills)),
      arts: JSON.parse(JSON.stringify(state.arts)),
      treasures: JSON.parse(JSON.stringify(state.treasures)),
      pets: JSON.parse(JSON.stringify(state.pets)),
      dwelling: { ...state.dwelling },
      expeditions: JSON.parse(JSON.stringify(state.expeditions)),
      path: state.path ?? null,
      challenge: state.challenge ?? null,
      talent: state.talent ?? null,
      talentOffer: [...state.talentOffer],
      daily: JSON.parse(JSON.stringify(state.daily)),
      timeBank: Math.floor(state.timeBank ?? 0),
      challengeDone: !!state.challengeDone,
      gear: JSON.parse(JSON.stringify(state.gear)),
      achTier: { ...state.achTier },
      reincarnation: JSON.parse(JSON.stringify(state.reincarnation)),
      garden: JSON.parse(JSON.stringify(state.garden)),
      mineAt: state.mineAt,
      sect: { ...state.sect },
      quests: JSON.parse(JSON.stringify(state.quests)),
      disciples: JSON.parse(JSON.stringify(state.disciples)),
      story: JSON.parse(JSON.stringify(state.story)),
    },
  }
}

const num = (v, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback

function dec(v, fallback = '0') {
  try {
    const d = new Decimal(typeof v === 'string' || typeof v === 'number' ? v : fallback)
    return d.lt(0) || Number.isNaN(d.mantissa) ? new Decimal(fallback) : d
  } catch {
    return new Decimal(fallback)
  }
}

/**
 * Kiểm tra và chuyển save JSON -> patch cho state. Ném Error có thông điệp
 * tiếng Việt nếu file không hợp lệ. Mọi trường thiếu được lấp bằng `defaults`.
 */
export function deserialize(save, defaults) {
  if (!save || typeof save !== 'object' || typeof save.data !== 'object' || save.data === null) {
    throw new Error('File save không đúng định dạng.')
  }
  if (typeof save.version !== 'number' || save.version > SAVE_VERSION) {
    throw new Error('Phiên bản save không được hỗ trợ.')
  }
  const d = save.data
  const root = SPIRIT_ROOTS.find((r) => r.id === d.spiritRootId) ?? defaults.spiritRoot
  const inv = d.inventory && typeof d.inventory === 'object' ? d.inventory : {}
  // Chỉ giữ vật phẩm còn tồn tại trong dữ liệu game và đúng nhóm túi
  const cleanGroup = (g, group) =>
    Object.fromEntries(
      Object.entries(g && typeof g === 'object' ? g : {})
        .filter(([k]) => ITEMS[k]?.group === group)
        .map(([k, v]) => [k, Math.floor(num(v, 0))])
        .filter(([, v]) => v > 0),
    )
  // Vượt Ải. Save cũ (bí cảnh chọn tay) chuyển thành ải: mỗi bí cảnh = một chương 10 ải; đã thông quan thì tính đủ chương
  let migrated = 0
  DUNGEONS.forEach((dg, i) => {
    const rec = d.dungeons?.[dg.id]
    if (!rec) return
    const reached = num(rec.clears, 0) > 0 ? AIS_PER_CHAPTER : Math.min(AIS_PER_CHAPTER - 1, Math.floor(num(rec.best, 0, 0, dg.floors)))
    if (reached > 0) migrated = Math.max(migrated, i * AIS_PER_CHAPTER + reached)
  })
  const cam = d.campaign && typeof d.campaign === 'object' ? d.campaign : { best: migrated, record: migrated }
  const best = Math.floor(num(cam.best, 0, 0, 100000))
  const campaign = {
    best,
    record: Math.max(best, Math.floor(num(cam.record, 0, 0, 100000))),
    grit: Math.floor(num(cam.grit, 0, 0, GRIT_MAX)),
    farm: Number.isFinite(cam.farm) && cam.farm >= 1 && cam.farm <= best ? Math.floor(cam.farm) : null,
    milestone: Math.floor(num(cam.milestone, 0, 0, MILESTONES.length)),
  }
  const usage = {}
  for (const [k, v] of Object.entries(d.usage && typeof d.usage === 'object' ? d.usage : {})) {
    if (ITEMS[k]) usage[k] = Math.floor(num(v, 0))
  }
  // Save cũ có 13 võ kỹ chung (học bằng tàn quyển, gắn ô): nay bỏ hẳn, quy thành điểm kỹ năng
  // (mỗi cấp đã học = 3 điểm, mỗi tàn quyển còn trong túi = 0,4 điểm)
  let legacyPoints = 0
  for (const [k, v] of Object.entries(d.skills?.owned && typeof d.skills.owned === 'object' ? d.skills.owned : {})) {
    if (LEGACY_SKILL_IDS.includes(k)) legacyPoints += 3 * Math.floor(num(v, 1, 1, 5))
  }
  for (const [k, v] of Object.entries(inv.scrolls && typeof inv.scrolls === 'object' ? inv.scrolls : {})) {
    if (k.startsWith('qk_') && LEGACY_SKILL_IDS.includes(k.slice(3))) legacyPoints += 0.4 * Math.floor(num(v, 0))
  }
  // Cây kỹ năng: chỉ nút có thật, cấp trong khoảng hợp lệ; điểm kỹ năng không âm
  const tree = {}
  for (const [k, v] of Object.entries(d.skills?.tree && typeof d.skills.tree === 'object' ? d.skills.tree : {})) {
    if (TREE_SKILLS[k]) tree[k] = Math.floor(num(v, 1, 1, treeMaxLevel(k)))
  }
  const skillPoints = num(d.skills?.points, 0, 0, 1e9) + Math.round(legacyPoints * 10) / 10
  // Pháp Bảo: giữ pháp bảo tồn tại, phẩm hợp lệ; ô gắn phải là pháp bảo đã luyện hoá, không trùng
  const trOwned = {}
  for (const [k, v] of Object.entries(d.treasures?.owned && typeof d.treasures.owned === 'object' ? d.treasures.owned : {})) {
    if (TREASURES[k]) trOwned[k] = Math.floor(num(v, 1, 1, TREASURE_MAX_TIER))
  }
  const trSeen = new Set()
  const trSlots = Array.from({ length: MAX_TREASURE_SLOTS }, (_, i) => {
    const id = d.treasures?.slots?.[i]
    if (!trOwned[id] || trSeen.has(id)) return null
    trSeen.add(id)
    return id
  })
  // Công pháp (bị động): giữ công pháp tồn tại, cấp hợp lệ (save cũ có ô trang bị thì bỏ qua: mọi công pháp đã học đều có hiệu lực)
  const artsOwned = {}
  for (const [k, v] of Object.entries(d.arts?.owned && typeof d.arts.owned === 'object' ? d.arts.owned : {})) {
    if (ARTS[k]) artsOwned[k] = Math.floor(num(v, 1, 1, ART_MAX_LEVEL))
  }
  // Ngộ đạo: chỉ công pháp đã đạt cấp tối đa và đặc tính nằm trong ba lựa chọn được chào
  const artsAwaken = {}
  for (const [k, v] of Object.entries(d.arts?.awaken && typeof d.arts.awaken === 'object' ? d.arts.awaken : {})) {
    if (artsOwned[k] === ART_MAX_LEVEL && awakenOffer(k).includes(v)) artsAwaken[k] = v
  }
  // Linh thú: giữ linh thú tồn tại, cấp hợp lệ; ô ra trận phải là linh thú đã thu phục, không trùng
  const petsOwned = {}
  for (const [k, v] of Object.entries(d.pets?.owned && typeof d.pets.owned === 'object' ? d.pets.owned : {})) {
    if (PETS[k]) petsOwned[k] = Math.floor(num(v, 1, 1, PET_MAX_LEVEL))
  }
  const petSeen = new Set()
  const petActive = Array.from({ length: MAX_PET_SLOTS }, (_, i) => {
    const id = d.pets?.active?.[i]
    if (!petsOwned[id] || petSeen.has(id)) return null
    petSeen.add(id)
    return id
  })
  // Trang bị: kiểm tra từng món, bỏ món hỏng; ô mặc phải trỏ tới món có thật đúng ô
  const bag = []
  const seen = new Set()
  for (const raw of Array.isArray(d.gear?.bag) ? d.gear.bag : []) {
    // Save cũ có ô 'Pháp bảo' (trinket): chuyển thành Ngọc bội (chỉ số khí huyết / linh khí tương tự)
    const it = raw && raw.slot === 'trinket' ? { ...raw, slot: 'jade' } : raw
    if (bag.length >= BAG_LIMIT || !it || typeof it.uid !== 'string' || seen.has(it.uid)) continue
    if (!SLOTS[it.slot] || !TIERS[it.tier] || !RARITIES[it.rarity]) continue
    seen.add(it.uid)
    // Dòng phụ: id hợp lệ, hợp ô, không trùng, giá trị trong khoảng; Huyền Thoại phải đúng ô
    const affSeen = new Set()
    const affixes = []
    for (const a of Array.isArray(it.affixes) ? it.affixes : []) {
      const def = a && AFFIXES[a.id]
      if (!def || !def.slots.includes(it.slot) || affSeen.has(a.id) || affixes.length >= MAX_AFFIXES) continue
      affSeen.add(a.id)
      affixes.push({ id: a.id, v: num(a.v, def.min, 0, def.max * 3) })
    }
    const legend = LEGENDS[it.legend]?.slot === it.slot ? it.legend : undefined
    bag.push({ uid: it.uid, slot: it.slot, tier: it.tier, rarity: it.rarity, enh: Math.floor(num(it.enh, 0, 0, MAX_ENHANCE)), affixes: legend ? [] : affixes, ...(legend ? { legend } : {}), ...(it.locked === true ? { locked: true } : {}) })
  }
  const equipped = {}
  for (const slot of Object.keys(SLOTS)) {
    const uid = d.gear?.equipped?.[slot] ?? (slot === 'jade' ? d.gear?.equipped?.trinket : undefined)
    equipped[slot] = bag.some((it) => it.uid === uid && it.slot === slot) ? uid : null
  }
  const achTier = {}
  for (const a of ACHIEVEMENTS) achTier[a.id] = Math.floor(num(d.achTier?.[a.id], 0, 0, a.targets.length))
  // Điểm danh và nhiệm vụ ngày: ngày hợp lệ YYYY-MM-DD, mẫu nhiệm vụ có thật, tối đa DAILY_TASK_COUNT nhiệm vụ
  const daily = emptyDaily()
  if (d.daily && typeof d.daily.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.daily.day)) {
    daily.day = d.daily.day
    daily.streak = Math.floor(num(d.daily.streak, 0, 0, 100000))
    daily.claimed = d.daily.claimed === true
    daily.bonus = d.daily.bonus === true
    for (const t of Array.isArray(d.daily.tasks) ? d.daily.tasks : []) {
      if (daily.tasks.length >= DAILY_TASK_COUNT || !t || !templateById(t.tpl)) continue
      daily.tasks.push({ tpl: t.tpl, target: Math.max(1, Math.floor(num(t.target, 1))), start: num(t.start, 0), claimed: t.claimed === true })
    }
  }
  // Kiếp Thử Thách: số lần hoàn thành mỗi thử thách hợp lệ
  const challenges = {}
  for (const id of Object.keys(CHALLENGES)) {
    const n = Math.floor(num(d.reincarnation?.challenges?.[id], 0, 0, 1e6))
    if (n > 0) challenges[id] = n
  }
  // Luân Hồi: chỉ giữ cường hoá hợp lệ, cấp không vượt tối đa
  const upgrades = {}
  for (const p of PERKS) {
    const lv = Math.floor(num(d.reincarnation?.upgrades?.[p.id], 0, 0, p.max))
    if (lv > 0) upgrades[p.id] = lv
  }
  // Linh Điền: luống phải có đủ MAX_PLOTS phần tử, cây hợp lệ
  const plots = Array.from({ length: MAX_PLOTS }, (_, i) => {
    const pl = d.garden?.plots?.[i]
    return pl && CROPS.some((c) => c.id === pl.crop) && Number.isFinite(pl.readyAt) ? { crop: pl.crop, readyAt: pl.readyAt } : null
  })
  // Tông môn / nhiệm vụ / đệ tử: loại bỏ dữ liệu không hợp lệ thay vì làm hỏng save
  const sect = {
    id: sectById(d.sect?.id) ? d.sect.id : null,
    contribution: Math.floor(num(d.sect?.contribution, 0)),
    total: Math.floor(num(d.sect?.total, 0)),
  }
  const questSeen = new Set()
  const quests = []
  for (const q of Array.isArray(d.quests) ? d.quests : []) {
    if (!q || typeof q.uid !== 'string' || questSeen.has(q.uid) || !templateById(q.tpl) || !QUEST_TIERS[q.tier]) continue
    questSeen.add(q.uid)
    quests.push({ uid: q.uid, tpl: q.tpl, tier: q.tier, target: Math.max(1, Math.floor(num(q.target, 1))), start: num(q.start, 0) })
  }
  const discSeen = new Set()
  const disciples = []
  for (const x of Array.isArray(d.disciples) ? d.disciples : []) {
    if (!x || typeof x.uid !== 'string' || discSeen.has(x.uid) || !GRADES[x.grade] || !ELEMENTS[x.element]) continue
    discSeen.add(x.uid)
    disciples.push({
      uid: x.uid,
      name: typeof x.name === 'string' ? x.name.slice(0, 20) : 'Đệ tử',
      element: x.element,
      grade: x.grade,
      level: Math.floor(num(x.level, 1, 1, MAX_LEVEL)),
      job: JOBS[x.job] ? x.job : null,
      since: num(x.since, Date.now(), 0, Date.now()),
    })
  }
  // Thám hiểm: nhiệm vụ có thật, đệ tử tồn tại và chỉ thuộc một đoàn; đệ tử "đang đi" phải nằm trong một thám hiểm
  const away = new Set()
  const expeditions = []
  for (const e of Array.isArray(d.expeditions) ? d.expeditions : []) {
    if (!e || !MISSIONS[e.id]) continue
    const uids = [...new Set(Array.isArray(e.uids) ? e.uids : [])].filter((u) => discSeen.has(u) && !away.has(u)).slice(0, MAX_PARTY)
    if (uids.length === 0) continue
    uids.forEach((u) => away.add(u))
    expeditions.push({ id: e.id, uids, since: num(e.since, Date.now(), 0, Date.now() + 1000), seconds: MISSIONS[e.id].seconds })
  }
  for (const x of disciples) {
    const raw = d.disciples.find((y) => y && y.uid === x.uid)
    if (away.has(x.uid)) {
      x.away = true
      x.prevJob = JOBS[raw?.prevJob] ? raw.prevJob : null
      x.job = null
    }
  }
  // Công trình Động Phủ: chỉ công trình có thật, cấp hợp lệ
  const dwelling = Object.fromEntries(BUILDING_IDS.map((id) => [id, Math.floor(num(d.dwelling?.[id], 0, 0, BUILDING_MAX_LEVEL))]))
  // Cốt truyện: chỉ giữ cờ hợp lệ, chương và mục điển tịch có thật; danh hiệu suy ra từ kết cục
  const loreIds = new Set(LORE.map((l) => l.id))
  const pickIds = (obj, allowed) =>
    Object.fromEntries(Object.entries(obj && typeof obj === 'object' ? obj : {}).filter(([k, v]) => v === true && allowed(k)))
  const flags = {}
  for (const k of Object.keys(d.story?.flags && typeof d.story.flags === 'object' ? d.story.flags : {}).slice(0, 120)) {
    if (/^[a-z0-9_]{1,40}$/.test(k) && d.story.flags[k] === true) flags[k] = true
  }
  const ending = ENDINGS[d.story?.ending] ? d.story.ending : null
  const story = {
    done: Math.floor(num(d.story?.done, 0, 0, CHAPTERS.length)),
    flags,
    align: Math.round(num(d.story?.align, 0, -20, 20)),
    extras: pickIds(d.story?.extras, (k) => EXTRAS.some((e) => e.id === k)),
    seen: pickIds(d.story?.seen, (k) => loreIds.has(k)),
    lore: pickIds(d.story?.lore, (k) => loreIds.has(k)),
    ending,
    title: ending ? ENDINGS[ending].title : null,
  }
  return {
    story,
    sect,
    quests,
    disciples,
    reincarnation: {
      count: Math.floor(num(d.reincarnation?.count, 0)),
      dao: Math.floor(num(d.reincarnation?.dao, 0)),
      totalDao: Math.floor(num(d.reincarnation?.totalDao, 0)),
      challenges,
      upgrades,
    },
    garden: { plots },
    mineAt: num(d.mineAt, Date.now(), 0, Date.now()),
    element: ELEMENTS[d.element] ? d.element : defaults.element,
    skills: { tree, points: skillPoints },
    treasures: { owned: trOwned, slots: trSlots },
    arts: { owned: artsOwned, awaken: artsAwaken },
    pets: { owned: petsOwned, active: petActive },
    dwelling,
    expeditions,
    path: PATHS[d.path] ? d.path : PATHS[LEGACY_PATH[d.path]] ? LEGACY_PATH[d.path] : null, // save cũ có 5 đạo lộ: Pháp Tu / Đan Sư / Trận Pháp Sư thành Phù Tu
    challenge: CHALLENGES[d.challenge] ? d.challenge : null,
    talent: TALENTS[d.talent] ? d.talent : null,
    talentOffer: TALENTS[d.talent] ? [] : [...new Set(Array.isArray(d.talentOffer) ? d.talentOffer : [])].filter((id) => TALENTS[id]).slice(0, TALENT_OFFER_SIZE),
    daily,
    timeBank: Math.floor(num(d.timeBank, 0, 0, TIME_BANK_CAP)),
    challengeDone: d.challengeDone === true,
    gear: { bag, equipped },
    achTier,
    name: typeof d.name === 'string' && d.name.trim() ? d.name.slice(0, 24) : defaults.name,
    createdAt: num(d.createdAt, defaults.createdAt),
    spiritRoot: root,
    stageIdx: Math.floor(num(d.stageIdx, 0, 0, MAX_STAGE_IDX)),
    exp: dec(d.exp),
    spiritStones: dec(d.spiritStones),
    arrayLevel: Math.floor(num(d.arrayLevel, 0, 0, 100000)),
    bonus: {
      hp: num(d.bonus?.hp, 0),
      atk: num(d.bonus?.atk, 0),
      def: num(d.bonus?.def, 0),
      speed: num(d.bonus?.speed, 0),
      exp: num(d.bonus?.exp, 0),
      success: num(d.bonus?.success, 0),
    },
    inventory: {
      herbs: cleanGroup(inv.herbs, 'herbs'),
      ores: cleanGroup(inv.ores, 'ores'),
      scrolls: cleanGroup(inv.scrolls, 'scrolls'),
      pills: cleanGroup(inv.pills, 'pills'),
    },
    buffs: {
      success: num(d.buffs?.success, 0, 0, 1),
      guard: num(d.buffs?.guard, 0, 0, 0.9),
    },
    alchemy: {
      level: Math.floor(num(d.alchemy?.level, 1, 1, 30)),
      exp: num(d.alchemy?.exp, 0),
    },
    usage,
    campaign,
    stats: {
      breakthroughs: num(d.stats?.breakthroughs, 0),
      failures: num(d.stats?.failures, 0),
      tribulations: num(d.stats?.tribulations, 0),
      playSeconds: num(d.stats?.playSeconds, 0),
      kills: num(d.stats?.kills, 0),
      bossKills: num(d.stats?.bossKills, 0),
      crafted: num(d.stats?.crafted, 0),
      forged: num(d.stats?.forged, 0),
      events: num(d.stats?.events, 0),
      maxStage: Math.floor(num(d.stats?.maxStage, 0, 0, MAX_STAGE_IDX)),
      reincarnations: num(d.stats?.reincarnations, 0),
      harvests: num(d.stats?.harvests, 0),
      questsDone: num(d.stats?.questsDone, 0),
      dailyTasks: num(d.stats?.dailyTasks, 0),
      expeditions: num(d.stats?.expeditions, 0),
    },
    settings: {
      particles: d.settings?.particles !== false,
      autoSave: d.settings?.autoSave !== false,
      autoRepeat: !d.campaign || d.settings?.autoRepeat !== false, // save cũ: "tự động lặp bí cảnh" nay là "Tự chiến đấu", bật lại cho mọi người
      autoHeal: d.settings?.autoHeal !== false,
      sound: d.settings?.sound !== false,
      music: d.settings?.music !== false,
      autoBreak: d.settings?.autoBreak === true,
      notify: d.settings?.notify === true,
      warp: false,
      auto: Object.fromEntries(AUTOMATION_IDS.map((id) => [id, d.settings?.auto?.[id] === true])),
      autoCraft: RECIPES.some((r) => r.id === d.settings?.autoCraft) ? d.settings.autoCraft : null,
      salvageBelow: Math.floor(num(d.settings?.salvageBelow, 1, 1, 3)),
      haptic: d.settings?.haptic !== false,
      lastBackup: num(d.settings?.lastBackup, 0, 0, Date.now()),
      fontScale: ['sm', 'md', 'lg'].includes(d.settings?.fontScale) ? d.settings.fontScale : 'md',
    },
    savedAt: num(save.savedAt, Date.now()),
  }
}

// ---------------- LocalStorage ----------------

export function writeLocal(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    return true
  } catch {
    return false // hết dung lượng / chế độ riêng tư
  }
}

/** Đọc save từ LocalStorage; trả về object hoặc null nếu chưa có / hỏng. */
export function readLocal() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearLocal() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* bỏ qua */
  }
}

// ---------------- Export / Import file ----------------

/** Tải xuống savegame dưới dạng file .json. */
export function exportToFile(save) {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 16).replace(/\D/g, '')
  const a = document.createElement('a')
  a.href = url
  a.download = `tutien-save-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Đọc file .json do người chơi chọn -> object save (chưa validate). */
export function readFileAsSave(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Không đọc được file.'))
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)))
      } catch {
        reject(new Error('File không phải JSON hợp lệ.'))
      }
    }
    reader.readAsText(file)
  })
}
