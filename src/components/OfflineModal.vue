<script setup>
// OfflineModal.vue - Báo cáo thành quả bế quan (và vượt ải) khi người chơi quay lại game.
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { fmt, fmtDuration } from '../game/format.js'
import { itemName } from '../game/data.js'
import { useUiStore } from '../stores/uiStore.js'
import { unlockedScreens } from '../game/screens.js'
import { SCREEN_HINT, screenWork } from './badges.js'
import Icon from './Icon.vue'

const game = useGameStore()
const ui = useUiStore()
// Việc nên làm ngay: các màn đang có chấm đỏ thật
const todo = computed(() => unlockedScreens(game).filter((s) => screenWork(game, s.id)).slice(0, 3))
function goTo(id) {
  game.dismissOfflineReport()
  ui.go(id)
}
const farmItems = computed(() => Object.entries(game.offlineReport?.campaign?.items ?? {}))
const capHours = computed(() => Math.round(game.offlineCap / 3600))
</script>

<template>
  <Transition name="modal">
  <div v-if="game.offlineReport" class="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-[2px]">
    <div class="panel thin-scroll max-h-full w-full max-w-xs overflow-y-auto p-4 text-center">
      <h2 class="title-rule mb-3 !text-base"><Icon name="lotus" :size="18" />Xuất Quan</h2>
      <p class="text-sm text-slate-300">
        Ngươi đã bế quan <b class="text-white">{{ fmtDuration(game.offlineReport.seconds) }}</b>
        <span v-if="game.offlineReport.capped" class="text-slate-400"> (tối đa {{ capHours }} giờ)</span>.
      </p>
      <div class="my-3 space-y-1 text-sm">
        <div class="flex items-center justify-center gap-1.5 text-jade-300"><Icon name="lotus" :size="16" />+{{ fmt(game.offlineReport.exp) }} linh khí</div>
        <div class="flex items-center justify-center gap-1.5 text-gold-300"><Icon name="stone" :size="16" />+{{ fmt(game.offlineReport.stones) }} linh thạch</div>
        <div v-if="game.offlineReport.full" class="text-xs text-slate-400">Linh khí đã đầy, hãy đột phá!</div>
      </div>

      <div v-if="game.offlineReport.campaign" class="mb-3 rounded bg-ink-900 p-2 text-left text-xs">
        <div class="mb-1 font-bold text-slate-200">Vượt Ải khi vắng mặt (hiệu suất 50%)</div>
        <div class="text-slate-300">
          <template v-if="game.offlineReport.campaign.to > game.offlineReport.campaign.from">Ải {{ game.offlineReport.campaign.from }} → ải {{ game.offlineReport.campaign.to }}</template>
          <template v-else>Vẫn dừng ở ải {{ game.offlineReport.campaign.to }}</template>
        </div>
        <div v-if="game.offlineReport.campaign.gear" class="text-gold-300">+{{ game.offlineReport.campaign.gear }} trang bị (vào túi trang bị)</div>
        <div v-if="farmItems.length" class="text-jade-300">
          <span v-for="([id, n], i) in farmItems" :key="id">{{ i ? ', ' : '' }}{{ itemName(id) }} x{{ n }}</span>
        </div>
      </div>

      <div v-if="todo.length" class="mb-3 space-y-1.5 text-left">
        <div class="text-xs font-bold text-gold-300">Việc nên làm ngay</div>
        <button v-for="s in todo" :key="s.id" class="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-gold-400/50 bg-gold-500/10 px-2.5 text-sm text-slate-200" @click="goTo(s.id)">
          <Icon :name="s.icon" :size="18" class="text-gold-300" /><span class="flex-1"><b>{{ s.label }}</b> <span class="text-xs text-slate-400">{{ SCREEN_HINT[s.id] }}</span></span><Icon name="up" :size="14" class="rotate-90" />
        </button>
      </div>
      <button class="btn-gold min-h-[44px] w-full" @click="game.dismissOfflineReport()">Nhận thưởng</button>
    </div>
  </div>
  </Transition>
</template>
