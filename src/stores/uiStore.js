// =====================================================================
// uiStore.js - Trạng thái giao diện (không thuộc savegame): màn hình hiện tại, nhật ký mở.
// Nhớ màn hình gần nhất trong LocalStorage riêng để tải lại trang vẫn ở đúng chỗ.
// =====================================================================
import { defineStore } from 'pinia'
import { DEFAULT_SCREEN, hasCanvas, screenById } from '../game/screens.js'

const UI_KEY = 'tutien-ui-v1'

function loadUi() {
  try {
    const raw = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}')
    return { tab: screenById(raw.tab) ? raw.tab : DEFAULT_SCREEN, seen: raw.seen && typeof raw.seen === 'object' ? raw.seen : null }
  } catch {
    return { tab: DEFAULT_SCREEN, seen: null }
  }
}
const initial = () => loadUi()

function persist(tab, seen) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ tab, seen }))
  } catch {
    /* chế độ riêng tư: không nhớ được cũng không sao */
  }
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    tab: initial().tab,
    seen: initial().seen ?? {}, // màn đã ghé thăm (để chấm "mới" ở màn vừa mở khoá)
    legacySeen: initial().seen === null, // chưa từng lưu: coi mọi màn đang mở là đã thấy
    logOpen: false, // bảng nhật ký đầy đủ (mở từ thanh trên)
    meditate: false, // chế độ thiền định: ẩn giao diện, ngừng vẽ cảnh, tick thưa để tiết kiệm pin (không lưu)
  }),
  getters: {
    /** Màn hiện tại có cảnh PixiJS không (Nhân Vật, Bí Cảnh). */
    hasCanvas: (s) => hasCanvas(s.tab),
    screen: (s) => screenById(s.tab),
  },
  actions: {
    /** Chuyển màn hình; id lạ thì bỏ qua. */
    go(id) {
      if (!screenById(id)) return false
      this.tab = id
      this.seen[id] = true
      persist(id, this.seen)
      return true
    },

    /** Đánh dấu đã thấy hàng loạt (lần đầu mở bản có mở khoá dần: không chấm "mới" ở mọi màn đang có). */
    markSeen(ids) {
      for (const id of ids) this.seen[id] = true
      this.legacySeen = false
      persist(this.tab, this.seen)
    },
  },
})
