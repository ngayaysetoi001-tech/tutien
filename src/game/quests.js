// =====================================================================
// quests.js - Bảng nhiệm vụ tự sinh: đếm tăng trưởng của một thống kê kể từ lúc nhận.
// Mục tiêu và phần thưởng co giãn theo cảnh giới. Hoàn thành thưởng linh thạch, Cống Hiến
// tông môn và (nhiệm vụ khó) vật phẩm.
// =====================================================================

export const BOARD_SIZE = 4

/**
 * Mẫu nhiệm vụ. `key` là tên thống kê do gameStore.achievementValue(key) cung cấp.
 * Mục tiêu = base * (1 + grow * bậc) * hệ số độ khó (làm tròn, tối thiểu 1).
 */
export const QUEST_TEMPLATES = [
  { id: 'kills', key: 'kills', label: 'Hạ yêu thú', base: 12, grow: 0.18 },
  { id: 'bosses', key: 'bossKills', label: 'Hạ boss bí cảnh', base: 1, grow: 0 },
  { id: 'clears', key: 'clears', label: 'Thông quan bí cảnh', base: 1, grow: 0 },
  { id: 'harvest', key: 'harvests', label: 'Thu hoạch Linh Điền', base: 3, grow: 0.08 },
  { id: 'craft', key: 'crafted', label: 'Luyện đan', base: 3, grow: 0.1 },
  { id: 'forge', key: 'forged', label: 'Rèn pháp khí', base: 1, grow: 0 },
  { id: 'break', key: 'breakthroughs', label: 'Đột phá thành công', base: 1, grow: 0 },
  { id: 'events', key: 'events', label: 'Trải qua kỳ ngộ', base: 1, grow: 0 },
]
export const templateById = (id) => QUEST_TEMPLATES.find((t) => t.id === id)

/** Độ khó: Dễ / Thường / Khó -> hệ số mục tiêu, hệ số thưởng, trọng số xuất hiện. */
export const TIERS = [
  { name: 'Dễ', goal: 1, reward: 1, weight: 50, css: '#4fdca6' },
  { name: 'Thường', goal: 2, reward: 2.3, weight: 35, css: '#60a5fa' },
  { name: 'Khó', goal: 4, reward: 5, weight: 15, css: '#f6c85f' },
]

export const questTarget = (tpl, tier, stageIdx) =>
  Math.max(1, Math.round(tpl.base * (1 + tpl.grow * stageIdx) * TIERS[tier].goal))

/** Phần thưởng: danh sách effects (linh thạch, vật phẩm) và số Cống Hiến. */
export function questReward(tier, stageIdx, rng = Math.random) {
  const k = TIERS[tier].reward
  const effects = [{ type: 'stones', base: Math.round(40 * k) }]
  if (tier === 2) {
    // Nhiệm vụ khó thêm một nhóm thảo dược hợp bậc
    const herb = stageIdx >= 18 ? 'hoa_than_qua' : stageIdx >= 12 ? 'bang_lien' : stageIdx >= 9 ? 'tu_van_thao' : stageIdx >= 2 ? 'huyet_sam' : 'linh_thao'
    effects.push({ type: 'item', id: herb, count: 3 + Math.floor(rng() * 3) })
  }
  const contribution = Math.max(1, Math.round(3 * Math.pow(1.12, stageIdx) * k))
  return { effects, contribution }
}

let seq = 0
/** Tạo nhiệm vụ mới không trùng mẫu với `existing`. `snapshot(key)` trả về giá trị thống kê hiện tại. */
export function generateQuest(stageIdx, existing, snapshot, rng = Math.random) {
  const used = new Set(existing.map((q) => q.tpl))
  const pool = QUEST_TEMPLATES.filter((t) => !used.has(t.id))
  const tpl = (pool.length ? pool : QUEST_TEMPLATES)[Math.floor(rng() * (pool.length || QUEST_TEMPLATES.length))]
  const total = TIERS.reduce((n, t) => n + t.weight, 0)
  let pick = rng() * total
  let tier = 0
  for (let i = 0; i < TIERS.length; i++) {
    pick -= TIERS[i].weight
    if (pick <= 0) {
      tier = i
      break
    }
  }
  return {
    uid: `q${Date.now().toString(36)}_${++seq}`,
    tpl: tpl.id,
    tier,
    target: questTarget(tpl, tier, stageIdx),
    start: snapshot(tpl.key),
  }
}

/** Chi phí làm mới bảng nhiệm vụ (linh thạch, nhân 1.45^bậc ở store). */
export const REFRESH_COST_BASE = 30
