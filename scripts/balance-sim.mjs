// =====================================================================
// balance-sim.mjs - Mô phỏng cân bằng chiến đấu (Monte Carlo)
// Chạy: npm run sim
// Với mỗi bí cảnh, người chơi ở các bậc (minStage + offset) không dùng đan:
// in số tầng trung bình hạ được và tỉ lệ hạ boss.
// =====================================================================
import { DUNGEONS } from '../src/game/data.js'
import { GRIT_MAX, GRIT_STEP, simulateRun } from '../src/game/battle.js'
import { combatStats } from '../src/game/formulas.js'

const RUNS = 3000
const ZERO = { hp: 0, atk: 0, def: 0, speed: 0 }

console.log('Bậc người chơi so với bậc chuẩn bí cảnh (0 = đúng bậc), không dùng đan:\n')
for (const dungeon of DUNGEONS) {
  console.log(`${dungeon.name} (bậc chuẩn ${dungeon.minStage})`)
  for (const offset of [0, 1, 2, 3, 4]) {
    const stage = Math.min(26, dungeon.minStage + offset)
    const stats = combatStats(stage, ZERO)
    let floors = 0
    let bosses = 0
    for (let i = 0; i < RUNS; i++) {
      const r = simulateRun(stats, dungeon)
      floors += r.cleared
      if (r.boss) bosses++
    }
    console.log(
      `  +${offset}: tầng TB ${(floors / RUNS).toFixed(2)}/${dungeon.floors}  hạ boss ${((bosses / RUNS) * 100).toFixed(0)}%`,
    )
  }
}

// ---- Ảnh hưởng của ngũ hành (đánh x1.2 / bị đánh x0.85 và ngược lại) ----
const EDGES = [
  ['hệ khắc yêu thú', { out: 1.2, in: 0.85 }],
  ['trung tính', { out: 1, in: 1 }],
  ['bị yêu thú khắc', { out: 0.85, in: 1.2 }],
]
console.log('\nẢnh hưởng ngũ hành (bậc +1 so với bậc chuẩn, hạ boss %):')
for (const dungeon of DUNGEONS) {
  const stats = combatStats(Math.min(26, dungeon.minStage + 1), ZERO)
  const row = EDGES.map(([label, edge]) => {
    let bosses = 0
    for (let i = 0; i < RUNS; i++) if (simulateRun(stats, dungeon, Math.random, edge).boss) bosses++
    return `${label} ${((bosses / RUNS) * 100).toFixed(0)}%`
  })
  console.log(`  ${dungeon.name}: ${row.join(' | ')}`)
}

// ---- Đường cong độ khó: tỉ lệ hạ boss theo hệ số sức mạnh (nhân hp/công/thủ) ----
const CURVE_DUNGEONS = [DUNGEONS[0], DUNGEONS[3], DUNGEONS[6]]
const MULTS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.45, 1.6, 1.8]
console.log('\nHạ boss theo hệ số sức mạnh so với bậc chuẩn (x1.0 = đúng bậc, mỗi bậc tu vi ~ x1.35):')
for (const dungeon of CURVE_DUNGEONS) {
  const base = combatStats(dungeon.minStage, ZERO)
  const row = MULTS.map((m) => {
    const stats = { ...base, hp: base.hp * m, atk: base.atk * m, def: base.def * m }
    let wins = 0
    for (let i = 0; i < RUNS; i++) if (simulateRun(stats, dungeon).boss) wins++
    return `x${m.toFixed(2)}:${String(Math.round((wins / RUNS) * 100)).padStart(3)}%`
  })
  console.log(`  ${dungeon.name.padEnd(20)} ${row.join(' ')}`)
}

// ---- Kiên Trì: số lần thử trung bình để hạ boss (mỗi lần thua +5% chỉ số, tối đa +30%) ----
function attemptsToClear(stats, dungeon) {
  let grit = 0
  for (let attempt = 1; attempt <= 60; attempt++) {
    const k = 1 + GRIT_STEP * grit
    const s = { ...stats, hp: stats.hp * k, atk: stats.atk * k, def: stats.def * k }
    if (simulateRun(s, dungeon).boss) return attempt
    grit = Math.min(GRIT_MAX, grit + 1)
  }
  return 60
}
console.log('\nSố lượt thử trung bình để hạ boss nhờ Kiên Trì (không đan, không công pháp):')
for (const dungeon of DUNGEONS) {
  const row = [0, 1, 2].map((off) => {
    const stats = combatStats(Math.min(26, dungeon.minStage + off), ZERO)
    let total = 0
    for (let i = 0; i < 300; i++) total += attemptsToClear(stats, dungeon)
    return `+${off}: ${(total / 300).toFixed(1)} lượt`
  })
  console.log(`  ${dungeon.name.padEnd(20)} ${row.join(' | ')}`)
}
