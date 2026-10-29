<script setup>
// DisciplesTab.vue - Đệ tử: thu nhận, giao việc, thu hoạch theo giờ thật, nâng cấp.
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { GRADES, JOBS, JOB_IDS, MAX_LEVEL, levelCap, levelCost, pending, recruitCost } from '../../game/disciples.js'
import { itemName } from '../../game/data.js'
import { fmt, fmtDuration } from '../../game/format.js'
import { MAX_PARTY, MISSIONS, MISSION_IDS } from '../../game/expedition.js'
import { STAGES } from '../../game/constants.js'
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

// ---------- Thám hiểm ----------
const picked = reactive({}) // { [missionId]: [uid, ...] } đệ tử đã chọn cho từng nhiệm vụ
const idle = computed(() => game.disciples.filter((d) => !d.away))
const sel = (m) => (picked[m] ??= [])
function toggle(m, uid) {
  const list = sel(m)
  const i = list.indexOf(uid)
  if (i >= 0) list.splice(i, 1)
  else if (list.length < MAX_PARTY) list.push(uid)
}
const missionLock = (m) => (game.stageIdx < MISSIONS[m].minStage ? `Cần ${STAGES[MISSIONS[m].minStage].fullName}` : null)
const chance = (m) => Math.round(game.expeditionChance(m, sel(m).filter((u) => idle.value.some((d) => d.uid === u))) * 100)
const canGo = (m) => !missionLock(m) && game.expeditions.length < game.expeditionSlotCount && sel(m).filter((u) => idle.value.some((d) => d.uid === u)).length >= MISSIONS[m].need
function go(m) {
  if (game.startExpedition(m, sel(m))) picked[m] = []
}
const remaining = (e) => Math.max(0, Math.ceil((e.since + e.seconds * 1000 - now.value) / 1000))

