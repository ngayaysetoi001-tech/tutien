// =====================================================================
// skills.js - Võ Kỹ: chiêu thức chủ động, tự thi triển khi Vượt Ải (hồi chiêu xong thì tung).
// Học bằng cách gom Tàn Quyển (rơi từ ải); thăng cấp bằng thêm tàn quyển.
// (Công pháp tăng bị động là hệ thống khác: xem arts.js.)
//
// kind:
//   damage    gây sát thương
//   dot       sát thương mỗi giây trong `seconds` giây (power = % công kích mỗi giây)
//   stun      gây sát thương và làm địch choáng `seconds` giây (mất lượt ra đòn)
//   execute   gây sát thương, nhân thêm `bonus` nếu khí huyết địch dưới `threshold`
//   ultimate  sát thương lớn, hồi chiêu dài, cần đạt đại cảnh giới `minRealm` mới trang bị được
//   heal      hồi khí huyết    shield  lá chắn    haste  tăng tốc ra đòn
//   lifesteal hút máu: đòn đánh hồi `power` x sát thương gây ra trong `seconds` giây
//   rage      tăng `power` công kích trong `seconds` giây
//   reflect   phản lại `power` x sát thương nhận vào trong `seconds` giây
// Ô võ kỹ mở theo đại cảnh giới (1 -> 2 ở Trúc Cơ -> 3 ở Kim Đan -> 4 ở Hóa Thần).
// =====================================================================

export const SKILLS = {
  ngu_kiem: { name: 'Ngự Kiếm Thuật', element: 'kim', kind: 'damage', power: 1.8, cd: 6 },
  liet_hoa: { name: 'Liệt Hỏa Chưởng', element: 'hoa', kind: 'damage', power: 2.6, cd: 10 },
  huyen_bang: { name: 'Huyền Băng Thuật', element: 'thuy', kind: 'damage', power: 1.5, cd: 9, slow: 0.3, seconds: 5 },
  thanh_moc: { name: 'Thanh Mộc Quyết', element: 'moc', kind: 'heal', power: 0.25, cd: 18 },
  hau_tho: { name: 'Hậu Thổ Hộ Thể', element: 'tho', kind: 'shield', power: 0.3, cd: 15, seconds: 8 },
  phong_loi: { name: 'Phong Lôi Bộ', element: 'moc', kind: 'haste', power: 0.4, cd: 14, seconds: 6 },
  doc_chu: { name: 'Độc Chú', element: 'moc', kind: 'dot', power: 0.45, cd: 12, seconds: 6 },
  loi_dinh: { name: 'Lôi Đình Chấn', element: 'kim', kind: 'stun', power: 1.2, cd: 14, seconds: 2 },
  tuyet_sat: { name: 'Tuyệt Sát Kiếm', element: 'kim', kind: 'execute', power: 1.5, cd: 9, threshold: 0.3, bonus: 1 },
  huyet_thuc: { name: 'Huyết Thực Quyết', element: 'hoa', kind: 'lifesteal', power: 0.35, cd: 16, seconds: 8 },
  bao_nhan: { name: 'Cuồng Bạo Thuật', element: 'hoa', kind: 'rage', power: 0.4, cd: 15, seconds: 8 },
  phan_chan: { name: 'Phản Chấn Thể', element: 'tho', kind: 'reflect', power: 0.5, cd: 16, seconds: 6 },
  thien_ha: { name: 'Thiên Hà Tuyệt Kích', element: 'thuy', kind: 'ultimate', power: 5, cd: 40, minRealm: 3 },
  // Võ kỹ độc quyền của đạo lộ (xem paths.js): chỉ trang bị được khi theo đạo lộ tương ứng
  van_kiem: { name: 'Vạn Kiếm Quy Tông', element: 'kim', kind: 'damage', power: 3, cd: 10, path: 'kiem' },
  kim_than: { name: 'Bất Diệt Kim Thân', element: 'tho', kind: 'shield', power: 0.5, cd: 18, seconds: 10, path: 'the' },
  ngu_loi: { name: 'Ngũ Lôi Chính Pháp', element: 'hoa', kind: 'stun', power: 1.6, cd: 12, seconds: 2.5, path: 'phap' },
  dan_hoa: { name: 'Đan Hỏa Phần Thân', element: 'hoa', kind: 'dot', power: 0.8, cd: 14, seconds: 8, path: 'dan' },
  tran_dia: { name: 'Địa Cực Phản Trận', element: 'tho', kind: 'reflect', power: 0.8, cd: 16, seconds: 8, path: 'tran' },
}

