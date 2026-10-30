// =====================================================================
// equipment.js - Trang bị: vũ khí / y phục / mũ / giày / nhẫn / ngọc bội (6 ô), 8 phẩm cấp x 4 độ hiếm.
// (Pháp Bảo là hệ thống riêng với thần thông, xem treasures.js.)
// Nguồn: rèn ở Động Phủ (tiêu khoáng thạch) và boss bí cảnh rơi.
// Cường hóa +1..+10: mỗi cấp tăng 12% chỉ số gốc.
// Dòng phụ (affix): món từ độ hiếm Linh trở lên có 1-3 dòng phụ ngẫu nhiên (đổi được bằng linh thạch).
// Bộ trang bị: mặc 2 / 4 / 6 món cùng phẩm cấp nhận thêm thưởng bộ.
// Huyền Thoại: chỉ rơi từ Chúa Tể, đặc hiệu cố định.
// =====================================================================
import Decimal from 'break_infinity.js'
import { COST_SECONDS, refCost } from './campaign.js'

export const SLOTS = { weapon: 'Vũ khí', armor: 'Y phục', helm: 'Mũ', boots: 'Giày', ring: 'Nhẫn', jade: 'Ngọc bội' }
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
  { power: 0, names: { weapon: 'Thiết Kiếm', armor: 'Bố Y', helm: 'Khăn Vải', boots: 'Giày Cỏ', ring: 'Nhẫn Đồng', jade: 'Ngọc Bội' } },
  { power: 4, names: { weapon: 'Thanh Phong Kiếm', armor: 'Linh Mộc Giáp', helm: 'Linh Mộc Quan', boots: 'Thanh Phong Ngoa', ring: 'Linh Mộc Giới', jade: 'Linh Châu' } },
  { power: 9, names: { weapon: 'Huyền Thiết Kiếm', armor: 'Huyết Văn Giáp', helm: 'Huyết Văn Khôi', boots: 'Huyết Văn Ngoa', ring: 'Huyết Ngọc Giới', jade: 'Huyết Ngọc' } },
  { power: 12, names: { weapon: 'Hàn Băng Kiếm', armor: 'Băng Tinh Giáp', helm: 'Băng Tinh Quan', boots: 'Hàn Băng Ngoa', ring: 'Băng Phách Giới', jade: 'Băng Phách Châu' } },
  { power: 15, names: { weapon: 'Cửu U Kiếm', armor: 'U Minh Giáp', helm: 'U Minh Khôi', boots: 'U Minh Ngoa', ring: 'U Minh Giới', jade: 'U Minh Châu' } },
  { power: 18, names: { weapon: 'Thái Cổ Ma Kiếm', armor: 'Ma Uyên Giáp', helm: 'Ma Uyên Quan', boots: 'Ma Uyên Ngoa', ring: 'Ma Uyên Giới', jade: 'Ma Uyên Châu' } },
  { power: 21, names: { weapon: 'Hư Không Kiếm', armor: 'Hư Không Giáp', helm: 'Hư Không Quan', boots: 'Hư Không Ngoa', ring: 'Hư Không Giới', jade: 'Hư Không Châu' } },
  { power: 24, names: { weapon: 'Hỗn Độn Kiếm', armor: 'Hỗn Độn Giáp', helm: 'Hỗn Độn Quan', boots: 'Hỗn Độn Ngoa', ring: 'Hỗn Độn Giới', jade: 'Hỗn Độn Châu' } },
]

/** Công thức rèn theo phẩm cấp. */
/** Linh thạch rèn một món ở phẩm cấp `tier`: vài chục giây thu nhập tham chiếu tại bậc mở khoá (xem stoneRef ở campaign.js). */
export const forgeCost = (tier) => refCost(FORGE[tier].minStage, COST_SECONDS.forge)

