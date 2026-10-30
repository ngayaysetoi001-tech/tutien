// =====================================================================
// arts.js - Công Pháp: tăng bị động liên tục (không cần thi triển, khác với Võ Kỹ ở skills.js).
// Học xong là cộng chỉ số trực tiếp cho nhân vật (không cần ô trang bị), cấp 1..10, thăng cấp bằng Công Pháp Tàn Quyển.
// Công pháp cùng hệ ngũ hành với tông môn của người chơi được +50% hiệu quả.
// Bốn hệ công pháp (Thể, Công, Tốc, Đạo): tổng cấp các công pháp trong một hệ mở mốc cộng hưởng (RESONANCE).
// Ngộ đạo: công pháp đạt cấp tối đa được ngộ một lần, chọn 1 trong 3 đặc tính (AWAKEN), khác nhau theo từng công pháp.
// stat: exp (tốc độ linh khí) | hp | atk | def | speed | stones (linh thạch) | income (thu nhập thụ động từ ải)
//       luck (tỉ lệ rơi đồ) | elem (sát thương thêm khi khắc hệ) | dao (Đạo Vận khi luân hồi)
// =====================================================================

export const ARTS = {
  thanh_tam: { name: 'Thanh Tâm Quyết', element: 'thuy', stat: 'exp', per: 0.035, minAi: 1, sys: 'dao', label: 'tốc độ linh khí' },
  cuong_the: { name: 'Cương Thể Công', element: 'moc', stat: 'hp', per: 0.035, minAi: 1, sys: 'the', label: 'khí huyết' },
  pha_quan: { name: 'Phá Quân Quyết', element: 'kim', stat: 'atk', per: 0.035, minAi: 1, sys: 'cong', label: 'công kích' },
  kim_cang: { name: 'Kim Cang Bất Hoại', element: 'tho', stat: 'def', per: 0.035, minAi: 1, sys: 'the', label: 'phòng ngự' },
  truy_phong: { name: 'Truy Phong Bộ Pháp', element: 'hoa', stat: 'speed', per: 0.026, minAi: 20, sys: 'toc', label: 'Thân pháp' },
  tu_bao: { name: 'Tụ Bảo Quyết', element: 'tho', stat: 'stones', per: 0.0435, minAi: 20, sys: 'toc', label: 'linh thạch' },
  ho_phap: { name: 'Thiên Địa Hộ Pháp', element: 'thuy', stat: 'income', per: 0.0435, minAi: 40, sys: 'dao', label: 'thu nhập thụ động từ ải' },
  thien_nhan: { name: 'Thiên Nhãn Thông', element: 'moc', stat: 'luck', per: 0.035, minAi: 40, sys: 'toc', label: 'tỉ lệ rơi đồ' },
  ngu_hanh: { name: 'Ngũ Hành Quy Nhất', element: 'kim', stat: 'elem', per: 0.026, minAi: 60, sys: 'cong', label: 'sát thương khi khắc hệ' },
  luan_hoi: { name: 'Luân Hồi Bí Điển', element: 'hoa', stat: 'dao', per: 0.026, minAi: 80, sys: 'dao', label: 'Đạo Vận khi luân hồi' },
}

export const ART_MAX_LEVEL = 10

/** Bốn hệ công pháp. */
export const SYSTEMS = {
  the: { name: 'Thể', icon: 'shield', css: '#e5a05a', text: 'khí huyết, phòng ngự' },
  cong: { name: 'Công', icon: 'sword', css: '#ef6a5a', text: 'công kích, khắc hệ' },
  toc: { name: 'Tốc', icon: 'wind', css: '#5fd3a6', text: 'Thân pháp, của cải, may mắn' },
  dao: { name: 'Đạo', icon: 'lotus', css: '#7fb8ff', text: 'linh khí, thu nhập, Đạo Vận' },
}
export const SYSTEM_IDS = Object.keys(SYSTEMS)

/** Mốc cộng hưởng theo tổng cấp của hệ (thưởng cộng dồn). Khoá là khoá của extraPerk ở gameStore. */
export const RESONANCE_STEPS = [5, 12, 20]
export const RESONANCE = {
  the: [{ hp: 0.04 }, { def: 0.05, thorns: 0.05 }, { hp: 0.08, thorns: 0.08 }],
  cong: [{ atk: 0.04 }, { crit: 0.03 }, { atk: 0.08, crit: 0.05 }],
  toc: [{ speed: 0.04 }, { cd: 0.04 }, { luck: 0.08, speed: 0.06 }],
  dao: [{ exp: 0.04 }, { dao: 0.05 }, { exp: 0.08, stones: 0.06 }],
}

