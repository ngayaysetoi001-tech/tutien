// =====================================================================
// achievements.js - Thành tựu theo bậc: mỗi thành tựu có nhiều mốc, nhận thưởng từng mốc.
// `key` là tên thống kê do gameStore.achievementValue(key) cung cấp.
// Thưởng mốc i: linh thạch (tỉ lệ theo bậc tu vi) + chỉ số vĩnh viễn `stat`.
// =====================================================================

export const ACHIEVEMENTS = [
  { id: 'stage', name: 'Đăng Phong', desc: 'Đạt cảnh giới (số bậc đã đột phá)', key: 'stage', targets: [9, 12, 15, 17, 20, 23, 26], stat: 'hp' },
  { id: 'breakthroughs', name: 'Phá Cảnh', desc: 'Đột phá thành công', key: 'breakthroughs', targets: [1, 5, 10, 17], stat: 'hp' },
  { id: 'tribulations', name: 'Độ Kiếp', desc: 'Vượt qua thiên kiếp', key: 'tribulations', targets: [1, 2, 4], stat: 'def' },
  { id: 'kills', name: 'Trảm Yêu', desc: 'Hạ yêu thú', key: 'kills', targets: [10, 50, 200, 1000, 5000], stat: 'atk' },
  { id: 'bossKills', name: 'Diệt Vương', desc: 'Hạ boss', key: 'bossKills', targets: [1, 5, 20, 50], stat: 'atk' },
  { id: 'clears', name: 'Thông Quan', desc: 'Thông quan bí cảnh', key: 'clears', targets: [1, 5, 20, 50], stat: 'def' },
  { id: 'crafted', name: 'Đan Sư', desc: 'Luyện đan thành công', key: 'crafted', targets: [5, 25, 100, 300], stat: 'exp' },
  { id: 'forged', name: 'Thợ Rèn', desc: 'Rèn pháp khí', key: 'forged', targets: [1, 5, 20], stat: 'speed' },
  { id: 'skills', name: 'Bách Gia Võ Học', desc: 'Học công pháp', key: 'skills', targets: [1, 3, 6], stat: 'speed' },
  { id: 'events', name: 'Kỳ Ngộ', desc: 'Trải qua kỳ ngộ', key: 'events', targets: [3, 10, 30], stat: 'hp' },
  { id: 'reborn', name: 'Luân Hồi', desc: 'Luân hồi chuyển thế', key: 'reincarnations', targets: [1, 3, 10], stat: 'exp' },
  { id: 'harvest', name: 'Nông Phu Tu Tiên', desc: 'Thu hoạch Linh Điền', key: 'harvests', targets: [5, 30, 100], stat: 'hp' },
  { id: 'quest', name: 'Cần Mẫn Việc Tông', desc: 'Hoàn thành nhiệm vụ', key: 'questsDone', targets: [5, 25, 100, 300], stat: 'atk' },
  { id: 'clicks', name: 'Cần Tu', desc: 'Bấm Tụ Khí', key: 'clicks', targets: [100, 1000, 5000], stat: 'exp' },
]

/** Danh sách effects thưởng cho mốc `tier` (0-based) của một thành tựu. */
export function achievementReward(ach, tier) {
  const n = tier + 1
  const stat = { hp: 20 * n, atk: 3 * n, def: 2 * n, speed: 1 }[ach.stat]
  const effects = [{ type: 'stones', base: 50 * Math.pow(2.5, tier) }]
  if (ach.stat === 'exp') effects.push({ type: 'expBonus', amount: 0.01 })
  else if (ach.stat === 'speed' && tier % 2 === 1) effects.push({ type: 'stat', stat: 'speed', amount: stat })
  else if (ach.stat !== 'speed') effects.push({ type: 'stat', stat: ach.stat, amount: stat })
  return effects
}
