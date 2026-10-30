// =====================================================================
// treasures.js - Pháp Bảo: hệ thống riêng (khác Trang Bị). Mỗi pháp bảo có một thần thông kích hoạt theo điều kiện
// trong trận, không cộng chỉ số thô.
//   Nguồn   : Mảnh Pháp Bảo (pb_<id>) rơi từ Đại Boss và Chúa Tể, gom đủ để luyện hoá.
//   Phẩm    : Phàm -> Linh -> Bảo -> Tiên -> Thần (1..5); mỗi phẩm tăng 40% hiệu quả thần thông.
//   Ô       : 2 ô, mở thêm theo đại cảnh giới (tối đa 4).
//   Cộng hưởng: có võ kỹ đang gắn cùng hệ ngũ hành với pháp bảo thì thần thông mạnh thêm 30%.
// kind (xem battleStore):
//   heal_tick   cứ `interval` giây hồi `value` x khí huyết tối đa
//   nth_hit     mỗi `n` đòn thường, một đòn gây thêm `value` x công kích
//   lethal      mỗi trận chặn một đòn chí mạng, hồi `value` x khí huyết tối đa
//   boss_kill   hạ boss: hồi `value` x khí huyết
//   cast_haste  mỗi lần tung võ kỹ tấn công: tăng `value` tốc độ ra đòn trong 3 giây
//   lifesteal   hút máu nền `value`
//   start_shield  đầu mỗi ải: lá chắn `value` x khí huyết trong 10 giây
//   boss_crit   +`value` chí mạng khi đánh boss
//   crit_dmg    +`value` sát thương chí mạng   skill_dmg  +`value` sát thương võ kỹ   thorns  phản `value` sát thương nhận vào
// =====================================================================

// Hậu kỳ (ải 90+): van_loi_an, tinh_ha_binh, huyen_vu_an là thưởng bị động mạnh.
export const TREASURES = {
  can_khon_dinh: { name: 'Càn Khôn Đỉnh', element: 'tho', kind: 'heal_tick', base: 0.12, interval: 20, minAi: 10, text: 'Cứ 20 giây hồi khí huyết' },
  that_tinh_kiem: { name: 'Thất Tinh Kiếm', element: 'kim', kind: 'nth_hit', base: 2, n: 7, minAi: 15, text: 'Mỗi 7 đòn thường, một đòn gây thêm sát thương lớn' },
  ho_than_phu: { name: 'Hộ Thân Linh Phù', element: 'thuy', kind: 'lethal', base: 0.2, minAi: 25, text: 'Mỗi ải chặn một đòn chí mạng và hồi khí huyết' },
  tu_linh_binh: { name: 'Tụ Linh Bình', element: 'moc', kind: 'boss_kill', base: 0.25, minAi: 20, text: 'Hạ boss: hồi khí huyết' },
  phong_loi_phien: { name: 'Phong Lôi Phiến', element: 'hoa', kind: 'cast_haste', base: 0.25, minAi: 30, text: 'Tung võ kỹ tấn công: ra đòn nhanh hơn 3 giây' },
  huyet_sat_chau: { name: 'Huyết Sát Châu', element: 'hoa', kind: 'lifesteal', base: 0.04, minAi: 40, text: 'Mọi đòn đánh hút máu' },
  hon_nguyen_chung: { name: 'Hỗn Nguyên Chung', element: 'tho', kind: 'start_shield', base: 0.15, minAi: 50, text: 'Đầu mỗi ải có lá chắn 10 giây' },
  thien_co_la_ban: { name: 'Thiên Cơ La Bàn', element: 'kim', kind: 'boss_crit', base: 0.08, minAi: 60, text: 'Tăng chí mạng khi đánh boss' },
  van_loi_an: { name: 'Vạn Lôi Ấn', element: 'kim', kind: 'crit_dmg', base: 0.25, minAi: 90, text: 'Đòn chí mạng gây thêm sát thương' },
  tinh_ha_binh: { name: 'Tinh Hà Bảo Bình', element: 'thuy', kind: 'skill_dmg', base: 0.15, minAi: 120, text: 'Võ kỹ tấn công mạnh hơn' },
  huyen_vu_an: { name: 'Huyền Vũ Giáp Ấn', element: 'tho', kind: 'thorns', base: 0.12, minAi: 150, text: 'Phản lại một phần sát thương nhận vào' },
}

export const TREASURE_TIERS = [
  { name: 'Phàm', css: '#cbd5e1' },
  { name: 'Linh', css: '#4fdca6' },
  { name: 'Bảo', css: '#60a5fa' },
  { name: 'Tiên', css: '#f6c85f' },
  { name: 'Thần', css: '#f472b6' },
]
export const TREASURE_MAX_TIER = TREASURE_TIERS.length
export const TREASURE_LEARN_COST = 5 // số mảnh để luyện hoá lần đầu (phẩm Phàm)
export const TREASURE_SYNERGY = 0.3 // cùng hệ với một võ kỹ đang gắn
export const MAX_TREASURE_SLOTS = 4

