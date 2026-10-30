<script setup>
// SettingsTab.vue - Cài đặt: hiệu ứng, lưu thủ công, xuất / nhập save .json, chơi lại từ đầu.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { AUTOMATIONS, automationUnlocked, automationValue } from '../../game/automation.js'
import { RECIPES, itemName } from '../../game/data.js'
import { notifySupported, requestNotify } from '../../services/notify.js'

const game = useGameStore()
const recipes = computed(() => RECIPES.filter((r) => game.stageIdx >= r.minStage && game.alchemy.level >= r.minAlchemy))
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

async function onNotifyChange() {
  if (!game.settings.notify) return
  const res = await requestNotify()
  if (res !== 'granted') {
    game.settings.notify = false
    say(res === 'unsupported' ? 'Trình duyệt này không hỗ trợ thông báo.' : 'Bạn chưa cấp quyền thông báo.', true)
  } else {
    say('Sẽ báo khi linh khí đầy lúc tab ở nền.')
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
      <span>Tự động đột phá bậc nhỏ<br /><span class="text-xs text-slate-500">Bậc có thiên kiếp vẫn phải tự bấm</span></span>
      <input v-model="game.settings.autoBreak" type="checkbox" class="h-4 w-4 accent-emerald-500" />
    </label>
    <div class="card space-y-1.5">
      <div class="title-rule">Tự động hoá (mở khoá dần)</div>
      <div v-for="a in AUTOMATIONS" :key="a.id" class="text-sm">
        <label v-if="automationUnlocked(a, game)" class="flex items-center justify-between">
          <span>{{ a.name }}<br /><span class="text-xs text-slate-500">{{ a.desc }}</span></span>
          <input v-model="game.settings.auto[a.id]" type="checkbox" class="h-4 w-4 accent-emerald-500" />
        </label>
        <div v-else class="flex items-center justify-between text-slate-500">
          <span>🔒 {{ a.name }}<br /><span class="text-xs">{{ a.text }} ({{ Math.min(automationValue(a, game), a.need.value) }}/{{ a.need.value }})</span></span>
        </div>
        <select
          v-if="a.id === 'craft' && automationUnlocked(a, game)"
          v-model="game.settings.autoCraft"
          class="mt-1 w-full rounded border border-ink-600 bg-ink-900 px-2 py-1 text-xs text-white"
        >
          <option :value="null">— chọn loại đan tự luyện —</option>
          <option v-for="r in recipes" :key="r.id" :value="r.id">{{ itemName(r.id) }}</option>
        </select>
      </div>
    </div>
    <label v-if="notifySupported()" class="card flex items-center justify-between text-sm">
      <span>Thông báo khi linh khí đầy<br /><span class="text-xs text-slate-500">Chỉ khi trang vẫn mở ở nền, không báo được khi đã đóng hẳn</span></span>
      <input v-model="game.settings.notify" type="checkbox" class="h-4 w-4 accent-emerald-500" @change="onNotifyChange" />
    </label>
    <label class="card flex items-center justify-between text-sm">
      <span>Rung nhẹ khi bấm nút<br /><span class="text-xs text-slate-500">Chỉ trên thiết bị hỗ trợ rung (Android)</span></span>
      <input v-model="game.settings.haptic" type="checkbox" class="h-4 w-4 accent-emerald-500" />
    </label>
    <label class="card flex items-center justify-between text-sm">
      <span>Tự động lưu mỗi 5 giây</span>
      <input v-model="game.settings.autoSave" type="checkbox" class="h-4 w-4 accent-emerald-500" />
    </label>

    <div class="card">
      <div class="mb-1 text-sm">Cỡ chữ</div>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="o in [{ id: 'sm', t: 'Nhỏ' }, { id: 'md', t: 'Vừa' }, { id: 'lg', t: 'Lớn' }]"
          :key="o.id"
          class="min-h-[44px] rounded-lg border text-sm font-bold"
          :class="game.settings.fontScale === o.id ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 bg-ink-900 text-slate-400'"
          @click="game.settings.fontScale = o.id"
        >{{ o.t }}</button>
      </div>
    </div>

    <div class="card text-xs" :class="game.backupDue ? 'border-gold-400 text-gold-200' : 'text-slate-400'">
      Sao lưu gần nhất: {{ game.settings.lastBackup ? Math.floor((Date.now() - game.settings.lastBackup) / 86400000) + ' ngày trước' : 'chưa từng' }}.
      Xuất save định kỳ để không mất tiến trình khi xoá dữ liệu trình duyệt.
    </div>

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
