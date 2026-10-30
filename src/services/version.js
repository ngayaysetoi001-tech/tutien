// version.js - Kiểm tra có bản game mới không (không cần service worker).
// Mỗi lần build, vite ghi dist/version.json = { id }; bản đang chạy biết id của chính nó (__BUILD_ID__).
// Hai id khác nhau nghĩa là đã có bản mới trên máy chủ. Gọi lại định kỳ và khi quay lại tab.

/** `remote` (id trên máy chủ) có khác `local` (id đang chạy) không. Rỗng / lỗi thì coi như không có bản mới. */
export const isNewerBuild = (local, remote) => typeof remote === 'string' && remote.length > 0 && typeof local === 'string' && local !== 'dev' && remote !== local

/** Hỏi máy chủ id bản mới nhất; trả về null nếu không lấy được (mất mạng, chưa có version.json). */
export async function fetchLatestBuildId(fetchFn = fetch, base = './') {
  try {
    const res = await fetchFn(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.id === 'string' ? data.id : null
  } catch {
    return null
  }
}

/** URL tải lại bản mới: thêm tham số để bỏ qua bản index.html còn nằm trong cache của trình duyệt. */
export const reloadUrl = (href, id) => {
  const u = new URL(href)
  u.searchParams.set('v', id)
  return u.toString()
}
