// =====================================================================
// goals.js - "Mục tiêu kế tiếp": luôn cho người chơi thấy một đích gần, kèm tiến độ.
// Ứng viên: đột phá, boss kế tiếp (Tiểu Boss mỗi 5 ải), rương mốc ải, mở khoá màn hình mới.
// Chọn ứng viên có tiến độ cao nhất nhưng chưa xong; rương mốc đã đủ điều kiện luôn lên đầu.
// =====================================================================
import { AI_KINDS, MILESTONES, aiKind } from './campaign.js'
import { lockedScreens } from './screens.js'

/** Mọi ứng viên mục tiêu: [{ id, label, progress (0..1), tab?, ready? }]. */
export function goalList(g) {
  const out = []
  const best = g.campaign.best

  const m = MILESTONES[g.campaign.milestone]
  if (m) {
    const ready = g.campaign.record >= m.ai
    out.push({
      id: 'milestone', tab: 'battle', ready,
      label: ready ? `Nhận rương mốc ải ${m.ai}` : `Rương mốc ải ${m.ai} (còn ${m.ai - g.campaign.record} ải)`,
      progress: ready ? 1 : Math.min(1, g.campaign.record / m.ai),
    })
  }

  if (!g.isMaxStage) {
    out.push({
      id: 'breakthrough', tab: 'character', ready: g.isFull,
      label: g.isFull ? `Đột phá lên ${g.nextStageName}` : `Đột phá lên ${g.nextStageName}`,
      progress: g.progress,
    })
  }

  // Boss kế tiếp: ải chia hết cho 5 gần nhất chưa vượt
  const bossAi = Math.ceil((best + 1) / 5) * 5
  const kind = aiKind(bossAi)
  out.push({
    id: 'boss', tab: 'battle',
    label: `${AI_KINDS[kind].name} ải ${bossAi} (còn ${bossAi - best} ải)`,
    progress: Math.min(1, Math.max(0, 1 - (bossAi - best) / 5)),
  })

  const locked = lockedScreens(g).find((l) => l.progress !== null)
  if (locked) out.push({ id: 'unlock', label: `Mở khoá ${locked.screen.label}: ${locked.text}`, progress: Math.min(1, locked.progress) })
  return out
}

/** Mục tiêu hiển thị: việc đã sẵn sàng (nhận rương mốc, đột phá) lên đầu, còn lại lấy cái có tiến độ cao nhất chưa xong. */
export function nextGoal(g) {
  const list = goalList(g)
  const ready = list.find((x) => x.ready)
  if (ready) return ready
  const open = list.filter((x) => x.progress < 1)
  if (open.length === 0) return list[0] ?? null
  return open.reduce((a, b) => (b.progress > a.progress ? b : a))
}