export const SKILL_MAX_LEVEL = 5
export const LEARN_COST = 5 // số tàn quyển để học

export const fragmentId = (id) => 'qk_' + id
/** Mỗi cấp +20% hiệu lực, hồi chiêu giảm 5%. */
export const skillLevelMult = (level) => 1 + 0.2 * (level - 1)
export const skillCooldown = (id, level) => SKILLS[id].cd * (1 - 0.05 * (level - 1))
/** Số tàn quyển để lên từ cấp `level` lên cấp kế. */
export const upgradeCost = (level) => 5 * level
/** Số ô võ kỹ theo đại cảnh giới. */
export const slotCount = (realmIdx) => (realmIdx >= 4 ? 4 : realmIdx >= 2 ? 3 : realmIdx >= 1 ? 2 : 1)
export const MAX_SKILL_SLOTS = 5 // 4 theo cảnh giới + 1 của Pháp Tu

/** Có trang bị được ở đại cảnh giới `realmIdx` và đạo lộ `path` không (tuyệt kỹ cần cảnh giới; võ kỹ độc quyền cần đúng đạo lộ). */
export const canEquip = (id, realmIdx, path = null) =>
  realmIdx >= (SKILLS[id].minRealm ?? 0) && (!SKILLS[id].path || SKILLS[id].path === path)

/** Loại hiệu ứng hình ảnh/âm thanh: các chiêu tấn công dùng cảnh bay của sát thương, chiêu tăng cường dùng cảnh tăng tốc/lá chắn. */
export function visualKind(kind) {
  if (kind === 'heal' || kind === 'shield' || kind === 'haste') return kind
  if (kind === 'lifesteal' || kind === 'rage') return 'haste'
  if (kind === 'reflect') return 'shield'
  return 'damage'
}

/** Mô tả hiệu quả ở cấp `level`. */
export function skillDesc(id, level = 1) {
  const s = SKILLS[id]
  const p = s.power * skillLevelMult(level)
  const cd = skillCooldown(id, level).toFixed(1)
  const pct = Math.round(p * 100)
  switch (s.kind) {
    case 'damage':
      return `Gây ${pct}% công kích${s.slow ? `, làm chậm địch ${Math.round(s.slow * 100)}% trong ${s.seconds}s` : ''}. Hồi ${cd}s.`
    case 'dot':
      return `Gây ${pct}% công kích mỗi giây trong ${s.seconds}s (bỏ qua nhịp ra đòn). Hồi ${cd}s.`
    case 'stun':
      return `Gây ${pct}% công kích và làm địch choáng ${s.seconds}s. Hồi ${cd}s.`
    case 'execute':
      return `Gây ${pct}% công kích, gấp ${1 + s.bonus} lần khi địch dưới ${Math.round(s.threshold * 100)}% khí huyết. Hồi ${cd}s.`
    case 'ultimate':
      return `Tuyệt kỹ: gây ${pct}% công kích. Cần đạt đại cảnh giới thứ ${s.minRealm + 1}. Hồi ${cd}s.`
    case 'heal':
      return `Hồi ${pct}% khí huyết tối đa. Hồi ${cd}s.`
    case 'shield':
      return `Lá chắn ${pct}% khí huyết trong ${s.seconds}s. Hồi ${cd}s.`
    case 'lifesteal':
      return `Hút ${pct}% sát thương gây ra thành khí huyết trong ${s.seconds}s. Hồi ${cd}s.`
    case 'rage':
      return `Tăng ${pct}% công kích trong ${s.seconds}s. Hồi ${cd}s.`
    case 'reflect':
      return `Phản ${pct}% sát thương nhận vào cho địch trong ${s.seconds}s. Hồi ${cd}s.`
    default:
      return `Tăng ${pct}% tốc độ ra đòn trong ${s.seconds}s. Hồi ${cd}s.`
  }
}
