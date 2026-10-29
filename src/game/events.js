// =====================================================================
// events.js - Event bus siêu nhỏ để store "bắn" hiệu ứng sang PixiJS
// mà không cần store biết gì về canvas (tách lớp logic / hiển thị).
//
// Các sự kiện đang dùng:
//   cultivate               - người chơi bấm Tụ Khí
//   breakthrough-success    - đột phá thành công { realmChanged }
//   breakthrough-fail       - đột phá thất bại
//   tribulation-start       - bắt đầu độ kiếp { total }
//   tribulation-bolt        - một đạo thiên lôi giáng xuống { index, total, damage, hpRatio }
//   tribulation-end         - kết thúc độ kiếp { survived }
// =====================================================================

const listeners = new Map()

/** Đăng ký lắng nghe. Trả về hàm huỷ đăng ký. */
export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(handler)
  return () => listeners.get(event)?.delete(handler)
}

/** Phát sự kiện tới mọi handler đã đăng ký. */
export function emit(event, payload) {
  const set = listeners.get(event)
  if (!set) return
  for (const handler of set) handler(payload)
}
