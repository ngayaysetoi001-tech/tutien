<script setup>
// DisciplesTab.vue - Đệ tử: lưới ô chân dung (bấm để giao việc / nâng cấp trong bảng trượt) và Thám hiểm.
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { GRADES, JOBS, JOB_IDS, MAX_LEVEL, levelCap, levelCost, pending, recruitCost } from '../../game/disciples.js'
import { itemName } from '../../game/data.js'
import { fmt, fmtDuration } from '../../game/format.js'
import { MAX_PARTY, MISSIONS, MISSION_IDS } from '../../game/expedition.js'
import { STAGES } from '../../game/constants.js'
import Icon from '../Icon.vue'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'

const game = useGameStore()
const JOB_GLYPH = { herb: 'herb', ore: 'gem', guard: 'shield' }

// Đồng hồ giây để số tích luỹ tự cập nhật
const now = ref(Date.now())
let timer = null
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(timer))

const price = computed(() => recruitCost(game.stageIdx, game.disciples.length))
const full = computed(() => game.disciples.length >= game.discipleLimit)
const slots = computed(() => Math.max(game.discipleLimit, game.disciples.length))
const selUid = ref(null)
const d = computed(() => game.disciples.find((x) => x.uid === selUid.value) ?? null)
const panel = ref(null) // 'expedition' khi mở bảng thám hiểm

const pend = (x) => pending(x, game.stageIdx, game.discipleCtx(), now.value)
function pendingText(x) {
  const p = pend(x)
  if (!p) return 'Đang nghỉ'
  return p.kind === 'stones' ? `${fmt(p.amount)} linh thạch` : `${itemName(p.id)} x${p.amount.toFixed(1)}`
}

// ---------- Thám hiểm ----------
const picked = reactive({}) // { [missionId]: [uid, ...] } đệ tử đã chọn cho từng nhiệm vụ
const idle = computed(() => game.disciples.filter((x) => !x.away))
const sel = (m) => (picked[m] ??= [])
function toggle(m, uid) {
  const list = sel(m)
  const i = list.indexOf(uid)
  if (i >= 0) list.splice(i, 1)
  else if (list.length < MAX_PARTY) list.push(uid)
}
const missionLock = (m) => (game.stageIdx < MISSIONS[m].minStage ? `Cần ${STAGES[MISSIONS[m].minStage].fullName}` : null)
const chance = (m) => Math.round(game.expeditionChance(m, sel(m).filter((u) => idle.value.some((x) => x.uid === u))) * 100)
const canGo = (m) => !missionLock(m) && game.expeditions.length < game.expeditionSlotCount && sel(m).filter((u) => idle.value.some((x) => x.uid === u)).length >= MISSIONS[m].need
function go(m) {
  if (game.startExpedition(m, sel(m))) picked[m] = []
}
const remaining = (e) => Math.max(0, Math.ceil((e.since + e.seconds * 1000 - now.value) / 1000))

function onDismiss(x) {
  if (window.confirm(`Tiễn đệ tử ${x.name} rời đi? Không hoàn lại linh thạch.`)) {
    game.dismissDisciple(x.uid)
    selUid.value = null
  }
}
</script>

