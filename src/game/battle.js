// =====================================================================
// battle.js - Công thức chiến đấu thuần (không phụ thuộc Vue/Pinia).
// battleStore chạy trận theo thời gian thực bằng rollHit/actionInterval; campaign.js dựng yêu thú
// và mô phỏng cả trận bằng simulateFight (tỉ lệ thắng, offline); kỳ ngộ giao chiến dùng enemyStats.
// =====================================================================
import { combatStats } from './formulas.js'

export const CRIT_CHANCE = 0.1
export const CRIT_MULT = 1.5
export const FLOOR_GROWTH = 0.08 // kỳ ngộ giao chiến: mỗi "tầng" yêu thú mạnh thêm 8%
export const ENEMY_SPREAD = 0.2
const ZERO_BONUS = { hp: 0, atk: 0, def: 0, speed: 0 }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/**
 * Chỉ số yêu thú cho kỳ ngộ giao chiến: `dungeon` = { power: bậc tu vi, difficulty } và `floor` tầng giả định;
 * nếu truyền `rng` thì hp/atk lệch ngẫu nhiên ±ENEMY_SPREAD. (Vượt Ải dùng aiEnemyStats ở campaign.js.)
 */
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

/** Sát thương một đòn: công giảm theo phòng ngự, dao động ±20%, có thể chí mạng. */
export function rollHit(atk, def, rng = Math.random, critChance = 0, elementMult = 1, critMult = CRIT_MULT) {
  const crit = rng() < critChance
  const variance = 0.8 + rng() * 0.4 // ±20%: kết quả trận mềm hơn, không còn "đủ bậc là thắng chắc"
  const damage = Math.max(1, Math.round(atk * (100 / (100 + def)) * variance * (crit ? critMult : 1) * elementMult))
  return { damage, crit }
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