export const FORGE = [
  { ingredients: { thiet_tinh: 6 }, minStage: 0 },
  { ingredients: { thiet_tinh: 12, huyen_thiet: 2 }, minStage: 4 },
  { ingredients: { huyen_thiet: 6 }, minStage: 9 },
  { ingredients: { huyen_thiet: 8, tinh_kim: 2 }, minStage: 12 },
  { ingredients: { tinh_kim: 5 }, minStage: 15 },
  { ingredients: { hu_khong_thach: 6 }, minStage: 18 },
  { ingredients: { hu_khong_thach: 8, hon_don_tinh: 2 }, minStage: 21 },
  { ingredients: { hon_don_tinh: 5 }, minStage: 24 },
]

let uidSeq = 0
const newUid = () => `e${Date.now().toString(36)}_${++uidSeq}`

/**
 * Chỉ số gốc của một ô ở phẩm cấp có cảnh giới chuẩn `p`.
 * Tổng 6 ô bằng tổng 3 ô trước đây (vũ khí/y phục/pháp bảo) nên cân bằng không đổi khi mặc đủ bộ:
 * công = 6+3p (vũ khí 70%, nhẫn 30%), thủ = 4+2p (y phục 50%, mũ 30%, giày 20%),
 * khí huyết = 60+37p (y phục 35%, mũ 35%, giày 10%, ngọc bội 20%), thân pháp = 1+p/5 (giày), linh khí (ngọc bội).
 */
function baseStats(slot, p) {
  const atk = 6 + 3 * p
  const def = 4 + 2 * p
  const hp = 60 + 37 * p
  switch (slot) {
    case 'weapon': return { atk: atk * 0.7 }
    case 'ring': return { atk: atk * 0.3 }
    case 'armor': return { def: def * 0.5, hp: hp * 0.35 }
    case 'helm': return { def: def * 0.3, hp: hp * 0.35 }
    case 'boots': return { def: def * 0.2, hp: hp * 0.1, speed: 1 + Math.floor(p / 5) }
    default: return { hp: hp * 0.2, exp: 0.02 + 0.002 * p } // jade
  }
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
  atk: { label: 'công kích', slots: ['weapon', 'ring'], min: 0.03, max: 0.08 },
  hp: { label: 'khí huyết', slots: ['armor', 'helm', 'boots', 'jade'], min: 0.04, max: 0.1 },
  def: { label: 'phòng ngự', slots: ['armor', 'helm', 'boots'], min: 0.04, max: 0.1 },
  speed: { label: 'Thân pháp', slots: ['weapon', 'armor', 'boots', 'ring', 'jade'], min: 0.03, max: 0.08 },
  crit: { label: 'chí mạng', slots: ['weapon', 'ring', 'jade'], min: 0.02, max: 0.06 },
  skillDmg: { label: 'sát thương võ kỹ', slots: ['weapon', 'ring', 'jade'], min: 0.05, max: 0.12 },
  lifesteal: { label: 'hút máu', slots: ['weapon', 'armor', 'ring'], min: 0.02, max: 0.05 },
  cd: { label: 'giảm hồi chiêu', slots: ['boots', 'jade'], min: 0.03, max: 0.07 },
  elem: { label: 'sát thương khi khắc hệ', slots: ['weapon', 'armor', 'ring', 'jade'], min: 0.04, max: 0.1 },
  luck: { label: 'tỉ lệ rơi đồ', slots: ['helm', 'boots', 'jade', 'armor'], min: 0.05, max: 0.12 },
  exp: { label: 'tốc độ linh khí', slots: ['helm', 'jade'], min: 0.02, max: 0.05 },
}
// Dòng đặc tính có tên: hiệu ứng điều kiện trong trận (special), hiển thị bằng text(v) thay vì "+x% nhãn".
const p1 = (v) => Math.round(v * 1000) / 10
Object.assign(AFFIXES, {
  bossDmg: { label: 'sát thương lên boss', slots: ['weapon', 'ring'], min: 0.06, max: 0.15, special: true, text: (v) => `+${p1(v)}% sát thương lên boss` },
  killHeal: { label: 'hồi máu khi hạ địch', slots: ['armor', 'helm', 'jade'], min: 0.03, max: 0.08, special: true, text: (v) => `Hạ yêu thú: hồi ${p1(v)}% khí huyết` },
  killShield: { label: 'lá chắn khi hạ địch', slots: ['armor', 'helm'], min: 0.06, max: 0.15, special: true, text: (v) => `Hạ yêu thú: lá chắn ${p1(v)}% khí huyết (8s)` },
  ignite: { label: 'đòn thường gây Thiêu', slots: ['weapon', 'ring'], min: 0.08, max: 0.2, special: true, text: (v) => `${p1(v)}% đòn thường gây Thiêu` },
  hitCd: { label: 'giảm hồi chiêu theo đòn', slots: ['boots', 'jade'], min: 0.4, max: 1, special: true, text: (v) => `Mỗi 5 đòn thường: giảm hồi chiêu ${Math.round(v * 10) / 10}s` },
})
export const AFFIX_IDS = Object.keys(AFFIXES)
/** Chuỗi một dòng phụ: "+5% công kích" hoặc câu có tên của dòng đặc tính. */
export const affixLine = (a) => (AFFIXES[a.id].text ? AFFIXES[a.id].text(a.v) : `+${p1(a.v)}% ${AFFIXES[a.id].label}`)
export const MAX_AFFIXES = 3
/** Số dòng phụ theo độ hiếm (Phàm 0, Linh 1, Bảo 2, Tiên 3). */
export const affixCount = (rarity) => Math.min(MAX_AFFIXES, rarity)

