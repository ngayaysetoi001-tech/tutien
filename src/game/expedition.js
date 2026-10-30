// =====================================================================
// expedition.js - Thám hiểm: cử đệ tử đi làm nhiệm vụ theo giờ thật (kể cả khi đóng game).
// Đệ tử đi thám hiểm thì tạm bỏ việc thường; về nhận thưởng khi đủ thời gian. Có rủi ro: thành công
// tuỳ tổng sức mạnh đoàn so với độ khó; thất bại chỉ còn một phần nhỏ phần thưởng.
// =====================================================================
import { ARTS, artFragmentId } from './arts.js'
import { PETS, petFragmentId } from './pets.js'
import { SKILLS, fragmentId } from './skills.js'
import { TREASURES, treasureFragmentId } from './treasures.js'
import { bestCrop, discipleMult } from './disciples.js'
import { mineInfo } from './garden.js'

export const MAX_PARTY = 5
export const FAIL_REWARD = 0.25 // thất bại: nhận 25% linh thạch và thảo dược, mất phần còn lại

/**
 * seconds: thời gian đi; need: số đệ tử tối thiểu; diff: độ khó (so với tổng sức mạnh đoàn);
 * stones (nhân 1.45^bậc), herbs, ore: phần thưởng thường; art / pet / skill / treasure: số tàn quyển, phách, mảnh pháp bảo hiếm nếu thành công.
 */
export const MISSIONS = {
  rung: { name: 'Thám Hiểm Rừng Rậm', seconds: 1800, need: 1, diff: 1.2, minStage: 0, stones: 70, herbs: 6, ore: 0, art: 0, pet: 0, skill: 0, treasure: 0, contribution: 1 },
  mach: { name: 'Khai Thác Khoáng Mạch Sâu', seconds: 3600, need: 2, diff: 3, minStage: 3, stones: 160, herbs: 4, ore: 10, art: 0, pet: 0, skill: 0, treasure: 0, contribution: 2 },
  mo: { name: 'Truy Tìm Cổ Mộ', seconds: 7200, need: 2, diff: 5, minStage: 6, stones: 400, herbs: 4, ore: 4, art: 2, pet: 0, skill: 1, treasure: 0, contribution: 4 },
  thu: { name: 'Săn Tìm Linh Thú', seconds: 14400, need: 3, diff: 9, minStage: 12, stones: 900, herbs: 6, ore: 4, art: 2, pet: 2, skill: 0, treasure: 1, contribution: 8 },
  vuc: { name: 'Vực Sâu Thượng Cổ', seconds: 28800, need: 3, diff: 16, minStage: 20, stones: 2600, herbs: 8, ore: 6, art: 4, pet: 2, skill: 2, treasure: 3, contribution: 20 },
}
export const MISSION_IDS = Object.keys(MISSIONS)

/** Số nhiệm vụ thám hiểm chạy cùng lúc: 1, thêm 1 mỗi 2 cấp bậc tông môn (tối đa 3). */
export const expeditionSlots = (rankIdx) => 1 + Math.floor(rankIdx / 2)

/** Tổng sức mạnh của đoàn: cấp, phẩm cấp và cùng hệ tông môn của từng đệ tử. */
export const partyPower = (party, sectElement = null) => party.reduce((n, d) => n + discipleMult(d, sectElement), 0)

/** Xác suất thành công theo tỉ lệ sức mạnh / độ khó. */
export function successChance(power, diff) {
  const s = power / diff
  return Math.min(0.95, 0.1 + (0.9 * s) / (s + 0.6))
}

/**
 * Danh sách effects thưởng (xem gameStore.applyEffects). `ctx`: { record, path } để bốc tàn quyển hợp ải và đạo lộ.
 */
export function missionEffects(m, stageIdx, success, ctx = {}, rng = Math.random) {
  const k = success ? 1 : FAIL_REWARD
  const fx = [
    { type: 'stones', base: m.stones * k },
    { type: 'item', id: bestCrop(stageIdx).id, count: Math.max(1, Math.round(m.herbs * k)) },
  ]
  if (!success) return fx
  const pick = (arr) => arr[Math.floor(rng() * arr.length)]
  if (m.ore) fx.push({ type: 'item', id: mineInfo(stageIdx).ore, count: m.ore })
  const record = Math.max(1, ctx.record ?? 1)
  if (m.art) {
    const pool = Object.keys(ARTS).filter((id) => ARTS[id].minAi <= record)
    fx.push({ type: 'item', id: artFragmentId(pick(pool.length ? pool : Object.keys(ARTS).slice(0, 1))), count: m.art })
  }
  if (m.pet) {
    const pool = Object.keys(PETS).filter((id) => PETS[id].minAi <= record)
    if (pool.length) fx.push({ type: 'item', id: petFragmentId(pick(pool)), count: m.pet })
  }
  if (m.treasure) {
    const pool = Object.keys(TREASURES).filter((id) => TREASURES[id].minAi <= record)
    if (pool.length) fx.push({ type: 'item', id: treasureFragmentId(pick(pool)), count: m.treasure })
  }
  if (m.skill) {
    const pool = Object.keys(SKILLS).filter((id) => !SKILLS[id].path || SKILLS[id].path === ctx.path)
    fx.push({ type: 'item', id: fragmentId(pick(pool)), count: m.skill })
  }
  return fx
}
