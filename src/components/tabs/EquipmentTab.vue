<script setup>
// EquipmentTab.vue - Trang bị: 3 ô đang mặc, túi trang bị (lưới biểu tượng), chi tiết + cường hoá / phân giải trong bảng trượt.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import {
  BAG_LIMIT, LEGENDS, RARITIES, MAX_ENHANCE, SLOTS, SLOT_IDS, affixCount, affixLine, affixText, enhanceCost, itemColor, itemFullName, itemStats, perkText,
  rerollCost, sellValue, statsText,
} from '../../game/equipment.js'
import { fmt } from '../../game/format.js'
import { automationById, automationUnlocked } from '../../game/automation.js'
import { SLOT_GLYPH, gearImg } from '../glyphs.js'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

const game = useGameStore()
const sel = ref(null) // uid đang xem
const lockIdx = ref(-1) // dòng phụ được khoá khi đổi (-1 = không khoá)

const isEquipped = (uid) => Object.values(game.gear.equipped).includes(uid)
// Túi sắp theo phẩm cấp rồi độ hiếm giảm dần
const slotFilter = ref('') // lọc túi theo ô
const sortKey = ref('tier') // tier | rarity
const SORTS = { tier: 'Phẩm cấp', rarity: 'Độ hiếm' }
const sortedBag = computed(() =>
  game.gear.bag
    .filter((it) => !slotFilter.value || it.slot === slotFilter.value)
    .sort((a, b) =>
      (sortKey.value === 'rarity' ? b.rarity - a.rarity || b.tier - a.tier : b.tier - a.tier || b.rarity - a.rarity) || b.enh - a.enh,
    ),
)
const equipped = computed(() => SLOT_IDS.map((slot, i) => [slot, game.equippedItems[i]]))
const canEnhance = (it) => it.enh < MAX_ENHANCE && game.spiritStones.gte(enhanceCost(it))
const canReroll = (it) => !it.legend && affixCount(it.rarity) > 0
const legendText = (it) => LEGENDS[it.legend]?.text
// Tự phân giải đồ yếu: mở ở ải 40 (cùng điều kiện với mục Tự động hoá ở Cài Đặt)
const salvageAuto = automationById('salvage')
const salvageUnlocked = computed(() => automationUnlocked(salvageAuto, game))
const salvageOptions = [1, 2, 3].map((n) => ({ n, text: n === 1 ? 'Phàm' : 'Phàm + ' + RARITIES.slice(1, n).map((r) => r.name).join(' + ') }))
const salvageNow = computed(() => game.gear.bag.filter((it) => it.rarity < game.settings.salvageBelow && !it.legend && !isEquipped(it.uid)).length)
const item = computed(() => (sel.value ? game.gear.bag.find((x) => x.uid === sel.value) ?? null : null))
// So với món đang mặc cùng ô: chênh lệch từng chỉ số (xanh = tốt hơn, đỏ = kém hơn)
const STAT_LABEL = { hp: 'Khí huyết', atk: 'Công', def: 'Thủ', speed: 'Thân pháp', exp: 'Linh khí' }
const delta = computed(() => {
  const it = item.value
  if (!it || isEquipped(it.uid)) return []
  const cur = game.equippedItems[SLOT_IDS.indexOf(it.slot)]
  const a = itemStats(it)
  const b = cur ? itemStats(cur) : {}
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => {
    const d = (a[k] ?? 0) - (b[k] ?? 0)
    return { k, label: STAT_LABEL[k], d, text: k === 'exp' ? (d * 100).toFixed(1) + '%' : String(d) }
  }).filter((x) => Math.abs(x.d) > 1e-9)
})
// Món bị phân giải / không còn trong túi thì bảng tự đóng
const open = computed(() => !!item.value)
</script>

