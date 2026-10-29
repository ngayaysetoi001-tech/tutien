// =====================================================================
// format.js - Hiển thị số lớn (Decimal của break_infinity.js) và thời gian
// =====================================================================
import Decimal from 'break_infinity.js'

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

/**
 * Rút gọn số: 1234 -> "1.23K", 5e30 -> "5.00e30".
 * Nhận Decimal hoặc number.
 */
export function fmt(value, digits = 2) {
  const d = value instanceof Decimal ? value : new Decimal(value)
  if (d.lt(1000)) {
    const n = d.toNumber()
    // Số nhỏ: bỏ phần thập phân thừa (12 thay vì 12.00)
    return Number.isInteger(n) ? String(n) : n.toFixed(digits > 1 ? 1 : digits)
  }
  const exp = d.exponent
  const tier = Math.floor(exp / 3)
  if (tier < SUFFIXES.length) {
    const scaled = d.div(Decimal.pow(10, tier * 3)).toNumber()
    return scaled.toFixed(digits) + SUFFIXES[tier]
  }
  return d.mantissa.toFixed(digits) + 'e' + exp
}

/** Định dạng số giây thành "1 giờ 5 phút" / "42 giây". */
export function fmtDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h} giờ ${m} phút`
  if (m > 0) return `${m} phút ${sec} giây`
  return `${sec} giây`
}

/** Giờ:phút:giây cho log. */
export function fmtClock(timestamp) {
  const d = new Date(timestamp)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Phần trăm hiển thị 1 chữ số thập phân. */
export function fmtPercent(ratio) {
  return (ratio * 100).toFixed(1) + '%'
}
