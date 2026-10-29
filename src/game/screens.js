// =====================================================================
// screens.js - Danh sách màn hình (mỗi tab là một màn hình riêng chiếm toàn bộ khung nội dung).
// `canvas: true` = màn có cảnh PixiJS ở trên (Nhân Vật: tu luyện; Vượt Ải: chiến đấu).
// Thuần dữ liệu (không import Vue) để test được trong Node; component nằm ở components/screens.js.
// =====================================================================

export const SCREENS = [
  { id: 'character', label: 'Nhân Vật', icon: 'character', canvas: true, group: 'tuluyen' },
  { id: 'skills', label: 'Công Pháp', icon: 'arts', canvas: false, group: 'tuluyen' },
  { id: 'dwelling', label: 'Động Phủ', icon: 'home', canvas: false, group: 'tuluyen' },
  { id: 'garden', label: 'Linh Điền', icon: 'garden', canvas: false, group: 'tuluyen' },
  { id: 'reincarnation', label: 'Luân Hồi', icon: 'reborn', canvas: false, group: 'tuluyen' },
  { id: 'battle', label: 'Vượt Ải', icon: 'dungeon', canvas: true, group: 'vuotai' },
  { id: 'gear', label: 'Trang Bị', icon: 'gear', canvas: false, group: 'hanhtrang' },
  { id: 'inventory', label: 'Túi Đồ', icon: 'bag', canvas: false, group: 'hanhtrang' },
  { id: 'sect', label: 'Tông Môn', icon: 'sect', canvas: false, group: 'monphai' },
  { id: 'disciples', label: 'Đệ Tử', icon: 'disciple', canvas: false, group: 'monphai' },
  { id: 'story', label: 'Cốt Truyện', icon: 'book', canvas: false, group: 'them' },
  { id: 'achievements', label: 'Thành Tựu', icon: 'trophy', canvas: false, group: 'them' },
  { id: 'settings', label: 'Cài Đặt', icon: 'settings', canvas: false, group: 'them' },
]

/** 5 nhóm ở thanh dưới; mỗi nhóm có các màn con (chip ở đầu màn hình). */
export const GROUPS = [
  { id: 'tuluyen', label: 'Tu Luyện', icon: 'lotus' },
  { id: 'vuotai', label: 'Vượt Ải', icon: 'dungeon' },
  { id: 'hanhtrang', label: 'Hành Trang', icon: 'bag' },
  { id: 'monphai', label: 'Môn Phái', icon: 'sect' },
  { id: 'them', label: 'Thêm', icon: 'dots' },
]

export const DEFAULT_SCREEN = 'character'

const maxStageOf = (g) => Math.max(g.stageIdx, g.stats.maxStage)
const hasAnyItem = (g) => Object.values(g.inventory).some((grp) => Object.keys(grp).length > 0)

/**
 * Điều kiện mở khoá từng màn hình (hiện dần để người mới không bị choáng). Màn không có trong bảng luôn mở.
 *   test(g)     : đã mở chưa (g = store game)
 *   text        : điều kiện hiển thị cho người chơi
 *   progress(g) : 0..1 tiến độ tới lúc mở (không bắt buộc)
 */
export const UNLOCKS = {
  dwelling: {
    text: 'Đạt Luyện Khí Tầng 2', test: (g) => maxStageOf(g) >= 1 || g.arrayLevel > 0 || g.spiritStones.gte(10) || Object.keys(g.inventory.herbs).length > 0,
    progress: (g) => Math.min(1, maxStageOf(g) / 1),
  },
  story: { text: 'Đạt Luyện Khí Tầng 2', test: (g) => maxStageOf(g) >= 1 || g.story.done > 0, progress: (g) => Math.min(1, maxStageOf(g) / 1) },
  garden: { text: 'Đạt Luyện Khí Tầng 2', test: (g) => maxStageOf(g) >= 1, progress: (g) => Math.min(1, maxStageOf(g) / 1) },
  achievements: { text: 'Hạ yêu thú đầu tiên', test: (g) => g.stats.kills >= 1 || g.stats.breakthroughs > 0 || g.claimableCount > 0 },
  inventory: { text: 'Nhặt được vật phẩm đầu tiên', test: (g) => hasAnyItem(g) || g.stats.kills >= 5 },
  skills: {
    text: 'Hạ Tiểu Boss đầu tiên (ải 5)',
    test: (g) => g.campaign.record >= 5 || Object.keys(g.skills.owned).length > 0 || Object.keys(g.arts.owned).length > 0 || Object.keys(g.inventory.scrolls).length > 0,
    progress: (g) => Math.min(1, g.campaign.record / 5),
  },
  gear: { text: 'Hạ Tiểu Boss đầu tiên (ải 5)', test: (g) => g.campaign.record >= 5 || g.gear.bag.length > 0, progress: (g) => Math.min(1, g.campaign.record / 5) },
  sect: {
    text: 'Đạt Luyện Khí Tầng 3', test: (g) => maxStageOf(g) >= 2 || !!g.sect.id || g.quests.some((q) => g.questDone(q)),
    progress: (g) => Math.min(1, maxStageOf(g) / 2),
  },
  disciples: { text: 'Gia nhập tông môn', test: (g) => !!g.sect.id || g.disciples.length > 0 },
  reincarnation: { text: 'Đạt Trúc Cơ Sơ Kỳ', test: (g) => maxStageOf(g) >= 9 || g.reincarnation.count > 0, progress: (g) => Math.min(1, maxStageOf(g) / 9) },
}

/** Màn hình `id` đã mở chưa. */
export const screenUnlocked = (id, g) => !UNLOCKS[id] || UNLOCKS[id].test(g)

/** Các màn đã mở, theo thứ tự thanh điều hướng. */
export const unlockedScreens = (g) => SCREENS.filter((s) => screenUnlocked(s.id, g))

/** Các màn chưa mở: [{ screen, text, progress (hoặc null) }]. */
export const lockedScreens = (g) =>
  SCREENS.filter((s) => !screenUnlocked(s.id, g)).map((s) => ({ screen: s, text: UNLOCKS[s.id].text, progress: UNLOCKS[s.id].progress?.(g) ?? null }))
export const screenById = (id) => SCREENS.find((s) => s.id === id) ?? null
export const hasCanvas = (id) => !!screenById(id)?.canvas

export const groupOf = (screenId) => screenById(screenId)?.group ?? null
/** Các màn đã mở của nhóm. */
export const groupScreens = (groupId, g) => unlockedScreens(g).filter((s) => s.group === groupId)
/** Các nhóm có ít nhất một màn đã mở (theo thứ tự thanh dưới). */
export const unlockedGroups = (g) => GROUPS.filter((gr) => groupScreens(gr.id, g).length > 0)
