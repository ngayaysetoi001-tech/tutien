// =====================================================================
// campaign.js - Vượt Ải: chuỗi ải vô hạn, thay cho các bí cảnh chọn tay.
//   Ải n: thường; chia hết cho 5 = Tiểu Boss; cho 10 = Đại Boss; cho 100 = Chúa Tể.
//   Mỗi 10 ải là một chương, bối cảnh/yêu thú quay vòng qua 8 bí cảnh trong DUNGEONS.
//   Thua ở ải n + 1 thì dừng ở đó: thu nhập thụ động theo ải cao nhất đã vượt (n).
// Thuần hàm (không phụ thuộc Vue/Pinia) để store và scripts/campaign-sim.mjs dùng chung.
// =====================================================================
import Decimal from 'break_infinity.js'
import { combatStats } from './formulas.js'
import { DUNGEONS, ITEMS, MONSTERS } from './data.js'
import { actionInterval, CRIT_CHANCE, rollHit, simulateFight } from './battle.js'
import { BALANCE } from './constants.js'

const ZERO_BONUS = { hp: 0, atk: 0, def: 0, speed: 0 }

export const AIS_PER_CHAPTER = 10
export const STAGE_PER_AI = 0.5 // 2 ải = sức mạnh chuẩn của 1 bậc tu vi (trang bị, đan, công pháp nâng thêm ~1-4 lần nên người chơi thực tế đi nhanh hơn)
export const AI_GROWTH = 1.006 // mỗi ải yêu thú mạnh thêm 0.6% (cộng dồn) ngoài tăng theo bậc tương đương
export const ENEMY_SPREAD = 0.15 // mỗi yêu thú lệch ±15% khí huyết/công kích

/** Loại ải và hệ số nhân chỉ số (hp/atk/def) so với mẫu yêu thú. */
export const AI_KINDS = {
  normal: { name: 'Yêu thú', hp: 1, atk: 1, def: 1, reward: 1, gear: 0.03 },
  mini: { name: 'Tiểu Boss', hp: 1.5, atk: 1.2, def: 1.05, reward: 3, gear: 0.25 },
  big: { name: 'Đại Boss', hp: 1.3, atk: 1.2, def: 1.1, reward: 8, gear: 0.7 },
  lord: { name: 'Chúa Tể', hp: 2, atk: 1.5, def: 1.2, reward: 25, gear: 1 },
}

export function aiKind(n) {
  if (n % 100 === 0) return 'lord'
  if (n % 10 === 0) return 'big'
  if (n % 5 === 0) return 'mini'
  return 'normal'
}

export const chapterOf = (n) => Math.ceil(n / AIS_PER_CHAPTER)

/** Bối cảnh của ải n: bí cảnh gốc cho yêu thú, nền, bảng rơi; `round` = đã quay vòng mấy lần. */
export function themeOf(n) {
  const idx = (chapterOf(n) - 1) % DUNGEONS.length
  return { dungeon: DUNGEONS[idx], idx, round: Math.floor((chapterOf(n) - 1) / DUNGEONS.length) }
}

export function chapterName(n) {
  const { dungeon, round } = themeOf(n)
  return `${dungeon.name}${round > 0 ? ` (vòng ${round + 1})` : ''}`
}

/** Bậc tu vi tương đương của yêu thú ở ải n (số thực, ải 1 = bậc 0). */
export const equivStage = (n) => Math.max(0, (n - 1) * STAGE_PER_AI)

/** Chọn mẫu yêu thú: boss lớn/chúa tể dùng boss của bối cảnh, còn lại lấy yêu thú thường. */
export function pickAiMonster(n, rng = Math.random) {
  const { dungeon } = themeOf(n)
  const kind = aiKind(n)
  const id = kind === 'big' || kind === 'lord' ? dungeon.boss : dungeon.monsters[Math.floor(rng() * dungeon.monsters.length)]
  return { id, tmpl: MONSTERS[id], kind }
}

// ---------------------------------------------------------------------
// Đặc tính yêu thú và kỹ năng boss
// ---------------------------------------------------------------------
/**
 * kind 'trait' (yêu thú thường, Tiểu Boss, Đại Boss, Chúa Tể) hoặc 'boss' (kỹ năng của Đại Boss / Chúa Tể).
 * stat: hệ số nhân chỉ số, áp dụng thật vào trận.
 * sim : hệ số nhân xấp xỉ cho hành vi trong trận (hồi sinh, phản đòn...) chỉ dùng khi ước lượng tỉ lệ thắng và mô phỏng offline.
 * Hành vi thật nằm trong battleStore.
 */
