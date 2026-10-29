// =====================================================================
// skills.js - Công pháp / thần thông tự động thi triển trong Bí Cảnh.
// Học bằng cách gom Tàn Quyển (rơi từ bí cảnh); thăng cấp bằng thêm tàn quyển.
// kind: damage (gây sát thương) | heal | shield (lá chắn) | haste (tăng tốc ra đòn)
// ô công pháp mở theo đại cảnh giới (1 -> 2 ở Trúc Cơ -> 3 ở Kim Đan).
// =====================================================================

export const SKILLS = {
  ngu_kiem: { name: 'Ngự Kiếm Thuật', element: 'kim', kind: 'damage', power: 1.8, cd: 6 },
  liet_hoa: { name: 'Liệt Hỏa Chưởng', element: 'hoa', kind: 'damage', power: 2.6, cd: 10 },
  huyen_bang: { name: 'Huyền Băng Thuật', element: 'thuy', kind: 'damage', power: 1.5, cd: 9, slow: 0.3, seconds: 5 },
  thanh_moc: { name: 'Thanh Mộc Quyết', element: 'moc', kind: 'heal', power: 0.25, cd: 18 },
  hau_tho: { name: 'Hậu Thổ Hộ Thể', element: 'tho', kind: 'shield', power: 0.3, cd: 15, seconds: 8 },
  phong_loi: { name: 'Phong Lôi Bộ', element: 'moc', kind: 'haste', power: 0.4, cd: 14, seconds: 6 },
}

export const SKILL_MAX_LEVEL = 5
export const LEARN_COST = 5 // số tàn quyển để học

export const fragmentId = (id) => 'qk_' + id
/** Mỗi cấp +20% hiệu lực, hồi chiêu giảm 5%. */
export const skillLevelMult = (level) => 1 + 0.2 * (level - 1)
export const skillCooldown = (id, level) => SKILLS[id].cd * (1 - 0.05 * (level - 1))
/** Số tàn quyển để lên từ cấp `level` lên cấp kế. */
export const upgradeCost = (level) => 5 * level
/** Số ô công pháp theo đại cảnh giới. */
export const slotCount = (realmIdx) => (realmIdx >= 2 ? 3 : realmIdx >= 1 ? 2 : 1)

/** Mô tả hiệu quả ở cấp `level`. */
export function skillDesc(id, level = 1) {
  const s = SKILLS[id]
  const p = s.power * skillLevelMult(level)
  const cd = skillCooldown(id, level).toFixed(1)
  const pct = Math.round(p * 100)
  switch (s.kind) {
    case 'damage':
      return `Gây ${pct}% công kích${s.slow ? `, làm chậm địch ${Math.round(s.slow * 100)}% trong ${s.seconds}s` : ''}. Hồi ${cd}s.`
    case 'heal':
      return `Hồi ${pct}% khí huyết tối đa. Hồi ${cd}s.`
    case 'shield':
      return `Lá chắn ${pct}% khí huyết trong ${s.seconds}s. Hồi ${cd}s.`
    default:
      return `Tăng ${pct}% tốc độ ra đòn trong ${s.seconds}s. Hồi ${cd}s.`
  }
}
