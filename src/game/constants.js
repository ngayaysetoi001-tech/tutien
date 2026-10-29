// =====================================================================
// constants.js - Dữ liệu tĩnh của game: cảnh giới, căn cốt, thiên kiếp...
// Không chứa logic; mọi công thức nằm ở formulas.js
// =====================================================================

export const SAVE_KEY = 'tutien-save-v1'
export const SAVE_VERSION = 1
export const AUTOSAVE_INTERVAL = 5 // giây
export const OFFLINE_CAP_SECONDS = 8 * 3600 // tối đa 8 tiếng offline
export const OFFLINE_MIN_SECONDS = 15 // dưới ngưỡng này không tính là "offline"
export const LOG_LIMIT = 200

/**
 * Các đại cảnh giới. `stages` là danh sách tên tiểu cảnh giới.
 * `color` dùng cho hào quang / UI (dạng số 0xRRGGBB cho Pixi).
 */
export const REALMS = [
  {
    id: 'luyen_khi',
    name: 'Luyện Khí',
    stages: Array.from({ length: 9 }, (_, i) => `Tầng ${i + 1}`),
    color: 0x7fe3ff,
  },
  {
    id: 'truc_co',
    name: 'Trúc Cơ',
    stages: ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ'],
    color: 0x6dffb0,
  },
  {
    id: 'kim_dan',
    name: 'Kim Đan',
    stages: ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ'],
    color: 0xffd36b,
  },
  {
    id: 'nguyen_anh',
    name: 'Nguyên Anh',
    stages: ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ'],
    color: 0xd49bff,
  },
  { id: 'hoa_than', name: 'Hóa Thần', stages: ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ'], color: 0xff8fb8 },
  { id: 'luyen_hu', name: 'Luyện Hư', stages: ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ'], color: 0x8fb8ff },
  { id: 'hop_the', name: 'Hợp Thể', stages: ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ'], color: 0xfff2a8 },
]

/**
 * Danh sách phẳng toàn bộ tiểu cảnh giới (27 bậc), index = stageIdx.
 * Mỗi phần tử biết mình thuộc đại cảnh giới nào và có phải bậc cuối đại cảnh giới không.
 */
export const STAGES = REALMS.flatMap((realm, realmIdx) =>
  realm.stages.map((stageName, i) => ({
    realmIdx,
    realmName: realm.name,
    stageName,
    fullName: `${realm.name} ${stageName}`,
    isRealmLast: i === realm.stages.length - 1,
  })),
)
export const MAX_STAGE_IDX = STAGES.length - 1

/** Các loại căn cốt: ảnh hưởng hệ số tốc độ hấp thụ linh khí. */
export const SPIRIT_ROOTS = [
  { id: 'ngu', name: 'Ngũ Linh Căn', mult: 0.85, weight: 40, desc: 'Ngụy linh căn, tu hành gian nan.' },
  { id: 'tu', name: 'Tứ Linh Căn', mult: 1.0, weight: 30, desc: 'Tư chất bình thường.' },
  { id: 'tam', name: 'Tam Linh Căn', mult: 1.2, weight: 18, desc: 'Tư chất khá.' },
  { id: 'song', name: 'Song Linh Căn', mult: 1.5, weight: 9, desc: 'Tư chất thượng đẳng.' },
  { id: 'thien', name: 'Thiên Linh Căn', mult: 1.9, weight: 3, desc: 'Vạn người có một, thiên tài tu đạo!' },
]

/**
 * Thiên kiếp (Lôi Kiếp): chỉ khi đột phá từ bậc cuối của đại cảnh giới (từ Trúc Cơ trở đi).
 * Khóa = realmIdx hiện tại. Sát thương thô đạo thứ i = base * growth^i, sau đó giảm theo Phòng ngự.
 */
export const TRIBULATIONS = {
  1: { name: 'Trúc Cơ Lôi Kiếp', bolts: 3, base: 250, growth: 1.25 },
  2: { name: 'Kim Đan Cửu Trọng Lôi Kiếp', bolts: 9, base: 88, growth: 1.2 },
  3: { name: 'Nguyên Anh Thiên Kiếp', bolts: 9, base: 105, growth: 1.2 },
  4: { name: 'Hóa Thần Cửu Trọng Thiên Phạt', bolts: 9, base: 131, growth: 1.2 },
  5: { name: 'Luyện Hư Hỗn Độn Kiếp', bolts: 9, base: 159, growth: 1.2 },
}

/** Tên hiển thị của kho đồ (dùng ở tab Túi Đồ). */
export const INVENTORY_GROUPS = [
  { key: 'herbs', label: 'Thảo dược' },
  { key: 'ores', label: 'Khoáng thạch' },
  { key: 'scrolls', label: 'Tàn quyển bí kíp' },
  { key: 'pills', label: 'Đan dược' },
]

// ---- Các hằng số cân bằng game (xem formulas.js) ----
export const BALANCE = {
  baseRequirement: 100, // linh khí cần cho tầng 1
  requirementGrowth: 2.1, // mỗi bậc cần gấp 2.1 lần (tốc độ gốc chỉ tăng 1.5 lần)
  stageExpGrowth: 1.5, // mỗi bậc tăng tốc hấp thụ ~1.5 lần
  baseSuccessRate: 0.9, // tỉ lệ đột phá bậc đầu
  successDropPerStage: 0.03, // giảm mỗi bậc
  minSuccessRate: 0.4,
  failExpLoss: 0.25, // thất bại: mất 25% yêu cầu linh khí
  tribulationFailExpLoss: 0.5, // thiên kiếp thất bại: mất 50%
  arrayBaseCost: 10, // giá nâng Tụ Linh Trận cấp 0 -> 1
  arrayCostGrowth: 1.4,
  clickSeconds: 2, // mỗi lần bấm Tụ Khí = 2 giây linh khí
  rewardExpCap: 0.008, // phần thưởng linh khí (kỳ ngộ, thành tựu) tối đa 0.8% yêu cầu đột phá
  pillExpCap: 0.1, // Tụ Khí Đan tối đa 10% yêu cầu đột phá
  pillExpStreak: 0.6, // mỗi viên dùng thêm trong cùng một bậc chỉ còn 60% hiệu quả viên trước
  killExpDecay: 0.7, // linh khí hạ quái giảm 30% cho mỗi bậc tu vi vượt bậc chuẩn của bí cảnh
  killStoneDecay: 0.8, // linh thạch và Cống Hiến hạ quái giảm 20% cho mỗi bậc vượt bậc chuẩn
}
