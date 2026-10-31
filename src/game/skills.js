// =====================================================================
// skills.js - Kỹ năng chiến đấu: mọi kỹ năng nằm trong cây kỹ năng của Đạo Lộ (skilltree.js), tự thi triển khi Vượt Ải
// (hồi chiêu xong thì tung); nâng cấp bằng Điểm kỹ năng. (Công pháp tăng bị động là hệ thống khác: xem arts.js.)
//
// kind:
//   damage    gây sát thương
//   dot       sát thương mỗi giây trong `seconds` giây (power = % công kích mỗi giây)
//   stun      gây sát thương và làm địch choáng `seconds` giây (mất lượt ra đòn)
//   execute   gây sát thương, nhân thêm `bonus` nếu khí huyết địch dưới `threshold`
//   ultimate  sát thương lớn, hồi chiêu dài
//   heal      hồi khí huyết    shield  lá chắn    haste  tăng tốc ra đòn
//   lifesteal hút máu: đòn đánh hồi `power` x sát thương gây ra trong `seconds` giây
//   rage      tăng `power` công kích trong `seconds` giây
//   crit      tăng `power` tỉ lệ chí mạng trong `seconds` giây
//   reflect   phản lại `power` x sát thương nhận vào trong `seconds` giây
//
// Trạng thái theo Đạo Lộ: Võ Kỹ 1-3 (chiêu tấn công / sát thương theo thời gian) gây trạng thái đặc trưng của đạo lộ lên địch
//   (Kiếm: Phá Giáp, Đao: Thiêu, Phù: Băng, Thể: Choáng Váng).
// Liên kích: Võ Kỹ 4 (chiêu chốt) và Tuyệt Kỹ gây thêm sát thương khi địch đang mang trạng thái của đạo lộ.
// =====================================================================

import { TREE_POWER_SCALE, TREE_SKILLS } from './skilltree.js'

/** Trạng thái lên địch: seconds = thời gian; dps = sát thương mỗi giây (x công kích); slow = làm chậm; defMult = hệ số phòng ngự; delay = kéo dài chờ ra đòn của địch. */
export const STATUS = {
  burn: { name: 'Thiêu', element: 'hoa', seconds: 4, dps: 0.15, text: 'cháy 15% công kích mỗi giây' },
  chill: { name: 'Băng', element: 'thuy', seconds: 4, slow: 0.2, text: 'làm chậm 20%' },
  pierce: { name: 'Phá Giáp', element: 'kim', seconds: 4, defMult: 0.85, text: 'giảm 15% phòng ngự' },
  dizzy: { name: 'Choáng Váng', element: 'tho', seconds: 4, delay: 0.7, text: 'địch chậm ra đòn 0,7 giây mỗi lần trúng' },
}
/** Trạng thái đặc trưng của từng đạo lộ. */
export const STATUS_OF_PATH = { kiem: 'pierce', dao: 'burn', phu: 'chill', the: 'dizzy' }
/** Liên kích của từng đạo lộ: chiêu chốt (nút 4) và Tuyệt Kỹ (nút 5) nhân `mult` sát thương khi địch mang `status`. */
export const PATH_COMBO = {
  kiem: { status: 'pierce', mult: 1.4, name: 'Phá Giáp Trảm' },
  dao: { status: 'burn', mult: 1.4, name: 'Hỏa Thiêu Phần Thế' },
  phu: { status: 'chill', mult: 1.4, name: 'Băng Phù Vỡ' },
  the: { status: 'dizzy', mult: 1.4, name: 'Chấn Động Địa Sơn' },
}
/** Chiêu gây sát thương tức thời (được tính liên kích). */
export const isAttack = (kind) => kind === 'damage' || kind === 'stun' || kind === 'execute' || kind === 'ultimate'

/** Nút là đòn đánh cơ bản của đạo lộ (thay đòn đánh thường, không hồi chiêu, không tính vào lượt tung chiêu). */
export const isBasicSkill = (id) => !!TREE_SKILLS[id]?.basic
/** Hệ số sát thương của đòn cơ bản theo cấp: +4% mỗi cấp (cấp 1 = đòn thường). */
export const basicLevelMult = (level) => 1 + 0.04 * (Math.max(1, level) - 1)

/** Định nghĩa kỹ năng theo id (nút trong cây kỹ năng). */
export const skillDef = (id) => TREE_SKILLS[id]
export const isTreeSkill = (id) => !!TREE_SKILLS[id]
/** Trạng thái mà kỹ năng này gây lên địch (Võ Kỹ 1-3 tấn công hoặc sát thương theo thời gian), hoặc null. */
export const statusOfSkill = (id) => {
  const s = TREE_SKILLS[id]
  return s && s.n <= 3 && (isAttack(s.kind) || s.kind === 'dot') ? STATUS_OF_PATH[s.path] : null
}
/** Liên kích của kỹ năng này (chỉ chiêu chốt và Tuyệt Kỹ), hoặc null. */
export const comboOfSkill = (id) => {
  const s = TREE_SKILLS[id]
  return s && (s.n === 4 || s.n === 5) && isAttack(s.kind) ? PATH_COMBO[s.path] : null
}

/**
 * Gợi ý liên kích của kỹ năng `id` so với các nút đang hoạt động (`active`): mỗi dòng { ok, text }.
 *  - chiêu chốt / Tuyệt Kỹ: cần địch mang trạng thái từ Võ Kỹ 1-3 đang mở;
 *  - Võ Kỹ 1-3: mở liên kích cho chiêu chốt và Tuyệt Kỹ.
 */
