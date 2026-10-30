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
import { groupOf } from './game/screens.js'
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

// Rung nhẹ khi bấm nút hành động (chỉ khi bật trong Cài Đặt và thiết bị hỗ trợ)
function buzz(e) {
  if (!game.settings.haptic || !navigator.vibrate) return
  const b = e.target.closest?.('button')
  if (b && !b.disabled && b.className.includes('btn')) navigator.vibrate(8)
}

const base = import.meta.env.BASE_URL
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
  document.addEventListener('click', buzz)
})

onBeforeUnmount(() => {
  unbindAudio?.()
  game.stopLoop()
  saveNow()
  window.removeEventListener('beforeunload', saveNow)
  document.removeEventListener('visibilitychange', onVisibility)
  document.removeEventListener('click', buzz)
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

      <section class="relative min-h-0 flex-1">
        <!-- Tranh nền mờ theo nhóm màn hình (public/banners), mờ dần xuống đáy -->
        <Transition name="bg-fade" mode="out-in">
          <div v-if="game.ready" :key="groupOf(ui.tab)" class="group-bg" :style="{ backgroundImage: `url(${base}banners/${groupOf(ui.tab)}.webp)` }"></div>
        </Transition>
        <ScreenHost v-if="game.ready" class="relative" />
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
