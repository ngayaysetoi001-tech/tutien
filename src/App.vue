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
import { bindAudio } from './game/audioDirector.js'
import { setAudioPrefs } from './game/audio.js'

const game = useGameStore()
const ui = useUiStore()

// Lưu ngay khi tab bị ẩn / đóng để không mất tiến trình giữa hai lần autosave 5s.
const saveNow = () => game.save()
const onVisibility = () => {
  if (document.visibilityState === 'hidden') saveNow()
}

let unbindAudio = null

// Bật/tắt âm thanh theo cài đặt (có hiệu lực ngay cả khi save được nạp sau đó)
watch(
  () => [game.settings.sound, game.settings.music],
  ([sound, music]) => setAudioPrefs({ sfx: sound, music }),
  { immediate: true },
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

      <!--
        Một thể hiện PixiJS duy nhất, không bao giờ bị huỷ: ở màn Nhân Vật / Bí Cảnh nằm trong luồng bố cục,
        ở các màn khác bị ẩn (giữ nguyên kích thước, vẽ chậm lại) nên trở về là thấy đúng trạng thái hiện tại.
      -->
      <div
        :class="
          ui.hasCanvas
            ? 'relative h-[34%] min-h-[190px] shrink-0'
            : 'pointer-events-none invisible absolute inset-x-0 top-0 h-[34%] min-h-[190px]'
        "
      >
        <GameCanvas :active="ui.hasCanvas" />
      </div>

      <section class="min-h-0 flex-1">
        <ScreenHost v-if="game.ready" />
      </section>

      <BottomNav v-if="game.ready" />

      <LogSheet />
      <EventModal />
      <StoryModal />
      <OfflineModal />
    </main>
  </div>
</template>
