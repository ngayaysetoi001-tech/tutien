<script setup>
// TreasureTab.vue - Pháp Bảo: mỗi pháp bảo có một thần thông kích hoạt trong trận. Luyện hoá bằng mảnh (rơi từ Đại Boss, Chúa Tể),
// nâng phẩm bằng mảnh cùng loại, gắn vào các ô pháp bảo. Võ kỹ đang gắn cùng hệ ngũ hành thì thần thông mạnh thêm.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ELEMENTS } from '../../game/elements.js'
import {
  MAX_TREASURE_SLOTS, TREASURES, TREASURE_LEARN_COST, TREASURE_MAX_TIER, TREASURE_SYNERGY, TREASURE_TIERS, treasureDesc, treasureFragmentId,
  treasureUpgradeCost,
} from '../../game/treasures.js'
import { SKILLS } from '../../game/skills.js'
import { REALMS } from '../../game/constants.js'
import { TREASURE_GLYPH } from '../glyphs.js'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

const game = useGameStore()
const sel = ref(null)
const ids = Object.keys(TREASURES)
const elCss = (e) => ELEMENTS[e].css

const tier = (id) => game.treasures.owned[id] ?? 0
const frags = (id) => game.itemCount(treasureFragmentId(id))
const slotOf = (id) => game.treasures.slots.indexOf(id)
const maxed = (id) => tier(id) >= TREASURE_MAX_TIER
const locked = (id) => !tier(id) && game.campaign.record < TREASURES[id].minAi
const canLearn = (id) => !tier(id) && !locked(id) && frags(id) >= TREASURE_LEARN_COST
const canUp = (id) => tier(id) > 0 && !maxed(id) && frags(id) >= treasureUpgradeCost(tier(id))
const ready = (id) => canLearn(id) || canUp(id)
const progress = (id) => (tier(id) ? (maxed(id) ? 1 : Math.min(1, frags(id) / treasureUpgradeCost(tier(id)))) : Math.min(1, frags(id) / TREASURE_LEARN_COST))
// Có võ kỹ đang gắn cùng hệ → cộng hưởng
const skillElements = computed(() => game.skills.slots.slice(0, game.skillSlots).filter(Boolean).map((id) => SKILLS[id].element))
const synergy = (id) => skillElements.value.includes(TREASURES[id].element)
const tierColor = (id) => TREASURE_TIERS[Math.max(0, tier(id) - 1)].css

const sections = computed(() => {
  const g = { ready: [], used: [], owned: [], learnable: [], locked: [] }
  for (const id of ids) {
    if (slotOf(id) >= 0) g.used.push(id)
    else if (ready(id)) g.ready.push(id)
    else if (tier(id)) g.owned.push(id)
    else if (locked(id)) g.locked.push(id)
    else g.learnable.push(id)
  }
  return [
    { key: 'ready', title: 'Có thể luyện / nâng', ids: g.ready, accent: true },
    { key: 'used', title: 'Đang gắn', ids: g.used },
    { key: 'owned', title: 'Đã luyện hoá', ids: g.owned },
    { key: 'learnable', title: 'Chưa luyện hoá', ids: g.learnable },
    { key: 'locked', title: 'Chưa mở khoá', ids: g.locked },
  ].filter((s) => s.ids.length)
})
const slotHint = (i) => (i === 2 ? REALMS[3].name : REALMS[6].name)
const def = computed(() => (sel.value ? TREASURES[sel.value] : null))

function equip(id) {
  const free = game.treasures.slots.findIndex((x, i) => i < game.treasureSlots && !x)
  game.equipTreasure(id, free >= 0 ? free : game.treasureSlots - 1)
}
</script>

