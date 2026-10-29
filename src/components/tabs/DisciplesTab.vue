<script setup>
// DisciplesTab.vue - Đệ tử: thu nhận, giao việc, thu hoạch theo giờ thật, nâng cấp.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { GRADES, JOBS, JOB_IDS, MAX_LEVEL, levelCap, levelCost, pending, recruitCost } from '../../game/disciples.js'
import { itemName } from '../../game/data.js'
import { fmt, fmtDuration } from '../../game/format.js'
import Icon from '../Icon.vue'

const game = useGameStore()

// Đồng hồ giây để số tích luỹ tự cập nhật
const now = ref(Date.now())
let timer = null
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(timer))

const price = computed(() => recruitCost(game.stageIdx, game.disciples.length))
const full = computed(() => game.disciples.length >= game.discipleLimit)

function pendingText(d) {
  const p = pending(d, game.stageIdx, game.discipleCtx(), now.value)
  if (!p) return 'Đang nghỉ'
  return p.kind === 'stones' ? `${fmt(p.amount)} linh thạch` : `${itemName(p.id)} x${p.amount.toFixed(1)}`
}

function onDismiss(d) {
  if (window.confirm(`Tiễn đệ tử ${d.name} rời đi? Không hoàn lại linh thạch.`)) game.dismissDisciple(d.uid)
}
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Đệ tử <span class="text-gold-300">{{ game.disciples.length }}/{{ game.discipleLimit }}</span></div>
        <button class="btn-jade px-2 py-0.5 text-[11px]" :disabled="game.disciples.length === 0" @click="game.collectAllDisciples()">Thu hoạch tất cả</button>
      </div>
      <p class="mt-0.5 text-[11px] text-slate-400">
        Giao việc để đệ tử làm ra thảo dược, khoáng thạch hoặc linh thạch theo giờ thật (tích luỹ tối đa 8 giờ). Cùng hệ với tông môn được +10%.
        Thêm chỗ bằng cách thăng cấp bậc tông môn.
      </p>
      <button class="btn-gold mt-2 w-full py-1.5 text-xs" :disabled="full || game.spiritStones.lt(price)" @click="game.recruit()">
        <Icon name="disciple" :size="14" />{{ full ? 'Đã đủ đệ tử' : `Thu nhận đệ tử - ${fmt(price)} linh thạch` }}
      </button>
    </div>

    <div v-for="d in game.disciples" :key="d.uid" class="card">
      <div class="flex items-center justify-between">
        <div class="text-sm font-bold" :style="{ color: GRADES[d.grade].css }">
          {{ d.name }}
          <span class="text-[10px] font-normal text-slate-400">{{ GRADES[d.grade].name }} · <span :style="{ color: ELEMENTS[d.element].css }">{{ ELEMENTS[d.element].name }}</span></span>
        </div>
        <div class="text-xs text-gold-300">Cấp {{ d.level }}/{{ Math.min(MAX_LEVEL, levelCap(game.stageIdx)) }}</div>
      </div>

      <div class="mt-1.5 grid grid-cols-4 gap-1">
        <button
          v-for="j in JOB_IDS"
          :key="j"
          class="rounded border px-0.5 py-1 text-[10px] font-semibold"
          :class="d.job === j ? 'border-jade-500/70 bg-jade-600/25 text-jade-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          :title="JOBS[j].desc"
          @click="game.assignJob(d.uid, j)"
        >
          {{ JOBS[j].name }}
        </button>
        <button
          class="rounded border px-0.5 py-1 text-[10px] font-semibold"
          :class="!d.job ? 'border-gold-500/60 bg-gold-500/15 text-gold-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          @click="game.assignJob(d.uid, null)"
        >
          Nghỉ
        </button>
      </div>

      <div class="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span class="text-slate-300">Đã tích luỹ: <b class="text-jade-300">{{ pendingText(d) }}</b></span>
        <button class="btn-jade px-2 py-0.5 text-[11px]" :disabled="!d.job" @click="game.collectDisciple(d.uid)">Thu</button>
      </div>
      <div class="mt-1.5 flex gap-1.5">
        <button
          class="btn-gold flex-1 py-1 text-[11px]"
          :disabled="d.level >= levelCap(game.stageIdx) || game.spiritStones.lt(levelCost(game.stageIdx, d.level))"
          @click="game.levelUpDisciple(d.uid)"
        >
          {{ d.level >= levelCap(game.stageIdx) ? 'Chờ tu vi cao hơn' : `Nâng cấp - ${fmt(levelCost(game.stageIdx, d.level))}` }}
        </button>
        <button class="btn-ghost px-2 py-1 text-[11px]" @click="onDismiss(d)">Tiễn</button>
      </div>
    </div>
  </div>
</template>
