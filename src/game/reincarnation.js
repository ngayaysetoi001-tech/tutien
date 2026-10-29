// =====================================================================
// reincarnation.js - Luân Hồi (prestige): đặt lại tiến trình để nhận Đạo Vận,
// dùng Đạo Vận mua cường hoá vĩnh viễn cho các kiếp sau.
//
// Mất khi luân hồi : cảnh giới, linh khí, linh thạch, Tụ Linh Trận, đan/chỉ số vĩnh viễn,
//                    túi vật phẩm, tiến độ bí cảnh, Linh Điền; căn cốt và hệ ngũ hành đổi mới.
// Giữ lại          : võ kỹ, công pháp, trang bị, cấp Luyện Đan, thành tựu, thống kê, Đạo Vận và cường hoá.
// =====================================================================

export const MIN_STAGE = 9 // cần tối thiểu Trúc Cơ Sơ Kỳ

/** Đạo Vận nhận được nếu luân hồi ở bậc `stageIdx` (0 nếu chưa đủ điều kiện). */
export function daoGain(stageIdx) {
  return stageIdx < MIN_STAGE ? 0 : Math.floor(3 * Math.pow(1.4, stageIdx - MIN_STAGE))
}

/** Các cường hoá vĩnh viễn mua bằng Đạo Vận. */
export const PERKS = [
  { id: 'tu_chat', name: 'Tu Chất', desc: '+10% tốc độ linh khí mỗi cấp', max: 20, base: 3, growth: 1.5 },
  { id: 'than_the', name: 'Thân Thể', desc: '+5% khí huyết, công kích, phòng ngự mỗi cấp', max: 20, base: 5, growth: 1.5 },
  { id: 'phuc_duyen', name: 'Phúc Duyên', desc: '+10% tỉ lệ rơi đồ (vật phẩm, trang bị) mỗi cấp', max: 10, base: 4, growth: 1.6 },
  { id: 'tuc_hue', name: 'Túc Huệ', desc: 'Kiếp sau khởi đầu với Tụ Linh Trận +3 cấp mỗi cấp', max: 10, base: 6, growth: 1.5 },
  { id: 'thien_menh', name: 'Thiên Mệnh', desc: 'Căn cốt kiếp sau không thấp hơn một bậc mỗi cấp', max: 4, base: 20, growth: 2.5 },
  { id: 'bi_quan', name: 'Bế Quan Dài', desc: '+1 giờ tối đa cho tu luyện và farm offline mỗi cấp', max: 8, base: 8, growth: 1.5 },
]

export const perkById = (id) => PERKS.find((p) => p.id === id)

/** Đạo Vận cần để lên từ cấp `level` lên cấp kế. */
export const perkCost = (perk, level) => Math.max(1, Math.round(perk.base * Math.pow(perk.growth, level)))
