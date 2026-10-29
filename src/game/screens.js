// =====================================================================
// screens.js - Danh sách màn hình (mỗi tab là một màn hình riêng chiếm toàn bộ khung nội dung).
// `canvas: true` = màn có cảnh PixiJS ở trên (Nhân Vật: tu luyện; Vượt Ải: chiến đấu).
// Thuần dữ liệu (không import Vue) để test được trong Node; component nằm ở components/screens.js.
// =====================================================================

export const SCREENS = [
  { id: 'character', label: 'Nhân Vật', icon: 'character', canvas: true },
  { id: 'skills', label: 'Công Pháp', icon: 'skills', canvas: false },
  { id: 'gear', label: 'Trang Bị', icon: 'gear', canvas: false },
  { id: 'battle', label: 'Vượt Ải', icon: 'dungeon', canvas: true },
  { id: 'inventory', label: 'Túi Đồ', icon: 'bag', canvas: false },
  { id: 'sect', label: 'Tông Môn', icon: 'sect', canvas: false },
  { id: 'disciples', label: 'Đệ Tử', icon: 'disciple', canvas: false },
  { id: 'dwelling', label: 'Động Phủ', icon: 'home', canvas: false },
  { id: 'garden', label: 'Linh Điền', icon: 'garden', canvas: false },
  { id: 'reincarnation', label: 'Luân Hồi', icon: 'reborn', canvas: false },
  { id: 'story', label: 'Cốt Truyện', icon: 'book', canvas: false },
  { id: 'achievements', label: 'Thành Tựu', icon: 'trophy', canvas: false },
  { id: 'settings', label: 'Cài Đặt', icon: 'settings', canvas: false },
]

export const DEFAULT_SCREEN = 'character'
export const screenById = (id) => SCREENS.find((s) => s.id === id) ?? null
export const hasCanvas = (id) => !!screenById(id)?.canvas
