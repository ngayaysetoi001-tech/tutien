// =====================================================================
// equipment.js - Trang bị: vũ khí / y phục / pháp bảo, 8 phẩm cấp x 4 độ hiếm.
// Nguồn: rèn ở Động Phủ (tiêu khoáng thạch) và boss bí cảnh rơi.
// Cường hóa +1..+10: mỗi cấp tăng 12% chỉ số gốc.
// Dòng phụ (affix): món từ độ hiếm Linh trở lên có 1-3 dòng phụ ngẫu nhiên (đổi được bằng linh thạch).
// Bộ trang bị: mặc 2 hoặc 3 món cùng phẩm cấp nhận thêm thưởng bộ.
// Huyền Thoại: chỉ rơi từ Chúa Tể, đặc hiệu cố định.
// =====================================================================
import Decimal from 'break_infinity.js'

export const SLOTS = { weapon: 'Vũ khí', armor: 'Y phục', trinket: 'Pháp bảo' }
export const SLOT_IDS = Object.keys(SLOTS)
export const MAX_ENHANCE = 10
export const BAG_LIMIT = 40

export const RARITIES = [
  { name: 'Phàm', mult: 1, css: '#cbd5e1' },
  { name: 'Linh', mult: 1.3, css: '#4fdca6' },
  { name: 'Bảo', mult: 1.7, css: '#60a5fa' },
  { name: 'Tiên', mult: 2.3, css: '#f6c85f' },
]
export const FORGE_RARITY_WEIGHTS = [60, 28, 10, 2]
export const DROP_RARITY_WEIGHTS = [40, 35, 20, 5]

/** Phẩm cấp (tương ứng thứ tự bí cảnh): cảnh giới chuẩn và tên. */
export const TIERS = [
  { power: 0, names: { weapon: 'Thiết Kiếm', armor: 'Bố Y', trinket: 'Ngọc Bội' } },
  { power: 4, names: { weapon: 'Thanh Phong Kiếm', armor: 'Linh Mộc Giáp', trinket: 'Linh Châu' } },
  { power: 9, names: { weapon: 'Huyền Thiết Kiếm', armor: 'Huyết Văn Giáp', trinket: 'Huyết Ngọc' } },
  { power: 12, names: { weapon: 'Hàn Băng Kiếm', armor: 'Băng Tinh Giáp', trinket: 'Băng Phách Châu' } },
  { power: 15, names: { weapon: 'Cửu U Kiếm', armor: 'U Minh Giáp', trinket: 'U Minh Châu' } },
  { power: 18, names: { weapon: 'Thái Cổ Ma Kiếm', armor: 'Ma Uyên Giáp', trinket: 'Ma Uyên Châu' } },
  { power: 21, names: { weapon: 'Hư Không Kiếm', armor: 'Hư Không Giáp', trinket: 'Hư Không Châu' } },
  { power: 24, names: { weapon: 'Hỗn Độn Kiếm', armor: 'Hỗn Độn Giáp', trinket: 'Hỗn Độn Châu' } },
]

/** Công thức rèn theo phẩm cấp. */
export const FORGE = [
  { ingredients: { thiet_tinh: 6 }, stones: 20, minStage: 0 },
  { ingredients: { thiet_tinh: 12, huyen_thiet: 2 }, stones: 150, minStage: 4 },
  { ingredients: { huyen_thiet: 6 }, stones: 800, minStage: 9 },
  { ingredients: { huyen_thiet: 8, tinh_kim: 2 }, stones: 4000, minStage: 12 },
  { ingredients: { tinh_kim: 5 }, stones: 20000, minStage: 15 },
  { ingredients: { hu_khong_thach: 6 }, stones: 100000, minStage: 18 },
  { ingredients: { hu_khong_thach: 8, hon_don_tinh: 2 }, stones: 500000, minStage: 21 },
  { ingredients: { hon_don_tinh: 5 }, stones: 2500000, minStage: 24 },
]

let uidSeq = 0
const newUid = () => `e${Date.now().toString(36)}_${++uidSeq}`

