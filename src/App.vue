<script setup>
// App.vue - Bố cục dọc (portrait): thanh trên, cảnh PixiJS (chỉ ở màn Nhân Vật / Bí Cảnh),
// màn hình hiện tại, thanh điều hướng dưới đáy. Mỗi tab là một màn hình riêng.
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useGameStore } from './stores/gameStore.js'
import GameCanvas from './components/GameCanvas.vue'
import TopBar from './components/TopBar.vue'
import ScreenHost from './components/ScreenHost.vue'
import BottomNav from './components/BottomNav.vue'
import LogSheet from './components/LogSheet.vue'
import { useUiStore } from './stores/uiStore.js'
import OfflineModal from './components/OfflineModal.vue'
import EventModal from './components/EventModal.vue'
import StoryModal from './components/StoryModal.vue'
import MeditateOverlay from './components/MeditateOverlay.vue'
import UpdateBanner from './components/UpdateBanner.vue'
import { bindAudio } from './game/audioDirector.js'
import { setAudioPrefs } from './game/audio.js'
import { notify } from './services/notify.js'

const game = useGameStore()
const ui = useUiStore()

// Lưu ngay khi tab bị ẩn / đóng để không mất tiến trình giữa hai lần autosave 5s.
const saveNow = () => game.save()
const onVisibility = () => {
  if (document.visibilityState === 'hidden') saveNow()
}

let unbindAudio = null

// Cỡ chữ người dùng chọn: đổi font-size gốc (mọi cỡ chữ rem trong giao diện co giãn theo)
const FONT_PX = { sm: '15px', md: '16px', lg: '18px' }
watch(
  () => game.settings.fontScale,
  (v) => { document.documentElement.style.fontSize = FONT_PX[v] ?? '16px' },
  { immediate: true },
)

// Bật/tắt âm thanh theo cài đặt (có hiệu lực ngay cả khi save được nạp sau đó)
watch(
  () => [game.settings.sound, game.settings.music],
  ([sound, music]) => setAudioPrefs({ sfx: sound, music }),
  { immediate: true },
)

// Thông báo khi linh khí đầy lúc tab đang ở nền (tuỳ chọn, cần được cấp quyền)
watch(
  () => game.isFull,
  (full) => {
    if (full && game.ready && game.settings.notify && document.hidden) notify('Tu Tiên Ký', 'Linh khí đã đầy, có thể Đột Phá!')
  },
)

onMounted(() => {
  unbindAudio = bindAudio()
  game.init() // tải save + tính offline progress
  game.startLoop() // vòng lặp tick + autosave mỗi 5s
  window.addEventListener('beforeunload', saveNow)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  unbindAudio?.()
  game.stopLoop()
  saveNow()
  window.removeEventListener('beforeunload', saveNow)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <!-- Trên desktop: khung điện thoại căn giữa; trên mobile: toàn màn hình -->
  <div class="flex h-full justify-center bg-ink-950">
    <main class="relative flex h-full w-full max-w-[460px] flex-col overflow-hidden bg-ink-900 shadow-2xl shadow-black">
      <TopBar v-if="game.ready" />
      <UpdateBanner v-if="game.ready" />

      <!--
        Một thể hiện PixiJS duy nhất, không bao giờ bị huỷ: ở màn Nhân Vật / Bí Cảnh nằm trong luồng bố cục,
        ở các màn khác bị ẩn (giữ nguyên kích thước, vẽ chậm lại) nên trở về là thấy đúng trạng thái hiện tại.
      -->
      <div
        :class="
          ui.hasCanvas
            ? 'relative h-[30%] min-h-[170px] shrink-0'
            : 'pointer-events-none invisible absolute inset-x-0 top-0 h-[30%] min-h-[170px]'
        "
      >
        <GameCanvas :active="ui.hasCanvas && !ui.meditate" />
      </div>

      <section class="min-h-0 flex-1">
        <ScreenHost v-if="game.ready" />
      </section>

      <BottomNav v-if="game.ready" />

      <LogSheet />
      <EventModal />
      <StoryModal />
      <OfflineModal />
      <MeditateOverlay />
    </main>
  </div>
</template>
