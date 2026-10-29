// =====================================================================
// talents.js - Thiên Phú: mỗi kiếp bốc ra 3 thiên phú ngẫu nhiên, chọn 1 (hoặc đổi bộ khác bằng Đạo Vận).
// Thiên phú theo suốt kiếp đó, kiếp sau bốc lại. grade 0 thường, 1 hiếm, 2 cực hiếm (thưởng lớn hơn, ít gặp hơn).
// perk dùng các khoá thưởng bổ sung của extraPerk (gameStore): atk hp def speed crit cd thorns luck stones exp arts disciple dao pill double.
// =====================================================================

export const TALENTS = {
  linh_can: { name: 'Linh Căn Thiên Phú', grade: 0, perk: { exp: 0.15 }, text: '+15% tốc độ linh khí' },
  thiet_cot: { name: 'Thiết Cốt', grade: 0, perk: { hp: 0.15, def: 0.1 }, text: '+15% khí huyết, +10% phòng ngự' },
  kiem_cot: { name: 'Kiếm Cốt', grade: 0, perk: { atk: 0.15, crit: 0.03 }, text: '+15% công kích, +3% chí mạng' },
  van_may: { name: 'Vận May', grade: 0, perk: { luck: 0.2 }, text: '+20% tỉ lệ rơi đồ' },
  phu_quy: { name: 'Phú Quý', grade: 0, perk: { stones: 0.25 }, text: '+25% linh thạch' },
  tri_tue: { name: 'Trí Tuệ Siêu Phàm', grade: 0, perk: { arts: 0.2 }, text: '+20% hiệu quả công pháp bị động' },
  tong_su: { name: 'Tông Sư Khí Độ', grade: 0, perk: { disciple: 0.3 }, text: '+30% sản lượng đệ tử' },
  dan_dao: { name: 'Đan Đạo Thiên Tư', grade: 1, perk: { pill: 0.3, double: 0.08 }, text: '+30% hiệu quả đan, +8% luyện đan ra gấp đôi' },
  than_nhe: { name: 'Thân Nhẹ Như Yến', grade: 1, perk: { speed: 0.15, cd: 0.08 }, text: '+15% Thân pháp, võ kỹ hồi chiêu nhanh hơn 8%' },
  bat_khuat: { name: 'Bất Khuất', grade: 1, perk: { hp: 0.2, thorns: 0.08 }, text: '+20% khí huyết, phản 8% sát thương' },
  thien_co: { name: 'Thiên Cơ Nhãn', grade: 1, perk: { dao: 0.25 }, text: '+25% Đạo Vận khi luân hồi' },
  thien_linh: { name: 'Thiên Linh Chi Thể', grade: 2, perk: { exp: 0.3, luck: 0.1 }, text: '+30% tốc độ linh khí, +10% rơi đồ' },
  chien_than: { name: 'Chiến Thần Chuyển Thế', grade: 2, perk: { atk: 0.25, hp: 0.15, crit: 0.05 }, text: '+25% công kích, +15% khí huyết, +5% chí mạng' },
}
export const TALENT_IDS = Object.keys(TALENTS)
export const GRADE_NAMES = ['Thường', 'Hiếm', 'Cực hiếm']
export const GRADE_COLORS = ['#cbd5e1', '#60a5fa', '#f6c85f']
const GRADE_WEIGHT = [60, 30, 10]

export const TALENT_OFFER_SIZE = 3
export const TALENT_REROLL_COST = 3 // Đạo Vận

/** Bốc 3 thiên phú khác nhau theo trọng số độ hiếm. */
export function rollTalentOffer(rng = Math.random) {
  const pool = [...TALENT_IDS]
  const out = []
  while (out.length < TALENT_OFFER_SIZE && pool.length) {
    const total = pool.reduce((n, id) => n + GRADE_WEIGHT[TALENTS[id].grade], 0)
    let pick = rng() * total
    let idx = pool.findIndex((id) => (pick -= GRADE_WEIGHT[TALENTS[id].grade]) <= 0)
    if (idx < 0) idx = pool.length - 1
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

/** Thưởng của thiên phú đã chọn ({} nếu chưa chọn). */
export const talentPerk = (id) => ({ ...(TALENTS[id]?.perk ?? {}) })