/** Chỉ số gốc của một ô ở phẩm cấp có cảnh giới chuẩn `p`. */
function baseStats(slot, p) {
  if (slot === 'weapon') return { atk: 6 + 3 * p }
  if (slot === 'armor') return { def: 4 + 2 * p, hp: 40 + 25 * p }
  return { hp: 20 + 12 * p, speed: 1 + Math.floor(p / 5), exp: 0.02 + 0.002 * p }
}

/** Chọn chỉ số rarity theo bảng trọng số. */
export function rollRarity(weights, rng = Math.random) {
  const total = weights.reduce((a, b) => a + b, 0)
  let pick = rng() * total
  for (let i = 0; i < weights.length; i++) {
    pick -= weights[i]
    if (pick <= 0) return i
  }
  return 0
}

// ---------------------------------------------------------------------
// Dòng phụ, bộ trang bị, đồ Huyền Thoại
// ---------------------------------------------------------------------
/** Các dòng phụ: giá trị là phân số (0.05 = +5%), mỗi dòng chỉ xuất hiện ở các ô cho phép. */
export const AFFIXES = {
  atk: { label: 'công kích', slots: ['weapon'], min: 0.03, max: 0.08 },
  hp: { label: 'khí huyết', slots: ['armor', 'trinket'], min: 0.04, max: 0.1 },
  def: { label: 'phòng ngự', slots: ['armor'], min: 0.04, max: 0.1 },
  speed: { label: 'Thân pháp', slots: ['weapon', 'armor', 'trinket'], min: 0.03, max: 0.08 },
  crit: { label: 'chí mạng', slots: ['weapon', 'trinket'], min: 0.02, max: 0.06 },
  skillDmg: { label: 'sát thương võ kỹ', slots: ['weapon', 'trinket'], min: 0.05, max: 0.12 },
  lifesteal: { label: 'hút máu', slots: ['weapon', 'armor'], min: 0.02, max: 0.05 },
  cd: { label: 'giảm hồi chiêu', slots: ['trinket'], min: 0.03, max: 0.07 },
  elem: { label: 'sát thương khi khắc hệ', slots: ['weapon', 'armor', 'trinket'], min: 0.04, max: 0.1 },
  luck: { label: 'tỉ lệ rơi đồ', slots: ['armor', 'trinket'], min: 0.05, max: 0.12 },
  exp: { label: 'tốc độ linh khí', slots: ['trinket'], min: 0.02, max: 0.05 },
}
export const AFFIX_IDS = Object.keys(AFFIXES)
export const MAX_AFFIXES = 3
/** Số dòng phụ theo độ hiếm (Phàm 0, Linh 1, Bảo 2, Tiên 3). */
export const affixCount = (rarity) => Math.min(MAX_AFFIXES, rarity)

/** Chọn ngẫu nhiên `count` dòng phụ khác nhau hợp với ô; giá trị tăng nhẹ theo phẩm cấp. */
export function rollAffixes(slot, tier, count, rng = Math.random) {
  const pool = AFFIX_IDS.filter((id) => AFFIXES[id].slots.includes(slot))
  const out = []
  while (out.length < count && pool.length) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0]
    const a = AFFIXES[id]
    const v = (a.min + rng() * (a.max - a.min)) * (1 + 0.08 * tier)
    out.push({ id, v: Math.round(v * 1000) / 1000 })
  }
  return out
}

/** Bộ trang bị theo phẩm cấp: mặc 2 / 3 món cùng phẩm cấp. */
export const SETS = [
  { name: 'Thiết Cốt', two: { hp: 0.05 }, three: { atk: 0.05, def: 0.05 } },
  { name: 'Thanh Phong', two: { speed: 0.05 }, three: { skillDmg: 0.1, cd: 0.05 } },
  { name: 'Huyết Văn', two: { lifesteal: 0.03 }, three: { atk: 0.08, crit: 0.04 } },
  { name: 'Hàn Băng', two: { def: 0.06 }, three: { hp: 0.1, elem: 0.06 } },
  { name: 'U Minh', two: { crit: 0.04 }, three: { critMult: 0.2, lifesteal: 0.03 } },
  { name: 'Ma Uyên', two: { atk: 0.06 }, three: { skillDmg: 0.12, atk: 0.05 } },
  { name: 'Hư Không', two: { speed: 0.06, luck: 0.06 }, three: { cd: 0.08, exp: 0.05 } },
  { name: 'Hỗn Độn', two: { hp: 0.08, def: 0.08 }, three: { atk: 0.1, crit: 0.05, exp: 0.05 } },
]

