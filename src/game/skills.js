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
//
// Trạng thái: chiêu tấn công theo ngũ hành gây trạng thái lên địch (Hỏa: Thiêu, Thủy: Băng, Kim: Phá Giáp, Mộc: Độc qua chiêu độc).
// Liên kích (COMBOS): tung chiêu đúng hệ khi địch đang mang trạng thái thích hợp thì gây thêm sát thương.
// Nhánh tiến hoá: võ kỹ đạt cấp tối đa chọn một trong hai nhánh (Cường Lực: +30% hiệu lực, Tốc Biến: -25% hồi chiêu).
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

/** Trạng thái lên địch: seconds = thời gian; dps = sát thương mỗi giây (x công kích); slow = làm chậm; defMult = hệ số phòng ngự. */
export const STATUS = {
  burn: { name: 'Thiêu', element: 'hoa', seconds: 4, dps: 0.15, text: 'cháy 15% công kích mỗi giây' },
  chill: { name: 'Băng', element: 'thuy', seconds: 4, slow: 0.2, text: 'làm chậm 20%' },
  pierce: { name: 'Phá Giáp', element: 'kim', seconds: 4, defMult: 0.85, text: 'giảm 15% phòng ngự' },
  poison: { name: 'Độc', element: 'moc', seconds: 0, text: 'nhiễm độc' },
}
/** Hệ nào gây trạng thái nào (Thổ không gây). */
export const STATUS_OF_ELEMENT = { hoa: 'burn', thuy: 'chill', kim: 'pierce', moc: 'poison' }
/** Liên kích: tung chiêu hệ `element` khi địch đang mang `status` thì sát thương nhân `mult`. */
export const COMBOS = [
  { status: 'chill', element: 'kim', mult: 1.45, name: 'Băng Vỡ' },
  { status: 'burn', element: 'thuy', mult: 1.45, name: 'Hàn Hỏa Giao Tranh' },
  { status: 'poison', element: 'hoa', mult: 1.45, name: 'Độc Hỏa Công Tâm' },
  { status: 'pierce', element: 'thuy', mult: 1.25, name: 'Phá Giáp Quán Thủy' },
]
/** Võ kỹ gây sát thương tức thời (được tính liên kích và gây trạng thái). */
export const isAttack = (kind) => kind === 'damage' || kind === 'stun' || kind === 'execute' || kind === 'ultimate'

/** Hai nhánh tiến hoá khi đạt cấp tối đa. */
export const BRANCHES = [
  { name: 'Cường Lực', text: '+30% hiệu lực', power: 1.3, cd: 1 },
  { name: 'Tốc Biến', text: '-25% hồi chiêu', power: 1, cd: 0.75 },
]
/** Tên nhánh riêng của từng võ kỹ: [Cường Lực, Tốc Biến]. */
export const BRANCH_NAMES = {
  ngu_kiem: ['Vạn Kiếm Quy Nhất', 'Phi Kiếm Liên Hoàn'],
  liet_hoa: ['Phần Thiên Chưởng', 'Liệt Diễm Liên Châu'],
  huyen_bang: ['Cực Hàn Phong Tỏa', 'Băng Phách Tốc Ngưng'],
  thanh_moc: ['Vạn Mộc Hồi Xuân', 'Xuân Phong Tái Sinh'],
  hau_tho: ['Thái Sơn Áp Đỉnh', 'Địa Mạch Tốc Củng'],
  phong_loi: ['Lôi Phong Cuồng Bộ', 'Thần Hành Vô Ảnh'],
  doc_chu: ['Vạn Độc Xâm Cốt', 'Độc Vụ Tốc Phát'],
  loi_dinh: ['Cửu Thiên Giáng Lôi', 'Lôi Quang Tốc Kích'],
  tuyet_sat: ['Nhất Kiếm Phong Hầu', 'Sát Ý Liên Miên'],
  huyet_thuc: ['Huyết Hải Nuốt Chửng', 'Huyết Thực Tốc Hồi'],
  bao_nhan: ['Cuồng Long Nộ Hống', 'Nộ Khí Tụ Nhanh'],
  phan_chan: ['Địa Chấn Phản Phệ', 'Phản Chấn Tốc Ứng'],
  thien_ha: ['Thiên Hà Đổ Xuống', 'Ngân Hà Tốc Tụ'],
  van_kiem: ['Vạn Kiếm Triều Tông', 'Kiếm Trận Tốc Khai'],
  kim_than: ['Bất Diệt Kim Cương', 'Kim Thân Tốc Thành'],
  ngu_loi: ['Ngũ Lôi Hợp Nhất', 'Lôi Pháp Tốc Triệu'],
  dan_hoa: ['Tam Muội Chân Hỏa', 'Đan Hỏa Tốc Luyện'],
  tran_dia: ['Địa Cực Phản Chấn', 'Trận Pháp Tốc Bố'],
}
/** Thông tin nhánh `b` của võ kỹ `id`: tên riêng, loại (Cường Lực / Tốc Biến) và hiệu quả. */
export const branchInfo = (id, b) => ({ name: BRANCH_NAMES[id]?.[b] ?? BRANCHES[b].name, kind: BRANCHES[b].name, text: BRANCHES[b].text })
export const branchPower = (b) => BRANCHES[b]?.power ?? 1
export const branchCd = (b) => BRANCHES[b]?.cd ?? 1

