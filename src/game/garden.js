// =====================================================================
// garden.js - Hoạt động theo giờ thật: Linh Điền (gieo trồng thảo dược) và Khoáng Mạch.
// Dùng mốc thời gian (Date.now) nên vẫn tiếp tục lớn khi đóng tab / offline.
// =====================================================================
import { COST_SECONDS, refCost } from './campaign.js'

/** Cây trồng: thời gian lớn (giây), sản lượng [min, max], mở theo bậc tu vi. */
export const CROPS = [
  { id: 'linh_thao', minStage: 0, power: 0, seconds: 300, yield: [4, 6] },
  { id: 'huyet_sam', minStage: 2, power: 2, seconds: 900, yield: [3, 4] },
  { id: 'tu_van_thao', minStage: 9, power: 9, seconds: 3600, yield: [3, 4] },
  { id: 'bang_lien', minStage: 12, power: 12, seconds: 7200, yield: [2, 3] },
  { id: 'thien_nien_chi', minStage: 15, power: 15, seconds: 14400, yield: [2, 3] },
  { id: 'hoa_than_qua', minStage: 18, power: 18, seconds: 21600, yield: [2, 3] },
]
export const MAX_PLOTS = 6
export const cropById = (id) => CROPS.find((c) => c.id === id)

/** Số luống đất mở: 2 ban đầu, +1 mỗi 6 bậc tu vi, tối đa 6. */
export const plotCount = (stageIdx) => Math.min(MAX_PLOTS, 2 + Math.floor(stageIdx / 6))

/** Giá hạt giống (linh thạch). */
export const seedCost = (crop) => refCost(crop.minStage, COST_SECONDS.seed)

/** Khoáng mạch: loại quặng và sản lượng/giờ theo bậc tu vi (lấy dòng cuối cùng phù hợp). */
const MINE_TABLE = [
  { minStage: 0, ore: 'thiet_tinh', perHour: 20 },
  { minStage: 9, ore: 'huyen_thiet', perHour: 12 },
  { minStage: 15, ore: 'tinh_kim', perHour: 6 },
  { minStage: 18, ore: 'hu_khong_thach', perHour: 8 },
  { minStage: 24, ore: 'hon_don_tinh', perHour: 3 },
]
export const MINE_CAP_SECONDS = 8 * 3600

export function mineInfo(stageIdx) {
  let row = MINE_TABLE[0]
  for (const r of MINE_TABLE) if (stageIdx >= r.minStage) row = r
  return row
}

/** Số quặng tích luỹ sau `elapsedSeconds` giây (tối đa 8 giờ). */
export function mineAmount(stageIdx, elapsedSeconds) {
  const secs = Math.max(0, Math.min(elapsedSeconds, MINE_CAP_SECONDS))
  return Math.floor((mineInfo(stageIdx).perHour * secs) / 3600)
}
