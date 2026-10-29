// =====================================================================
// formulas.js - Toàn bộ công thức tính toán (thuần hàm, không phụ thuộc Vue/Pinia)
// Dễ test và dễ cân bằng game: chỉ cần chỉnh BALANCE trong constants.js.
// =====================================================================
import Decimal from 'break_infinity.js'
import { BALANCE, MAX_STAGE_IDX, STAGES, TRIBULATIONS } from './constants.js'

/** Linh khí cần để đột phá khỏi bậc `stageIdx`. */
export function stageRequirement(stageIdx) {
  return new Decimal(BALANCE.requirementGrowth).pow(stageIdx).mul(BALANCE.baseRequirement)
}

/**
 * Linh khí/giây (Passive Exp):
 *   (1 + 0.1 * cấpTrận)                   -> Tụ Linh Trận
 *   * hệ số căn cốt
 *   * 1.5^bậc                            -> cảnh giới càng cao hút linh khí càng mạnh
 *   * (1 + thưởng vĩnh viễn từ đan dược)
 */
export function expPerSecond({ arrayLevel, rootMult, stageIdx, expBonus }) {
  const array = 1 + 0.1 * arrayLevel // tuyến tính: mỗi cấp trận +10% sản lượng gốc
  return new Decimal(BALANCE.stageExpGrowth)
    .pow(stageIdx)
    .mul(array)
    .mul(rootMult)
    .mul(1 + expBonus)
}

/** Linh thạch/giây: nguồn thu cơ bản khi chưa mở Bí Cảnh. */
export function stonesPerSecond(stageIdx) {
  return new Decimal(0.1 * (1 + 0.3 * stageIdx))
}

/** Lượng linh khí nhận được mỗi lần bấm "Tụ Khí" (tối thiểu 1). */
export function clickGain(expRate) {
  const gain = expRate.mul(BALANCE.clickSeconds)
  return gain.lt(1) ? new Decimal(1) : gain
}

/** Tỉ lệ đột phá thành công (0..1): 90% bậc đầu, giảm 3%/bậc, sàn 40%. */
export function successRate(stageIdx, bonus = 0) {
  const base = BALANCE.baseSuccessRate - BALANCE.successDropPerStage * stageIdx
  return Math.min(1, Math.max(BALANCE.minSuccessRate, base) + bonus)
}

/** Chỉ số chiến đấu/độ kiếp: tăng theo bậc cộng với thưởng vĩnh viễn. */
export function combatStats(stageIdx, bonus) {
  return {
    hp: Math.round(100 + 60 * stageIdx + bonus.hp), // Khí huyết
    atk: Math.round(10 + 6 * stageIdx + bonus.atk), // Công kích
    def: Math.round(5 + 4 * stageIdx + bonus.def), // Phòng ngự
    speed: Math.round(10 + stageIdx + bonus.speed), // Thân pháp
  }
}

/**
 * Kháng đan: mỗi lần dùng cùng một loại đan/tàn quyển chỉ còn 93% hiệu quả lần trước.
 * Không có sàn, nên tổng cộng dồn hữu hạn (tối đa ~14 lần hiệu quả gốc) và sức mạnh không tăng vô hạn.
 */
export function usageFactor(uses) {
  return Math.pow(0.93, uses)
}

/** Kinh nghiệm cần để lên cấp Luyện Đan. */
export function alchemyExpNeeded(level) {
  return Math.round(10 * Math.pow(1.3, level - 1))
}

/** Tỉ lệ ra gấp đôi thành phẩm: +1.5% mỗi cấp luyện đan, tối đa 40%. */
export function alchemyDoubleChance(level) {
  return Math.min(0.4, 0.015 * (level - 1))
}

/** Giá nâng Tụ Linh Trận từ cấp hiện tại lên cấp kế. */
export function arrayUpgradeCost(level) {
  return new Decimal(BALANCE.arrayCostGrowth).pow(level).mul(BALANCE.arrayBaseCost)
}

/** Phần thưởng linh thạch khi đột phá thành công lên bậc `newStageIdx`. */
export function breakthroughReward(newStageIdx) {
  return new Decimal(1.6).pow(newStageIdx).mul(20)
}

/** Bậc hiện tại có phải đột phá đại cảnh giới (và còn cảnh giới kế) không? */
export function isMajorBreakthrough(stageIdx) {
  return stageIdx < MAX_STAGE_IDX && STAGES[stageIdx].isRealmLast
}

/** Trả về cấu hình thiên kiếp nếu lần đột phá này cần độ kiếp, ngược lại null. */
export function tribulationFor(stageIdx) {
  if (!isMajorBreakthrough(stageIdx)) return null
  return TRIBULATIONS[STAGES[stageIdx].realmIdx] ?? null
}

/**
 * Sát thương một đạo thiên lôi sau khi trừ phòng ngự.
 * `roll` (0..1) cho phép test deterministic; mặc định random ±12%.
 */
export function boltDamage(cfg, boltIndex, def, roll = Math.random()) {
  const raw = cfg.base * Math.pow(cfg.growth, boltIndex)
  const variance = 0.88 + roll * 0.24
  return Math.max(1, Math.round(raw * variance * (100 / (100 + def))))
}

/**
 * Tính lượng linh khí/linh thạch nhận được khi offline.
 * Linh khí bị chặn ở mức yêu cầu đột phá (không vượt 100%).
 */
export function offlineGain({ seconds, expRate, stonesRate, exp, requirement }) {
  const rawExp = expRate.mul(seconds)
  const room = requirement.sub(exp)
  const gainedExp = room.lte(0) ? new Decimal(0) : rawExp.gt(room) ? room : rawExp
  return { exp: gainedExp, stones: stonesRate.mul(seconds) }
}
