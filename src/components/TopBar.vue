<script setup>
// TopBar.vue - Thanh trên mỏng có mặt ở mọi màn hình: cảnh giới, linh thạch, tiến độ tu vi, nhật ký.
// Khi linh khí đầy mà đang ở màn khác, hiện nút "Đột Phá!" nhấp nháy để quay về màn Nhân Vật.
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { ELEMENTS } from '../game/elements.js'
import { fmt, fmtPercent } from '../game/format.js'
import ProgressBar from './ProgressBar.vue'
import Icon from './Icon.vue'

const game = useGameStore()
const ui = useUiStore()

const barLabel = computed(() => {
  if (game.isMaxStage) return `Cực hạn · +${fmt(game.expRate)}/giây`
  const state = game.isFull ? 'Đã đầy' : fmtPercent(game.progress)
  return `${state} → ${game.nextStageName} · +${fmt(game.expRate)}/giây`
})
const showBreakChip = computed(() => game.canBreakthrough && ui.tab !== 'character')
</script>

<template>
  <header class="topbar shrink-0 px-2.5 pb-1.5 pt-2">
    <div class="flex items-center gap-2">
      <div class="min-w-0 flex-1">
        <div class="truncate text-[15px] font-bold leading-tight tracking-wide text-gold-300">
          {{ game.stage.fullName }}
          <span v-if="game.story.title" class="ml-1 text-[10px] font-bold text-jade-300">✦ {{ game.story.title }}</span>
        </div>
        <div class="flex items-center gap-1.5 text-[10px] leading-tight text-slate-400">
          <span :style="{ color: ELEMENTS[game.element].css }" class="font-bold">{{ ELEMENTS[game.element].name }}</span>
          <span class="text-slate-600">·</span>
          <span class="truncate">{{ game.spiritRoot.name }}</span>
        </div>
      </div>

      <button v-if="showBreakChip" class="btn-gold glow-ready shrink-0 !px-2 !py-1 text-[11px]" @click="ui.go('character')">
        <Icon name="bolt" :size="13" />Đột Phá!
      </button>

      <div class="top-chip text-gold-300" title="Linh thạch">
        <Icon name="stone" :size="13" /><b>{{ fmt(game.spiritStones) }}</b>
      </div>
      <div v-if="game.reincarnation.dao > 0" class="top-chip text-jade-300" title="Đạo Vận">
        <Icon name="reborn" :size="13" /><b>{{ game.reincarnation.dao }}</b>
      </div>
      <button class="top-chip !px-1.5 text-slate-300" aria-label="Nhật ký" @click="ui.logOpen = true">
        <Icon name="log" :size="15" />
      </button>
    </div>
    <ProgressBar class="mt-1" compact :value="game.progress" :label="barLabel" :full="game.isFull" />
  </header>
</template>

<style scoped>
.topbar {
  background: linear-gradient(180deg, rgb(10 14 25 / 0.96), rgb(14 19 33 / 0.9));
  border-bottom: 1px solid rgb(217 165 58 / 0.25);
}
.top-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  border: 1px solid rgb(217 165 58 / 0.3);
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 11px;
  background: rgb(8 12 22 / 0.7);
}
</style>