/**
 * Gợi ý liên kích của võ kỹ `id` so với các võ kỹ đang gắn (`equipped`): mỗi dòng { ok, text }.
 *  - chiêu tấn công: cần địch mang trạng thái nào, ô hiện có chiêu gây trạng thái đó không;
 *  - chiêu gây trạng thái: mở liên kích cho chiêu nào trong ô.
 */
export function comboHints(id, equipped) {
  const s = SKILLS[id]
  const others = equipped.filter((x) => x && x !== id)
  const gives = (x, status) => SKILLS[x].kind !== 'heal' && STATUS_OF_ELEMENT[SKILLS[x].element] === status && (isAttack(SKILLS[x].kind) || SKILLS[x].kind === 'dot')
  const out = []
  if (isAttack(s.kind)) {
    for (const c of COMBOS.filter((x) => x.element === s.element)) {
      const src = others.filter((x) => gives(x, c.status))
      out.push({ ok: src.length > 0, text: src.length ? `${c.name} (+${Math.round((c.mult - 1) * 100)}%): có ${STATUS[c.status].name} từ ${src.map((x) => SKILLS[x].name).join(', ')}` : `${c.name} (+${Math.round((c.mult - 1) * 100)}%): thiếu chiêu gây ${STATUS[c.status].name}` })
    }
  }
  const st = STATUS_OF_ELEMENT[s.element]
  if (st && (isAttack(s.kind) || s.kind === 'dot')) {
    for (const c of COMBOS.filter((x) => x.status === st)) {
      const use = others.filter((x) => isAttack(SKILLS[x].kind) && SKILLS[x].element === c.element)
      out.push({ ok: use.length > 0, text: use.length ? `Mở ${c.name} cho ${use.map((x) => SKILLS[x].name).join(', ')}` : `Hợp với chiêu hệ ${c.element === 'kim' ? 'Kim' : c.element === 'thuy' ? 'Thủy' : c.element === 'hoa' ? 'Hỏa' : 'khác'} để ra ${c.name} (chưa gắn)` })
    }
  }
  return out
}

/** Gợi ý trạng thái và liên kích của một võ kỹ (để hiển thị). */
export function statusLine(id) {
  const s = SKILLS[id]
  const st = STATUS_OF_ELEMENT[s.element]
  const parts = []
  if (st && (isAttack(s.kind) || s.kind === 'dot')) parts.push(`Gây ${STATUS[st].name}${STATUS[st].seconds ? ` ${STATUS[st].seconds}s` : ''} (${STATUS[st].text})`)
  if (isAttack(s.kind)) {
    for (const c of COMBOS) if (c.element === s.element) parts.push(`Liên kích sau ${STATUS[c.status].name}: ${c.name} +${Math.round((c.mult - 1) * 100)}%`)
  }
  return parts.join(' · ')
}
export const LEARN_COST = 5 // số tàn quyển để học

export const fragmentId = (id) => 'qk_' + id
/** Mỗi cấp +20% hiệu lực, hồi chiêu giảm 5%. */
export const skillLevelMult = (level) => 1 + 0.2 * (level - 1)
export const skillCooldown = (id, level, branch = null) => SKILLS[id].cd * (1 - 0.05 * (level - 1)) * branchCd(branch)
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