/** Đồ Huyền Thoại: chỉ rơi từ Chúa Tể, mỗi ô một món, đặc hiệu cố định (extra: đánh thêm một đòn, thorns: phản sát thương). */
export const LEGENDS = {
  thanh_minh: { name: 'Thanh Minh Thần Kiếm', slot: 'weapon', perk: { atk: 0.2, extra: 0.25 }, text: '+20% công kích, 25% đánh thêm một đòn' },
  van_co: { name: 'Vạn Cổ Chiến Giáp', slot: 'armor', perk: { hp: 0.25, def: 0.2, thorns: 0.15 }, text: '+25% khí huyết, +20% phòng ngự, phản 15% sát thương nhận vào' },
  hong_mong: { name: 'Hồng Mông Thần Châu', slot: 'trinket', perk: { exp: 0.15, luck: 0.12, cd: 0.15, skillDmg: 0.15 }, text: '+15% linh khí, +12% rơi đồ, -15% hồi chiêu, +15% sát thương võ kỹ' },
}
export const LEGEND_COLOR = '#f472b6'
export const LEGEND_MULT = 1.3 // chỉ số gốc nhân thêm

/** Mọi khoá thưởng từ dòng phụ / bộ / huyền thoại (mặc định 0). */
export const ZERO_GEAR_PERK = { atk: 0, hp: 0, def: 0, speed: 0, crit: 0, critMult: 0, skillDmg: 0, lifesteal: 0, cd: 0, elem: 0, luck: 0, exp: 0, extra: 0, thorns: 0 }

/** Số món cùng phẩm cấp nhiều nhất trong các món đang mặc (để tính thưởng bộ). */
export function setCounts(items) {
  const counts = {}
  for (const it of items) counts[it.tier] = (counts[it.tier] ?? 0) + 1
  return counts
}

/** Tổng thưởng từ dòng phụ, thưởng bộ (2 và 3 món) và đặc hiệu Huyền Thoại của các món đang mặc. */
export function gearPerks(items) {
  const out = { ...ZERO_GEAR_PERK }
  const add = (perk) => { for (const [k, v] of Object.entries(perk)) out[k] += v }
  for (const it of items) {
    for (const a of it.affixes ?? []) out[a.id] += a.v
    if (it.legend && LEGENDS[it.legend]) add(LEGENDS[it.legend].perk)
  }
  for (const [tier, n] of Object.entries(setCounts(items))) {
    if (n >= 2) add(SETS[tier].two)
    if (n >= 3) add(SETS[tier].three)
  }
  return out
}

/** Bộ trang bị đang kích hoạt: [{ name, pieces, bonus: perk }]. */
export function activeSets(items) {
  const out = []
  for (const [tier, n] of Object.entries(setCounts(items))) {
    if (n < 2) continue
    out.push({ name: SETS[tier].name, pieces: Math.min(n, 3), bonus: n >= 3 ? { ...SETS[tier].two, ...SETS[tier].three } : SETS[tier].two })
  }
  return out
}

/** Tạo một món trang bị mới (có dòng phụ theo độ hiếm). */
export function generateItem(slot, tier, weights = FORGE_RARITY_WEIGHTS, rng = Math.random) {
  const rarity = rollRarity(weights, rng)
  return { uid: newUid(), slot, tier, rarity, enh: 0, affixes: rollAffixes(slot, tier, affixCount(rarity), rng) }
}

/** Tạo một món Huyền Thoại cho `slot` (độ hiếm Tiên, không dòng phụ). */
export function generateLegend(slot, tier) {
  const id = Object.keys(LEGENDS).find((k) => LEGENDS[k].slot === slot)
  return { uid: newUid(), slot, tier, rarity: 3, enh: 0, affixes: [], legend: id }
}