<template>
  <div class="space-y-2">
    <div class="sticky top-0 z-10 rounded-lg border border-ink-600 bg-ink-900 px-2 pb-1.5 pt-1">
      <div class="mb-1 flex items-center justify-between text-xs">
        <b class="text-gold-300">Pháp bảo đang gắn</b>
        <span class="text-slate-500">cùng hệ võ kỹ: +{{ Math.round(TREASURE_SYNERGY * 100) }}%</span>
      </div>
      <div class="grid grid-cols-4 gap-1.5">
        <ItemIcon
          v-for="i in MAX_TREASURE_SLOTS"
          :key="i"
          :glyph="game.treasures.slots[i - 1] ? TREASURE_GLYPH[game.treasures.slots[i - 1]] : 'dots'"
          :color="game.treasures.slots[i - 1] ? elCss(TREASURES[game.treasures.slots[i - 1]].element) : '#475569'"
          :tint="game.treasures.slots[i - 1] ? elCss(TREASURES[game.treasures.slots[i - 1]].element) : ''"
          :frame="game.treasures.slots[i - 1] ? tierColor(game.treasures.slots[i - 1]) : ''"
          :locked="i - 1 >= game.treasureSlots"
          :dim="!game.treasures.slots[i - 1]"
          @click="game.treasures.slots[i - 1] && (sel = game.treasures.slots[i - 1])"
        />
      </div>
      <div v-if="game.treasureSlots < MAX_TREASURE_SLOTS" class="mt-1 text-[11px] text-slate-500">Ô kế tiếp mở ở: {{ slotHint(game.treasureSlots) }}</div>
    </div>

    <p class="px-0.5 text-xs text-slate-500">Mảnh Pháp Bảo rơi từ Đại Boss và Chúa Tể. Mỗi pháp bảo có một thần thông kích hoạt trong trận, không cộng chỉ số thô.</p>

    <template v-for="s in sections" :key="s.key">
      <div class="px-0.5 text-xs font-bold" :class="s.accent ? 'text-cinnabar-400' : 'text-gold-300'">{{ s.title }}</div>
      <div class="space-y-1.5">
        <div
          v-for="id in s.ids"
          :key="id"
          class="flex min-h-[60px] items-center gap-2 rounded-lg border px-2 py-1.5"
          :class="s.accent ? 'border-gold-400/60 bg-gold-500/10' : slotOf(id) >= 0 ? 'border-gold-500/40 bg-ink-800/60' : 'border-ink-600 bg-ink-900/60'"
          @click="sel = id"
        >
          <div class="w-11 shrink-0">
            <ItemIcon
              :glyph="TREASURE_GLYPH[id]"
              :color="elCss(TREASURES[id].element)"
              :tint="elCss(TREASURES[id].element)"
              :frame="tier(id) ? tierColor(id) : ''"
              :locked="s.key === 'locked'"
              :badge="tier(id) || ''"
              :progress="tier(id) && maxed(id) ? -1 : progress(id)"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-bold" :style="{ color: elCss(TREASURES[id].element) }">{{ TREASURES[id].name }}</div>
            <div class="truncate text-xs text-slate-400">
              <template v-if="s.key === 'locked'">Ải {{ TREASURES[id].minAi }}</template>
              <template v-else>{{ treasureDesc(id, tier(id) || 1, synergy(id)) }}</template>
            </div>
          </div>
          <div v-if="s.key !== 'locked'" class="flex shrink-0 gap-1" @click.stop>
            <template v-if="tier(id)">
              <button v-if="slotOf(id) >= 0" class="btn-ghost !px-2 text-xs" @click="game.unequipTreasure(slotOf(id))">Tháo</button>
              <button v-else class="btn-jade !px-2 text-xs" @click="equip(id)">Gắn</button>
              <button class="btn-gold !px-2 text-xs" :disabled="!canUp(id)" @click="game.upgradeTreasure(id)">
                <Icon name="up" :size="14" />{{ maxed(id) ? 'Max' : `${frags(id)}/${treasureUpgradeCost(tier(id))}` }}
              </button>
            </template>
            <button v-else class="btn-gold !px-2 text-xs" :disabled="!canLearn(id)" @click="game.learnTreasure(id)">Luyện {{ frags(id) }}/{{ TREASURE_LEARN_COST }}</button>
          </div>
        </div>
      </div>
    </template>

    <BottomSheet :open="!!sel" :title="def ? def.name : ''" :glyph="sel ? TREASURE_GLYPH[sel] : ''" :color="def ? elCss(def.element) : undefined" @close="sel = null">
      <template v-if="sel && def">
        <div class="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span class="rounded px-1.5 py-0.5" :style="{ color: elCss(def.element), background: 'rgb(255 255 255 / 0.06)' }">Hệ {{ ELEMENTS[def.element].name }}</span>
          <span v-if="tier(sel)" :style="{ color: tierColor(sel) }">Phẩm {{ TREASURE_TIERS[tier(sel) - 1].name }} ({{ tier(sel) }}/{{ TREASURE_MAX_TIER }})</span>
          <span v-else class="text-slate-400">Mảnh {{ frags(sel) }}/{{ TREASURE_LEARN_COST }}</span>
          <span v-if="synergy(sel)" class="text-jade-300">Cộng hưởng võ kỹ cùng hệ +{{ Math.round(TREASURE_SYNERGY * 100) }}%</span>
        </div>
        <p class="text-slate-400">{{ def.text }}.</p>
        <p>{{ treasureDesc(sel, tier(sel) || 1, synergy(sel)) }}</p>
        <p v-if="tier(sel) && !maxed(sel)" class="text-xs text-jade-300">Phẩm sau: {{ treasureDesc(sel, tier(sel) + 1, synergy(sel)) }}</p>
        <p v-if="tier(sel)" class="mt-1 text-xs text-slate-400">Mảnh đang có: <b class="text-slate-200">{{ frags(sel) }}</b></p>
        <p v-if="locked(sel)" class="mt-1 text-xs text-cinnabar-400"><Icon name="lock" :size="12" class="inline" /> Rơi từ ải {{ def.minAi }} trở đi</p>
      </template>
      <template #actions>
        <template v-if="sel">
          <template v-if="tier(sel)">
            <button v-if="slotOf(sel) >= 0" class="btn-ghost" @click="game.unequipTreasure(slotOf(sel)); sel = null">Tháo</button>
            <button v-else class="btn-jade" @click="equip(sel); sel = null">Gắn</button>
            <button class="btn-gold" :disabled="!canUp(sel)" @click="game.upgradeTreasure(sel)">
              Nâng phẩm <span class="text-xs opacity-90">{{ maxed(sel) ? 'tối đa' : `${frags(sel)}/${treasureUpgradeCost(tier(sel))}` }}</span>
            </button>
          </template>
          <button v-else class="btn-gold" :disabled="!canLearn(sel)" @click="game.learnTreasure(sel)">Luyện hoá <span class="text-xs opacity-90">{{ frags(sel) }}/{{ TREASURE_LEARN_COST }}</span></button>
        </template>
      </template>
    </BottomSheet>
  </div>
</template>
