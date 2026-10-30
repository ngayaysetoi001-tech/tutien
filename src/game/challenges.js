// =====================================================================
// challenges.js - Kiếp Thử Thách: chọn một ràng buộc đặc biệt khi luân hồi. Đạt bậc mục tiêu trong kiếp đó
// thì nhận thêm Đạo Vận (lần sau hoàn thành cùng thử thách thưởng nhiều hơn 50% so với lần đầu mỗi lượt).
// Đã hoàn thành được tính cho thành tựu "Vượt Thử Thách".
// =====================================================================

export const CHALLENGES = {
  tinh_tam: {
    name: 'Tịnh Tâm', goalStage: 18, reward: 200,
    desc: 'Không được dùng đan dược (đan, tàn quyển lĩnh ngộ, đan hồi huyết, đan hỗ trợ đột phá).',
  },
  doc_hanh: {
    name: 'Độc Hành', goalStage: 18, reward: 200,
    desc: 'Không tông môn, không đệ tử, công pháp bị động bị vô hiệu.',
  },
  tay_khong: {
    name: 'Tay Không', goalStage: 15, reward: 150,
    desc: 'Trang bị không có tác dụng (chỉ số, dòng phụ, bộ, Huyền Thoại).',
  },
  don_nhat: {
    name: 'Đơn Nhất', goalStage: 18, reward: 150,
    desc: 'Chỉ dùng được một kỹ năng (Võ Kỹ 1 của đạo lộ).',
  },
}
export const CHALLENGE_IDS = Object.keys(CHALLENGES)

/** Đạo Vận thưởng cho lần hoàn thành thứ \`times\` (1-based) của một thử thách: lần sau +50% so với lần đầu. */
export const challengeReward = (id, times) => Math.round(CHALLENGES[id].reward * (1 + 0.5 * (times - 1)))
