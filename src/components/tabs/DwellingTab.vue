<script setup>
// DwellingTab.vue - Động phủ: Tụ Linh Trận (linh thạch) và Luyện Đan (thảo dược + khoáng thạch).
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ITEMS, RECIPES, itemName } from '../../game/data.js'
import { STAGES } from '../../game/constants.js'
import { alchemyDoubleChance, alchemyExpNeeded } from '../../game/formulas.js'
import { fmt, fmtPercent } from '../../game/format.js'
import { BUILDINGS, BUILDING_IDS, BUILDING_MAX_LEVEL, buildingCost, buildingNeedStage } from '../../game/dwelling.js'
import Icon from '../Icon.vue'
import { FORGE, FORGE_RARITY_WEIGHTS, RARITIES, SLOTS, SLOT_IDS, TIERS, itemFullName } from '../../game/equipment.js'

const forgeTier = ref(0) // phẩm cấp đang chọn ở lò rèn
const lastForged = ref(null)
const rarityOdds = FORGE_RARITY_WEIGHTS.map((w, i) => `${RARITIES[i].name} ${Math.round((w / FORGE_RARITY_WEIGHTS.reduce((a, b) => a + b, 0)) * 100)}%`).join(' · ')

function forge(slot) {
  lastForged.value = game.forge(forgeTier.value, slot)
}

const game = useGameStore()

const buildingLocked = (id) => game.stageIdx < buildingNeedStage(id, game.dwelling[id])
const canBuild = (id) => game.dwelling[id] < BUILDING_MAX_LEVEL && !buildingLocked(id) && game.spiritStones.gte(buildingCost(id, game.dwelling[id]))

const alchemyNeed = computed(() => alchemyExpNeeded(game.alchemy.level))

/** Lý do chưa luyện được (null nếu mở khoá). */
function lockReason(r) {
  if (game.stageIdx < r.minStage) return 'Cần ' + STAGES[r.minStage].fullName
  if (game.alchemy.level < r.minAlchemy) return `Cần Luyện Đan cấp ${r.minAlchemy}`
  return null
}

