<script setup>
// GardenTab.vue - Linh Điền (lưới ô đất: bấm để gieo / thu) và Khoáng Mạch; chạy theo giờ thật, tiếp tục cả khi offline.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ITEMS, itemName } from '../../game/data.js'
import { STAGES } from '../../game/constants.js'
import { CROPS, MINE_CAP_SECONDS, MAX_PLOTS, cropById, mineAmount, mineInfo, plotCount, seedCost } from '../../game/garden.js'
import { fmt, fmtDuration } from '../../game/format.js'
import Icon from '../Icon.vue'

const game = useGameStore()

// Đồng hồ giây để thanh tiến độ tự cập nhật
const now = ref(Date.now())
let timer = null
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(timer))

const plots = computed(() => Array.from({ length: MAX_PLOTS }, (_, i) => ({ idx: i, open: i < plotCount(game.stageIdx), plot: game.garden.plots[i] })))
const selected = ref('linh_thao') // cây đang chọn để gieo
const crop = computed(() => cropById(selected.value))
const cropLocked = computed(() => game.stageIdx < crop.value.minStage)
const readyCount = computed(() => game.garden.plots.filter((p) => p && p.readyAt <= now.value).length)
const emptyCount = computed(() => plots.value.filter((p) => p.open && !p.plot).length)

const remaining = (p) => Math.max(0, (p.readyAt - now.value) / 1000)
const progress = (p) => Math.min(1, 1 - remaining(p) / cropById(p.crop).seconds)
const canPlant = computed(() => !cropLocked.value && game.spiritStones.gte(seedCost(crop.value)))

/** Gieo cây đang chọn vào mọi ô trống (dừng khi hết linh thạch). */
function plantAll() {
  for (const p of plots.value) if (p.open && !p.plot && canPlant.value) game.plant(p.idx, selected.value)
}
function tap(p) {
  if (!p.open) return
  if (!p.plot) game.plant(p.idx, selected.value)
  else if (remaining(p.plot) <= 0) game.harvest(p.idx)
}

const mineReady = computed(() => mineAmount(game.stageIdx, (now.value - game.mineAt) / 1000))
const mineFull = computed(() => (now.value - game.mineAt) / 1000 >= MINE_CAP_SECONDS)
const mine = computed(() => mineInfo(game.stageIdx))
</script>

<template>
  <div class="space-y-3">
    <div>
      <div class="mb-1.5 text-sm font-bold text-gold-300">Linh Điền <span class="text-xs font-normal text-slate-500">chạy theo giờ thật, cả khi vắng mặt</span></div>

      <!-- Chọn cây -->
      <div class="grid grid-cols-6 gap-1">
        <button
          v-for="c in CROPS"
          :key="c.id"
          class="flex min-h-[48px] flex-col items-center justify-center rounded-lg border text-[11px] font-semibold disabled:opacity-40"
          :class="selected === c.id ? 'border-jade-500/70 bg-jade-600/25 text-jade-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          :disabled="game.stageIdx < c.minStage"
          :title="itemName(c.id)"
          @click="selected = c.id"
        >
          <Icon :name="game.stageIdx < c.minStage ? 'lock' : 'herb'" :size="20" />
          <span class="w-full truncate px-0.5 text-center">{{ itemName(c.id).split(' ').slice(-1)[0] }}</span>
        </button>
      </div>
      <div class="mt-1 text-xs text-slate-400">
        {{ itemName(selected) }}: lớn {{ fmtDuration(crop.seconds) }} · thu {{ crop.yield[0] }}-{{ crop.yield[1] }} ·
        hạt <Icon name="stone" :size="12" class="inline text-gold-400" /> {{ fmt(seedCost(crop)) }}
        <span v-if="cropLocked" class="text-cinnabar-400"> · cần {{ STAGES[crop.minStage].fullName }}</span>
      </div>

      <!-- Lưới ô đất -->
      <div class="mt-2 grid grid-cols-4 gap-2">
        <button
          v-for="p in plots"
          :key="p.idx"
          class="relative flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition active:scale-95"
          :class="!p.open ? 'border-ink-700 bg-ink-900/40 text-slate-600' : !p.plot ? 'border-dashed border-gold-500/40 bg-ink-900/60 text-slate-400' : remaining(p.plot) <= 0 ? 'border-jade-400 bg-jade-500/20 text-jade-200' : 'border-ink-600 bg-ink-900/70 text-slate-300'"
          @click="tap(p)"
        >
          <Icon :name="!p.open ? 'lock' : !p.plot ? 'dots' : 'herb'" :size="26" :class="p.plot && remaining(p.plot) <= 0 ? 'text-jade-300' : ''" />
          <span class="mt-0.5 text-[11px] leading-tight">
            <template v-if="!p.open">Khoá</template>
            <template v-else-if="!p.plot">Gieo</template>
            <template v-else-if="remaining(p.plot) <= 0">Thu!</template>
            <template v-else>{{ fmtDuration(remaining(p.plot)) }}</template>
          </span>
          <span v-if="p.plot && remaining(p.plot) > 0" class="absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-black/50">
            <i class="block h-full bg-jade-400" :style="{ width: progress(p.plot) * 100 + '%' }"></i>
          </span>
        </button>
      </div>

      <div class="mt-2 grid grid-cols-2 gap-2">
        <button class="btn-jade min-h-[44px]" :disabled="readyCount === 0" @click="game.harvestAll()"><Icon name="check" :size="16" />Thu hết ({{ readyCount }})</button>
        <button class="btn-gold min-h-[44px]" :disabled="emptyCount === 0 || !canPlant" @click="plantAll()"><Icon name="leaf" :size="16" />Gieo hết ({{ emptyCount }})</button>
      </div>
    </div>

    <div class="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-2">
      <Icon name="gem" :size="26" class="shrink-0 text-sky-300" />
      <div class="min-w-0 flex-1">
        <div class="text-sm font-bold text-white">Khoáng Mạch</div>
        <div class="truncate text-xs text-slate-400">{{ itemName(mine.ore) }} · {{ mine.perHour }}/giờ · tối đa {{ MINE_CAP_SECONDS / 3600 }} giờ</div>
      </div>
      <button class="btn-jade shrink-0 !px-3 text-xs" :disabled="mineReady <= 0" @click="game.collectMine()">
        Thu {{ mineReady }}{{ mineFull ? ' (đầy)' : '' }}
      </button>
    </div>
  </div>
</template>
