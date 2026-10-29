<script setup>
// BattleTab.vue - Bí Cảnh: chọn bí cảnh, theo dõi lượt đi, điều khiển tự động lặp / tự dùng đan.
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useBattleStore } from '../../stores/battleStore.js'
import { DUNGEONS, MONSTERS, itemName } from '../../game/data.js'
import { STAGES } from '../../game/constants.js'
import { fmt } from '../../game/format.js'
import { ELEMENTS, elementEdge } from '../../game/elements.js'

/** Các hệ yêu thú trong bí cảnh (không trùng). */
const dungeonElements = (d) => [...new Set([...d.monsters, d.boss].map((id) => MONSTERS[id].element))]
const edgeMark = (el) => ({ up: '▲', down: '▼' })[elementEdge(game.element, el)] ?? ''

const game = useGameStore()
const battle = useBattleStore()

const healPills = computed(() => game.itemCount('hoi_huyet_dan'))
const runItems = computed(() => Object.entries(battle.run.items))

function unlocked(d) {
  return game.stageIdx >= d.minStage
}
const record = (d) => game.dungeons[d.id] ?? { best: 0, clears: 0, grit: 0 }
</script>

<template>
  <div class="space-y-2">
    <!-- Đang trong bí cảnh -->
    <div v-if="battle.active" class="card space-y-2">
      <div class="flex items-center justify-between">
        <div class="font-bold text-gold-300">{{ battle.dungeon.name }}</div>
        <div class="text-xs text-slate-300">
          <template v-if="battle.phase === 'resting'">{{ battle.lastResult === 'clear' ? 'Đã thông quan' : 'Đang hồi phục' }}</template>
          <template v-else>Tầng {{ battle.floor }}/{{ battle.dungeon.floors }}</template>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn-jade" :disabled="!battle.inFight || healPills < 1 || battle.hp >= battle.maxHp" @click="battle.useHealPill()">
          Hồi Huyết Đan ({{ healPills }})
        </button>
        <button class="btn-danger" @click="battle.retreat()">Rút lui</button>
      </div>
      <div class="rounded bg-ink-900 p-2 text-xs text-slate-300">
        <div class="mb-0.5 font-semibold text-slate-200">Thu hoạch lượt này</div>
        <div>Hạ {{ battle.run.kills }} yêu thú · <span class="text-gold-300">+{{ fmt(battle.run.stones) }} linh thạch</span></div>
        <div v-if="battle.run.gear.length" class="text-gold-300">Trang bị: {{ battle.run.gear.join(', ') }}</div>
        <div v-if="runItems.length" class="text-jade-300">
          <span v-for="([id, n], i) in runItems" :key="id">{{ i ? ', ' : '' }}{{ itemName(id) }} x{{ n }}</span>
        </div>
      </div>
    </div>

    <!-- Tuỳ chọn -->
    <div class="grid grid-cols-2 gap-2 text-xs">
      <label class="card flex items-center justify-between py-2">
        <span>Tự động lặp</span>
        <input v-model="game.settings.autoRepeat" type="checkbox" class="h-4 w-4 accent-emerald-500" />
      </label>
      <label class="card flex items-center justify-between py-2">
        <span>Tự dùng đan hồi</span>
        <input v-model="game.settings.autoHeal" type="checkbox" class="h-4 w-4 accent-emerald-500" />
      </label>
    </div>

    <!-- Danh sách bí cảnh -->
    <div v-for="d in DUNGEONS" :key="d.id" class="card" :class="{ 'opacity-60': !unlocked(d) }">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">{{ d.name }}</div>
        <div class="text-[11px]" :class="unlocked(d) ? 'text-slate-400' : 'text-cinnabar-400'">
          {{ unlocked(d) ? `Tầng cao nhất ${record(d).best}/${d.floors} · Thông quan ${record(d).clears}` : '🔒 Cần ' + STAGES[d.minStage].fullName }}
        </div>
      </div>
      <p class="mt-0.5 text-xs text-slate-400">{{ d.desc }} Boss: {{ MONSTERS[d.boss].name }}.</p>
      <div v-if="record(d).grit > 0" class="mt-0.5 text-[11px] text-jade-300">
        Kiên Trì +{{ Math.round(record(d).grit * 5) }}% chỉ số (sau mỗi lần tử trận, mất khi hạ boss)
      </div>
      <div class="mt-0.5 flex gap-2 text-[11px]">
        <span class="text-slate-500">Hệ yêu thú:</span>
        <span v-for="el in dungeonElements(d)" :key="el" :style="{ color: ELEMENTS[el].css }">
          {{ ELEMENTS[el].name }}<span :class="elementEdge(game.element, el) === 'up' ? 'text-jade-300' : 'text-cinnabar-400'">{{ edgeMark(el) }}</span>
        </span>
      </div>
      <button
        class="btn-gold mt-2 w-full"
        :disabled="!unlocked(d) || battle.inFight || game.tribulation.active"
        @click="battle.enter(d.id)"
      >
        Tiến vào
      </button>
    </div>
  </div>
</template>
