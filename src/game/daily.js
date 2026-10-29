// =====================================================================
// daily.js - Điểm danh hằng ngày (chuỗi 7 ngày) và 3 nhiệm vụ ngày ngắn.
// Ngày tính theo giờ địa phương của thiết bị. Bỏ lỡ một ngày thì chuỗi về 0.
// =====================================================================
import { ARTS, artFragmentId } from './arts.js'
import { QUEST_TEMPLATES } from './quests.js'

export const DAILY_TASK_COUNT = 3
export const STREAK_DAYS = 7
/** Giây của thời gian cộng thêm vào kho thời gian mỗi lần hoàn thành cả 3 nhiệm vụ ngày (xem tăng tốc). */
export const DAILY_BONUS_TIME = 30 * 60

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Khoá ngày địa phương dạng YYYY-MM-DD của mốc thời gian `ms`. */
export const dayKey = (ms) => keyOf(new Date(ms))

/** Khoá ngày hôm trước. */
export function previousDayKey(ms) {
  const d = new Date(ms)
  d.setDate(d.getDate() - 1)
  return keyOf(d)
}

export const emptyDaily = () => ({ day: '', streak: 0, claimed: false, bonus: false, tasks: [] })

/** Ngày thưởng (1..7) mà lần điểm danh kế tiếp sẽ nhận, theo số ngày liên tiếp đã điểm danh. */
export const nextRewardDay = (streak) => (streak % STREAK_DAYS) + 1

/** Công pháp tàn quyển dùng cho phần thưởng ngày (chọn trong các công pháp đã mở theo ải). */
export function dailyArtPool(record) {
  const pool = Object.keys(ARTS).filter((id) => ARTS[id].minAi <= Math.max(1, record))
  return pool.length ? pool : [Object.keys(ARTS)[0]]
}

/** Danh sách effects của ngày thưởng `day` (1..7); `artId` là công pháp tàn quyển nhận. */
export function dailyReward(day, artId) {
  const frag = (count) => ({ type: 'item', id: artFragmentId(artId), count })
  switch (day) {
    case 1: return [{ type: 'stones', base: 60 }]
    case 2: return [{ type: 'stones', base: 40 }, { type: 'item', id: 'hoi_huyet_dan', count: 3 }]
    case 3: return [{ type: 'stones', base: 100 }, { type: 'item', id: 'tu_khi_dan', count: 2 }]
    case 4: return [{ type: 'stones', base: 150 }, frag(2)]
    case 5: return [{ type: 'stones', base: 200 }, { type: 'item', id: 'duong_the_dan', count: 1 }]
    case 6: return [{ type: 'stones', base: 300 }, frag(3)]
    default: return [{ type: 'stones', base: 600 }, frag(4), { type: 'expBonus', amount: 0.01 }]
  }
}

/** Các mẫu nhiệm vụ dùng cho nhiệm vụ ngày (mọi mẫu của bảng nhiệm vụ). */
export const DAILY_TEMPLATE_IDS = QUEST_TEMPLATES.map((t) => t.id)

/** Phần thưởng một nhiệm vụ ngày và phần thưởng thêm khi xong cả 3. */
export const DAILY_TASK_REWARD = [{ type: 'stones', base: 25 }]
export const DAILY_BONUS_REWARD = [{ type: 'stones', base: 90 }, { type: 'item', id: 'hoi_huyet_dan', count: 5 }]
