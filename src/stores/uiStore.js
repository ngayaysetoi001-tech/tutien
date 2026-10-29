// =====================================================================
// uiStore.js - Trạng thái giao diện (không thuộc savegame): màn hình hiện tại, nhật ký mở.
// Nhớ màn hình gần nhất trong LocalStorage riêng để tải lại trang vẫn ở đúng chỗ.
// =====================================================================
import { defineStore } from 'pinia'
import { DEFAULT_SCREEN, hasCanvas, screenById } from '../game/screens.js'

const UI_KEY = 'tutien-ui-v1'

function loadTab() {
  try {
    const tab = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}').tab
    return screenById(tab) ? tab : DEFAULT_SCREEN
  } catch {
    return DEFAULT_SCREEN
  }
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    tab: loadTab(),
    logOpen: false, // bảng nhật ký đầy đủ (mở từ thanh trên)
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
      try {
        localStorage.setItem(UI_KEY, JSON.stringify({ tab: id }))
      } catch {
        /* chế độ riêng tư: không nhớ được cũng không sao */
      }
      return true
    },
  },
})
