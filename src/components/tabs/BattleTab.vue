<script setup>
// BattleTab.vue - Vượt Ải: ải đang đánh, tiến độ chương, thu nhập thụ động theo ải cao nhất, cày ải cũ.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useBattleStore } from '../../stores/battleStore.js'
import { MONSTERS, itemName } from '../../game/data.js'
import * as C from '../../game/campaign.js'
import { fmt } from '../../game/format.js'
import { ELEMENTS, elementEdge } from '../../game/elements.js'

const game = useGameStore()
const battle = useBattleStore()

const healPills = computed(() => game.itemCount('hoi_huyet_dan'))
const runItems = computed(() => Object.entries(battle.run.items))
const best = computed(() => game.campaign.best)
const target = computed(() => battle.targetAi())
const farming = computed(() => !!game.campaign.farm && game.campaign.farm <= best.value)
const farmInput = ref(Math.max(1, game.campaign.farm ?? best.value))

// Thanh tiến độ của chương đang đánh: 10 ải, đánh dấu Tiểu Boss / Đại Boss
const strip = computed(() => {
  const first = (C.chapterOf(target.value) - 1) * C.AIS_PER_CHAPTER + 1
  return Array.from({ length: C.AIS_PER_CHAPTER }, (_, i) => {
    const n = first + i
    return { n, kind: C.aiKind(n), done: n <= best.value, current: n === target.value }
  })
})
const cellClass = (c) => {
  if (c.current) return 'border-gold-400 bg-gold-500/25 text-gold-200 ring-1 ring-gold-400'
  if (c.done) return 'border-jade-500/50 bg-jade-500/15 text-jade-300'
  return 'border-ink-600 bg-ink-900 text-slate-500'
}
const cellMark = (c) => ({ mini: '◆', big: '★', lord: '♛' })[c.kind] ?? ''

const expIncome = computed(() => {
  const camp = C.campaignExpBonus(best.value)
  return game.expRate.mul(camp / (1 + game.bonus.exp + game.gearStats.exp + camp))
})
const stoneIncome = computed(() => C.campaignStonesPerSecond(best.value))
const itemIncome = computed(() => C.campaignItemsPerHour(best.value))
const nextKind = computed(() => C.aiKind(target.value))
const nextMonster = computed(() => MONSTERS[C.pickAiMonster(target.value, () => 0).id])
const chance = computed(() => Math.round(C.winChance(battle.playerStats(), target.value, 30) * 100))
const chanceClass = computed(() => (chance.value >= 70 ? 'text-jade-300' : chance.value >= 30 ? 'text-gold-300' : 'text-cinnabar-400'))
const chanceBar = computed(() => (chance.value >= 70 ? 'bg-jade-500' : chance.value >= 30 ? 'bg-gold-500' : 'bg-cinnabar-500'))
const edgeMark = computed(() => ({ up: ' ▲', down: ' ▼' })[elementEdge(game.element, nextMonster.value.element)] ?? '')
const stuck = computed(() => !farming.value && chance.value < 30)

function stepFarm(d) {
  farmInput.value = Math.min(Math.max(1, best.value), Math.max(1, (farmInput.value || 1) + d))
}
</script>