/** Số lò tối đa luyện được với nguyên liệu và linh thạch hiện có. */
function maxBatches(r) {
  let n = Infinity
  for (const [id, need] of Object.entries(r.ingredients)) n = Math.min(n, Math.floor(game.itemCount(id) / need))
  const stones = game.spiritStones.div(r.stones).floor().toNumber()
  return Math.max(0, Math.min(n, stones, 99))
}
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Tụ Linh Trận</div>
        <div class="text-xs text-jade-300">Cấp {{ game.arrayLevel }}</div>
      </div>
      <p class="mt-1 text-xs text-slate-400">
        Hội tụ linh khí thiên địa về động phủ, tăng tốc độ hấp thụ linh khí. Hiện tại: {{ fmt(game.expRate) }} linh khí/giây.
      </p>
      <button class="btn-jade mt-2 w-full" :disabled="!game.canUpgradeArray" @click="game.upgradeArray()">
        Nâng cấp <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(game.arrayCost) }}
      </button>
      <div class="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500">Đang có <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(game.spiritStones) }}</div>
    </div>

    <div class="card space-y-1.5">
      <div class="title-rule">Công trình (giữ khi luân hồi)</div>
      <div v-for="id in BUILDING_IDS" :key="id" class="rounded bg-ink-900 p-1.5 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-bold text-white">{{ BUILDINGS[id].name }}</span>
          <span class="text-gold-300">Cấp {{ game.dwelling[id] }}/{{ BUILDING_MAX_LEVEL }}</span>
        </div>
        <div class="text-xs text-slate-400">{{ BUILDINGS[id].text }}</div>
        <button class="btn-gold mt-1 w-full py-1 text-xs" :disabled="!canBuild(id)" @click="game.upgradeBuilding(id)">
          <template v-if="game.dwelling[id] >= BUILDING_MAX_LEVEL">Tối đa</template>
          <template v-else-if="buildingLocked(id)">{{ `Cần ${STAGES[buildingNeedStage(id, game.dwelling[id])].fullName}` }}</template>
          <template v-else>Nâng cấp <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(buildingCost(id, game.dwelling[id])) }}</template>
        </button>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Luyện Đan</div>
        <div class="text-xs text-gold-300">Cấp {{ game.alchemy.level }}</div>
      </div>
      <div class="mt-1 text-xs text-slate-400">
        Kinh nghiệm {{ game.alchemy.exp }}/{{ alchemyNeed }} · Ra gấp đôi {{ fmtPercent(alchemyDoubleChance(game.alchemy.level)) }}
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Lò Rèn Pháp Khí</div>
        <div class="text-xs text-slate-400">{{ rarityOdds }}</div>
      </div>
      <div class="mt-1.5 flex gap-1">
        <button
          v-for="(r, t) in FORGE"
          :key="t"
          class="flex-1 rounded border px-1 py-1 text-xs font-semibold"
          :class="forgeTier === t ? 'border-gold-500/70 bg-gold-500/20 text-gold-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          @click="forgeTier = t"
        >
          Phẩm {{ t + 1 }}
        </button>
      </div>
      <div class="mt-1.5 flex flex-wrap gap-x-3 text-xs">
        <span
          v-for="(need, id) in FORGE[forgeTier].ingredients"
          :key="id"
          :class="game.itemCount(id) >= need ? 'text-jade-300' : 'text-cinnabar-400'"
        >
          {{ itemName(id) }} {{ game.itemCount(id) }}/{{ need }}
        </span>
        <span class="inline-flex items-center gap-1" :class="game.spiritStones.gte(FORGE[forgeTier].stones) ? 'text-gold-300' : 'text-cinnabar-400'">
          <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(FORGE[forgeTier].stones) }}
        </span>
      </div>
      <div v-if="game.stageIdx < FORGE[forgeTier].minStage" class="mt-1 text-xs text-cinnabar-400">
        🔒 Cần {{ STAGES[FORGE[forgeTier].minStage].fullName }}
      </div>
      <div v-else class="mt-1.5 grid grid-cols-3 gap-1.5">
        <button v-for="slot in SLOT_IDS" :key="slot" class="btn-gold px-1 py-1 text-xs" :disabled="!game.canForge(forgeTier)" @click="forge(slot)">
          {{ TIERS[forgeTier].names[slot] }}
        </button>
      </div>
      <div v-if="lastForged" class="mt-1.5 text-center text-xs">
        Vừa rèn: <b :style="{ color: RARITIES[lastForged.rarity].css }">{{ itemFullName(lastForged) }}</b>
        <span class="text-slate-500">({{ SLOTS[lastForged.slot] }})</span>
      </div>
    </div>

    <div v-for="r in RECIPES" :key="r.id" class="card" :class="{ 'opacity-60': lockReason(r) }">
      <div class="flex items-center justify-between">
        <div class="text-sm font-bold text-white">{{ ITEMS[r.id].name }}</div>
        <div class="text-xs text-slate-400">Đang có x{{ game.itemCount(r.id) }}</div>
      </div>
      <div class="text-xs text-slate-400">{{ ITEMS[r.id].desc }}</div>
      <div class="mt-1 flex flex-wrap gap-x-3 text-xs">
        <span
          v-for="(need, id) in r.ingredients"
          :key="id"
          :class="game.itemCount(id) >= need ? 'text-jade-300' : 'text-cinnabar-400'"
        >
          {{ itemName(id) }} {{ game.itemCount(id) }}/{{ need }}
        </span>
        <span :class="game.spiritStones.gte(r.stones) ? 'text-gold-300' : 'text-cinnabar-400'">{{ r.stones }} linh thạch</span>
      </div>
      <div v-if="lockReason(r)" class="mt-1 text-xs text-cinnabar-400">🔒 {{ lockReason(r) }}</div>
      <div v-else class="mt-1.5 flex gap-1.5">
        <button class="btn-gold flex-1 py-1 text-xs" :disabled="!game.canCraft(r.id)" @click="game.craft(r.id, 1)">Luyện</button>
        <button class="btn-gold flex-1 py-1 text-xs" :disabled="maxBatches(r) < 2" @click="game.craft(r.id, maxBatches(r))">
          Luyện tối đa ({{ maxBatches(r) }})
        </button>
      </div>
    </div>
  </div>
</template>