export const ENEMY_MODS = {
  cuong_toc: { kind: 'trait', name: 'Cuồng Tốc', desc: 'Đánh nhanh hơn 30%.', stat: { speed: 1.3 } },
  giap_day: { kind: 'trait', name: 'Giáp Dày', desc: 'Phòng ngự x1.6, khí huyết +10%.', stat: { def: 1.6, hp: 1.1 } },
  ngoan_cuong: { kind: 'trait', name: 'Ngoan Cường', desc: 'Khí huyết x1.5 nhưng công kích giảm 15%.', stat: { hp: 1.5, atk: 0.85 } },
  hung_han: { kind: 'trait', name: 'Hung Hãn', desc: 'Công kích +30% nhưng khí huyết giảm 15%.', stat: { atk: 1.3, hp: 0.85 } },
  hoi_sinh: { kind: 'trait', name: 'Hồi Sinh', desc: 'Gục lần đầu thì sống lại với 40% khí huyết.', sim: { hp: 1.4 } },
  hut_mau: { kind: 'trait', name: 'Hút Máu', desc: 'Mỗi đòn đánh hồi cho nó 40% sát thương gây ra.', sim: { hp: 1.2 } },
  khang_vo_ky: { kind: 'trait', name: 'Kháng Võ Kỹ', desc: 'Võ kỹ và độc gây ít hơn 30% sát thương.' },
  nhat_chem: { kind: 'boss', name: 'Nhát Chém Ngàn Cân', desc: 'Mỗi đòn thứ 4 gây gấp 2.5 sát thương.', sim: { atk: 1.37 } },
  cuong_hoa: { kind: 'boss', name: 'Cuồng Hóa', desc: 'Dưới 40% khí huyết: công kích +35%, đánh nhanh hơn 20%.', sim: { atk: 1.12, speed: 1.05 } },
  tai_sinh: { kind: 'boss', name: 'Huyết Hồn Tái Sinh', desc: 'Dưới 50% khí huyết: hồi 25% khí huyết một lần.', sim: { hp: 1.25 } },
}
export const TRAIT_POOL = ['cuong_toc', 'giap_day', 'ngoan_cuong', 'hung_han', 'hoi_sinh', 'hut_mau', 'khang_vo_ky']
export const BOSS_SKILL_POOL = ['nhat_chem', 'cuong_hoa', 'tai_sinh']

/** Băm cố định theo số ải: đặc tính của một ải luôn như nhau (hiển thị trước được, ước lượng đúng). */
function hashAi(n, salt = 0) {
  let x = Math.imul((n + salt * 7919) | 0, 0x9e3779b1) >>> 0
  x ^= x >>> 15
  x = Math.imul(x, 0x85ebca6b) >>> 0
  x ^= x >>> 13
  return x >>> 0
}

/**
 * Danh sách đặc tính/kỹ năng của ải n (id trong ENEMY_MODS).
 *  - Ải thường từ ải 8: 25% có một đặc tính; Tiểu Boss từ ải 5: 70% có một đặc tính.
 *  - Đại Boss: một kỹ năng boss theo chương, 50% thêm một đặc tính.
 *  - Chúa Tể: hai kỹ năng boss khác nhau và một đặc tính.
 */
export function aiMods(n) {
  const kind = aiKind(n)
  const trait = () => TRAIT_POOL[hashAi(n, 1) % TRAIT_POOL.length]
  const chapter = chapterOf(n)
  if (kind === 'normal') return n >= 8 && hashAi(n) % 100 < 25 ? [trait()] : []
  if (kind === 'mini') return n >= 5 && hashAi(n) % 100 < 70 ? [trait()] : []
  const first = BOSS_SKILL_POOL[chapter % BOSS_SKILL_POOL.length]
  if (kind === 'big') return hashAi(n) % 100 < 50 ? [first, trait()] : [first]
  return [first, BOSS_SKILL_POOL[(chapter + 1) % BOSS_SKILL_POOL.length], trait()]
}

/** Chỉ số yêu thú ở ải n (đã tính đặc tính); truyền `rng` để hp/atk lệch ngẫu nhiên. `forSim` cộng thêm xấp xỉ hành vi để ước lượng. */
export function aiEnemyStats(n, tmpl, kind, rng = null, forSim = false) {
  const base = combatStats(equivStage(n), ZERO_BONUS)
  const k = AI_KINDS[kind]
  const grow = Math.pow(AI_GROWTH, n - 1)
  const roll = () => (rng ? 1 + (rng() * 2 - 1) * ENEMY_SPREAD : 1)
  const stats = {
    hp: base.hp * tmpl.hp * k.hp * grow * roll(),
    atk: base.atk * tmpl.atk * k.atk * grow * roll(),
    def: base.def * tmpl.def * k.def,
    speed: base.speed * tmpl.speed * 0.8,
  }
  for (const id of aiMods(n)) {
    const m = ENEMY_MODS[id]
    for (const [key, mult] of Object.entries(m.stat ?? {})) stats[key] *= mult
    if (forSim) for (const [key, mult] of Object.entries(m.sim ?? {})) stats[key] *= mult
  }
  return { hp: Math.round(stats.hp), atk: Math.round(stats.atk), def: Math.round(stats.def), speed: stats.speed }
}

