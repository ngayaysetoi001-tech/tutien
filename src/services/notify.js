// =====================================================================
// notify.js - Thông báo trình duyệt (tuỳ chọn). Chỉ hoạt động khi trang / PWA còn mở ở nền:
// không có máy chủ đẩy nên không thể báo khi đã đóng hẳn.
// =====================================================================

export const notifySupported = () => typeof Notification !== 'undefined'

/** Xin quyền (gọi khi người chơi bật tuỳ chọn). Trả về 'granted' | 'denied' | 'default' | 'unsupported'. */
export async function requestNotify() {
  if (!notifySupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Hiện một thông báo nếu đã được cấp quyền; lỗi thì bỏ qua. */
export function notify(title, body) {
  try {
    if (notifySupported() && Notification.permission === 'granted') new Notification(title, { body, icon: './icons/icon-192.png' })
  } catch {
    /* một số trình duyệt di động chỉ cho phép thông báo qua service worker */
  }
}
