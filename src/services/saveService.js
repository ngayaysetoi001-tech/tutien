// =====================================================================
// saveService.js - Lưu / tải / xuất / nhập savegame
//  * LocalStorage: tự động lưu (store gọi mỗi 5 giây)
//  * Export: tải file .json   * Import: nạp file .json (có kiểm tra hợp lệ)
// Decimal được lưu dưới dạng chuỗi để JSON không mất độ chính xác.
// =====================================================================
import Decimal from 'break_infinity.js'
import { MAX_STAGE_IDX, SAVE_KEY, SAVE_VERSION, SPIRIT_ROOTS } from '../game/constants.js'
import { DUNGEONS, ITEMS } from '../game/data.js'
import { AIS_PER_CHAPTER, GRIT_MAX, MILESTONES } from '../game/campaign.js'
import { ELEMENTS } from '../game/elements.js'
import { SKILLS, SKILL_MAX_LEVEL } from '../game/skills.js'
import { ARTS, ART_MAX_LEVEL, MAX_ART_SLOTS } from '../game/arts.js'
import { PATHS } from '../game/paths.js'
import { MAX_SKILL_SLOTS } from '../game/skills.js'
import { AFFIXES, BAG_LIMIT, LEGENDS, MAX_AFFIXES, MAX_ENHANCE, RARITIES, SLOTS, TIERS } from '../game/equipment.js'
import { ACHIEVEMENTS } from '../game/achievements.js'
import { PERKS } from '../game/reincarnation.js'
import { CROPS, MAX_PLOTS } from '../game/garden.js'
import { sectById } from '../game/sect.js'
import { TIERS as QUEST_TIERS, templateById } from '../game/quests.js'
import { GRADES, JOBS, MAX_LEVEL } from '../game/disciples.js'
import { CHAPTERS, ENDINGS, EXTRAS } from '../game/story.js'
import { LORE } from '../game/lore.js'

/** Trích phần dữ liệu cần lưu từ state của store -> object JSON thuần. */
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
      path: state.path ?? null,
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
  // Võ kỹ: chỉ giữ võ kỹ tồn tại, cấp hợp lệ; ô trang bị phải là võ kỹ đã học (save cũ có 3 ô, nay 4)
  const owned = {}
  for (const [k, v] of Object.entries(d.skills?.owned && typeof d.skills.owned === 'object' ? d.skills.owned : {})) {
    if (SKILLS[k]) owned[k] = Math.floor(num(v, 1, 1, SKILL_MAX_LEVEL))
  }
  const slots = Array.from({ length: MAX_SKILL_SLOTS }, (_, i) => {
    const id = d.skills?.slots?.[i]
    return owned[id] ? id : null
  })
  // Công pháp (bị động): giữ công pháp tồn tại, cấp hợp lệ; ô trang bị phải là công pháp đã học, không trùng
  const artsOwned = {}
  for (const [k, v] of Object.entries(d.arts?.owned && typeof d.arts.owned === 'object' ? d.arts.owned : {})) {
    if (ARTS[k]) artsOwned[k] = Math.floor(num(v, 1, 1, ART_MAX_LEVEL))
  }
  const artSeen = new Set()
  const artSlots = Array.from({ length: MAX_ART_SLOTS }, (_, i) => {
    const id = d.arts?.slots?.[i]
    if (!artsOwned[id] || artSeen.has(id)) return null
    artSeen.add(id)
    return id
  })
  // Trang bị: kiểm tra từng món, bỏ món hỏng; ô mặc phải trỏ tới món có thật đúng ô
  const bag = []
  const seen = new Set()
  for (const it of Array.isArray(d.gear?.bag) ? d.gear.bag : []) {
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
    bag.push({ uid: it.uid, slot: it.slot, tier: it.tier, rarity: it.rarity, enh: Math.floor(num(it.enh, 0, 0, MAX_ENHANCE)), affixes: legend ? [] : affixes, ...(legend ? { legend } : {}) })
  }
  const equipped = {}
  for (const slot of Object.keys(SLOTS)) {
    const uid = d.gear?.equipped?.[slot]
    equipped[slot] = bag.some((it) => it.uid === uid && it.slot === slot) ? uid : null
  }
  const achTier = {}
  for (const a of ACHIEVEMENTS) achTier[a.id] = Math.floor(num(d.achTier?.[a.id], 0, 0, a.targets.length))
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
      upgrades,
    },
    garden: { plots },
    mineAt: num(d.mineAt, Date.now(), 0, Date.now()),
    element: ELEMENTS[d.element] ? d.element : defaults.element,
    skills: { owned, slots },
    arts: { owned: artsOwned, slots: artSlots },
    path: PATHS[d.path] ? d.path : null,
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
    },
    settings: {
      particles: d.settings?.particles !== false,
      autoSave: d.settings?.autoSave !== false,
      autoRepeat: !d.campaign || d.settings?.autoRepeat !== false, // save cũ: "tự động lặp bí cảnh" nay là "Tự chiến đấu", bật lại cho mọi người
      autoHeal: d.settings?.autoHeal !== false,
      sound: d.settings?.sound !== false,
      music: d.settings?.music !== false,
      autoBreak: d.settings?.autoBreak === true,
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