<template>
  <div class="space-y-3">
    <div>
      <div class="mb-1.5 flex items-center justify-between">
        <div class="text-sm font-bold text-gold-300">Đệ tử {{ game.disciples.length }}/{{ game.discipleLimit }}</div>
        <button class="btn-jade !px-3 text-xs" :disabled="game.disciples.length === 0" @click="game.collectAllDisciples()"><Icon name="check" :size="14" />Thu hết</button>
      </div>
      <div class="grid grid-cols-4 gap-x-2 gap-y-3">
        <ItemIcon
          v-for="i in slots"
          :key="i"
          :glyph="game.disciples[i - 1] ? 'disciple' : 'dots'"
          :color="game.disciples[i - 1] ? GRADES[game.disciples[i - 1].grade].css : '#475569'"
          :tint="game.disciples[i - 1] ? ELEMENTS[game.disciples[i - 1].element].css : ''"
          :frame="game.disciples[i - 1] ? GRADES[game.disciples[i - 1].grade].css : ''"
          :dim="!game.disciples[i - 1]"
          :label="game.disciples[i - 1] ? game.disciples[i - 1].name : 'Trống'"
          :badge="game.disciples[i - 1] ? game.disciples[i - 1].level : ''"
          :dot="!!game.disciples[i - 1] && !!pend(game.disciples[i - 1]) && !game.disciples[i - 1].away"
          @click="game.disciples[i - 1] && (selUid = game.disciples[i - 1].uid)"
        />
      </div>
      <button class="btn-gold mt-2 min-h-[44px] w-full" :disabled="full || game.spiritStones.lt(price)" @click="game.recruit()">
        <Icon name="disciple" :size="16" /><template v-if="full">Đã đủ đệ tử (nâng cấp bậc tông môn để thêm)</template><template v-else>Thu nhận <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(price) }}</template>
      </button>
    </div>

    <!-- Thám hiểm -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <div class="text-sm font-bold text-gold-300">Thám hiểm {{ game.expeditions.length }}/{{ game.expeditionSlotCount }}</div>
      </div>
      <div v-for="(e, i) in game.expeditions" :key="i" class="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-1.5">
        <Icon name="dungeon" :size="20" class="text-gold-300" />
        <span class="min-w-0 flex-1 truncate text-sm text-slate-200">{{ MISSIONS[e.id].name }} <span class="text-xs text-slate-500">· {{ e.uids.length }} đệ tử</span></span>
        <button class="btn-jade shrink-0 !px-3 text-xs" :disabled="!game.expeditionReady(e, now)" @click="game.claimExpedition(i)">
          {{ game.expeditionReady(e, now) ? 'Nhận' : fmtDuration(remaining(e)) }}
        </button>
      </div>
      <button class="btn-ghost min-h-[44px] w-full" @click="panel = 'expedition'"><Icon name="quest" :size="16" />Cử đệ tử đi thám hiểm</button>
    </div>

    <!-- Chi tiết đệ tử -->
    <BottomSheet :open="!!d" :title="d ? d.name : ''" glyph="disciple" :color="d ? GRADES[d.grade].css : undefined" @close="selUid = null">
      <template v-if="d">
        <div class="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span :style="{ color: GRADES[d.grade].css }">{{ GRADES[d.grade].name }}</span>
          <span :style="{ color: ELEMENTS[d.element].css }">Hệ {{ ELEMENTS[d.element].name }}</span>
          <span class="ml-auto text-gold-300">{{ d.away ? 'Đang thám hiểm · ' : '' }}Cấp {{ d.level }}/{{ Math.min(MAX_LEVEL, levelCap(game.stageIdx)) }}</span>
        </div>
        <div class="mb-1 text-xs text-slate-500">Giao việc (tích luỹ tối đa 8 giờ, cùng hệ tông môn +10%)</div>
        <div class="grid grid-cols-4 gap-1.5">
          <button
            v-for="j in JOB_IDS"
            :key="j"
            class="flex min-h-[52px] flex-col items-center justify-center rounded-lg border text-xs font-bold"
            :class="d.job === j ? 'border-jade-500/70 bg-jade-600/25 text-jade-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
            :disabled="d.away"
            @click="game.assignJob(d.uid, j)"
          ><Icon :name="JOB_GLYPH[j] ?? 'star'" :size="18" />{{ JOBS[j].name }}</button>
          <button
            class="flex min-h-[52px] flex-col items-center justify-center rounded-lg border text-xs font-bold"
            :class="!d.job ? 'border-gold-500/60 bg-gold-500/15 text-gold-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
            @click="game.assignJob(d.uid, null)"
          ><Icon name="rest" :size="18" />Nghỉ</button>
        </div>
        <p v-if="d.job" class="mt-1 text-xs text-slate-400">{{ JOBS[d.job].desc }}</p>
        <div class="mt-2 flex items-center justify-between text-sm">
          <span>Đã tích luỹ: <b class="text-jade-300">{{ pendingText(d) }}</b></span>
          <button class="btn-jade min-h-[40px] !px-4" :disabled="!d.job" @click="game.collectDisciple(d.uid)">Thu</button>
        </div>
      </template>
      <template #actions>
        <template v-if="d">
          <button class="btn-gold" :disabled="d.level >= levelCap(game.stageIdx) || game.spiritStones.lt(levelCost(game.stageIdx, d.level))" @click="game.levelUpDisciple(d.uid)">
            <template v-if="d.level >= levelCap(game.stageIdx)">Chờ tu vi cao hơn</template>
            <template v-else>Nâng cấp <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(levelCost(game.stageIdx, d.level)) }}</template>
          </button>
          <button class="btn-ghost" @click="onDismiss(d)">Tiễn</button>
        </template>
      </template>
    </BottomSheet>

    <!-- Bảng thám hiểm -->
    <BottomSheet :open="panel === 'expedition'" title="Thám hiểm" glyph="dungeon" @close="panel = null">
      <p class="mb-2 text-xs text-slate-400">Chạy theo giờ thật (kể cả khi đóng game). Đoàn càng mạnh càng dễ thành công; thất bại chỉ mang về chút ít.</p>
      <div v-for="m in MISSION_IDS" :key="m" class="mb-2 rounded-lg border border-ink-600 p-2" :class="{ 'opacity-60': missionLock(m) }">
        <div class="flex items-center justify-between text-sm">
          <b class="text-gold-200">{{ MISSIONS[m].name }}</b>
          <span class="text-xs text-slate-400">{{ fmtDuration(MISSIONS[m].seconds) }} · ≥{{ MISSIONS[m].need }} người</span>
        </div>
        <div class="text-xs text-slate-500">
          Thưởng: linh thạch, thảo dược<template v-if="MISSIONS[m].ore">, quặng</template><template v-if="MISSIONS[m].art">, công pháp</template><template v-if="MISSIONS[m].pet">, linh thú</template><template v-if="MISSIONS[m].treasure">, mảnh pháp bảo</template><template v-if="MISSIONS[m].skill">, võ kỹ</template>
        </div>
        <div v-if="missionLock(m)" class="text-xs text-cinnabar-400"><Icon name="lock" :size="12" class="inline" /> {{ missionLock(m) }}</div>
        <template v-else>
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <button
              v-for="x in idle"
              :key="x.uid"
              class="min-h-[36px] rounded-lg border px-2 text-xs"
              :class="sel(m).includes(x.uid) ? 'border-jade-500/70 bg-jade-600/25 text-jade-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
              @click="toggle(m, x.uid)"
            >{{ x.name }} Lv{{ x.level }}</button>
            <span v-if="idle.length === 0" class="text-xs text-slate-500">Không còn đệ tử rảnh.</span>
          </div>
          <div class="mt-1.5 flex items-center justify-between">
            <span class="text-xs text-slate-300">Thành công: <b :class="chance(m) >= 60 ? 'text-jade-300' : 'text-gold-300'">{{ chance(m) }}%</b></span>
            <button class="btn-gold min-h-[40px] !px-4 text-xs" :disabled="!canGo(m)" @click="go(m)">Cử đi</button>
          </div>
        </template>
      </div>
    </BottomSheet>
  </div>
</template>
