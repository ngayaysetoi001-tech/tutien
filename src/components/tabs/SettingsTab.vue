<script setup>
// SettingsTab.vue - Cài đặt: hiệu ứng, lưu thủ công, xuất / nhập save .json, chơi lại từ đầu.
import { ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'

const game = useGameStore()
const fileInput = ref(null)
const message = ref('')
const isError = ref(false)

function say(text, error = false) {
  message.value = text
  isError.value = error
}

function saveNow() {
  const ok = game.save()
  say(ok ? 'Đã lưu vào LocalStorage.' : 'Không ghi được LocalStorage!', !ok)
}

async function onImport(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // cho phép chọn lại cùng một file
  if (!file) return
  try {
    await game.importSave(file)
    say('Nhập save thành công!')
  } catch (e) {
    say(e.message || 'Nhập save thất bại.', true)
  }
}

function onReset() {
  if (window.confirm('Xoá toàn bộ tiến trình và luân hồi từ đầu? Hãy xuất save trước nếu muốn giữ lại.')) {
    game.resetGame()
    say('Đã luân hồi chuyển thế.')
  }
}
</script>

<template>
  <div class="space-y-2">
    <label class="card flex items-center justify-between text-sm">
      <span>Hiệu ứng hạt linh khí</span>
      <input v-model="game.settings.particles" type="checkbox" class="h-4 w-4 accent-emerald-500" />
    </label>
    <label class="card flex items-center justify-between text-sm">
      <span>Hiệu ứng âm thanh</span>
      <input v-model="game.settings.sound" type="checkbox" class="h-4 w-4 accent-emerald-500" />
    </label>
    <label class="card flex items-center justify-between text-sm">
      <span>Nhạc nền</span>
      <input v-model="game.settings.music" type="checkbox" class="h-4 w-4 accent-emerald-500" />
    </label>
    <label class="card flex items-center justify-between text-sm">
      <span>Tự động đột phá bậc nhỏ<br /><span class="text-[11px] text-slate-500">Bậc có thiên kiếp vẫn phải tự bấm</span></span>
      <input v-model="game.settings.autoBreak" type="checkbox" class="h-4 w-4 accent-emerald-500" />
    </label>
    <label class="card flex items-center justify-between text-sm">
      <span>Tự động lưu mỗi 5 giây</span>
      <input v-model="game.settings.autoSave" type="checkbox" class="h-4 w-4 accent-emerald-500" />
    </label>

    <div class="grid grid-cols-3 gap-2">
      <button class="btn-ghost" @click="saveNow">Lưu ngay</button>
      <button class="btn-ghost" @click="game.exportSave()">Xuất save</button>
      <button class="btn-ghost" @click="fileInput.click()">Nhập save</button>
    </div>
    <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onImport" />

    <button class="btn-danger w-full" @click="onReset">Luân hồi (xoá save)</button>

    <p v-if="message" class="text-center text-xs" :class="isError ? 'text-cinnabar-400' : 'text-jade-300'">{{ message }}</p>
  </div>
</template>