/** Tỉ lệ thắng ước tính của `player` (hp/atk/def/speed) trước ải n bằng mô phỏng. */
export function winChance(player, n, samples = 40, rng = Math.random, edge = { out: 1, in: 1 }) {
  let wins = 0
  for (let i = 0; i < samples; i++) {
    const { tmpl, kind } = pickAiMonster(n, rng)
    const enemy = aiEnemyStats(n, tmpl, kind, rng, true)
    if (simulateFight({ ...player }, enemy, rng, edge).won) wins++
  }
  return wins / samples
}

// ---------------------------------------------------------------------
// Phần thưởng khi hạ yêu thú ở ải n
// ---------------------------------------------------------------------
export const OVERLEVEL_GRACE = 6 // tu vi vượt ải quá 6 bậc thì thưởng bắt đầu giảm (cày ải quá yếu)

/** Hệ số giảm thưởng khi cày ải yếu hơn hẳn tu vi hiện tại. */
export const overlevel = (stageIdx, n, decay) => Math.pow(decay, Math.max(0, stageIdx - equivStage(n) - OVERLEVEL_GRACE))

/** Linh thạch rơi khi hạ yêu thú ải n. */
export function aiStoneReward(n, kind, stageIdx = 0) {
  return new Decimal(1.45).pow(equivStage(n)).mul(2 * AI_KINDS[kind].reward * (1 + 0.02 * (n - 1)) * overlevel(stageIdx, n, BALANCE.killStoneDecay))
}

/** Thưởng linh khí khi hạ yêu thú: số giây sản lượng (nhỏ, vì thu nhập chính là thụ động theo ải). */
export const aiExpSeconds = (n, kind, stageIdx = 0) =>
  (1.5 + 0.03 * Math.min(n, 200)) * AI_KINDS[kind].reward * overlevel(stageIdx, n, BALANCE.killExpDecay)

/** Thưởng một lần khi lần đầu vượt ải n (Tiểu Boss trở lên): linh thạch cộng thêm. */
export function firstClearStones(n) {
  const kind = aiKind(n)
  return kind === 'normal' ? new Decimal(0) : new Decimal(1.45).pow(equivStage(n)).mul(10 * AI_KINDS[kind].reward)
}

/** Cống Hiến tông môn khi hạ boss (Tiểu Boss trở lên). */
export function aiContribution(n, kind) {
  if (kind === 'normal') return 0
  return Math.max(1, Math.round(0.6 * Math.pow(1.12, equivStage(n)) * (AI_KINDS[kind].reward / 3)))
}

/** Tung bảng rơi đồ của bối cảnh ải n. Trả về [{ id, count }]. */
export function rollAiLoot(n, kind, rng = Math.random, luck = 0) {
  const out = []
  const boss = kind !== 'normal'
  for (const entry of themeOf(n).dungeon.loot) {
    const base = boss ? entry.bossChance ?? Math.min(1, entry.chance * 2) : entry.chance
    if (rng() < Math.min(1, base * (1 + luck) * (kind === 'normal' ? 1 : 1 + AI_KINDS[kind].reward / 20))) {
      out.push({ id: entry.item, count: entry.min + Math.floor(rng() * (entry.max - entry.min + 1)) })
    }
  }
  return out
}

// ---------------------------------------------------------------------
// Thu nhập thụ động theo ải cao nhất đã vượt (`best`)
// ---------------------------------------------------------------------
export const AI_EXP_PER_CLEAR = 0.02 // mỗi ải đã vượt cộng 2% tốc độ linh khí gốc
export const AI_STONE_PER_CLEAR = 0.04 // linh thạch/giây = số ải x hệ số x giá trị của ải đó

export const INCOME_AI_BASE = 10 // trần ải được tính thu nhập = BASE + PER_STAGE x bậc tu vi
export const INCOME_AI_PER_STAGE = 8 // nhờ vậy kiếp mới có trang bị cũ cũng không hưởng thu nhập ải cao ngay từ bậc đầu

