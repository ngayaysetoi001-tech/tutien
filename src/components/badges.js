import { pending } from '../game/disciples.js'

// badges.js - Chấm đỏ "có việc làm được ngay" của từng màn hình (dùng chung cho thanh dưới, chip màn con, báo cáo xuất quan).

/** Màn `id` có việc làm được ngay không (không tính "màn mới mở", xem isNewScreen). */
export function screenWork(game, id) {
  switch (id) {
    case 'story': return game.loreUnread > 0 || !!(game.storyNext && !game.chapterLock(game.storyNext))
    case 'achievements': return game.claimableCount > 0
    case 'sect': return game.quests.some((q) => game.questDone(q))
    case 'battle': return !!game.milestoneClaimable || !!game.bossChoice
    case 'character': return !!(game.dailyPending || game.canChoosePath || game.talentPending)
    case 'disciples': return game.disciples.some((d) => !d.away && d.job && pending(d, game.stageIdx, game.discipleCtx(), Date.now()))
    case 'garden': return game.garden.plots.some((p) => p && p.readyAt <= Date.now())
    default: return false
  }
}

/** Màn vừa mở khoá, chưa ghé lần nào. */
export const isNewScreen = (ui, id) => !ui.seen[id]

export const SCREEN_HINT = {
  character: 'Có thưởng điểm danh / thiên phú / đạo lộ',
  battle: 'Có rương hoặc thưởng boss chờ nhận',
  sect: 'Có nhiệm vụ đã xong',
  achievements: 'Có thành tựu chờ nhận',
  story: 'Có chương mới',
  garden: 'Cây đã chín',
  disciples: 'Đệ tử có sản phẩm',
}