/** Kho đặc tính ngộ đạo của từng hệ (6 đặc tính; mỗi công pháp được chào 3 trong số đó). */
export const AWAKEN_POOL = {
  the: {
    huyet_khi: { name: 'Huyết Khí Cuồn Cuộn', perk: { hp: 0.1 }, text: '+10% khí huyết' },
    kim_than: { name: 'Kim Thân Bất Hoại', perk: { def: 0.1 }, text: '+10% phòng ngự' },
    phan_chan: { name: 'Phản Chấn', perk: { thorns: 0.1 }, text: 'phản 10% sát thương nhận vào' },
    trong_the: { name: 'Trọng Thể', perk: { hp: 0.05, def: 0.05 }, text: '+5% khí huyết, +5% phòng ngự' },
    thiet_cot: { name: 'Thiết Cốt', perk: { def: 0.06, thorns: 0.04 }, text: '+6% phòng ngự, phản 4% sát thương' },
    hoi_xuan: { name: 'Hồi Xuân', perk: { hp: 0.06, pill: 0.1 }, text: '+6% khí huyết, +10% hiệu quả đan' },
  },
  cong: {
    pha_quan: { name: 'Phá Quân', perk: { atk: 0.1 }, text: '+10% công kích' },
    bao_kich: { name: 'Bạo Kích', perk: { crit: 0.06 }, text: '+6% chí mạng' },
    nhat_kich: { name: 'Nhất Kích', perk: { atk: 0.05, crit: 0.03 }, text: '+5% công kích, +3% chí mạng' },
    cuong_phong: { name: 'Cuồng Phong', perk: { speed: 0.06, atk: 0.04 }, text: '+6% Thân pháp, +4% công kích' },
    tuyet_chieu: { name: 'Tuyệt Chiêu', perk: { cd: 0.05, atk: 0.04 }, text: '-5% hồi chiêu, +4% công kích' },
    sat_y: { name: 'Sát Ý', perk: { crit: 0.04, thorns: 0.04 }, text: '+4% chí mạng, phản 4% sát thương' },
  },
  toc: {
    than_hanh: { name: 'Thần Hành', perk: { speed: 0.1 }, text: '+10% Thân pháp' },
    tinh_khoi: { name: 'Tinh Khôi', perk: { cd: 0.07 }, text: '-7% hồi chiêu' },
    tai_van: { name: 'Tài Vận', perk: { stones: 0.1 }, text: '+10% linh thạch' },
    kim_may: { name: 'Kim May', perk: { luck: 0.1 }, text: '+10% tỉ lệ rơi đồ' },
    luu_van: { name: 'Lưu Vân', perk: { speed: 0.05, luck: 0.05 }, text: '+5% Thân pháp, +5% rơi đồ' },
    thuan_buom: { name: 'Thuận Buồm', perk: { cd: 0.04, stones: 0.05 }, text: '-4% hồi chiêu, +5% linh thạch' },
  },
  dao: {
    linh_khi: { name: 'Linh Khí Dồi Dào', perk: { exp: 0.1 }, text: '+10% tốc độ linh khí' },
    ngo_tinh: { name: 'Ngộ Tính', perk: { dao: 0.1 }, text: '+10% Đạo Vận khi luân hồi' },
    tu_bao: { name: 'Tụ Bảo', perk: { stones: 0.08 }, text: '+8% linh thạch' },
    dan_dao: { name: 'Đan Đạo', perk: { pill: 0.12, double: 0.04 }, text: '+12% hiệu quả đan, +4% luyện đan ra gấp đôi' },
    van_phap: { name: 'Vạn Pháp', perk: { arts: 0.1 }, text: '+10% hiệu quả mọi công pháp' },
    thien_co: { name: 'Thiên Cơ', perk: { forge: 0.1, luck: 0.04 }, text: '+10% rèn ra đồ hiếm, +4% rơi đồ' },
  },
}
/** Ba đặc tính ngộ đạo được chào cho công pháp `id` (cố định theo công pháp để chọn là chọn thật sự). */
export function awakenOffer(id) {
  const art = ARTS[id]
  if (!art) return []
  const keys = Object.keys(AWAKEN_POOL[art.sys])
  const at = Object.keys(ARTS).filter((x) => ARTS[x].sys === art.sys).indexOf(id)
  return [0, 1, 2].map((i) => keys[(at * 2 + i * 2 + (i > 0 ? 1 : 0)) % keys.length]).filter((k, i, a) => a.indexOf(k) === i)
}

