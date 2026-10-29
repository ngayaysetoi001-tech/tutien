// =====================================================================
// arts.js - Công Pháp: tăng bị động liên tục (không cần thi triển, khác với Võ Kỹ ở skills.js).
// Học xong là cộng chỉ số trực tiếp cho nhân vật (không cần ô trang bị), cấp 1..10, thăng cấp bằng Công Pháp Tàn Quyển.
// Công pháp cùng hệ ngũ hành với tông môn của người chơi được +50% hiệu quả.
// stat: exp (tốc độ linh khí) | hp | atk | def | speed | stones (linh thạch) | income (thu nhập thụ động từ ải)
//       luck (tỉ lệ rơi đồ) | elem (sát thương thêm khi khắc hệ) | dao (Đạo Vận khi luân hồi)
// =====================================================================

export const ARTS = {
  thanh_tam: { name: 'Thanh Tâm Quyết', element: 'thuy', stat: 'exp', per: 0.035, minAi: 1, label: 'tốc độ linh khí' },
  cuong_the: { name: 'Cương Thể Công', element: 'moc', stat: 'hp', per: 0.035, minAi: 1, label: 'khí huyết' },
  pha_quan: { name: 'Phá Quân Quyết', element: 'kim', stat: 'atk', per: 0.035, minAi: 1, label: 'công kích' },
  kim_cang: { name: 'Kim Cang Bất Hoại', element: 'tho', stat: 'def', per: 0.035, minAi: 1, label: 'phòng ngự' },
  truy_phong: { name: 'Truy Phong Bộ Pháp', element: 'hoa', stat: 'speed', per: 0.026, minAi: 20, label: 'Thân pháp' },
  tu_bao: { name: 'Tụ Bảo Quyết', element: 'tho', stat: 'stones', per: 0.0435, minAi: 20, label: 'linh thạch' },
  ho_phap: { name: 'Thiên Địa Hộ Pháp', element: 'thuy', stat: 'income', per: 0.0435, minAi: 40, label: 'thu nhập thụ động từ ải' },
  thien_nhan: { name: 'Thiên Nhãn Thông', element: 'moc', stat: 'luck', per: 0.035, minAi: 40, label: 'tỉ lệ rơi đồ' },
  ngu_hanh: { name: 'Ngũ Hành Quy Nhất', element: 'kim', stat: 'elem', per: 0.026, minAi: 60, label: 'sát thương khi khắc hệ' },
  luan_hoi: { name: 'Luân Hồi Bí Điển', element: 'hoa', stat: 'dao', per: 0.026, minAi: 80, label: 'Đạo Vận khi luân hồi' },
}

export const ART_MAX_LEVEL = 10
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