/** Đổi lại toàn bộ dòng phụ ngẫu nhiên (không áp dụng cho Huyền Thoại hay đồ Phàm). */
export function rerollItemAffixes(item, rng = Math.random) {
  item.affixes = rollAffixes(item.slot, item.tier, affixCount(item.rarity), rng)
}
/** Linh thạch đổi dòng phụ. */
export const rerollCost = (item) => new Decimal(2.1).pow(item.tier).mul(60 * (item.rarity + 1))

/** Điểm so sánh trang bị để tự mặc: Huyền Thoại > phẩm cấp > độ hiếm > cường hoá > số dòng phụ. */
export const gearScore = (item) => (item.legend ? 1000 : 0) + item.tier * 100 + item.rarity * 10 + item.enh + (item.affixes?.length ?? 0) * 3

export const itemName = (item) => (item.legend ? LEGENDS[item.legend].name : TIERS[item.tier].names[item.slot])
export const itemFullName = (item) => (item.legend ? `[Huyền Thoại] ${itemName(item)}${item.enh ? ` +${item.enh}` : ''}` : `${RARITIES[item.rarity].name} ${itemName(item)}${item.enh ? ` +${item.enh}` : ''}`)
export const itemColor = (item) => (item.legend ? LEGEND_COLOR : RARITIES[item.rarity].css)

/** Chỉ số thực của món đồ (đã nhân độ hiếm và cường hóa). */
export function itemStats(item) {
  const base = baseStats(item.slot, TIERS[item.tier].power)
  const k = RARITIES[item.rarity].mult * (1 + 0.12 * item.enh) * (item.legend ? LEGEND_MULT : 1)
  const out = {}
  for (const [stat, v] of Object.entries(base)) out[stat] = stat === 'exp' ? v * k : Math.round(v * k)
  return out
}

/** Linh thạch cường hóa từ +enh lên +enh+1. */
export const enhanceCost = (item) => new Decimal(2.1).pow(item.tier).mul(30 * (item.enh + 1))

/** Linh thạch khi bán / phân giải. */
export const sellValue = (item) =>
  new Decimal(2.1).pow(item.tier).mul(15 * RARITIES[item.rarity].mult * (1 + item.enh * 0.5))

/** Cộng chỉ số của danh sách trang bị. */
export function sumStats(items) {
  const total = { hp: 0, atk: 0, def: 0, speed: 0, exp: 0 }
  for (const it of items) for (const [k, v] of Object.entries(itemStats(it))) total[k] += v
  return total
}

/** Chuỗi hiển thị dòng phụ: "+5% công kích, +3% chí mạng". */
export const affixText = (item) => (item.affixes ?? []).map((a) => `+${Math.round(a.v * 1000) / 10}% ${AFFIXES[a.id].label}`).join(', ')

/** Chuỗi hiển thị thưởng gộp (dùng cho bộ trang bị): "+5% khí huyết". */
export function perkText(perk) {
  const label = { atk: 'công kích', hp: 'khí huyết', def: 'phòng ngự', speed: 'Thân pháp', crit: 'chí mạng', critMult: 'sát thương chí mạng', skillDmg: 'sát thương võ kỹ', lifesteal: 'hút máu', cd: 'giảm hồi chiêu', elem: 'sát thương khắc hệ', luck: 'rơi đồ', exp: 'linh khí', extra: 'đánh thêm', thorns: 'phản sát thương' }
  return Object.entries(perk).map(([k, v]) => `+${Math.round(v * 1000) / 10}% ${label[k]}`).join(', ')
}

/** Chuỗi hiển thị chỉ số: "+25 Công, +1.2% Linh khí". */
export function statsText(stats) {
  const label = { hp: 'Khí huyết', atk: 'Công', def: 'Thủ', speed: 'Thân pháp' }
  return Object.entries(stats)
    .map(([k, v]) => (k === 'exp' ? `+${(v * 100).toFixed(1)}% linh khí` : `+${v} ${label[k]}`))
    .join(', ')
}
