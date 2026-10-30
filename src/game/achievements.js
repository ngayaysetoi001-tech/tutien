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
  { id: 'bossKills', name: 'Diệt Vương', desc: 'Hạ boss ải', key: 'bossKills', targets: [1, 5, 20, 50], stat: 'atk' },
  { id: 'clears', name: 'Vượt Ải', desc: 'Ải cao nhất từng vượt (mọi kiếp)', key: 'aiRecord', targets: [10, 30, 60, 100, 200, 400], stat: 'def' },
  { id: 'crafted', name: 'Đan Sư', desc: 'Luyện đan thành công', key: 'crafted', targets: [5, 25, 100, 300], stat: 'exp' },
  { id: 'forged', name: 'Thợ Rèn', desc: 'Rèn pháp khí', key: 'forged', targets: [1, 5, 20], stat: 'speed' },
  { id: 'skills', name: 'Bách Gia Võ Học', desc: 'Nâng cấp kỹ năng trong cây', key: 'skills', targets: [5, 20, 50, 100], stat: 'speed' },
  { id: 'arts', name: 'Tâm Pháp Thâm Hậu', desc: 'Tổng cấp công pháp đã luyện', key: 'artLevels', targets: [3, 15, 40, 80], stat: 'exp' },
  { id: 'challenges', name: 'Vượt Thử Thách', desc: 'Hoàn thành Kiếp Thử Thách', key: 'challengesDone', targets: [1, 3, 6, 12], stat: 'hp' },
  { id: 'daily', name: 'Chuyên Cần', desc: 'Hoàn thành nhiệm vụ ngày', key: 'dailyTasks', targets: [3, 15, 45, 120], stat: 'exp' },
  { id: 'pets', name: 'Bạn Đồng Hành', desc: 'Tổng cấp linh thú đã nuôi', key: 'petLevels', targets: [1, 5, 15, 30], stat: 'hp' },
  { id: 'expeditions', name: 'Thám Hiểm Gia', desc: 'Thám hiểm thành công', key: 'expeditionsDone', targets: [1, 5, 15, 40], stat: 'atk' },
  { id: 'events', name: 'Kỳ Ngộ', desc: 'Trải qua kỳ ngộ', key: 'events', targets: [3, 10, 30], stat: 'hp' },
  { id: 'reborn', name: 'Luân Hồi', desc: 'Luân hồi chuyển thế', key: 'reincarnations', targets: [1, 3, 10], stat: 'exp' },
  { id: 'harvest', name: 'Nông Phu Tu Tiên', desc: 'Thu hoạch Linh Điền', key: 'harvests', targets: [5, 30, 100], stat: 'hp' },
  { id: 'quest', name: 'Cần Mẫn Việc Tông', desc: 'Hoàn thành nhiệm vụ', key: 'questsDone', targets: [5, 25, 100, 300], stat: 'atk' },
  { id: 'failures', name: 'Bách Chiết Bất Hồi', desc: 'Đột phá thất bại (vẫn không bỏ cuộc)', key: 'failures', targets: [3, 15, 50], stat: 'def' },
  { id: 'playtime', name: 'Kiên Trì Đạo Tâm', desc: 'Giờ tu luyện tích luỹ', key: 'playHours', targets: [1, 10, 50, 200], stat: 'exp' },
  { id: 'pills', name: 'Nghiện Đan', desc: 'Dùng đan dược và tàn quyển', key: 'pillsUsed', targets: [5, 30, 100, 300], stat: 'hp' },
  { id: 'disciples', name: 'Đệ Tử Đầy Nhà', desc: 'Số đệ tử đang có', key: 'discipleCount', targets: [1, 3, 6], stat: 'atk' },
  { id: 'gear', name: 'Kho Pháp Khí', desc: 'Pháp khí trong hành trang', key: 'gearCount', targets: [3, 10, 25], stat: 'def' },
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
