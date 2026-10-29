<script setup>
// EquipmentTab.vue - Trang bị: 3 ô đang mặc, túi trang bị (lưới biểu tượng), chi tiết + cường hoá / phân giải trong bảng trượt.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import {
  BAG_LIMIT, LEGENDS, MAX_ENHANCE, SLOTS, SLOT_IDS, affixCount, affixText, enhanceCost, itemColor, itemFullName, itemStats, perkText,
  rerollCost, sellValue, statsText,
} from '../../game/equipment.js'
import { fmt } from '../../game/format.js'
import { SLOT_GLYPH } from '../glyphs.js'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

const game = useGameStore()
const sel = ref(null) // uid đang xem

const isEquipped = (uid) => Object.values(game.gear.equipped).includes(uid)
// Túi sắp theo phẩm cấp rồi độ hiếm giảm dần
const sortedBag = computed(() => [...game.gear.bag].sort((a, b) => b.tier - a.tier || b.rarity - a.rarity || b.enh - a.enh))
const equipped = computed(() => SLOT_IDS.map((slot, i) => [slot, game.equippedItems[i]]))
const canEnhance = (it) => it.enh < MAX_ENHANCE && game.spiritStones.gte(enhanceCost(it))
const canReroll = (it) => !it.legend && affixCount(it.rarity) > 0
const legendText = (it) => LEGENDS[it.legend]?.text
const item = computed(() => (sel.value ? game.gear.bag.find((x) => x.uid === sel.value) ?? null : null))
// Món bị phân giải / không còn trong túi thì bảng tự đóng
const open = computed(() => !!item.value)
</script>

<template>
  <div class="space-y-3">
    <div v-if="game.activeGearSets.length" class="space-y-0.5 text-xs">
      <div v-for="set in game.activeGearSets" :key="set.name" class="rounded-lg border border-jade-500/30 bg-jade-500/10 px-2 py-1 text-slate-300">
        <b class="text-jade-300">Bộ {{ set.name }} ({{ set.pieces }}/3)</b>: {{ perkText(set.bonus) }}
      </div>
    </div>

    <div>
      <div class="mb-1.5 text-sm font-bold text-gold-300">Đang mặc</div>
      <div class="grid grid-cols-3 gap-3">
        <ItemIcon
          v-for="[slot, it] in equipped"
          :key="slot"
          :glyph="SLOT_GLYPH[slot]"
          :color="it ? itemColor(it) : '#475569'"
          :frame="it ? itemColor(it) : ''"
          :dim="!it"
          :label="it ? SLOTS[slot] : SLOTS[slot] + ' (trống)'"
          :badge="it && it.enh ? '+' + it.enh : ''"
          @click="it && (sel = it.uid)"
        />
      </div>
    </div>

    <div>
      <div class="mb-1.5 flex items-center justify-between text-sm font-bold text-gold-300">
        <span>Túi trang bị</span><span class="text-xs font-normal text-slate-500">{{ game.gear.bag.length }}/{{ BAG_LIMIT }}</span>
      </div>
      <p v-if="sortedBag.length === 0" class="text-sm text-slate-500">Trống. Hạ boss ở Vượt Ải hoặc rèn pháp khí ở Động Phủ để có trang bị.</p>
      <div class="grid grid-cols-4 gap-x-2 gap-y-3">
        <ItemIcon
          v-for="it in sortedBag"
          :key="it.uid"
          :glyph="SLOT_GLYPH[it.slot]"
          :color="itemColor(it)"
          :frame="itemColor(it)"
          :label="SLOTS[it.slot]"
          :badge="it.enh ? '+' + it.enh : ''"
          :selected="isEquipped(it.uid)"
          @click="sel = it.uid"
        />
      </div>
      <p class="mt-2 text-xs text-slate-500">Màu viền = độ hiếm · viền sáng = đang mặc.</p>
    </div>

    <BottomSheet :open="open" :title="item ? itemFullName(item) : ''" :glyph="item ? SLOT_GLYPH[item.slot] : ''" :color="item ? itemColor(item) : undefined" @close="sel = null">
      <template v-if="item">
        <div class="mb-1 text-xs text-slate-500">{{ SLOTS[item.slot] }}{{ isEquipped(item.uid) ? ' · đang mặc' : '' }}</div>
        <div class="text-slate-100">{{ statsText(itemStats(item)) }}</div>
        <div v-if="item.legend" class="mt-1 text-pink-300">{{ legendText(item) }}</div>
        <div v-else-if="item.affixes?.length" class="mt-1 text-jade-300">{{ affixText(item) }}</div>
        <button
          v-if="canReroll(item)"
          class="btn-ghost mt-3 min-h-[44px] w-full"
          :disabled="game.spiritStones.lt(rerollCost(item))"
          @click="game.rerollAffixes(item.uid)"
        >
          <Icon name="refine" :size="16" />Đổi dòng phụ <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(rerollCost(item)) }}
        </button>
      </template>
      <template #actions>
        <template v-if="item">
          <button v-if="isEquipped(item.uid)" class="btn-ghost" @click="game.unequipGear(item.slot); sel = null">Tháo</button>
          <button v-else class="btn-jade" @click="game.equipGear(item.uid)">Trang bị</button>
          <button class="btn-gold" :disabled="!canEnhance(item)" @click="game.enhanceGear(item.uid)">
            <template v-if="item.enh >= MAX_ENHANCE">Tối đa</template>
            <template v-else>Cường hoá <Icon name="stone" :size="14" />{{ fmt(enhanceCost(item)) }}</template>
          </button>
          <button v-if="!isEquipped(item.uid)" class="btn-ghost" @click="game.sellGear(item.uid)">
            Phân giải <Icon name="stone" :size="14" />+{{ fmt(sellValue(item)) }}
          </button>
        </template>
      </template>
    </BottomSheet>
  </div>
</template>
