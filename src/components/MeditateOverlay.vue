<script setup>
// MeditateOverlay.vue - Chế độ thiền định: màn hình tối giản, ngừng vẽ cảnh và tick thưa để tiết kiệm pin khi treo máy.
// Game vẫn chạy bình thường (tu luyện, vượt ải, thu nhập), chạm vào bất kỳ đâu để thoát.
import { useGameStore } from '../stores/gameStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { fmt, fmtPercent } from '../game/format.js'

const game = useGameStore()
const ui = useUiStore()
</script>

<template>
  <Transition name="modal">
    <div
      v-if="ui.meditate"
      class="absolute inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-3 bg-black px-6 text-center"
      @click="ui.meditate = false"
    >
      <div class="text-xl font-bold tracking-wide text-gold-300">{{ game.stage.fullName }}</div>
      <div class="w-full max-w-xs">
        <div class="h-2 overflow-hidden rounded bg-ink-800"><div class="h-full bg-jade-500" :style="{ width: Math.round(game.progress * 100) + '%' }"></div></div>
        <div class="mt-1 text-xs text-slate-400">{{ game.isFull ? 'Linh khí đã đầy, hãy đột phá!' : fmtPercent(game.progress) }} · +{{ fmt(game.expRate) }}/giây</div>
      </div>
      <div class="text-sm text-slate-300">Vượt Ải: ải {{ game.campaign.best }} · {{ fmt(game.spiritStones) }} linh thạch</div>
      <div v-if="game.settings.warp" class="text-xs text-gold-300">Đang tăng tốc, còn {{ Math.floor(game.timeBank / 60) }} phút trong kho</div>
      <div class="mt-6 text-xs text-slate-600">Đang thiền định, tiết kiệm pin. Chạm để thoát.</div>
    </div>
  </Transition>
</template>
