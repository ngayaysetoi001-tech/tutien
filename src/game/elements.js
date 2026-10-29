// =====================================================================
// elements.js - Ngũ hành tương khắc: Kim > Mộc > Thổ > Thủy > Hỏa > Kim
// Hệ khắc gây thêm 20% sát thương, bị khắc chỉ gây 85%.
// =====================================================================

export const ELEMENTS = {
  kim: { name: 'Kim', color: 0xe8e8f4, css: '#e8e8f4' },
  moc: { name: 'Mộc', color: 0x5fd36a, css: '#5fd36a' },
  thuy: { name: 'Thủy', color: 0x5fb8ff, css: '#5fb8ff' },
  hoa: { name: 'Hỏa', color: 0xff7a4d, css: '#ff7a4d' },
  tho: { name: 'Thổ', color: 0xd2a15a, css: '#d2a15a' },
}
export const ELEMENT_IDS = Object.keys(ELEMENTS)

/** Hệ nào khắc hệ nào (key khắc value). */
const BEATS = { kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim' }
export const ELEMENT_ADVANTAGE = 1.2
export const ELEMENT_DISADVANTAGE = 0.85

/** Hệ số sát thương khi `attacker` đánh `defender` (1 nếu thiếu thông tin). */
export function elementMult(attacker, defender) {
  if (!attacker || !defender) return 1
  if (BEATS[attacker] === defender) return ELEMENT_ADVANTAGE
  if (BEATS[defender] === attacker) return ELEMENT_DISADVANTAGE
  return 1
}

/** 'up' | 'down' | null: để hiển thị mũi tên lợi/hại. */
export function elementEdge(attacker, defender) {
  const m = elementMult(attacker, defender)
  return m > 1 ? 'up' : m < 1 ? 'down' : null
}
