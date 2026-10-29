<script setup>
// DwellingTab.vue - Động phủ: Tụ Linh Trận (linh thạch) và Luyện Đan (thảo dược + khoáng thạch).
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ITEMS, RECIPES, itemName } from '../../game/data.js'
import { STAGES } from '../../game/constants.js'
import { alchemyDoubleChance, alchemyExpNeeded } from '../../game/formulas.js'
import { fmt, fmtPercent } from '../../game/format.js'
import { FORGE, FORGE_RARITY_WEIGHTS, RARITIES, SLOTS, SLOT_IDS, TIERS, itemFullName } from '../../game/equipment.js'

const forgeTier = ref(0) // phẩm cấp đang chọn ở lò rèn
const lastForged = ref(null)
const rarityOdds = FORGE_RARITY_WEIGHTS.map((w, i) => `${RARITIES[i].name} ${Math.round((w / FORGE_RARITY_WEIGHTS.reduce((a, b) => a + b, 0)) * 100)}%`).join(' · ')

function forge(slot) {
  lastForged.value = game.forge(forgeTier.value, slot)
}

const game = useGameStore()

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
        Nâng cấp - {{ fmt(game.arrayCost) }} linh thạch
      </button>
      <div class="mt-1 text-center text-[11px] text-slate-500">Đang có: {{ fmt(game.spiritStones) }} linh thạch</div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Luyện Đan</div>
        <div class="text-xs text-gold-300">Cấp {{ game.alchemy.level }}</div>
      </div>
      <div class="mt-1 text-[11px] text-slate-400">
        Kinh nghiệm {{ game.alchemy.exp }}/{{ alchemyNeed }} · Ra gấp đôi {{ fmtPercent(alchemyDoubleChance(game.alchemy.level)) }}
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Lò Rèn Pháp Khí</div>
        <div class="text-[11px] text-slate-400">{{ rarityOdds }}</div>
      </div>
      <div class="mt-1.5 flex gap-1">
        <button
          v-for="(r, t) in FORGE"
          :key="t"
          class="flex-1 rounded border px-1 py-1 text-[11px] font-semibold"
          :class="forgeTier === t ? 'border-gold-500/70 bg-gold-500/20 text-gold-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          @click="forgeTier = t"
        >
          Phẩm {{ t + 1 }}
        </button>
      </div>
      <div class="mt-1.5 flex flex-wrap gap-x-3 text-[11px]">
        <span
          v-for="(need, id) in FORGE[forgeTier].ingredients"
          :key="id"
          :class="game.itemCount(id) >= need ? 'text-jade-300' : 'text-cinnabar-400'"
        >
          {{ itemName(id) }} {{ game.itemCount(id) }}/{{ need }}
        </span>
        <span :class="game.spiritStones.gte(FORGE[forgeTier].stones) ? 'text-gold-300' : 'text-cinnabar-400'">
          {{ fmt(FORGE[forgeTier].stones) }} linh thạch
        </span>
      </div>
      <div v-if="game.stageIdx < FORGE[forgeTier].minStage" class="mt-1 text-[11px] text-cinnabar-400">
        🔒 Cần {{ STAGES[FORGE[forgeTier].minStage].fullName }}
      </div>
      <div v-else class="mt-1.5 grid grid-cols-3 gap-1.5">
        <button v-for="slot in SLOT_IDS" :key="slot" class="btn-gold px-1 py-1 text-[11px]" :disabled="!game.canForge(forgeTier)" @click="forge(slot)">
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
        <div class="text-[11px] text-slate-400">Đang có x{{ game.itemCount(r.id) }}</div>
      </div>
      <div class="text-[11px] text-slate-400">{{ ITEMS[r.id].desc }}</div>
      <div class="mt-1 flex flex-wrap gap-x-3 text-[11px]">
        <span
          v-for="(need, id) in r.ingredients"
          :key="id"
          :class="game.itemCount(id) >= need ? 'text-jade-300' : 'text-cinnabar-400'"
        >
          {{ itemName(id) }} {{ game.itemCount(id) }}/{{ need }}
        </span>
        <span :class="game.spiritStones.gte(r.stones) ? 'text-gold-300' : 'text-cinnabar-400'">{{ r.stones }} linh thạch</span>
      </div>
      <div v-if="lockReason(r)" class="mt-1 text-[11px] text-cinnabar-400">🔒 {{ lockReason(r) }}</div>
      <div v-else class="mt-1.5 flex gap-1.5">
        <button class="btn-gold flex-1 py-1 text-xs" :disabled="!game.canCraft(r.id)" @click="game.craft(r.id, 1)">Luyện</button>
        <button class="btn-gold flex-1 py-1 text-xs" :disabled="maxBatches(r) < 2" @click="game.craft(r.id, maxBatches(r))">
          Luyện tối đa ({{ maxBatches(r) }})
        </button>
      </div>
    </div>
  </div>
</template>
