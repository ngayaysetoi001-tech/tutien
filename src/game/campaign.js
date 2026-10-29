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

const ZERO_BONUS = { hp: 0, atk: 0, def: 0, speed: 0 }

export const AIS_PER_CHAPTER = 10
export const STAGE_PER_AI = 0.25 // 4 ải = sức mạnh chuẩn của 1 bậc tu vi
export const AI_GROWTH = 1.004 // mỗi ải yêu thú mạnh thêm 0.4% (cộng dồn) ngoài tăng theo bậc tương đương
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

/** Chỉ số yêu thú ở ải n; truyền `rng` để hp/atk lệch ngẫu nhiên. */
export function aiEnemyStats(n, tmpl, kind, rng = null) {
  const base = combatStats(equivStage(n), ZERO_BONUS)
  const k = AI_KINDS[kind]
  const grow = Math.pow(AI_GROWTH, n - 1)
  const roll = () => (rng ? 1 + (rng() * 2 - 1) * ENEMY_SPREAD : 1)
  return {
    hp: Math.round(base.hp * tmpl.hp * k.hp * grow * roll()),
    atk: Math.round(base.atk * tmpl.atk * k.atk * grow * roll()),
    def: Math.round(base.def * tmpl.def * k.def),
    speed: base.speed * tmpl.speed * 0.8,
  }
}

/** Tỉ lệ thắng ước tính của `player` (hp/atk/def/speed) trước ải n bằng mô phỏng. */
export function winChance(player, n, samples = 40, rng = Math.random, edge = { out: 1, in: 1 }) {
  let wins = 0
  for (let i = 0; i < samples; i++) {
    const { tmpl, kind } = pickAiMonster(n, rng)
    const enemy = aiEnemyStats(n, tmpl, kind, rng)
    if (simulateFight({ ...player }, enemy, rng, edge).won) wins++
  }
  return wins / samples
}

// ---------------------------------------------------------------------
// Phần thưởng khi hạ yêu thú ở ải n
// ---------------------------------------------------------------------
/** Linh thạch rơi khi hạ yêu thú ải n. */
export function aiStoneReward(n, kind) {
  return new Decimal(1.45).pow(equivStage(n)).mul(2 * AI_KINDS[kind].reward * (1 + 0.02 * (n - 1)))
}

/** Thưởng linh khí: số giây sản lượng. */
export const aiExpSeconds = (n, kind) => (2.5 + 0.1 * n) * AI_KINDS[kind].reward

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
export const AI_EXP_PER_CLEAR = 0.05 // mỗi ải đã vượt cộng 5% tốc độ linh khí gốc
export const AI_STONE_PER_CLEAR = 0.04 // linh thạch/giây = số ải x hệ số x giá trị của ải đó

/** Hệ số cộng vào tốc độ linh khí (phân số, cộng chung với các thưởng % khác). */
export const campaignExpBonus = (best) => AI_EXP_PER_CLEAR * best

/** Linh thạch/giây cộng thêm (Decimal). */
export const campaignStonesPerSecond = (best) =>
  best <= 0 ? new Decimal(0) : new Decimal(1.45).pow(equivStage(best)).mul(AI_STONE_PER_CLEAR * best)

/**
 * Nguyên liệu nhận mỗi giờ theo chương hiện tại: lấy thảo dược/khoáng thạch trong bảng rơi
 * của bối cảnh ải `best`, số lượng tăng theo ải. Trả về [{ id, perHour }].
 */
export function campaignItemsPerHour(best) {
  if (best <= 0) return []
  const scale = 1 + best / 25
  const out = []
  for (const entry of themeOf(best).dungeon.loot) {
    const group = ITEMS[entry.item]?.group
    if (group !== 'herbs' && group !== 'ores') continue
    out.push({ id: entry.item, perHour: entry.chance * ((entry.min + entry.max) / 2) * 4 * scale })
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

