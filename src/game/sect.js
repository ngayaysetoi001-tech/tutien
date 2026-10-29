// =====================================================================
// sect.js - Tông Môn: chọn môn phái, thăng cấp bậc bằng Cống Hiến, mua đồ ở cửa hàng tông môn.
// Cống Hiến kiếm từ nhiệm vụ và hạ boss. Giữ nguyên khi luân hồi.
// =====================================================================
import { SKILLS, fragmentId } from './skills.js'
import { ARTS, artFragmentId } from './arts.js'

/** Mỗi tông môn một hệ ngũ hành và một đặc quyền (perk). Đặc quyền tăng 25% mỗi cấp bậc. */
export const SECTS = [
  { id: 'thien_kiem', name: 'Thiên Kiếm Tông', element: 'kim', perk: { atk: 0.1 }, perkText: '+10% công kích',
    desc: 'Kiếm tu hung hãn, lấy sát phạt chứng đạo.' },
  { id: 'van_moc', name: 'Vạn Mộc Cốc', element: 'moc', perk: { herb: 0.25 }, perkText: '+25% thảo dược thu hoạch (Linh Điền, đệ tử)',
    desc: 'Thảo mộc sinh sôi, tinh thông dược đạo.' },
  { id: 'nguyet_thuy', name: 'Nguyệt Thủy Các', element: 'thuy', perk: { exp: 0.1 }, perkText: '+10% tốc độ linh khí',
    desc: 'Tâm tĩnh như nước, khí thuần như trăng.' },
  { id: 'xich_viem', name: 'Xích Viêm Môn', element: 'hoa', perk: { skill: 0.15 }, perkText: '+15% sát thương võ kỹ',
    desc: 'Liệt hỏa thiêu đốt, thần thông bá đạo.' },
  { id: 'hau_tho', name: 'Hậu Thổ Sơn', element: 'tho', perk: { hp: 0.1, def: 0.1 }, perkText: '+10% khí huyết và phòng ngự',
    desc: 'Vững như núi lớn, thân thể cường tráng.' },
]
export const sectById = (id) => SECTS.find((s) => s.id === id) ?? null

/** Cấp bậc theo tổng Cống Hiến đã tích luỹ. */
export const RANKS = [
  { name: 'Ngoại Môn Đệ Tử', need: 0 },
  { name: 'Nội Môn Đệ Tử', need: 100 },
  { name: 'Chân Truyền Đệ Tử', need: 500 },
  { name: 'Trưởng Lão', need: 2500 },
  { name: 'Phó Chưởng Môn', need: 10000 },
  { name: 'Chưởng Môn', need: 50000 },
]
export const RANK_PERK_STEP = 0.25 // mỗi cấp bậc +25% hiệu lực đặc quyền

export function rankIndex(totalContribution) {
  let idx = 0
  RANKS.forEach((r, i) => {
    if (totalContribution >= r.need) idx = i
  })
  return idx
}

/** Số đệ tử tối đa: 2 nếu chưa có tông môn, 3 + 2 mỗi cấp bậc nếu đã gia nhập. */
export const discipleCap = (rankIdx, inSect) => (inSect ? 3 + 2 * rankIdx : 2)

/** Mất 50% Cống Hiến khi đổi tông môn. */
export const SWITCH_PENALTY = 0.5

/** Cửa hàng tông môn: mua bằng Cống Hiến, mở theo cấp bậc. */
export const SHOP = [
  { id: 'hoi_huyet', item: 'hoi_huyet_dan', count: 3, cost: 8, rank: 0 },
  { id: 'tu_khi', item: 'tu_khi_dan', count: 2, cost: 10, rank: 0 },
  { id: 'duong_the', item: 'duong_the_dan', count: 1, cost: 40, rank: 1 },
  { id: 'kim_cang', item: 'kim_cang_dan', count: 1, cost: 50, rank: 1 },
  { id: 'cuong_can', item: 'cuong_can_dan', count: 1, cost: 60, rank: 1 },
  { id: 'huyen_thiet', item: 'huyen_thiet', count: 3, cost: 30, rank: 1 },
  { id: 'than_phap', item: 'than_phap_dan', count: 1, cost: 200, rank: 2 },
  { id: 'pha_canh', item: 'pha_canh_dan', count: 1, cost: 250, rank: 2 },
  { id: 'ho_kiep', item: 'ho_kiep_dan', count: 1, cost: 220, rank: 2 },
  { id: 'tinh_kim', item: 'tinh_kim', count: 1, cost: 100, rank: 2 },
  { id: 'bao_the', item: 'bao_the_dan', count: 1, cost: 900, rank: 3 },
  { id: 'kim_than', item: 'kim_than_dan', count: 1, cost: 1200, rank: 3 },
  { id: 'hon_don', item: 'hon_don_tinh', count: 1, cost: 600, rank: 3 },
  { id: 'ngo_dao', item: 'ngo_dao_dan', count: 1, cost: 3500, rank: 4 },
  { id: 'thien_pha', item: 'thien_pha_dan', count: 1, cost: 4000, rank: 4 },
  // Tàn quyển võ kỹ: mỗi loại 40 Cống Hiến, từ Nội Môn
  ...Object.keys(SKILLS).map((id) => ({ id: 'qk_' + id, item: fragmentId(id), count: 1, cost: 40, rank: 1 })),
  // Công Pháp Tàn Quyển: mỗi loại 60 Cống Hiến, từ Chân Truyền
  ...Object.keys(ARTS).map((id) => ({ id: 'cp_' + id, item: artFragmentId(id), count: 1, cost: 60, rank: 2 })),
]
