// =====================================================================
// skilltree.js - Cây kỹ năng theo Đạo Lộ (Kiếm, Đao, Thể, Phù).
// Mỗi đạo lộ có 8 nút: 4 Võ Kỹ (chuỗi), 1 Tuyệt Kỹ, 3 Bí Kỹ (chuỗi buff trong trận). Chọn đạo lộ rồi đủ cảnh giới
// thì nút TỰ MỞ (cấp 1) và tự thi triển trong trận; nâng cấp bằng ĐIỂM KỸ NĂNG nhận theo thời gian (như linh thạch).
// Thuần dữ liệu, không import Vue. Hiệu lực dùng chung bộ kind của skills.js
// (damage | dot | stun | execute | ultimate | heal | shield | haste | lifesteal | rage | reflect | crit).
// =====================================================================

export const TREE_COLS = { vo: 'Võ Kỹ', tuyet: 'Tuyệt Kỹ', bi: 'Bí Kỹ' }
/** Cấp tối đa theo cột. */
export const TREE_MAX_LEVEL = { vo: 10, bi: 10, tuyet: 5 }
/** Hệ số sức mạnh chung của kỹ năng trong cây (cân bằng: tất cả nút tự thi triển, không chiếm ô). */
export const TREE_POWER_SCALE = 0.7

/** Vị trí lưới (cột 0..2, hàng 0..3) của nút n=1..8 (bố cục như bảng kỹ năng): cột trái Võ Kỹ, giữa Tuyệt Kỹ, phải Bí Kỹ. */
export const TREE_POS = {
  1: { c: 0, r: 0 }, // Võ Kỹ 1
  5: { c: 1, r: 0 }, // Tuyệt Kỹ
  6: { c: 2, r: 0 }, // Bí Kỹ 1
  2: { c: 0, r: 1 }, // Võ Kỹ 2
  7: { c: 2, r: 1 }, // Bí Kỹ 2
  3: { c: 0, r: 2 }, // Võ Kỹ 3
  8: { c: 2, r: 2 }, // Bí Kỹ 3
  4: { c: 1, r: 3 }, // Võ Kỹ 4 (chốt)
}
/** Cảnh giới (chỉ số đại cảnh giới) mở từng nút n=1..8; cảnh giới 1 = Trúc Cơ (chọn đạo lộ). */
export const TREE_REALM = { 1: 1, 6: 2, 2: 2, 5: 3, 7: 3, 3: 4, 8: 5, 4: 6 }
/** Cạnh nối giữa các nút (cha -> con). */
export const TREE_EDGES = [[1, 2], [2, 3], [3, 4], [6, 7], [7, 8], [8, 4], [1, 5], [5, 6]]

const col = (n) => (n <= 4 ? 'vo' : n === 5 ? 'tuyet' : 'bi')

/** Dữ liệu 8 nút của từng đạo lộ: [tên, hệ, kind, power, cd, thêm]. n = thứ tự 1..8 (xem TREE_POS). */
const RAW = {
  kiem: [
    ['Ngự Kiếm Quyết', 'kim', 'damage', 1, 0, { basic: true }], // đòn đánh cơ bản của đạo lộ: thay đòn chém thường, không hồi chiêu
    ['Phi Kiếm Liên Hoàn', 'kim', 'damage', 2, 8, { hits: 5 }], // 5 thanh kiếm, mỗi thanh một đòn riêng (chí mạng riêng)
    ['Phong Lôi Kiếm Quyết', 'kim', 'stun', 1.5, 12, { seconds: 1.5 }],
    ['Vạn Kiếm Quy Tông', 'kim', 'damage', 3.2, 14, { hits: 3, gap: 0.45, defStack: 0.1 }], // 3 đợt kiếm rơi, mỗi đợt giáp địch yếu thêm 10%
    ['Tru Tiên Nhất Kiếm', 'kim', 'ultimate', 7, 40, { pierceBonus: 0.5 }], // trảm tan giáp địch đang Phá Giáp: +50% sát thương, xoá Phá Giáp
    ['Kiếm Tâm Thông Minh', 'kim', 'crit', 0.25, 16, { seconds: 8 }],
    ['Đạp Vân Bộ', 'moc', 'haste', 0.35, 18, { seconds: 8 }],
    ['Kiếm Ý Hộ Thể', 'kim', 'shield', 0.3, 20, { seconds: 10 }],
  ],
  dao: [
    ['Liệt Hỏa Trảm', 'hoa', 'damage', 1.5, 5],
    ['Tâm Nguyệt Đao', 'hoa', 'execute', 1.6, 8, { threshold: 0.3, bonus: 1 }],
    ['Hỏa Hoàn Thuật', 'hoa', 'dot', 0.5, 12, { seconds: 6 }],
    ['Phá Quân Đao', 'hoa', 'damage', 3.3, 14],
    ['Thiên Hỏa Phần Thế', 'hoa', 'ultimate', 7.5, 40],
    ['Đao Ý Cuồng Phong', 'hoa', 'haste', 0.4, 18, { seconds: 8 }],
    ['Chiến Ý Sôi Trào', 'hoa', 'rage', 0.4, 16, { seconds: 8 }],
    ['Bất Khuất Huyết Đao', 'hoa', 'lifesteal', 0.35, 18, { seconds: 8 }],
  ],
  the: [
    ['Bách Lôi Quyền', 'tho', 'damage', 1.4, 5],
    ['Đoạn Kim Chưởng', 'tho', 'damage', 2, 8],
    ['Hắc Hổ Đảo Tâm', 'tho', 'execute', 1.8, 9, { threshold: 0.35, bonus: 1 }],
    ['Chưởng Tâm Lôi', 'tho', 'stun', 2.4, 14, { seconds: 2 }],
    ['Thái Sơn Áp Đỉnh', 'tho', 'ultimate', 7, 40],
    ['Kim Cương Nộ Mục', 'tho', 'rage', 0.35, 16, { seconds: 8 }],
    ['Huyền Quy Tế Thể', 'tho', 'shield', 0.35, 18, { seconds: 10 }],
    ['Bất Hoại Kim Thân', 'tho', 'reflect', 0.5, 18, { seconds: 8 }],
  ],
  phu: [
    ['Hỏa Phù Thuật', 'hoa', 'damage', 1.4, 5],
    ['Lôi Phù Chấn', 'kim', 'stun', 1.5, 10, { seconds: 1.5 }],
    ['Băng Phù Phong Tỏa', 'thuy', 'damage', 2, 9, { slow: 0.3, seconds: 5 }],
    ['Ngũ Hành Phù Trận', 'thuy', 'damage', 3.2, 14],
    ['Thiên Lôi Chân Phù', 'thuy', 'ultimate', 7, 40],
    ['Linh Phù Hộ Thể', 'thuy', 'shield', 0.3, 18, { seconds: 10 }],
    ['Tụ Linh Phù', 'moc', 'heal', 0.2, 20],
    ['Phản Phù Chú', 'thuy', 'reflect', 0.5, 18, { seconds: 8 }],
  ],
}

