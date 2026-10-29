<script setup>
// InventoryTab.vue - Túi đồ: dùng đan, lĩnh ngộ tàn quyển, bán vật phẩm lấy linh thạch.
import { useGameStore } from '../../stores/gameStore.js'
import { INVENTORY_GROUPS } from '../../game/constants.js'
import { ITEMS } from '../../game/data.js'
import { fmt } from '../../game/format.js'
import Icon from '../Icon.vue'

const GROUP_ICON = { herbs: 'herb', ores: 'stone', scrolls: 'scroll', pills: 'pill' }

const game = useGameStore()

const usable = (id) => ITEMS[id].effect && ITEMS[id].effect.type !== 'heal'
const need = (id) => ITEMS[id].useCost ?? 1
const canUse = (id) => game.itemCount(id) >= need(id) && !game.tribulation.active
const useLabel = (id) => (ITEMS[id].group === 'scrolls' ? `Lĩnh ngộ (${need(id)})` : 'Dùng')
const entries = (group) => Object.entries(game.inventory[group])
</script>

<template>
  <div class="space-y-2">
    <div class="card flex items-center justify-between">
      <span class="flex items-center gap-1.5 text-sm text-slate-300"><Icon name="stone" :size="16" class="text-gold-400" />Linh thạch</span>
      <b class="text-gold-300">{{ fmt(game.spiritStones) }}</b>
    </div>

    <div v-if="game.buffs.success > 0 || game.buffs.guard > 0" class="card text-xs text-gold-300">
      <div v-if="game.buffs.success > 0">✦ Phá Cảnh: +{{ Math.round(game.buffs.success * 100) }}% đột phá lần kế</div>
      <div v-if="game.buffs.guard > 0">✦ Hộ Kiếp: -{{ Math.round(game.buffs.guard * 100) }}% sát thương lôi lần kế</div>
    </div>

    <div v-for="group in INVENTORY_GROUPS" :key="group.key" class="card">
      <div class="title-rule mb-1.5"><Icon :name="GROUP_ICON[group.key]" :size="14" />{{ group.label }}</div>
      <div v-if="entries(group.key).length === 0" class="text-xs text-slate-500">Trống</div>
      <div v-else class="space-y-1">
        <div v-for="[id, count] in entries(group.key)" :key="id" class="rounded bg-ink-900 px-2 py-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-slate-100">{{ ITEMS[id].name }} <b class="text-jade-300">x{{ count }}</b></span>
            <span class="text-[11px] text-slate-500">bán {{ ITEMS[id].sell }}</span>
          </div>
          <div class="text-[11px] text-slate-400">{{ ITEMS[id].desc }}</div>
          <div class="mt-1 flex gap-1.5">
            <button v-if="usable(id)" class="btn-jade px-2 py-1 text-[11px]" :disabled="!canUse(id)" @click="game.useItem(id, 1)">
              {{ useLabel(id) }}
            </button>
            <button
              v-if="usable(id) && count >= need(id) * 2"
              class="btn-jade px-2 py-1 text-[11px]"
              :disabled="!canUse(id)"
              @click="game.useItem(id, Math.floor(count / need(id)))"
            >
              Dùng hết
            </button>
            <button class="btn-ghost px-2 py-1 text-[11px]" @click="game.sellItem(id, 1)">Bán 1</button>
            <button v-if="count > 1" class="btn-ghost px-2 py-1 text-[11px]" @click="game.sellItem(id, count)">Bán hết</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
