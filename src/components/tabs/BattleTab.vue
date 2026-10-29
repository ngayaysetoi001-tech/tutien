<script setup>
// BattleTab.vue - Vượt Ải: theo dõi ải đang đánh, thu nhập thụ động theo ải cao nhất, cày ải cũ.
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
const farmInput = ref(1)

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
const edgeMark = computed(() => ({ up: ' ▲', down: ' ▼' })[elementEdge(game.element, nextMonster.value.element)] ?? '')
</script>

<template>
  <div class="space-y-2">
    <!-- Ải đang đánh -->
    <div class="card space-y-1.5">
      <div class="flex items-center justify-between">
        <div class="font-bold text-gold-300">{{ C.chapterName(target) }}</div>
        <div class="text-xs text-slate-300">Chương {{ C.chapterOf(target) }}</div>
      </div>
      <div class="text-sm text-white">
        Ải {{ target }} · {{ C.AI_KINDS[nextKind].name }}: {{ nextMonster.name }}
        <span :style="{ color: ELEMENTS[nextMonster.element].css }">({{ ELEMENTS[nextMonster.element].name }}{{ edgeMark }})</span>
      </div>
      <div class="text-xs text-slate-300">
        Tỉ lệ thắng ước tính: <b :class="chanceClass">{{ chance }}%</b>
        <span v-if="game.campaign.grit > 0" class="text-jade-300"> · Kiên Trì +{{ Math.round(game.campaign.grit * C.GRIT_STEP * 100) }}%</span>
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
      <label class="flex items-center justify-between text-xs">
        <span>Tự dùng đan hồi</span>
        <input v-model="game.settings.autoHeal" type="checkbox" class="h-4 w-4 accent-emerald-500" />
      </label>
    </div>

    <!-- Thu nhập thụ động -->
    <div class="card space-y-0.5 text-xs">
      <div class="font-semibold text-slate-200">Thu nhập thụ động (ải cao nhất đã vượt: {{ best }})</div>
      <template v-if="best > 0">
        <div class="text-jade-300">+{{ Math.round(C.campaignExpBonus(best) * 100) }}% tốc độ linh khí (≈ +{{ fmt(expIncome) }}/giây)</div>
        <div class="text-gold-300">+{{ fmt(stoneIncome) }} linh thạch/giây</div>
        <div v-if="itemIncome.length" class="text-slate-300">
          Mỗi giờ:
          <span v-for="(it, i) in itemIncome" :key="it.id">{{ i ? ', ' : '' }}{{ itemName(it.id) }} ~{{ it.perHour.toFixed(1) }}</span>
        </div>
      </template>
      <div v-else class="text-slate-400">Vượt ải đầu tiên để bắt đầu nhận thu nhập.</div>
      <div class="text-slate-500">Kỷ lục mọi kiếp: ải {{ game.campaign.record }}</div>
    </div>

    <!-- Cày ải đã vượt -->
    <div class="card space-y-1.5 text-xs">
      <div class="font-semibold text-slate-200">Cày ải đã vượt</div>
      <div v-if="farming" class="text-gold-300">Đang cày ải {{ game.campaign.farm }} (không tiến lên).</div>
      <div v-else class="text-slate-400">Đang tiến lên: thua thì dừng ở ải {{ best }}, vẫn nhận thu nhập của ải này.</div>
      <div class="flex gap-2">
        <input v-model.number="farmInput" type="number" min="1" :max="Math.max(1, best)" class="w-20 rounded border border-ink-600 bg-ink-900 px-2 py-1 text-white" />
        <button class="btn-gold flex-1" :disabled="best < 1" @click="battle.setFarm(Math.min(best, Math.max(1, farmInput || 1)))">Cày ải này</button>
        <button class="btn-ghost" :disabled="!farming" @click="battle.setFarm(null)">Tiến lên</button>
      </div>
    </div>

    <!-- Thu hoạch -->
    <div class="rounded bg-ink-900 p-2 text-xs text-slate-300">
      <div class="mb-0.5 font-semibold text-slate-200">Thu hoạch phiên này</div>
      <div>Hạ {{ battle.run.kills }} yêu thú · <span class="text-gold-300">+{{ fmt(battle.run.stones) }} linh thạch</span></div>
      <div v-if="battle.run.gear.length" class="text-gold-300">Trang bị: {{ battle.run.gear.slice(-5).join(', ') }}</div>
      <div v-if="runItems.length" class="text-jade-300">
        <span v-for="([id, n], i) in runItems" :key="id">{{ i ? ', ' : '' }}{{ itemName(id) }} x{{ n }}</span>
      </div>
    </div>
  </div>
</template>