/** TREES[pathId] = [nút n=1..8], nút: { id, path, n, col, name, element, kind, power, cd, minRealm, parent, ... }. */
export const TREES = Object.fromEntries(
  Object.entries(RAW).map(([path, list]) => [
    path,
    list.map(([name, element, kind, power, cd, extra = {}], i) => {
      const n = i + 1
      return { id: `${path}_${n}`, path, n, col: col(n), name, element, kind, power, cd, minRealm: TREE_REALM[n], ...extra }
    }),
  ]),
)
/** Mọi nút theo id (dùng như định nghĩa kỹ năng: tên, hệ, kind, power, cd...). */
export const TREE_SKILLS = Object.fromEntries(Object.values(TREES).flat().map((nd) => [nd.id, nd]))
export const TREE_PATHS = Object.keys(TREES)

export const treeMaxLevel = (id) => TREE_MAX_LEVEL[TREE_SKILLS[id].col]
/** Nút có mở được không: đúng đạo lộ và đủ cảnh giới (mọi nút có cảnh giới tăng dần theo chuỗi nên cha luôn mở trước). */
export const treeUnlocked = (id, path, realmIdx) => !!TREE_SKILLS[id] && TREE_SKILLS[id].path === path && realmIdx >= TREE_SKILLS[id].minRealm
/** Điểm kỹ năng để nâng nút từ cấp `level` lên cấp kế: Võ Kỹ / Bí Kỹ = cấp hiện tại, Tuyệt Kỹ = 2 x cấp hiện tại. */
export const treeUpgradeCost = (id, level) => (TREE_SKILLS[id].col === 'tuyet' ? 2 * level : level)

/** Thứ tự ưu tiên thi triển trong trận: Tuyệt Kỹ, Võ Kỹ từ mạnh tới yếu, rồi Bí Kỹ. */
export const TREE_CAST_ORDER = [5, 4, 3, 2, 1, 6, 7, 8]
/** Id các nút đang hoạt động (đã mở) của đạo lộ `path` theo thứ tự thi triển. */
export const activeTreeIds = (path, realmIdx) =>
  path && TREES[path] ? TREE_CAST_ORDER.map((n) => TREES[path][n - 1].id).filter((id) => treeUnlocked(id, path, realmIdx)) : []

/** Điểm kỹ năng nhận mỗi giây: 1 điểm / 10 phút ở đầu game, tăng 12% mỗi bậc tu vi. */
export const SKILL_POINT_BASE = 1 / 600
/** Điểm kỹ năng rơi thêm khi hạ boss (theo loại ải): thay cho tàn quyển võ kỹ cũ. */
export const SKILL_POINT_DROP = { mini: 0.1, big: 0.3, lord: 1 }
export const skillPointRate = (stageIdx) => SKILL_POINT_BASE * (1 + 0.12 * stageIdx)
