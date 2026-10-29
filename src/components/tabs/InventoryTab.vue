<script setup>
// InventoryTab.vue - Túi đồ: lưới biểu tượng theo nhóm; dùng đan, lĩnh ngộ tàn quyển, bán trong bảng trượt.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { INVENTORY_GROUPS } from '../../game/constants.js'
import { ITEMS } from '../../game/data.js'
import { fmt } from '../../game/format.js'
import { GROUP_COLOR, GROUP_GLYPH, itemGlyph } from '../glyphs.js'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

const game = useGameStore()
const sel = ref(null)

const usable = (id) => ITEMS[id].effect && ITEMS[id].effect.type !== 'heal'
const need = (id) => ITEMS[id].useCost ?? 1
const canUse = (id) => game.itemCount(id) >= need(id) && !game.tribulation.active
const useLabel = (id) => (ITEMS[id].group === 'scrolls' ? 'Lĩnh ngộ' : 'Dùng')
const entries = (group) => Object.entries(game.inventory[group])
const count = computed(() => (sel.value ? game.itemCount(sel.value) : 0))
const open = computed(() => !!sel.value && count.value > 0)
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between rounded-lg border border-ink-600 bg-ink-900/60 px-3 py-2">
      <span class="flex items-center gap-1.5 text-sm text-slate-300"><Icon name="stone" :size="18" class="text-gold-400" />Linh thạch</span>
      <b class="text-gold-300">{{ fmt(game.spiritStones) }}</b>
    </div>

    <div v-if="game.buffs.success > 0 || game.buffs.guard > 0" class="rounded-lg border border-gold-500/35 bg-gold-500/10 px-3 py-1.5 text-sm text-gold-300">
      <div v-if="game.buffs.success > 0">✦ Phá Cảnh: +{{ Math.round(game.buffs.success * 100) }}% đột phá lần kế</div>
      <div v-if="game.buffs.guard > 0">✦ Hộ Kiếp: -{{ Math.round(game.buffs.guard * 100) }}% sát thương lôi lần kế</div>
    </div>

    <div v-for="group in INVENTORY_GROUPS" :key="group.key">
      <div class="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gold-300"><Icon :name="GROUP_GLYPH[group.key]" :size="16" />{{ group.label }}</div>
      <div v-if="entries(group.key).length === 0" class="text-sm text-slate-500">Trống</div>
      <div v-else class="grid grid-cols-4 gap-x-2 gap-y-3">
        <ItemIcon
          v-for="[id, n] in entries(group.key)"
          :key="id"
          :glyph="itemGlyph(id, group.key)"
          :color="GROUP_COLOR[group.key]"
          :label="ITEMS[id].name.replace(/ Tàn Quyển/, '')"
          :badge="n"
          @click="sel = id"
        />
      </div>
    </div>

    <BottomSheet :open="open" :title="sel ? ITEMS[sel].name : ''" :glyph="sel ? itemGlyph(sel, ITEMS[sel].group) : ''" :color="sel ? GROUP_COLOR[ITEMS[sel].group] : undefined" @close="sel = null">
      <template v-if="sel">
        <p>{{ ITEMS[sel].desc }}</p>
        <p class="mt-1 text-xs text-slate-400">
          Đang có <b class="text-jade-300">x{{ count }}</b> · bán <Icon name="stone" :size="12" class="inline text-gold-400" /> {{ ITEMS[sel].sell }}/cái
          <template v-if="usable(sel) && need(sel) > 1"> · cần {{ need(sel) }} để {{ useLabel(sel).toLowerCase() }}</template>
        </p>
      </template>
      <template #actions>
        <template v-if="sel">
          <button v-if="usable(sel)" class="btn-jade" :disabled="!canUse(sel)" @click="game.useItem(sel, 1)">{{ useLabel(sel) }}</button>
          <button v-if="usable(sel) && count >= need(sel) * 2" class="btn-jade" :disabled="!canUse(sel)" @click="game.useItem(sel, Math.floor(count / need(sel)))">Dùng hết</button>
          <button class="btn-ghost" @click="game.sellItem(sel, 1)">Bán 1</button>
          <button v-if="count > 1" class="btn-ghost" @click="game.sellItem(sel, count)">Bán hết</button>
        </template>
      </template>
    </BottomSheet>
  </div>
</template>
