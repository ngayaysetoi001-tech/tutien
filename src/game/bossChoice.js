// =====================================================================
// bossChoice.js - Chọn 1 trong 3 phần thưởng khi lần đầu hạ Tiểu Boss / Đại Boss / Chúa Tể của một ải mới.
// Để người chơi luôn có quyết định có nghĩa thay vì game tự chơi một mình. Không chọn thì sau
// BOSS_CHOICE_SECONDS giây tự lấy lựa chọn đầu tiên.
// =====================================================================
import { ARTS, artFragmentId } from './arts.js'
import { SKILLS, fragmentId } from './skills.js'

export const BOSS_CHOICE_SECONDS = 600
const WEIGHT = { mini: 1, big: 2, lord: 4 } // độ lớn phần thưởng theo loại boss
const STAT_NAME = { hp: 'khí huyết', atk: 'công kích', def: 'phòng ngự' }

/**
 * Tạo 3 lựa chọn khác loại: { id, label, effects } (effects dạng gameStore.applyEffects).
 * ctx: { n: số ải, kind: 'mini' | 'big' | 'lord', path: đạo lộ hiện tại }.
 */
export function bossChoiceOptions({ n, kind, path = null }, rng = Math.random) {
  const w = WEIGHT[kind] ?? 1
  const pick = (arr) => arr[Math.floor(rng() * arr.length)]
  const kinds = ['stones', 'stat', 'art', 'skill', 'exp']
  const chosen = []
  while (chosen.length < 3) chosen.push(kinds.splice(Math.floor(rng() * kinds.length), 1)[0])

  const build = {
    stones: () => ({
      label: 'Kho linh thạch lớn',
      effects: [{ type: 'stones', base: 40 * w * (1 + 0.02 * n) }],
    }),
    stat: () => {
      const stat = pick(['hp', 'atk', 'def'])
      const amount = { hp: 10 * w + n, atk: 2 * w + Math.round(n / 8), def: 2 * w + Math.round(n / 10) }[stat]
      return { label: `+${amount} ${STAT_NAME[stat]} vĩnh viễn`, effects: [{ type: 'stat', stat, amount }] }
    },
    art: () => {
      const pool = Object.keys(ARTS).filter((id) => ARTS[id].minAi <= n)
      const id = pick(pool.length ? pool : Object.keys(ARTS).slice(0, 1))
      const count = 1 + w
      return { label: `${ARTS[id].name} Tàn Quyển x${count}`, effects: [{ type: 'item', id: artFragmentId(id), count }] }
    },
    skill: () => {
      // chỉ võ kỹ dùng được: không độc quyền của đạo lộ khác
      const pool = Object.keys(SKILLS).filter((id) => !SKILLS[id].path || SKILLS[id].path === path)
      const id = pick(pool)
      const count = 1 + w
      return { label: `${SKILLS[id].name} Tàn Quyển x${count}`, effects: [{ type: 'item', id: fragmentId(id), count }] }
    },
    exp: () => {
      const amount = 0.003 * w
      return { label: `+${Math.round(amount * 1000) / 10}% tốc độ linh khí vĩnh viễn`, effects: [{ type: 'expBonus', amount }] }
    },
  }
  return chosen.map((id) => ({ id, ...build[id]() }))
}