export function comboHints(id, active) {
  const s = skillDef(id)
  const out = []
  const combo = comboOfSkill(id)
  if (combo) {
    const src = active.filter((x) => x !== id && statusOfSkill(x) === combo.status)
    const pct = Math.round((combo.mult - 1) * 100)
    out.push({
      ok: src.length > 0,
      text: src.length ? `${combo.name} (+${pct}%): có ${STATUS[combo.status].name} từ ${src.map((x) => skillDef(x).name).join(', ')}` : `${combo.name} (+${pct}%): cần Võ Kỹ 1-3 gây ${STATUS[combo.status].name}`,
    })
  }
  const st = statusOfSkill(id)
  if (st) {
    const use = active.filter((x) => x !== id && comboOfSkill(x))
    out.push({
      ok: use.length > 0,
      text: use.length ? `Mở ${PATH_COMBO[s.path].name} cho ${use.map((x) => skillDef(x).name).join(', ')}` : `Mở ${PATH_COMBO[s.path].name} cho chiêu chốt và Tuyệt Kỹ (chưa mở)`,
    })
  }
  return out
}

/** Gợi ý trạng thái và liên kích của một kỹ năng (để hiển thị). */
export function statusLine(id) {
  const st = statusOfSkill(id)
  const combo = comboOfSkill(id)
  const parts = []
  if (st) parts.push(`Gây ${STATUS[st].name} ${STATUS[st].seconds}s (${STATUS[st].text})`)
  if (combo) parts.push(`Liên kích khi địch bị ${STATUS[combo.status].name}: ${combo.name} +${Math.round((combo.mult - 1) * 100)}%`)
  return parts.join(' · ')
}

/** Kỹ năng trong cây: mỗi cấp +12% hiệu lực (x TREE_POWER_SCALE), hồi chiêu giảm 2% (tối đa 30%). */
export const skillLevelMult = (level) => TREE_POWER_SCALE * (1 + 0.12 * (level - 1))
export const skillCooldown = (id, level) => skillDef(id).cd * Math.max(0.7, 1 - 0.02 * (level - 1))

/** Loại hiệu ứng hình ảnh/âm thanh: các chiêu tấn công dùng cảnh bay của sát thương, chiêu tăng cường dùng cảnh tăng tốc/lá chắn. */
export function visualKind(kind) {
  if (kind === 'heal' || kind === 'shield' || kind === 'haste') return kind
  if (kind === 'lifesteal' || kind === 'rage' || kind === 'crit') return 'haste'
  if (kind === 'reflect') return 'shield'
  return 'damage'
}

/** Mô tả hiệu quả ở cấp `level`. */
export function skillDesc(id, level = 1) {
  const s = skillDef(id)
  const p = s.power * skillLevelMult(level)
  const cd = skillCooldown(id, level).toFixed(1)
  if (s.basic) return `Đòn đánh cơ bản của đạo lộ, thay đòn chém thường (không hồi chiêu): sát thương +${Math.round((basicLevelMult(level) - 1) * 100)}%, gây trạng thái đặc trưng.`
  const pct = Math.round(p * 100)
  switch (s.kind) {
    case 'damage':
      if (s.defStack) return `${s.hits} đợt kiếm rơi, mỗi đợt gây ${Math.round(pct / s.hits)}% công kích (tổng ${pct}%), chí mạng riêng; mỗi đợt sau phòng ngự địch yếu thêm ${Math.round(s.defStack * 100)}%. Hồi ${cd}s.`
      if (s.hits) return `Phóng ${s.hits} thanh phi kiếm, mỗi thanh gây ${Math.round(pct / s.hits)}% công kích và chí mạng riêng (tổng ${pct}%). Hồi ${cd}s.`
      return `Gây ${pct}% công kích${s.slow ? `, làm chậm địch ${Math.round(s.slow * 100)}% trong ${s.seconds}s` : ''}. Hồi ${cd}s.`
    case 'dot':
      return `Gây ${pct}% công kích mỗi giây trong ${s.seconds}s (bỏ qua nhịp ra đòn). Hồi ${cd}s.`
    case 'stun':
      return `Gây ${pct}% công kích và làm địch choáng ${s.seconds}s. Hồi ${cd}s.`
    case 'execute':
      return `Gây ${pct}% công kích, gấp ${1 + s.bonus} lần khi địch dưới ${Math.round(s.threshold * 100)}% khí huyết. Hồi ${cd}s.`
    case 'ultimate':
      return `Tuyệt kỹ: gây ${pct}% công kích${s.pierceBonus ? `; nếu địch đang Phá Giáp, trảm tan giáp: thêm ${Math.round(s.pierceBonus * 100)}% sát thương rồi xoá Phá Giáp` : ''}. Hồi ${cd}s.`
    case 'heal':
      return `Hồi ${pct}% khí huyết tối đa. Hồi ${cd}s.`
    case 'shield':
      return `Lá chắn ${pct}% khí huyết trong ${s.seconds}s. Hồi ${cd}s.`
    case 'lifesteal':
      return `Hút ${pct}% sát thương gây ra thành khí huyết trong ${s.seconds}s. Hồi ${cd}s.`
    case 'rage':
      return `Tăng ${pct}% công kích trong ${s.seconds}s. Hồi ${cd}s.`
    case 'crit':
      return `Tăng ${pct}% tỉ lệ chí mạng trong ${s.seconds}s. Hồi ${cd}s.`
    case 'reflect':
      return `Phản ${pct}% sát thương nhận vào cho địch trong ${s.seconds}s. Hồi ${cd}s.`
    default:
      return `Tăng ${pct}% tốc độ ra đòn trong ${s.seconds}s. Hồi ${cd}s.`
  }
}
