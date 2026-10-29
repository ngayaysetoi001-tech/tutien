<script setup>
// EquipmentTab.vue - Trang bị: 3 ô đang mặc, túi trang bị, cường hoá, phân giải.
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import {
  BAG_LIMIT, LEGENDS, MAX_ENHANCE, SLOTS, SLOT_IDS, affixCount, affixText, enhanceCost, itemColor, itemFullName, itemStats, perkText,
  rerollCost, sellValue, statsText,
} from '../../game/equipment.js'
import { fmt } from '../../game/format.js'

const game = useGameStore()

const isEquipped = (uid) => Object.values(game.gear.equipped).includes(uid)
// Túi sắp theo phẩm cấp rồi độ hiếm giảm dần
const sortedBag = computed(() => [...game.gear.bag].sort((a, b) => b.tier - a.tier || b.rarity - a.rarity || b.enh - a.enh))
const equipped = computed(() => SLOT_IDS.map((slot, i) => [slot, game.equippedItems[i]]))
const canEnhance = (it) => it.enh < MAX_ENHANCE && game.spiritStones.gte(enhanceCost(it))
const canReroll = (it) => !it.legend && affixCount(it.rarity) > 0
const legendText = (it) => LEGENDS[it.legend]?.text
</script>

<template>
  <div class="space-y-2">
    <div v-if="game.activeGearSets.length" class="card space-y-0.5 text-[11px]">
      <div class="title-rule mb-1">Bộ trang bị</div>
      <div v-for="set in game.activeGearSets" :key="set.name" class="text-slate-300">
        <b class="text-jade-300">Bộ {{ set.name }} ({{ set.pieces }}/3)</b>: {{ perkText(set.bonus) }}
      </div>
    </div>

    <div class="card">
      <div class="title-rule mb-1.5">Đang mặc</div>
      <div class="space-y-1">
        <div v-for="[slot, item] in equipped" :key="slot" class="rounded bg-ink-900 px-2 py-1.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">{{ SLOTS[slot] }}</span>
            <button v-if="item" class="btn-ghost px-2 py-0.5 text-[11px]" @click="game.unequipGear(slot)">Tháo</button>
          </div>
          <template v-if="item">
            <div class="font-bold" :style="{ color: itemColor(item) }">{{ itemFullName(item) }}</div>
            <div class="text-[11px] text-slate-400">{{ statsText(itemStats(item)) }}</div>
            <div v-if="item.legend" class="text-[11px] text-pink-300">{{ legendText(item) }}</div>
            <div v-else-if="item.affixes?.length" class="text-[11px] text-jade-300">{{ affixText(item) }}</div>
          </template>
          <div v-else class="text-slate-600">Trống</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="mb-1 flex items-center justify-between text-xs font-bold text-slate-300">
        <span>Túi trang bị</span><span class="text-slate-500">{{ game.gear.bag.length }}/{{ BAG_LIMIT }}</span>
      </div>
      <div v-if="sortedBag.length === 0" class="text-xs text-slate-500">
        Trống. Hạ boss ở màn Vượt Ải hoặc rèn pháp khí ở Động Phủ để có trang bị.
      </div>
      <div class="space-y-1">
        <div v-for="it in sortedBag" :key="it.uid" class="rounded bg-ink-900 px-2 py-1.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="font-bold" :style="{ color: itemColor(it) }">{{ itemFullName(it) }}</span>
            <span class="text-[10px] text-slate-500">{{ SLOTS[it.slot] }}{{ isEquipped(it.uid) ? ' · đang mặc' : '' }}</span>
          </div>
          <div class="text-[11px] text-slate-400">{{ statsText(itemStats(it)) }}</div>
          <div v-if="it.legend" class="text-[11px] text-pink-300">{{ legendText(it) }}</div>
          <div v-else-if="it.affixes?.length" class="text-[11px] text-jade-300">{{ affixText(it) }}</div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            <button v-if="!isEquipped(it.uid)" class="btn-jade px-2 py-1 text-[11px]" @click="game.equipGear(it.uid)">Trang bị</button>
            <button class="btn-gold px-2 py-1 text-[11px]" :disabled="!canEnhance(it)" @click="game.enhanceGear(it.uid)">
              {{ it.enh >= MAX_ENHANCE ? 'Tối đa' : `Cường hoá ${fmt(enhanceCost(it))}` }}
            </button>
            <button v-if="canReroll(it)" class="btn-ghost px-2 py-1 text-[11px]" :disabled="game.spiritStones.lt(rerollCost(it))" @click="game.rerollAffixes(it.uid)">
              Đổi dòng phụ {{ fmt(rerollCost(it)) }}
            </button>
            <button v-if="!isEquipped(it.uid)" class="btn-ghost px-2 py-1 text-[11px]" @click="game.sellGear(it.uid)">
              Phân giải +{{ fmt(sellValue(it)) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
