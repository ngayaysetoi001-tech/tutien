<script setup>
// EquipmentTab.vue - Trang bị: 3 ô đang mặc, túi trang bị, cường hoá, phân giải.
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import {
  BAG_LIMIT, MAX_ENHANCE, RARITIES, SLOTS, SLOT_IDS, enhanceCost, itemFullName, itemStats, sellValue, statsText,
} from '../../game/equipment.js'
import { fmt } from '../../game/format.js'

const game = useGameStore()

const isEquipped = (uid) => Object.values(game.gear.equipped).includes(uid)
// Túi sắp theo phẩm cấp rồi độ hiếm giảm dần
const sortedBag = computed(() => [...game.gear.bag].sort((a, b) => b.tier - a.tier || b.rarity - a.rarity || b.enh - a.enh))
const equipped = computed(() => SLOT_IDS.map((slot, i) => [slot, game.equippedItems[i]]))
const canEnhance = (it) => it.enh < MAX_ENHANCE && game.spiritStones.gte(enhanceCost(it))
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="title-rule mb-1.5">Đang mặc</div>
      <div class="space-y-1">
        <div v-for="[slot, item] in equipped" :key="slot" class="rounded bg-ink-900 px-2 py-1.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">{{ SLOTS[slot] }}</span>
            <button v-if="item" class="btn-ghost px-2 py-0.5 text-[11px]" @click="game.unequipGear(slot)">Tháo</button>
          </div>
          <template v-if="item">
            <div class="font-bold" :style="{ color: RARITIES[item.rarity].css }">{{ itemFullName(item) }}</div>
            <div class="text-[11px] text-slate-400">{{ statsText(itemStats(item)) }}</div>
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
            <span class="font-bold" :style="{ color: RARITIES[it.rarity].css }">{{ itemFullName(it) }}</span>
            <span class="text-[10px] text-slate-500">{{ SLOTS[it.slot] }}{{ isEquipped(it.uid) ? ' · đang mặc' : '' }}</span>
          </div>
          <div class="text-[11px] text-slate-400">{{ statsText(itemStats(it)) }}</div>
          <div class="mt-1 flex gap-1.5">
            <button v-if="!isEquipped(it.uid)" class="btn-jade px-2 py-1 text-[11px]" @click="game.equipGear(it.uid)">Trang bị</button>
            <button class="btn-gold px-2 py-1 text-[11px]" :disabled="!canEnhance(it)" @click="game.enhanceGear(it.uid)">
              {{ it.enh >= MAX_ENHANCE ? 'Tối đa' : `Cường hoá ${fmt(enhanceCost(it))}` }}
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
