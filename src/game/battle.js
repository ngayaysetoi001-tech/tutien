// =====================================================================
// battle.js - Công thức & mô phỏng chiến đấu thuần (không phụ thuộc Vue/Pinia).
// Store dùng các hàm này để chạy trận theo thời gian thực; scripts/balance-sim.mjs
// dùng simulateRun() để kiểm tra cân bằng.
// =====================================================================
import Decimal from 'break_infinity.js'
import { combatStats } from './formulas.js'
import { MONSTERS } from './data.js'
import { BALANCE } from './constants.js'

export const CRIT_CHANCE = 0.1
export const CRIT_MULT = 1.5
export const FLOOR_GROWTH = 0.08 // mỗi tầng yêu thú mạnh thêm 8%
export const FLOOR_HEAL = 0.2 // hồi 20% khí huyết khi qua tầng
const ZERO_BONUS = { hp: 0, atk: 0, def: 0, speed: 0 }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/** Chỉ số yêu thú ở tầng `floor` của bí cảnh. */
export const ENEMY_SPREAD = 0.2
export const GRIT_STEP = 0.05 // mỗi lần tử trận: +5% chỉ số cho lượt sau ở cùng bí cảnh
export const GRIT_MAX = 6 // tối đa +30%, xoá khi hạ boss

/** Chỉ số yêu thú; nếu truyền `rng` thì hp/atk lệch ngẫu nhiên ±ENEMY_SPREAD cho từng con. */
export function enemyStats(dungeon, tmpl, floor, rng = null) {
  const base = combatStats(dungeon.power, ZERO_BONUS)
  const roll = () => (rng ? 1 + (rng() * 2 - 1) * ENEMY_SPREAD : 1)
  const scale = (1 + FLOOR_GROWTH * (floor - 1)) * (dungeon.difficulty ?? 1)
  return {
    hp: Math.round(base.hp * tmpl.hp * scale * roll()),
    atk: Math.round(base.atk * tmpl.atk * scale * roll()),
    def: Math.round(base.def * tmpl.def * (1 + FLOOR_GROWTH * (floor - 1))),
    speed: base.speed * tmpl.speed * 0.8,
  }
}

/** Số giây giữa hai lần ra đòn: Thân pháp càng cao đánh càng nhanh. */
export const actionInterval = (speed) => clamp(10 / speed, 0.35, 2.5)

/** Sát thương một đòn: công giảm theo phòng ngự, dao động ±10%, có thể chí mạng. */
export function rollHit(atk, def, rng = Math.random, critChance = 0, elementMult = 1) {
  const crit = rng() < critChance
  const variance = 0.8 + rng() * 0.4 // ±20%: kết quả trận mềm hơn, không còn "đủ bậc là thắng chắc"
  const damage = Math.max(1, Math.round(atk * (100 / (100 + def)) * variance * (crit ? CRIT_MULT : 1) * elementMult))
  return { damage, crit }
}

/** Chọn yêu thú cho một tầng: tầng cuối là boss. Trả về [id, template]. */
export function pickMonster(dungeon, floor, rng = Math.random) {
  const id = floor >= dungeon.floors ? dungeon.boss : dungeon.monsters[Math.floor(rng() * dungeon.monsters.length)]
  return [id, MONSTERS[id]]
}

/** Hệ số giảm thưởng khi tu vi vượt xa bậc chuẩn của bí cảnh (khuyến khích tiến lên bí cảnh mạnh hơn). */
export const overlevelFactor = (stageIdx, power) => Math.pow(BALANCE.killStoneDecay, Math.max(0, stageIdx - power))

/** Linh thạch rơi khi hạ yêu thú (Decimal). */
export function stoneReward(dungeon, tmpl, floor, stageIdx = dungeon.power) {
  const base = new Decimal(1.45).pow(dungeon.power).mul(2 * tmpl.reward * (1 + 0.1 * (floor - 1)) * overlevelFactor(stageIdx, dungeon.power))
  return tmpl.boss ? base.mul(5) : base
}

/** Thưởng thêm khi thông quan bí cảnh (Decimal). */
export function clearBonus(dungeon, stageIdx = dungeon.power) {
  return new Decimal(1.45).pow(dungeon.power).mul(40 * overlevelFactor(stageIdx, dungeon.power))
}

/** Cống Hiến tông môn khi hạ boss. */
export function bossContribution(dungeon, stageIdx = dungeon.power) {
  return Math.max(1, Math.round(1 * Math.pow(1.12, dungeon.power) * overlevelFactor(stageIdx, dungeon.power)))
}

/**
 * Thưởng linh khí khi hạ yêu thú = một số giây sản lượng. Giảm dần khi tu vi vượt xa bí cảnh
 * (cày bí cảnh quá yếu gần như không còn lợi), nên phải tiến lên bí cảnh mạnh hơn.
 */
export function expRewardSeconds(floor, boss, stageIdx = 0, power = 0) {
  const decay = Math.pow(BALANCE.killExpDecay, Math.max(0, stageIdx - power))
  return (2.5 + floor * 0.5) * (boss ? 4 : 1) * decay
}

/** Tung bảng rơi đồ. Trả về [{ id, count }]. */
export function rollLoot(dungeon, tmpl, floor, rng = Math.random, luck = 0) {
  const out = []
  for (const entry of dungeon.loot) {
    const base = tmpl.boss ? entry.bossChance ?? Math.min(1, entry.chance * 2) : entry.chance
    const chance = Math.min(1, base * (1 + luck)) // luck: thưởng Phúc Duyên khi luân hồi
    if (rng() < chance) {
      const count = entry.min + Math.floor(rng() * (entry.max - entry.min + 1))
      out.push({ id: entry.item, count })
    }
  }
  return out
}

