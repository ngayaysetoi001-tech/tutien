// =====================================================================
// guide.js - Gợi ý "việc nên làm kế tiếp" cho người chơi (thay cho hướng dẫn dài dòng).
// Trả về danh sách gợi ý đang áp dụng theo thứ tự ưu tiên; giao diện hiện cái đầu tiên chưa bị tắt.
// Mỗi gợi ý: { id, text, tab? } - `tab` là tab nên mở (khớp id trong game/screens.js).
// Thuần hàm trên state của store, không đổi trạng thái.
// =====================================================================
import { RECIPES } from './data.js'
import { SKILLS, fragmentId, LEARN_COST } from './skills.js'
import { ARTS, ART_LEARN_COST, artFragmentId } from './arts.js'
import { PETS, PET_LEARN_COST, petFragmentId } from './pets.js'
import { plotCount, seedCost } from './garden.js'
import { recruitCost } from './disciples.js'
import { SLOT_IDS } from './equipment.js'

const sum = (obj) => Object.values(obj).reduce((n, v) => n + v, 0)

export function nextHints(g) {
  const hints = []
  const add = (id, text, tab) => hints.push({ id, text, tab })
  const maxStage = Math.max(g.stageIdx, g.stats.maxStage)

  // 1. Đột phá: việc quan trọng nhất
  if (g.canBreakthrough) {
    if (g.nextTribulation) {
      add('trib', `Đột phá lần này có thiên kiếp (${g.nextTribulation.bolts} đạo lôi). Nên chuẩn bị Hộ Kiếp Đan trước.`, 'inventory')
    } else {
      add('break', 'Linh khí đã đầy: bấm Đột Phá để lên bậc.')
    }
  }

  // 2. Nhập môn: Vượt Ải, Tụ Linh Trận, luyện đan
  if (g.stageIdx >= 1 && g.campaign.record === 0 && !g.settings.autoRepeat) {
    add('dungeon', 'Bật "Tự chiến đấu" ở màn Vượt Ải: ải càng cao, thu nhập thụ động càng lớn.', 'battle')
  }
  if (g.arrayLevel === 0 && g.spiritStones.gte(g.arrayCost)) {
    add('array', 'Dùng linh thạch nâng Tụ Linh Trận để tu luyện nhanh hơn.', 'dwelling')
  }
  const herbs = sum(g.inventory.herbs)
  if (g.stats.crafted === 0 && herbs >= 3 && RECIPES.some((r) => g.canCraft(r.id))) {
    add('craft', 'Đã có thảo dược: luyện đan ở Động Phủ để tăng sức mạnh.', 'dwelling')
  }
  if (g.stats.harvests === 0 && g.stageIdx >= 1 && plotCount(g.stageIdx) > 0 && g.garden.plots.every((p) => !p) && g.spiritStones.gte(seedCost({ power: 0 }))) {
    add('garden', 'Gieo hạt ở Linh Điền: cây lớn theo giờ thật, kể cả khi bạn vắng mặt.', 'garden')
  }

  // 3. Phần thưởng đang chờ
  if (g.quests.some((q) => g.questDone(q))) add('quest', 'Có nhiệm vụ đã hoàn thành, bấm nhận thưởng.', 'sect')
  if (g.claimableCount > 0) add('ach', 'Có thành tựu có thể nhận thưởng.', 'achievements')

  // 4. Mở rộng hệ thống khi đủ điều kiện
  if (g.talentPending) add('talent', 'Chọn một Thiên Phú cho kiếp này (3 lựa chọn ở màn Nhân Vật).', 'character')
  if (g.canChoosePath) add('path', 'Đã đạt Trúc Cơ: hãy chọn Đạo Lộ (Kiếm Tu, Thể Tu, Pháp Tu, Đan Sư, Trận Pháp Sư).', 'character')
  if (!g.sect.id && maxStage >= 4) add('sect', 'Gia nhập một tông môn để nhận đặc quyền và Cống Hiến.', 'sect')
  const learnable = Object.keys(SKILLS).find((id) => !g.skills.owned[id] && g.itemCount(fragmentId(id)) >= LEARN_COST)
  if (learnable) add('skill', 'Đủ tàn quyển để học một võ kỹ mới.', 'skills')
  const learnableArt = Object.keys(ARTS).find((id) => !g.arts.owned[id] && g.itemCount(artFragmentId(id)) >= ART_LEARN_COST)
  if (learnableArt) add('art', 'Đủ tàn quyển để học một công pháp bị động mới.', 'skills')
  const learnablePet = Object.keys(PETS).find((id) => !g.pets.owned[id] && g.itemCount(petFragmentId(id)) >= PET_LEARN_COST)
  if (learnablePet) add('pet', 'Đủ Linh Thú Phách để thu phục một linh thú đồng hành.', 'skills')
  const emptySlot = SLOT_IDS.some((slot) => !g.gear.equipped[slot] && g.gear.bag.some((it) => it.slot === slot))
  if (emptySlot) add('gear', 'Túi có trang bị chưa mặc.', 'gear')
  if (g.sect.id && g.disciples.length === 0 && g.spiritStones.gte(recruitCost(g.stageIdx, 0))) {
    add('disciple', 'Thu nhận đệ tử để làm việc giúp bạn theo giờ thật.', 'disciples')
  }

  // 5. Cuối game
  if (g.isMaxStage && g.isFull) add('reborn', 'Đã chạm cực hạn: luân hồi để nhận Đạo Vận và mạnh hơn kiếp sau.', 'reincarnation')

  return hints
}
