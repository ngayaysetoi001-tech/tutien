// =====================================================================
// disciples.js - Đệ tử: thu nhận bằng linh thạch, giao việc, sản lượng tích luỹ theo giờ thật.
// Việc: Hái Thuốc (thảo dược), Khai Khoáng (quặng), Trấn Thủ (linh thạch).
// Tích luỹ tối đa 8 giờ; cùng hệ với tông môn được +10%.
// =====================================================================
import Decimal from 'break_infinity.js'
import { CROPS, mineInfo } from './garden.js'
import { stonesPerSecond } from './formulas.js'
import { COST_SECONDS, refCost } from './campaign.js'

export const GRADES = [
  { name: 'Phàm', mult: 1, weight: 55, css: '#cbd5e1' },
  { name: 'Linh', mult: 1.5, weight: 30, css: '#4fdca6' },
  { name: 'Bảo', mult: 2.2, weight: 12, css: '#60a5fa' },
  { name: 'Tiên', mult: 3.5, weight: 3, css: '#f6c85f' },
]

export const JOBS = {
  herb: { name: 'Hái Thuốc', desc: 'Mỗi giờ hái thảo dược cao cấp nhất đang mở' },
  ore: { name: 'Khai Khoáng', desc: 'Mỗi giờ đào khoáng thạch hợp bậc' },
  guard: { name: 'Trấn Thủ', desc: 'Mỗi giờ thu linh thạch cho động phủ' },
}
export const JOB_IDS = Object.keys(JOBS)

export const NAMES = ['Thanh Vân', 'Minh Nguyệt', 'Hàn Phong', 'Tử Diên', 'Lăng Tiêu', 'Mặc Hiên', 'Dao Quang', 'Bạch Lộ', 'Huyền Ca', 'Tịch Dương', 'Vân Sơ', 'Ngọc Hành']

export const MAX_LEVEL = 20
export const MAX_ACCRUE_SECONDS = 8 * 3600
export const SAME_ELEMENT_BONUS = 0.1

/** Linh thạch thu nhận đệ tử thứ (owned + 1). */
export const recruitCost = (stageIdx, owned) => refCost(Math.max(stageIdx, 4), COST_SECONDS.recruit * Math.pow(2, owned))

/** Cấp tối đa của đệ tử theo tu vi của chủ nhân. */
export const levelCap = (stageIdx) => Math.min(MAX_LEVEL, 3 + Math.floor(stageIdx / 2))

/** Linh thạch để nâng đệ tử từ cấp `level` lên cấp kế. */
export const levelCost = (stageIdx, level) => refCost(Math.max(stageIdx, 3), COST_SECONDS.discipleLevel * Math.pow(1.5, level - 1))

export function rollGrade(rng = Math.random) {
  const total = GRADES.reduce((n, g) => n + g.weight, 0)
  let pick = rng() * total
  for (let i = 0; i < GRADES.length; i++) {
    pick -= GRADES[i].weight
    if (pick <= 0) return i
  }
  return 0
}

/** Cây thảo dược tốt nhất đang mở ở bậc `stageIdx`. */
export function bestCrop(stageIdx) {
  let best = CROPS[0]
  for (const c of CROPS) if (stageIdx >= c.minStage) best = c
  return best
}

/** Hệ số sản lượng của một đệ tử. */
export const discipleMult = (d, sectElement) =>
  GRADES[d.grade].mult * (1 + 0.15 * (d.level - 1)) * (d.element === sectElement ? 1 + SAME_ELEMENT_BONUS : 1)

/**
 * Sản lượng mỗi giờ: { kind: 'item'|'stones', id, perHour }.
 * perHour là số lượng (item) hoặc Decimal (stones).
 */
export function outputPerHour(d, stageIdx, { sectElement = null, herbPerk = 0, bonus = 0 } = {}) {
  const m = discipleMult(d, sectElement) * (1 + bonus) // bonus: Trận Pháp Sư +25%
  if (d.job === 'herb') return { kind: 'item', id: bestCrop(stageIdx).id, perHour: 12 * m * (1 + herbPerk) }
  if (d.job === 'ore') return { kind: 'item', id: mineInfo(stageIdx).ore, perHour: 0.8 * mineInfo(stageIdx).perHour * m }
  // Trấn Thủ: mỗi giờ thu 2 phút thu nhập linh thạch tham chiếu của bậc (linh thạch chỉ có từ thời gian, không có thưởng hạ quái)
  if (d.job === 'guard') return { kind: 'stones', id: 'stones', perHour: refCost(stageIdx, 120 * m) }
  return null
}

/**
 * Tính phần thu được tại thời điểm `now` (ms): { kind, id, amount, since }.
 *  - item: chỉ thu khi đủ ≥ 1; phần lẻ giữ lại bằng cách lùi mốc `since` tương ứng.
 *  - stones: thu mọi lúc, đặt lại mốc.
 * Trả về null nếu chưa có gì để thu.
 */
export function collectResult(d, stageIdx, ctx, now) {
  const out = outputPerHour(d, stageIdx, ctx)
  if (!out) return null
  const elapsed = Math.max(0, (now - d.since) / 1000)
  const secs = Math.min(elapsed, MAX_ACCRUE_SECONDS)
  const hours = secs / 3600
  if (out.kind === 'stones') {
    const amount = out.perHour.mul(hours)
    return amount.gt(0) ? { kind: 'stones', id: 'stones', amount, since: now } : null
  }
  const amount = Math.floor(out.perHour * hours)
  if (amount < 1) return null
  const consumed = (amount / out.perHour) * 3600 // giây đã "tiêu" cho phần nguyên
  const remaining = Math.max(0, secs - consumed) // phần lẻ còn lại
  return { kind: 'item', id: out.id, amount, since: now - remaining * 1000 }
}

/** Số đang tích luỹ (để hiển thị), không đổi trạng thái. */
export function pending(d, stageIdx, ctx, now) {
  const out = outputPerHour(d, stageIdx, ctx)
  if (!out) return null
  const hours = Math.min(Math.max(0, (now - d.since) / 1000), MAX_ACCRUE_SECONDS) / 3600
  return out.kind === 'stones' ? { kind: 'stones', id: 'stones', amount: out.perHour.mul(hours) } : { kind: 'item', id: out.id, amount: out.perHour * hours }
}
