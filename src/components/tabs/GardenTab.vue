<script setup>
// GardenTab.vue - Linh Điền (gieo trồng) và Khoáng Mạch: chạy theo giờ thật, tiếp tục cả khi offline.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ITEMS, itemName } from '../../game/data.js'
import { STAGES } from '../../game/constants.js'
import { CROPS, MINE_CAP_SECONDS, MAX_PLOTS, cropById, mineAmount, mineInfo, plotCount, seedCost } from '../../game/garden.js'
import { fmt, fmtDuration } from '../../game/format.js'

const game = useGameStore()

// Đồng hồ giây để thanh tiến độ tự cập nhật
const now = ref(Date.now())
let timer = null
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(timer))

const plots = computed(() => Array.from({ length: MAX_PLOTS }, (_, i) => ({ idx: i, open: i < plotCount(game.stageIdx), plot: game.garden.plots[i] })))
const selected = ref('linh_thao') // cây đang chọn để gieo
const readyCount = computed(() => game.garden.plots.filter((p) => p && p.readyAt <= now.value).length)

const remaining = (p) => Math.max(0, (p.readyAt - now.value) / 1000)
const progress = (p) => {
  const total = cropById(p.crop).seconds
  return Math.min(1, 1 - remaining(p) / total)
}
const mineReady = computed(() => mineAmount(game.stageIdx, (now.value - game.mineAt) / 1000))
const mineFull = computed(() => (now.value - game.mineAt) / 1000 >= MINE_CAP_SECONDS)
const mine = computed(() => mineInfo(game.stageIdx))
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Linh Điền</div>
        <button class="btn-gold px-2 py-0.5 text-[11px]" :disabled="readyCount === 0" @click="game.harvestAll()">
          Thu hoạch tất cả ({{ readyCount }})
        </button>
      </div>
      <p class="text-[11px] text-slate-400">Cây lớn theo giờ thật, kể cả khi ngươi vắng mặt. Mở thêm luống khi tu vi cao hơn.</p>

      <div class="mt-2 grid grid-cols-3 gap-1">
        <button
          v-for="c in CROPS"
          :key="c.id"
          class="rounded border px-1 py-1 text-[11px] font-semibold disabled:opacity-40"
          :class="selected === c.id ? 'border-jade-500/70 bg-jade-600/25 text-jade-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          :disabled="game.stageIdx < c.minStage"
          @click="selected = c.id"
        >
          {{ itemName(c.id) }}
        </button>
      </div>
      <div class="mt-1 text-[11px] text-slate-400">
        {{ itemName(selected) }}: lớn {{ fmtDuration(cropById(selected).seconds) }}, thu {{ cropById(selected).yield[0] }}-{{
          cropById(selected).yield[1]
        }}, hạt giống {{ fmt(seedCost(cropById(selected))) }} linh thạch
        <span v-if="game.stageIdx < cropById(selected).minStage" class="text-cinnabar-400">
          · cần {{ STAGES[cropById(selected).minStage].fullName }}
        </span>
      </div>

      <div class="mt-2 space-y-1">
        <div v-for="p in plots" :key="p.idx" class="rounded bg-ink-900 px-2 py-1.5 text-xs">
          <template v-if="!p.open">
            <span class="text-slate-600">🔒 Luống {{ p.idx + 1 }} (mở khi tu vi cao hơn)</span>
          </template>
          <template v-else-if="p.plot">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100">Luống {{ p.idx + 1 }}: {{ itemName(p.plot.crop) }}</span>
              <button v-if="remaining(p.plot) <= 0" class="btn-jade px-2 py-0.5 text-[11px]" @click="game.harvest(p.idx)">Thu hoạch</button>
              <span v-else class="text-[11px] text-slate-400">còn {{ fmtDuration(remaining(p.plot)) }}</span>
            </div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-black/50">
              <div class="h-full bg-gradient-to-r from-jade-600 to-jade-300" :style="{ width: progress(p.plot) * 100 + '%' }"></div>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Luống {{ p.idx + 1 }}: trống</span>
              <button
                class="btn-gold px-2 py-0.5 text-[11px]"
                :disabled="game.stageIdx < cropById(selected).minStage || game.spiritStones.lt(seedCost(cropById(selected)))"
                @click="game.plant(p.idx, selected)"
              >
                Gieo {{ itemName(selected) }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Khoáng Mạch</div>
        <div class="text-[11px] text-slate-400">{{ itemName(mine.ore) }} · {{ mine.perHour }}/giờ</div>
      </div>
      <p class="text-[11px] text-slate-400">Quặng tích luỹ theo giờ thật, tối đa {{ MINE_CAP_SECONDS / 3600 }} giờ.</p>
      <button class="btn-jade mt-1.5 w-full py-1 text-xs" :disabled="mineReady <= 0" @click="game.collectMine()">
        Thu {{ mineReady }} {{ ITEMS[mine.ore].name }}{{ mineFull ? ' (đã đầy)' : '' }}
      </button>
    </div>
  </div>
</template>
