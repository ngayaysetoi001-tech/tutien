<script setup>
// OfflineModal.vue - Báo cáo thành quả bế quan (và vượt ải) khi người chơi quay lại game.
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { fmt, fmtDuration } from '../game/format.js'
import { itemName } from '../game/data.js'

const game = useGameStore()
const farmItems = computed(() => Object.entries(game.offlineReport?.campaign?.items ?? {}))
const capHours = computed(() => Math.round(game.offlineCap / 3600))
</script>

<template>
  <Transition name="modal">
  <div v-if="game.offlineReport" class="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-[2px]">
    <div class="panel thin-scroll max-h-full w-full max-w-xs overflow-y-auto p-4 text-center">
      <h2 class="title-rule mb-3 !text-base">Xuất Quan</h2>
      <p class="text-sm text-slate-300">
        Ngươi đã bế quan <b class="text-white">{{ fmtDuration(game.offlineReport.seconds) }}</b>
        <span v-if="game.offlineReport.capped" class="text-slate-400"> (tối đa {{ capHours }} giờ)</span>.
      </p>
      <div class="my-3 space-y-1 text-sm">
        <div class="text-jade-300">+{{ fmt(game.offlineReport.exp) }} linh khí</div>
        <div class="text-gold-300">+{{ fmt(game.offlineReport.stones) }} linh thạch</div>
        <div v-if="game.offlineReport.full" class="text-xs text-slate-400">Linh khí đã đầy, hãy đột phá!</div>
      </div>

      <div v-if="game.offlineReport.campaign" class="mb-3 rounded bg-ink-900 p-2 text-left text-xs">
        <div class="mb-1 font-bold text-slate-200">Vượt Ải khi vắng mặt (hiệu suất 50%)</div>
        <div class="text-slate-300">
          <template v-if="game.offlineReport.campaign.to > game.offlineReport.campaign.from">Ải {{ game.offlineReport.campaign.from }} → ải {{ game.offlineReport.campaign.to }}</template>
          <template v-else>Vẫn dừng ở ải {{ game.offlineReport.campaign.to }}</template>
        </div>
        <div v-if="game.offlineReport.campaign.stones.gt(0)" class="text-gold-300">+{{ fmt(game.offlineReport.campaign.stones) }} linh thạch từ các ải mới</div>
        <div v-if="game.offlineReport.campaign.gear" class="text-gold-300">+{{ game.offlineReport.campaign.gear }} trang bị (vào túi trang bị)</div>
        <div v-if="farmItems.length" class="text-jade-300">
          <span v-for="([id, n], i) in farmItems" :key="id">{{ i ? ', ' : '' }}{{ itemName(id) }} x{{ n }}</span>
        </div>
      </div>

      <button class="btn-gold w-full" @click="game.dismissOfflineReport()">Nhận thưởng</button>
    </div>
  </div>
  </Transition>
</template>
