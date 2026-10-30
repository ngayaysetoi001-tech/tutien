// =====================================================================
// automation.js - Tự động hoá mở khoá dần: các việc vặt trở thành phần thưởng của tiến độ,
// người chơi bật / tắt từng cái ở Cài Đặt (mặc định tắt).
// need: { kind, value } kind = record (ải cao nhất từng đạt) | quests (nhiệm vụ đã xong) | stage (bậc tu vi cao nhất)
//                              | harvests (lần thu hoạch Linh Điền) | crafted (đan đã luyện)
// =====================================================================

export const AUTOMATIONS = [
  { id: 'equip', name: 'Tự mặc đồ tốt nhất', desc: 'Mỗi ô tự mặc món có phẩm cấp, độ hiếm, dòng phụ tốt nhất trong túi.', need: { kind: 'record', value: 20 }, text: 'Đạt ải 20' },
  { id: 'claim', name: 'Tự nhận thưởng', desc: 'Tự nhận nhiệm vụ đã xong, thành tựu và rương mốc ải.', need: { kind: 'quests', value: 10 }, text: 'Hoàn thành 10 nhiệm vụ' },
  { id: 'array', name: 'Tự nâng Tụ Linh Trận', desc: 'Nâng trận khi linh thạch gấp đôi giá nâng (giữ lại một nửa để dùng việc khác).', need: { kind: 'stage', value: 5 }, text: 'Đạt Luyện Khí Tầng 6' },
  { id: 'collect', name: 'Tự thu hoạch', desc: 'Tự thu Linh Điền (gieo lại cây tốt nhất), khoáng mạch và sản lượng đệ tử.', need: { kind: 'harvests', value: 10 }, text: 'Thu hoạch Linh Điền 10 lần' },
  { id: 'craft', name: 'Tự luyện đan', desc: 'Tự luyện loại đan đã chọn khi đủ nguyên liệu và linh thạch.', need: { kind: 'crafted', value: 25 }, text: 'Luyện thành 25 viên đan' },
  { id: 'salvage', name: 'Tự phân giải đồ yếu', desc: 'Tự phân giải trang bị không mặc có độ hiếm dưới ngưỡng đã chọn (giữ món tốt nhất mỗi ô và đồ Huyền Thoại).', need: { kind: 'record', value: 40 }, text: 'Đạt ải 40' },
]
export const AUTOMATION_IDS = AUTOMATIONS.map((a) => a.id)
export const automationById = (id) => AUTOMATIONS.find((a) => a.id === id) ?? null

/** Giá trị hiện tại của điều kiện mở khoá (g = store game). */
export function automationValue(a, g) {
  switch (a.need.kind) {
    case 'record': return g.campaign.record
    case 'quests': return g.stats.questsDone
    case 'stage': return Math.max(g.stageIdx, g.stats.maxStage)
    case 'harvests': return g.stats.harvests
    default: return g.stats.crafted
  }
}
export const automationUnlocked = (a, g) => automationValue(a, g) >= a.need.value

/** Ngưỡng tự phân giải: phân giải đồ có độ hiếm < ngưỡng. 1 = chỉ Phàm, 2 = Phàm và Linh, 3 = tới Bảo (giữ Tiên). */
export const SALVAGE_MIN = 1
export const SALVAGE_MAX = 3
/** Giây giữa hai lần chạy tự động hoá. */
export const AUTOMATION_INTERVAL = 2
