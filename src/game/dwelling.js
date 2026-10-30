// =====================================================================
// dwelling.js - Công trình Động Phủ: nâng cấp bằng linh thạch, giữ nguyên khi luân hồi.
// Cấp L của một công trình cần bậc tu vi tối thiểu minStage + L - 1. perk là thưởng mỗi cấp (cộng gộp ở extraPerk,
// 'forge' là tăng xác suất rèn ra đồ hiếm hơn).
// =====================================================================
import { COST_SECONDS, refCost } from './campaign.js'

export const BUILDING_MAX_LEVEL = 10

export const BUILDINGS = {
  linh_mach: { name: 'Linh Mạch', minStage: 2, perk: { exp: 0.025 }, text: '+2.5% tốc độ linh khí mỗi cấp' },
  luyen_dan: { name: 'Luyện Đan Phòng', minStage: 4, perk: { double: 0.015 }, text: '+1.5% luyện đan ra gấp đôi mỗi cấp' },
  tang_kinh: { name: 'Tàng Kinh Các', minStage: 6, perk: { arts: 0.03 }, text: '+3% hiệu quả công pháp bị động mỗi cấp' },
  luyen_khi: { name: 'Luyện Khí Phòng', minStage: 8, perk: { forge: 0.08 }, text: '+8% xác suất rèn ra đồ hiếm hơn mỗi cấp' },
  dien_vo: { name: 'Diễn Võ Trường', minStage: 10, perk: { atk: 0.015, def: 0.015 }, text: '+1.5% công kích và phòng ngự mỗi cấp' },
}
export const BUILDING_IDS = Object.keys(BUILDINGS)
export const emptyDwelling = () => Object.fromEntries(BUILDING_IDS.map((id) => [id, 0]))

/** Bậc tu vi tối thiểu để lên cấp kế tiếp của công trình (từ cấp `level`). */
export const buildingNeedStage = (id, level) => BUILDINGS[id].minStage + level

/** Linh thạch để nâng công trình `id` từ cấp `level` lên cấp kế: vài phút thu nhập tham chiếu tại bậc mở khoá cấp đó (xem stoneRef ở campaign.js). */
export const buildingCost = (id, level) => refCost(buildingNeedStage(id, level), COST_SECONDS.building * (1 + 0.3 * level))

/** Tổng thưởng từ mọi công trình: { exp, double, arts, forge, atk, def } (khoá thiếu là 0). */
export function dwellingPerks(levels) {
  const out = { exp: 0, double: 0, arts: 0, forge: 0, atk: 0, def: 0 }
  for (const [id, b] of Object.entries(BUILDINGS)) {
    for (const [k, per] of Object.entries(b.perk)) out[k] += per * (levels[id] ?? 0)
  }
  return out
}