<template>
  <div class="space-y-3">
    <div v-if="game.activeGearSets.length" class="space-y-0.5 text-xs">
      <div v-for="set in game.activeGearSets" :key="set.name" class="rounded-lg border border-jade-500/30 bg-jade-500/10 px-2 py-1 text-slate-300">
        <b class="text-jade-300">Bộ {{ set.name }} ({{ set.pieces }}/6)</b>: {{ perkText(set.bonus) }}
      </div>
    </div>

    <div>
      <div class="mb-1.5 text-sm font-bold text-gold-300">Đang mặc</div>
      <div class="grid grid-cols-3 gap-3">
        <ItemIcon
          v-for="[slot, it] in equipped"
          :key="slot"
          :src="it ? gearImg(slot) : ''"
          :glyph="SLOT_GLYPH[slot]"
          :color="it ? itemColor(it) : '#475569'"
          :frame="it ? itemColor(it) : ''"
          :dim="!it"
          :label="it ? SLOTS[slot] : SLOTS[slot] + ' (trống)'"
          :badge="it && it.enh ? '+' + it.enh : ''"
          @click="it && ((sel = it.uid), (lockIdx = -1))"
        />
      </div>
    </div>

    <!-- Tự phân giải đồ yếu -->
    <div class="rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-2">
      <div class="flex items-center justify-between gap-2">
        <span class="flex items-center gap-1.5 text-sm font-bold text-slate-200"><Icon name="refine" :size="16" class="text-gold-300" />Tự phân giải đồ yếu</span>
        <button
          class="min-h-[36px] rounded-full border px-3 text-xs font-bold"
          :class="game.settings.auto.salvage && salvageUnlocked ? 'border-jade-500/60 bg-jade-500/20 text-jade-200' : 'border-ink-600 bg-ink-900 text-slate-400'"
          :disabled="!salvageUnlocked"
          @click="game.settings.auto.salvage = !game.settings.auto.salvage"
        >{{ salvageUnlocked ? (game.settings.auto.salvage ? 'BẬT' : 'TẮT') : 'Mở ở ải 40' }}</button>
      </div>
      <template v-if="salvageUnlocked">
        <div class="mt-1.5 text-xs text-slate-400">Phân giải đồ không mặc có độ hiếm dưới ngưỡng (giữ món tốt nhất mỗi ô và đồ Huyền Thoại):</div>
        <div class="mt-1 grid grid-cols-3 gap-1">
          <button
            v-for="o in salvageOptions"
            :key="o.n"
            class="min-h-[40px] rounded-lg border px-1 text-xs font-bold"
            :class="game.settings.salvageBelow === o.n ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 bg-ink-900 text-slate-400'"
            @click="game.settings.salvageBelow = o.n"
          >{{ o.text }}</button>
        </div>
        <button class="btn-ghost mt-1.5 min-h-[40px] w-full text-xs" :disabled="salvageNow === 0" @click="game.autoSalvage()">Phân giải ngay {{ salvageNow }} món</button>
      </template>
    </div>

    <div>
      <div class="mb-1.5 flex items-center justify-between text-sm font-bold text-gold-300">
        <span>Túi trang bị</span><span class="text-xs font-normal text-slate-500">{{ game.gear.bag.length }}/{{ BAG_LIMIT }}</span>
      </div>
      <div class="mb-2 flex gap-1 overflow-x-auto no-bar">
        <button class="min-h-[34px] shrink-0 rounded-full border px-3 text-xs font-bold" :class="!slotFilter ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 text-slate-400'" @click="slotFilter = ''">Tất cả</button>
        <button
          v-for="sl in SLOT_IDS"
          :key="sl"
          class="min-h-[34px] shrink-0 rounded-full border px-3 text-xs font-bold"
          :class="slotFilter === sl ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 text-slate-400'"
          @click="slotFilter = slotFilter === sl ? '' : sl"
        >{{ SLOTS[sl] }}</button>
        <button class="min-h-[34px] shrink-0 rounded-full border border-ink-600 px-3 text-xs font-bold text-slate-300" @click="sortKey = sortKey === 'tier' ? 'rarity' : 'tier'">Sắp: {{ SORTS[sortKey] }}</button>
      </div>
      <p v-if="sortedBag.length === 0" class="text-sm text-slate-500">{{ game.gear.bag.length ? 'Không có món nào ở ô này.' : 'Trống. Hạ boss ở Vượt Ải hoặc rèn pháp khí ở Động Phủ để có trang bị.' }}</p>
      <div class="grid grid-cols-4 gap-x-2 gap-y-3">
        <ItemIcon
          v-for="it in sortedBag"
          :key="it.uid"
          :src="gearImg(it.slot)"
          :glyph="SLOT_GLYPH[it.slot]"
          :color="itemColor(it)"
          :frame="itemColor(it)"
          :label="SLOTS[it.slot]"
          :badge="(it.locked ? '🔒' : '') + (it.enh ? '+' + it.enh : '')"
          :selected="isEquipped(it.uid)"
          @click="(sel = it.uid), (lockIdx = -1)"
        />
      </div>
      <p class="mt-2 text-xs text-slate-500">Màu viền = độ hiếm · viền sáng = đang mặc.</p>
    </div>

    <BottomSheet :open="open" :title="item ? itemFullName(item) : ''" :glyph="item ? SLOT_GLYPH[item.slot] : ''" :color="item ? itemColor(item) : undefined" @close="sel = null">
      <template v-if="item">
        <div class="mb-1 text-xs text-slate-500">{{ SLOTS[item.slot] }}{{ isEquipped(item.uid) ? ' · đang mặc' : '' }}</div>
        <div class="text-slate-100">{{ statsText(itemStats(item)) }}</div>
        <div v-if="delta.length" class="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span class="text-slate-500">So với đang mặc:</span>
          <span v-for="x in delta" :key="x.k" class="rounded px-1.5 py-0.5 font-bold" :class="x.d > 0 ? 'bg-jade-500/20 text-jade-300' : 'bg-cinnabar-500/20 text-cinnabar-300'">{{ x.d > 0 ? '▲ +' : '▼ ' }}{{ x.text }} {{ x.label }}</span>
        </div>
        <div v-if="item.legend" class="mt-1 text-pink-300">{{ legendText(item) }}</div>
        <template v-else-if="item.affixes?.length">
          <div class="mt-2 space-y-1">
            <button
              v-for="(a, i) in item.affixes"
              :key="a.id"
              class="flex min-h-[40px] w-full items-center justify-between rounded-lg border px-2.5 text-left text-sm"
              :class="lockIdx === i ? 'border-gold-400 bg-gold-500/15 text-gold-200' : 'border-ink-600 bg-ink-900/60 text-jade-300'"
              @click="lockIdx = lockIdx === i ? -1 : i"
            >
              <span>{{ affixLine(a) }}</span>
              <Icon :name="lockIdx === i ? 'lock' : 'dots'" :size="16" />
            </button>
          </div>
          <p class="mt-1 text-xs text-slate-500">Bấm một dòng để khoá khi đổi (tốn gấp đôi).</p>
        </template>
        <button
          v-if="canReroll(item)"
          class="btn-ghost mt-2 min-h-[44px] w-full"
          :disabled="game.spiritStones.lt(rerollCost(item, lockIdx >= 0))"
          @click="game.rerollAffixes(item.uid, lockIdx)"
        >
          <Icon name="refine" :size="16" />{{ lockIdx >= 0 ? 'Đổi dòng còn lại' : 'Đổi dòng phụ' }} <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(rerollCost(item, lockIdx >= 0)) }}
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
          <button class="btn-ghost" @click="game.toggleGearLock(item.uid)"><Icon :name="item.locked ? 'lock' : 'dots'" :size="16" />{{ item.locked ? 'Mở khoá' : 'Khoá' }}</button>
          <button v-if="!isEquipped(item.uid)" class="btn-ghost" :disabled="item.locked" @click="game.sellGear(item.uid)">
            Phân giải <Icon name="stone" :size="14" />+{{ fmt(sellValue(item)) }}
          </button>
        </template>
      </template>
    </BottomSheet>
  </div>
</template>