function onDismiss(d) {
  if (window.confirm(`Tiễn đệ tử ${d.name} rời đi? Không hoàn lại linh thạch.`)) game.dismissDisciple(d.uid)
}
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Đệ tử <span class="text-gold-300">{{ game.disciples.length }}/{{ game.discipleLimit }}</span></div>
        <button class="btn-jade px-2 py-0.5 text-xs" :disabled="game.disciples.length === 0" @click="game.collectAllDisciples()">Thu hoạch tất cả</button>
      </div>
      <p class="mt-0.5 text-xs text-slate-400">
        Giao việc để đệ tử làm ra thảo dược, khoáng thạch hoặc linh thạch theo giờ thật (tích luỹ tối đa 8 giờ). Cùng hệ với tông môn được +10%.
        Thêm chỗ bằng cách thăng cấp bậc tông môn.
      </p>
      <button class="btn-gold mt-2 w-full py-1.5 text-xs" :disabled="full || game.spiritStones.lt(price)" @click="game.recruit()">
        <Icon name="disciple" :size="14" /><template v-if="full">Đã đủ đệ tử</template><template v-else>Thu nhận đệ tử <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(price) }}</template>
      </button>
    </div>

    <div class="card space-y-1.5">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Thám hiểm</div>
        <div class="text-xs text-slate-400">Đang đi {{ game.expeditions.length }}/{{ game.expeditionSlotCount }}</div>
      </div>
      <p class="text-xs text-slate-400">Cử đệ tử đi theo giờ thật (kể cả khi đóng game). Sức mạnh đoàn càng lớn càng dễ thành công, thất bại chỉ mang về chút ít. Thêm chỗ bằng cấp bậc tông môn.</p>
      <div v-for="(e, i) in game.expeditions" :key="i" class="flex items-center justify-between rounded bg-ink-900 p-1.5 text-xs">
        <span class="text-slate-200">{{ MISSIONS[e.id].name }} ({{ e.uids.length }} đệ tử)</span>
        <button class="btn-jade !px-2 !py-0.5 text-xs" :disabled="!game.expeditionReady(e, now)" @click="game.claimExpedition(i)">
          {{ game.expeditionReady(e, now) ? 'Nhận thưởng' : fmtDuration(remaining(e)) }}
        </button>
      </div>
      <div v-for="m in MISSION_IDS" :key="m" class="rounded border border-ink-600 p-1.5 text-xs" :class="{ 'opacity-60': missionLock(m) }">
        <div class="flex items-center justify-between">
          <span class="font-bold text-gold-200">{{ MISSIONS[m].name }}</span>
          <span class="text-slate-400">{{ fmtDuration(MISSIONS[m].seconds) }} · cần ≥{{ MISSIONS[m].need }} đệ tử</span>
        </div>
        <div class="text-xs text-slate-500">
          Thưởng: linh thạch, thảo dược<template v-if="MISSIONS[m].ore">, quặng</template><template v-if="MISSIONS[m].art">, công pháp</template><template v-if="MISSIONS[m].pet">, linh thú</template><template v-if="MISSIONS[m].skill">, võ kỹ</template>
        </div>
        <div v-if="missionLock(m)" class="text-xs text-cinnabar-400">🔒 {{ missionLock(m) }}</div>
        <template v-else>
          <div class="mt-1 flex flex-wrap gap-1">
            <button
              v-for="d in idle"
              :key="d.uid"
              class="rounded border px-1.5 py-0.5 text-[11px]"
              :class="sel(m).includes(d.uid) ? 'border-jade-500/70 bg-jade-600/25 text-jade-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
              @click="toggle(m, d.uid)"
            >
              {{ d.name }} Lv{{ d.level }}
            </button>
            <span v-if="idle.length === 0" class="text-xs text-slate-500">Không còn đệ tử rảnh.</span>
          </div>
          <div class="mt-1 flex items-center justify-between">
            <span class="text-xs text-slate-300">Tỉ lệ thành công: <b :class="chance(m) >= 60 ? 'text-jade-300' : 'text-gold-300'">{{ chance(m) }}%</b></span>
            <button class="btn-gold !px-3 !py-0.5 text-xs" :disabled="!canGo(m)" @click="go(m)">Cử đi</button>
          </div>
        </template>
      </div>
    </div>

    <div v-for="d in game.disciples" :key="d.uid" class="card">
      <div class="flex items-center justify-between">
        <div class="text-sm font-bold" :style="{ color: GRADES[d.grade].css }">
          {{ d.name }}
          <span class="text-[11px] font-normal text-slate-400">{{ GRADES[d.grade].name }} · <span :style="{ color: ELEMENTS[d.element].css }">{{ ELEMENTS[d.element].name }}</span></span>
        </div>
        <div class="text-xs text-gold-300">{{ d.away ? 'Đang thám hiểm · ' : '' }}Cấp {{ d.level }}/{{ Math.min(MAX_LEVEL, levelCap(game.stageIdx)) }}</div>
      </div>

      <div class="mt-1.5 grid grid-cols-4 gap-1">
        <button
          v-for="j in JOB_IDS"
          :key="j"
          class="rounded border px-0.5 py-1 text-[11px] font-semibold"
          :class="d.job === j ? 'border-jade-500/70 bg-jade-600/25 text-jade-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          :disabled="d.away"
          :title="JOBS[j].desc"
          @click="game.assignJob(d.uid, j)"
        >
          {{ JOBS[j].name }}
        </button>
        <button
          class="rounded border px-0.5 py-1 text-[11px] font-semibold"
          :class="!d.job ? 'border-gold-500/60 bg-gold-500/15 text-gold-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          @click="game.assignJob(d.uid, null)"
        >
          Nghỉ
        </button>
      </div>

      <div class="mt-1.5 flex items-center justify-between gap-2 text-xs">
        <span class="text-slate-300">Đã tích luỹ: <b class="text-jade-300">{{ pendingText(d) }}</b></span>
        <button class="btn-jade px-2 py-0.5 text-xs" :disabled="!d.job" @click="game.collectDisciple(d.uid)">Thu</button>
      </div>
      <div class="mt-1.5 flex gap-1.5">
        <button
          class="btn-gold flex-1 py-1 text-xs"
          :disabled="d.level >= levelCap(game.stageIdx) || game.spiritStones.lt(levelCost(game.stageIdx, d.level))"
          @click="game.levelUpDisciple(d.uid)"
        >
          <template v-if="d.level >= levelCap(game.stageIdx)">Chờ tu vi cao hơn</template>
          <template v-else>Nâng cấp <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(levelCost(game.stageIdx, d.level)) }}</template>
        </button>
        <button class="btn-ghost px-2 py-1 text-xs" @click="onDismiss(d)">Tiễn</button>
      </div>
    </div>
  </div>
</template>
