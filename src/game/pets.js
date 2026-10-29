// =====================================================================
// pets.js - Linh Thú đồng hành: thu phục bằng Linh Thú Phách (rơi từ boss, bán ở cửa hàng tông môn),
// mỗi con một kỹ năng riêng, cấp 1..10. Ra trận một con (hai con từ Hóa Thần).
//   kind  hunter: cứ `interval` giây cắn một đòn bằng `power` x công kích
//         healer: cứ `interval` giây hồi `heal` x khí huyết tối đa
//         guard / lucky / scholar: chỉ có thưởng bị động (perk)
//   perk  thưởng bị động mỗi cấp (phân số), xem extraPerk ở gameStore. Cùng hệ ngũ hành với người chơi: +25%.
// =====================================================================

export const PETS = {
  tieu_ho: { name: 'Tiểu Hổ Con', element: 'kim', kind: 'hunter', minAi: 5, power: 0.5, interval: 4, perk: { crit: 0.01 }, text: 'Cắn địch mỗi 4 giây, thêm chí mạng' },
  quy_giap: { name: 'Huyền Quy', element: 'tho', kind: 'guard', minAi: 5, perk: { def: 0.03, thorns: 0.015 }, text: 'Mai rùa cứng: tăng phòng ngự và phản sát thương' },
  linh_hac: { name: 'Linh Hạc', element: 'moc', kind: 'healer', minAi: 15, heal: 0.012, interval: 5, perk: { hp: 0.02 }, text: 'Hồi khí huyết mỗi 5 giây, thêm khí huyết' },
  kim_thiem: { name: 'Kim Thiềm', element: 'kim', kind: 'lucky', minAi: 15, perk: { luck: 0.03, stones: 0.03 }, text: 'Ngậm tiền ra vào: tăng rơi đồ và linh thạch' },
  van_ho: { name: 'Vân Hồ', element: 'thuy', kind: 'scholar', minAi: 30, perk: { exp: 0.025 }, text: 'Hồ ly hút linh khí trời đất: tăng tốc độ linh khí' },
  bang_ly: { name: 'Băng Ly', element: 'thuy', kind: 'hunter', minAi: 40, power: 0.7, interval: 5, perk: { cd: 0.015 }, text: 'Cắn địch mỗi 5 giây, võ kỹ hồi chiêu nhanh hơn' },
  thanh_long: { name: 'Thanh Long Ấu', element: 'moc', kind: 'guard', minAi: 60, perk: { hp: 0.03, atk: 0.02 }, text: 'Long uy: tăng khí huyết và công kích' },
  hoa_phuong: { name: 'Hỏa Phụng', element: 'hoa', kind: 'hunter', minAi: 80, power: 1.1, interval: 5, perk: { atk: 0.02, crit: 0.01 }, text: 'Phun lửa mỗi 5 giây rất mạnh' },
}

export const PET_MAX_LEVEL = 10
export const PET_LEARN_COST = 5 // số Linh Thú Phách để thu phục
export const PET_SAME_ELEMENT_BONUS = 0.25
export const MAX_PET_SLOTS = 2

export const petFragmentId = (id) => 'ln_' + id
/** Số Linh Thú Phách để lên từ cấp `level` lên cấp kế. */
export const petUpgradeCost = (level) => 2 + level
/** Số ô linh thú: 1, thêm một ô từ Hóa Thần (đại cảnh giới thứ 5). */
export const petSlotCount = (realmIdx) => (realmIdx >= 4 ? 2 : 1)

/** Hệ số theo cấp cho sát thương / hồi máu chủ động: +15% mỗi cấp. */
export const petLevelMult = (level) => 1 + 0.15 * (level - 1)

export const ZERO_PET_PERK = { atk: 0, hp: 0, def: 0, crit: 0, cd: 0, thorns: 0, luck: 0, stones: 0, exp: 0 }

/** Tổng thưởng bị động từ các linh thú đang ra trận (đã tính cùng hệ với người chơi). */
export function petPerks(active, owned, playerElement = null) {
  const out = { ...ZERO_PET_PERK }
  for (const id of active) {
    if (!id || !owned[id]) continue
    const p = PETS[id]
    const k = owned[id] * (p.element === playerElement ? 1 + PET_SAME_ELEMENT_BONUS : 1)
    for (const [key, per] of Object.entries(p.perk)) out[key] += per * k
  }
  return out
}

/** Mô tả hiệu quả ở cấp `level`. */
export function petDesc(id, level = 1, playerElement = null) {
  const p = PETS[id]
  const k = level * (p.element === playerElement ? 1 + PET_SAME_ELEMENT_BONUS : 1)
  const labels = { atk: 'công kích', hp: 'khí huyết', def: 'phòng ngự', crit: 'chí mạng', cd: 'giảm hồi chiêu', thorns: 'phản sát thương', luck: 'rơi đồ', stones: 'linh thạch', exp: 'linh khí' }
  const perk = Object.entries(p.perk).map(([key, per]) => `+${Math.round(per * k * 1000) / 10}% ${labels[key]}`).join(', ')
  const act = p.kind === 'hunter'
    ? `Cắn ${Math.round(p.power * petLevelMult(level) * 100)}% công kích mỗi ${p.interval}s. `
    : p.kind === 'healer' ? `Hồi ${Math.round(p.heal * petLevelMult(level) * 1000) / 10}% khí huyết mỗi ${p.interval}s. ` : ''
  return act + perk
}

/** Linh Thú Phách rơi khi hạ boss: [tỉ lệ, min, max]. */
export const PET_DROP = { mini: [0.25, 1, 1], big: [0.5, 1, 2], lord: [1, 2, 3] }

/** Tung rơi Linh Thú Phách ở ải `n`. Trả về [{ id (vật phẩm), count }]. */
export function rollPetDrops(n, kind, rng = Math.random, luck = 0) {
  const cfg = PET_DROP[kind]
  if (!cfg || rng() >= Math.min(1, cfg[0] * (1 + luck))) return []
  const pool = Object.keys(PETS).filter((id) => PETS[id].minAi <= n)
  if (!pool.length) return []
  const id = pool[Math.floor(rng() * pool.length)]
  return [{ id: petFragmentId(id), count: cfg[1] + Math.floor(rng() * (cfg[2] - cfg[1] + 1)) }]
}