/**
 * Mô phỏng một trận theo thời gian (không render). `player` có hp/maxHp/atk/def/speed.
 * Trả về { won, hp, time }.
 */
export function simulateFight(player, enemy, rng = Math.random, edge = { out: 1, in: 1 }) {
  let hp = player.hp
  let ehp = enemy.hp
  let tp = 0.4
  let te = actionInterval(enemy.speed) * 0.8
  let time = 0
  while (hp > 0 && ehp > 0 && time < 600) {
    if (tp <= te) {
      time = tp
      ehp -= rollHit(player.atk, enemy.def, rng, CRIT_CHANCE, edge.out).damage
      tp += actionInterval(player.speed)
    } else {
      time = te
      hp -= rollHit(enemy.atk, player.def, rng, 0, edge.in).damage
      te += actionInterval(enemy.speed)
    }
  }
  return { won: ehp <= 0 && hp > 0, hp: Math.max(0, hp), time }
}

/** Mô phỏng cả lượt vào bí cảnh. Trả về số tầng hạ được và boss có bị hạ không. */
export function simulateRun(playerStats, dungeon, rng = Math.random, edge = { out: 1, in: 1 }) {
  let hp = playerStats.hp
  let cleared = 0
  let time = 0
  for (let floor = 1; floor <= dungeon.floors; floor++) {
    const [, tmpl] = pickMonster(dungeon, floor, rng)
    const res = simulateFight({ ...playerStats, hp }, enemyStats(dungeon, tmpl, floor, rng), rng, edge)
    time += res.time + BETWEEN_SECONDS
    if (!res.won) return { cleared, boss: false, time: time + REST_DEAD_SECONDS }
    cleared++
    hp = Math.min(playerStats.hp, res.hp + playerStats.hp * FLOOR_HEAL)
  }
  return { cleared, boss: true, time: time + REST_CLEAR_SECONDS }
}

// Thời gian nghỉ giữa tầng / sau lượt (khớp battleStore)
export const BETWEEN_SECONDS = 0.9
export const REST_CLEAR_SECONDS = 3
export const REST_DEAD_SECONDS = 6
export const OFFLINE_FARM_EFFICIENCY = 0.5 // farm offline chỉ đạt 50% hiệu suất khi online
export const GEAR_DROP_BOSS = 0.4
export const GEAR_DROP_NORMAL = 0.03

/** Làm tròn ngẫu nhiên: 2.3 -> 2 (70%) hoặc 3 (30%). */
const stochRound = (x, rng) => Math.floor(x) + (rng() < x - Math.floor(x) ? 1 : 0)

/**
 * Ước lượng thu hoạch khi farm bí cảnh trong `seconds` giây lúc offline.
 * Lấy mẫu `samples` lượt chạy để biết thời gian và tỉ lệ qua từng tầng, rồi tính giá trị kỳ vọng.
 * Bỏ qua ngũ hành và công pháp (ước lượng bảo thủ). Trả về { runs, kills, bossKills, stones,
 * expSeconds, items: {id: n}, gearDrops, avgRunTime }.
 */
export function simulateOfflineFarm({ stats, dungeon, seconds, luck = 0, rng = Math.random, samples = 40, stageIdx = dungeon.power }) {
  const reach = new Array(dungeon.floors + 1).fill(0) // reach[f] = số mẫu hạ được tầng f
  let totalTime = 0
  for (let i = 0; i < samples; i++) {
    const r = simulateRun(stats, dungeon, rng)
    totalTime += r.time
    for (let f = 1; f <= r.cleared; f++) reach[f]++
  }
  const avgRunTime = totalTime / samples
  const runs = Math.floor((seconds * OFFLINE_FARM_EFFICIENCY) / avgRunTime)
  const out = { runs, kills: 0, bossKills: 0, stones: new Decimal(0), expSeconds: 0, items: {}, gearDrops: 0, avgRunTime }
  if (runs <= 0) return out
  const expected = {}
  let gearExpected = 0
  for (let f = 1; f <= dungeon.floors; f++) {
    const killsF = (runs * reach[f]) / samples
    if (killsF <= 0) continue
    const boss = f === dungeon.floors
    const ids = boss ? [dungeon.boss] : dungeon.monsters
    for (const id of ids) {
      const tmpl = MONSTERS[id]
      const share = killsF / ids.length
      out.stones = out.stones.add(stoneReward(dungeon, tmpl, f, stageIdx).mul(share))
      out.expSeconds += expRewardSeconds(f, boss, stageIdx, dungeon.power) * share
      gearExpected += share * (boss ? GEAR_DROP_BOSS : GEAR_DROP_NORMAL)
      for (const entry of dungeon.loot) {
        const base = boss ? entry.bossChance ?? Math.min(1, entry.chance * 2) : entry.chance
        const avg = (entry.min + entry.max) / 2
        expected[entry.item] = (expected[entry.item] ?? 0) + share * Math.min(1, base * (1 + luck)) * avg
      }
    }
    out.kills += killsF
    if (boss) out.bossKills += killsF
  }
  out.kills = stochRound(out.kills, rng)
  out.bossKills = stochRound(out.bossKills, rng)
  for (const [id, n] of Object.entries(expected)) {
    const count = stochRound(n, rng)
    if (count > 0) out.items[id] = count
  }
  out.gearDrops = stochRound(gearExpected, rng)
  return out
}