/** Ải được tính thu nhập: ải cao nhất đã vượt, nhưng không quá trần theo bậc tu vi. */
export const incomeAi = (best, stageIdx = Infinity) => Math.min(best, INCOME_AI_BASE + INCOME_AI_PER_STAGE * stageIdx)

/** Hệ số cộng vào tốc độ linh khí (phân số, cộng chung với các thưởng % khác). */
export const campaignExpBonus = (best, stageIdx = Infinity, mult = 1) => AI_EXP_PER_CLEAR * incomeAi(best, stageIdx) * mult

/** Linh thạch/giây cộng thêm (Decimal). */
export const campaignStonesPerSecond = (best, stageIdx = Infinity, mult = 1) => {
  const n = incomeAi(best, stageIdx)
  return n <= 0 ? new Decimal(0) : new Decimal(1.45).pow(equivStage(n)).mul(AI_STONE_PER_CLEAR * n * mult)
}

/**
 * Nguyên liệu nhận mỗi giờ theo chương hiện tại: lấy thảo dược/khoáng thạch trong bảng rơi
 * của bối cảnh ải `best`, số lượng tăng theo ải. Trả về [{ id, perHour }].
 */
export function campaignItemsPerHour(rawBest, stageIdx = Infinity, mult = 1) {
  const best = incomeAi(rawBest, stageIdx)
  if (best <= 0) return []
  const scale = 1 + best / 25
  const out = []
  for (const entry of themeOf(best).dungeon.loot) {
    const group = ITEMS[entry.item]?.group
    if (group !== 'herbs' && group !== 'ores') continue
    out.push({ id: entry.item, perHour: entry.chance * ((entry.min + entry.max) / 2) * 4 * scale * mult })
  }
  return out
}

/** Số giây dự kiến để thử một ải (ước lượng cho hiển thị). */
export function expectedFightSeconds(player, n) {
  const { tmpl, kind } = pickAiMonster(n, () => 0)
  const enemy = aiEnemyStats(n, tmpl, kind)
  const dealt = rollHit(player.atk, enemy.def, () => 0.5, 0).damage / actionInterval(player.speed)
  return Math.min(120, enemy.hp / Math.max(1, dealt * (1 + CRIT_CHANCE * 0.5)))
}


// ---------------------------------------------------------------------
// Offline: mô phỏng leo ải trong lúc vắng mặt
// ---------------------------------------------------------------------
export const GRIT_STEP = 0.05 // mỗi lần thua liên tiếp ở cùng một ải: +5% chỉ số cho lần thử sau
export const GRIT_MAX = 6 // tối đa +30%, xoá khi vượt ải
export const ATTEMPT_SECONDS = 12 // một lần thử ~ 8 giây đánh + 6 giây nghỉ nếu thua (ước lượng)
export const OFFLINE_CLIMB_EFFICIENCY = 0.5
const MAX_OFFLINE_ATTEMPTS = 3000
const MAX_OFFLINE_GEAR = 20

/** Nhân chỉ số theo Kiên Trì (số lần thua liên tiếp ở ải đang kẹt). */
export const gritStats = (stats, grit) => {
  const k = 1 + GRIT_STEP * grit
  return { ...stats, hp: Math.round(stats.hp * k), atk: Math.round(stats.atk * k), def: Math.round(stats.def * k) }
}

/**
 * Mô phỏng người chơi tiếp tục thử ải kế tiếp khi vắng mặt (hiệu suất 50%).
 * Trả về { best, grit, wins, attempts, stones, gear: [tier...] }; không tính linh khí
 * (đã có trong thu nhập thụ động).
 */
export function simulateOfflineClimb({ stats, best, grit = 0, seconds, stageIdx = 0, rng = Math.random }) {
  const attempts = Math.min(MAX_OFFLINE_ATTEMPTS, Math.floor((seconds * OFFLINE_CLIMB_EFFICIENCY) / ATTEMPT_SECONDS))
  const out = { best, grit, wins: 0, attempts, stones: new Decimal(0), gear: [] }
  for (let i = 0; i < attempts; i++) {
    const n = out.best + 1
    const { tmpl, kind } = pickAiMonster(n, rng)
    const enemy = aiEnemyStats(n, tmpl, kind, rng, true)
    const hero = gritStats(stats, out.grit)
    if (simulateFight({ ...hero }, enemy, rng).won) {
      out.best = n
      out.grit = 0
      out.wins++
      out.stones = out.stones.add(aiStoneReward(n, kind, stageIdx)).add(firstClearStones(n))
      if (out.gear.length < MAX_OFFLINE_GEAR && rng() < AI_KINDS[kind].gear) out.gear.push(themeOf(n).idx)
    } else {
      out.grit = Math.min(GRIT_MAX, out.grit + 1)
    }
  }
  return out
}
