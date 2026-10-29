// =====================================================================
// equipment.js - Trang bị: vũ khí / y phục / pháp bảo, 8 phẩm cấp x 4 độ hiếm.
// Nguồn: rèn ở Động Phủ (tiêu khoáng thạch) và boss bí cảnh rơi.
// Cường hóa +1..+10: mỗi cấp tăng 12% chỉ số gốc.
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

/** Tạo một món trang bị mới. */
export function generateItem(slot, tier, weights = FORGE_RARITY_WEIGHTS, rng = Math.random) {
  return { uid: newUid(), slot, tier, rarity: rollRarity(weights, rng), enh: 0 }
}

export const itemName = (item) => TIERS[item.tier].names[item.slot]
export const itemFullName = (item) => `${RARITIES[item.rarity].name} ${itemName(item)}${item.enh ? ` +${item.enh}` : ''}`

/** Chỉ số thực của món đồ (đã nhân độ hiếm và cường hóa). */
export function itemStats(item) {
  const base = baseStats(item.slot, TIERS[item.tier].power)
  const k = RARITIES[item.rarity].mult * (1 + 0.12 * item.enh)
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

/** Chuỗi hiển thị chỉ số: "+25 Công, +1.2% Linh khí". */
export function statsText(stats) {
  const label = { hp: 'Khí huyết', atk: 'Công', def: 'Thủ', speed: 'Thân pháp' }
  return Object.entries(stats)
    .map(([k, v]) => (k === 'exp' ? `+${(v * 100).toFixed(1)}% linh khí` : `+${v} ${label[k]}`))
    .join(', ')
}