/** Tổng cấp công pháp đã học của từng hệ. */
export function systemLevels(owned) {
  const out = { the: 0, cong: 0, toc: 0, dao: 0 }
  for (const [id, lv] of Object.entries(owned)) if (ARTS[id]) out[ARTS[id].sys] += lv
  return out
}
/** Số mốc cộng hưởng đã đạt của một hệ (0..3). */
export const resonanceTier = (total) => RESONANCE_STEPS.filter((n) => total >= n).length

/** Thưởng cộng hưởng và ngộ đạo gộp thành khối perk (khoá của extraPerk). */
export function artPerks(owned, awaken = {}) {
  const out = {}
  const add = (perk) => { for (const [k, v] of Object.entries(perk)) out[k] = (out[k] ?? 0) + v }
  const lv = systemLevels(owned)
  for (const sys of SYSTEM_IDS) for (let i = 0; i < resonanceTier(lv[sys]); i++) add(RESONANCE[sys][i])
  for (const [id, key] of Object.entries(awaken)) {
    const art = ARTS[id]
    if (art && owned[id] >= ART_MAX_LEVEL && AWAKEN_POOL[art.sys][key] && awakenOffer(id).includes(key)) add(AWAKEN_POOL[art.sys][key].perk)
  }
  return out
}

export const ART_LEARN_COST = 5 // số tàn quyển để học
export const ART_SECT_BONUS = 0.5 // cùng hệ với tông môn: +50% hiệu quả

export const artFragmentId = (id) => 'cp_' + id
/** Số tàn quyển để lên từ cấp `level` lên cấp kế. */
export const artUpgradeCost = (level) => 2 + level

/** Hiệu quả của một công pháp ở cấp `level` (phân số), có tính thưởng cùng hệ với tông môn. */
export const artValue = (id, level, sectElement = null) => {
  const art = ARTS[id]
  return art.per * level * (sectElement && sectElement === art.element ? 1 + ART_SECT_BONUS : 1)
}

/** Tổng bị động từ mọi công pháp đã học: { exp, hp, atk, def, speed, stones, income, luck, elem, dao }. */
export function totalArtBonus(owned, sectElement = null) {
  const out = { exp: 0, hp: 0, atk: 0, def: 0, speed: 0, stones: 0, income: 0, luck: 0, elem: 0, dao: 0 }
  for (const id of Object.keys(owned)) {
    if (!ARTS[id] || !owned[id]) continue
    out[ARTS[id].stat] += artValue(id, owned[id], sectElement)
  }
  return out
}

/** Mô tả ngắn hiệu quả ở cấp `level`. */
export const artDesc = (id, level = 1, sectElement = null) => `+${+(artValue(id, level, sectElement) * 100).toFixed(1)}% ${ARTS[id].label}`

/** Hệ số rơi Công Pháp Tàn Quyển khi hạ boss theo loại ải: [tỉ lệ rơi, min, max]. */
export const ART_DROP = { mini: [0.5, 1, 2], big: [1, 2, 3], lord: [1, 3, 5] }

/** Tung rơi Công Pháp Tàn Quyển ở ải `n` (chỉ Tiểu Boss trở lên). Trả về [{ id (vật phẩm), count }]. */
export function rollArtDrops(n, kind, rng = Math.random, luck = 0) {
  const cfg = ART_DROP[kind]
  if (!cfg || rng() >= Math.min(1, cfg[0] * (1 + luck))) return []
  const pool = Object.keys(ARTS).filter((id) => ARTS[id].minAi <= n)
  if (!pool.length) return []
  const id = pool[Math.floor(rng() * pool.length)]
  return [{ id: artFragmentId(id), count: cfg[1] + Math.floor(rng() * (cfg[2] - cfg[1] + 1)) }]
}
