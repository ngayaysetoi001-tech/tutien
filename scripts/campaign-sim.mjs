// campaign-sim.mjs - Đo ải cao nhất mà người chơi (không đan/trang bị) vượt được ở từng bậc tu vi.
// Chạy: node scripts/campaign-sim.mjs
import { combatStats } from '../src/game/formulas.js'
import { winChance, campaignExpBonus, campaignStonesPerSecond } from '../src/game/campaign.js'
import { STAGES } from '../src/game/constants.js'
import { fmt } from '../src/game/format.js'

const ZERO = { hp: 0, atk: 0, def: 0, speed: 0 }
const MULTS = [1, 1.5, 2.5]
const frontier = (stats) => {
  let n = 1
  // ải cao nhất còn thắng >= 50%
  while (n < 600 && winChance(stats, n + 1, 60) >= 0.5) n++
  return n
}
console.log('Bậc'.padEnd(18) + MULTS.map((m) => `chỉ số x${m}`.padStart(14)).join(''))
for (let s = 0; s < STAGES.length; s += 2) {
  const base = combatStats(s, ZERO)
  const row = MULTS.map((m) => String(frontier({ ...base, hp: base.hp * m, atk: base.atk * m, def: base.def * m })).padStart(14))
  console.log(`${String(s).padStart(2)} ${STAGES[s].fullName}`.padEnd(18) + row.join(''))
}
for (const n of [10, 50, 100, 200]) {
  console.log(`ải ${n}: +${(campaignExpBonus(n) * 100).toFixed(0)}% linh khí, +${fmt(campaignStonesPerSecond(n))} linh thạch/s`)
}