<template>
  <div class="space-y-2">
    <!-- Ải đang đánh -->
    <div class="card space-y-1.5">
      <div class="flex items-center justify-between">
        <div class="font-bold text-gold-300">{{ C.chapterName(target) }}</div>
        <div class="text-[11px] text-slate-400">Chương {{ C.chapterOf(target) }}</div>
      </div>
      <div class="grid grid-cols-10 gap-0.5">
        <div
          v-for="c in strip"
          :key="c.n"
          class="flex h-8 flex-col items-center justify-center rounded border text-[10px] leading-none"
          :class="cellClass(c)"
        >
          <span class="text-[9px] text-cinnabar-400">{{ cellMark(c) || '&nbsp;' }}</span>
          <span>{{ c.n }}</span>
        </div>
      </div>
      <div class="text-sm text-white">
        <span v-if="farming" class="mr-1 rounded bg-gold-500/30 px-1 text-[11px] text-gold-200">Cày</span>
        Ải {{ target }} · {{ C.AI_KINDS[nextKind].name }}: {{ nextMonster.name }}
        <span :style="{ color: ELEMENTS[nextMonster.element].css }">({{ ELEMENTS[nextMonster.element].name }}{{ edgeMark }})</span>
      </div>
      <div>
        <div class="mb-0.5 flex items-center justify-between text-xs text-slate-300">
          <span>Tỉ lệ thắng ước tính</span>
          <b :class="chanceClass">{{ chance }}%</b>
        </div>
        <div class="h-1.5 overflow-hidden rounded bg-ink-900"><div class="h-full transition-all" :class="chanceBar" :style="{ width: chance + '%' }"></div></div>
        <div v-if="game.campaign.grit > 0" class="mt-0.5 text-[11px] text-jade-300">Kiên Trì +{{ Math.round(game.campaign.grit * C.GRIT_STEP * 100) }}% chỉ số (mất khi vượt ải)</div>
      </div>
      <div v-if="stuck" class="rounded border border-gold-500/30 bg-gold-500/10 p-1.5 text-[11px] leading-snug text-gold-200">
        Đang kẹt ở ải {{ best }}. Muốn qua ải {{ target }}: đột phá cảnh giới, mặc trang bị tốt hơn, học công pháp, dùng đan tăng chỉ số. Trong lúc đó vẫn nhận thu nhập của ải {{ best }}.
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn-jade" :disabled="!battle.inFight || healPills < 1 || battle.hp >= battle.maxHp" @click="battle.useHealPill()">
          Hồi Huyết Đan ({{ healPills }})
        </button>
        <label class="card flex items-center justify-between py-2 text-xs">
          <span>Tự chiến đấu</span>
          <input v-model="game.settings.autoRepeat" type="checkbox" class="h-4 w-4 accent-emerald-500" />
        </label>
      </div>
      <label class="flex items-center justify-between text-xs text-slate-300">
        <span>Tự dùng Hồi Huyết Đan khi dưới 35%</span>
        <input v-model="game.settings.autoHeal" type="checkbox" class="h-4 w-4 accent-emerald-500" />
      </label>
    </div>

    <!-- Thu nhập thụ động -->
    <div class="card space-y-0.5 text-xs">
      <div class="flex items-center justify-between">
        <div class="font-semibold text-slate-200">Thu nhập thụ động</div>
        <div class="text-slate-400">Ải cao nhất: <b class="text-white">{{ best }}</b> · Kỷ lục: {{ game.campaign.record }}</div>
      </div>
      <template v-if="best > 0">
        <div class="text-jade-300">+{{ Math.round(C.campaignExpBonus(best) * 100) }}% tốc độ linh khí (≈ +{{ fmt(expIncome) }}/giây)</div>
        <div class="text-gold-300">+{{ fmt(stoneIncome) }} linh thạch/giây</div>
        <div v-if="itemIncome.length" class="text-slate-300">
          Mỗi giờ:
          <span v-for="(it, i) in itemIncome" :key="it.id">{{ i ? ', ' : '' }}{{ itemName(it.id) }} ~{{ it.perHour.toFixed(1) }}</span>
        </div>
      </template>
      <div v-else class="text-slate-400">Vượt ải đầu tiên để bắt đầu nhận thu nhập. Mỗi ải vượt thêm làm thu nhập tăng lên.</div>
    </div>

    <!-- Cày ải đã vượt -->
    <div class="card space-y-1.5 text-xs">
      <div class="font-semibold text-slate-200">Cày ải đã vượt (cày tàn quyển, trang bị)</div>
      <div v-if="farming" class="text-gold-300">Đang cày ải {{ game.campaign.farm }}, không tiến lên.</div>
      <div v-else class="text-slate-400">Đang tiến lên. Chọn một ải đã vượt để đánh lặp lại.</div>
      <div class="flex items-center gap-1.5">
        <button class="btn-ghost !px-2.5" :disabled="best < 1" @click="stepFarm(-1)">−</button>
        <input v-model.number="farmInput" type="number" min="1" :max="Math.max(1, best)" class="w-16 rounded border border-ink-600 bg-ink-900 px-2 py-1 text-center text-white" />
        <button class="btn-ghost !px-2.5" :disabled="best < 1" @click="stepFarm(1)">+</button>
        <button class="btn-gold flex-1" :disabled="best < 1" @click="battle.setFarm(Math.min(best, Math.max(1, farmInput || 1)))">Cày ải này</button>
        <button class="btn-ghost" :disabled="!farming" @click="battle.setFarm(null)">Tiến lên</button>
      </div>
    </div>

    <!-- Thu hoạch -->
    <div class="rounded bg-ink-900 p-2 text-xs text-slate-300">
      <div class="mb-0.5 font-semibold text-slate-200">Thu hoạch từ lúc mở game</div>
      <div>Hạ {{ battle.run.kills }} yêu thú · <span class="text-gold-300">+{{ fmt(battle.run.stones) }} linh thạch</span></div>
      <div v-if="battle.run.gear.length" class="text-gold-300">Trang bị: {{ battle.run.gear.slice(-5).join(', ') }}</div>
      <div v-if="runItems.length" class="text-jade-300">
        <span v-for="([id, n], i) in runItems" :key="id">{{ i ? ', ' : '' }}{{ itemName(id) }} x{{ n }}</span>
      </div>
    </div>
  </div>
</template>