export const treasureFragmentId = (id) => 'pb_' + id
/** Số mảnh để lên từ phẩm `tier` lên phẩm kế. */
export const treasureUpgradeCost = (tier) => [6, 10, 16, 25][tier - 1] ?? 0
/** Số ô pháp bảo: 2, thêm một ô từ đại cảnh giới 4 (Hóa Thần) và 7. */
export const treasureSlotCount = (realmIdx) => Math.min(MAX_TREASURE_SLOTS, 2 + (realmIdx >= 3 ? 1 : 0) + (realmIdx >= 6 ? 1 : 0))

/** Hiệu quả thần thông ở phẩm `tier`; `synergy` = có võ kỹ cùng hệ đang gắn. */
export const treasureValue = (id, tier, synergy = false) => TREASURES[id].base * (1 + 0.4 * (tier - 1)) * (synergy ? 1 + TREASURE_SYNERGY : 1)

const pct = (v) => `${Math.round(v * 1000) / 10}%`
/** Mô tả thần thông ở phẩm `tier`. */
export function treasureDesc(id, tier = 1, synergy = false) {
  const t = TREASURES[id]
  const v = treasureValue(id, tier, synergy)
  switch (t.kind) {
    case 'heal_tick': return `Mỗi ${t.interval}s hồi ${pct(v)} khí huyết tối đa.`
    case 'nth_hit': return `Mỗi ${t.n} đòn thường, một đòn gây thêm ${pct(v)} công kích.`
    case 'lethal': return `Mỗi ải chặn một đòn chí mạng, hồi ${pct(v)} khí huyết.`
    case 'boss_kill': return `Hạ boss: hồi ${pct(v)} khí huyết.`
    case 'cast_haste': return `Tung võ kỹ tấn công: +${pct(v)} tốc độ ra đòn trong 3s.`
    case 'lifesteal': return `Hút ${pct(v)} sát thương gây ra thành khí huyết.`
    case 'start_shield': return `Đầu mỗi ải: lá chắn ${pct(v)} khí huyết trong 10s.`
    case 'crit_dmg': return `+${pct(v)} sát thương chí mạng.`
    case 'skill_dmg': return `+${pct(v)} sát thương võ kỹ tấn công.`
    case 'thorns': return `Phản ${pct(v)} sát thương nhận vào.`
    default: return `+${pct(v)} chí mạng khi đánh boss.`
  }
}

/**
 * Gộp thần thông của các pháp bảo đang gắn thành khối hiệu ứng cho trận.
 * `slots` = id (hoặc null), `owned` = { id: phẩm }, `skillElements` = hệ của các võ kỹ đang gắn.
 */
export function treasureEffects(slots, owned, skillElements = []) {
  const out = { heal: null, nth: null, lethal: 0, bossKill: 0, haste: 0, lifesteal: 0, shield: 0, bossCrit: 0, critMult: 0, skillDmg: 0, thorns: 0 }
  for (const id of slots) {
    if (!id || !owned[id]) continue
    const t = TREASURES[id]
    const v = treasureValue(id, owned[id], skillElements.includes(t.element))
    switch (t.kind) {
      case 'heal_tick': out.heal = { interval: t.interval, pct: v }; break
      case 'nth_hit': out.nth = { n: t.n, mult: v }; break
      case 'lethal': out.lethal = v; break
      case 'boss_kill': out.bossKill = v; break
      case 'cast_haste': out.haste = v; break
      case 'lifesteal': out.lifesteal = v; break
      case 'start_shield': out.shield = v; break
      case 'crit_dmg': out.critMult = v; break
      case 'skill_dmg': out.skillDmg = v; break
      case 'thorns': out.thorns = v; break
      default: out.bossCrit = v
    }
  }
  return out
}

/** Hệ số rơi Mảnh Pháp Bảo khi hạ boss theo loại ải: [tỉ lệ rơi, min, max] (chỉ Đại Boss và Chúa Tể). */
export const TREASURE_DROP = { big: [0.35, 1, 2], lord: [0.8, 2, 4] }

/** Tung rơi Mảnh Pháp Bảo ở ải `n`. Trả về [{ id (vật phẩm), count }]. */
export function rollTreasureDrops(n, kind, rng = Math.random, luck = 0) {
  const cfg = TREASURE_DROP[kind]
  if (!cfg || rng() >= Math.min(1, cfg[0] * (1 + luck))) return []
  const pool = Object.keys(TREASURES).filter((id) => TREASURES[id].minAi <= n)
  if (!pool.length) return []
  const id = pool[Math.floor(rng() * pool.length)]
  return [{ id: treasureFragmentId(id), count: cfg[1] + Math.floor(rng() * (cfg[2] - cfg[1] + 1)) }]
}