/** Chọn ngẫu nhiên `count` dòng phụ khác nhau hợp với ô; giá trị tăng nhẹ theo phẩm cấp. */
export function rollAffixes(slot, tier, count, rng = Math.random, keep = null) {
  const pool = AFFIX_IDS.filter((id) => AFFIXES[id].slots.includes(slot) && id !== keep?.id)
  const out = keep ? [keep] : []
  while (out.length < count && pool.length) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0]
    const a = AFFIXES[id]
    const v = (a.min + rng() * (a.max - a.min)) * (1 + 0.08 * tier)
    out.push({ id, v: Math.round(v * 1000) / 1000 })
  }
  return out
}

/** Bộ trang bị theo phẩm cấp: mặc 2 / 4 / 6 món cùng phẩm cấp (four gồm cả two, six gồm cả four). */
export const SETS = [
  { name: 'Thiết Cốt', two: { hp: 0.05 }, four: { atk: 0.05, def: 0.05 }, six: { hp: 0.06, thorns: 0.05 } },
  { name: 'Thanh Phong', two: { speed: 0.05 }, four: { skillDmg: 0.1, cd: 0.05 }, six: { speed: 0.06, crit: 0.03 } },
  { name: 'Huyết Văn', two: { lifesteal: 0.03 }, four: { atk: 0.08, crit: 0.04 }, six: { lifesteal: 0.03, atk: 0.06 } },
  { name: 'Hàn Băng', two: { def: 0.06 }, four: { hp: 0.1, elem: 0.06 }, six: { def: 0.08, elem: 0.06 } },
  { name: 'U Minh', two: { crit: 0.04 }, four: { critMult: 0.2, lifesteal: 0.03 }, six: { crit: 0.04, critMult: 0.2 } },
  { name: 'Ma Uyên', two: { atk: 0.06 }, four: { skillDmg: 0.12, atk: 0.05 }, six: { skillDmg: 0.1, cd: 0.05 } },
  { name: 'Hư Không', two: { speed: 0.06, luck: 0.06 }, four: { cd: 0.08, exp: 0.05 }, six: { cd: 0.06, luck: 0.08 } },
  { name: 'Hỗn Độn', two: { hp: 0.08, def: 0.08 }, four: { atk: 0.1, crit: 0.05, exp: 0.05 }, six: { atk: 0.08, hp: 0.1, skillDmg: 0.1 } },
]

/** Đồ Huyền Thoại: chỉ rơi từ Chúa Tể, mỗi ô một món, đặc hiệu cố định (extra: đánh thêm một đòn, thorns: phản sát thương). */
export const LEGENDS = {
  thanh_minh: { name: 'Thanh Minh Thần Kiếm', slot: 'weapon', perk: { atk: 0.2, extra: 0.25 }, text: '+20% công kích, 25% đánh thêm một đòn' },
  van_co: { name: 'Vạn Cổ Chiến Giáp', slot: 'armor', perk: { hp: 0.25, def: 0.2, thorns: 0.15 }, text: '+25% khí huyết, +20% phòng ngự, phản 15% sát thương nhận vào' },
  hong_mong: { name: 'Hồng Mông Thần Châu', slot: 'jade', perk: { exp: 0.15, luck: 0.12, cd: 0.15, skillDmg: 0.15 }, text: '+15% linh khí, +12% rơi đồ, -15% hồi chiêu, +15% sát thương võ kỹ' },
  thien_quan: { name: 'Thiên Quan Hộ Đạo', slot: 'helm', perk: { hp: 0.15, def: 0.15, luck: 0.1 }, text: '+15% khí huyết, +15% phòng ngự, +10% rơi đồ' },
  tieu_dao: { name: 'Tiêu Dao Du Ngoa', slot: 'boots', perk: { speed: 0.25, cd: 0.1 }, text: '+25% Thân pháp, -10% hồi chiêu' },
  chi_ton: { name: 'Chí Tôn Chiến Giới', slot: 'ring', perk: { crit: 0.1, critMult: 0.3, lifesteal: 0.03 }, text: '+10% chí mạng, +30% sát thương chí mạng, hút 3% máu' },
}
export const LEGEND_COLOR = '#f472b6'
export const LEGEND_MULT = 1.3 // chỉ số gốc nhân thêm

/** Mọi khoá thưởng từ dòng phụ / bộ / huyền thoại (mặc định 0). */
export const ZERO_GEAR_PERK = { bossDmg: 0, killHeal: 0, killShield: 0, ignite: 0, hitCd: 0, atk: 0, hp: 0, def: 0, speed: 0, crit: 0, critMult: 0, skillDmg: 0, lifesteal: 0, cd: 0, elem: 0, luck: 0, exp: 0, extra: 0, thorns: 0 }

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
    if (n >= 4) add(SETS[tier].four)
    if (n >= 6) add(SETS[tier].six)
  }
  return out
}

/** Cộng gộp nhiều khối thưởng (cùng khoá thì cộng dồn). */
const mergePerks = (...perks) => perks.reduce((o, p) => { for (const [k, v] of Object.entries(p)) o[k] = (o[k] ?? 0) + v; return o }, {})

/** Bộ trang bị đang kích hoạt: [{ name, pieces, bonus: perk }]. */
export function activeSets(items) {
  const out = []
  for (const [tier, n] of Object.entries(setCounts(items))) {
    if (n < 2) continue
    const set = SETS[tier]
    out.push({ name: set.name, pieces: Math.min(n, 6), bonus: n >= 6 ? { ...mergePerks(set.two, set.four, set.six) } : n >= 4 ? mergePerks(set.two, set.four) : set.two })
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

/** Đổi lại dòng phụ ngẫu nhiên (không áp dụng cho Huyền Thoại hay đồ Phàm). `lock` = chỉ số dòng được khoá (giữ nguyên). */
export function rerollItemAffixes(item, rng = Math.random, lock = -1) {
  const keep = lock >= 0 && item.affixes[lock] ? { ...item.affixes[lock] } : null
  item.affixes = rollAffixes(item.slot, item.tier, affixCount(item.rarity), rng, keep)
}
/** Linh thạch đổi dòng phụ; khoá một dòng thì đắt gấp đôi. */
export const rerollCost = (item, locked = false) => refCost(TIERS[item.tier].power, COST_SECONDS.reroll * (item.rarity + 1) * (locked ? 2 : 1))

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
export const enhanceCost = (item) => refCost(TIERS[item.tier].power, COST_SECONDS.enhance * (item.enh + 1))

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
export const affixText = (item) => (item.affixes ?? []).map(affixLine).join(', ')

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
