<script setup>
// JourneyTab.vue - Hành Trình: cột mốc dài hạn (chỉ hiển thị tiến độ) và Đồ Giám (bộ sưu tập, mục chưa có hiện bóng mờ + nơi có).
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { REALMS, STAGES } from '../../game/constants.js'
import { ARTS } from '../../game/arts.js'
import { PETS } from '../../game/pets.js'
import { fmt } from '../../game/format.js'
import { ART_GLYPH, PET_GLYPH } from '../glyphs.js'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

const game = useGameStore()
const sub = ref('goals') // goals | codex
const sel = ref(null) // { kind, id }

const maxStage = computed(() => Math.max(game.stageIdx, game.stats.maxStage))

/** Cột mốc: [mục tiêu kế tiếp, giá trị hiện tại, mô tả]. Mỗi dòng có các mốc tăng dần. */
const LADDERS = [
  { icon: 'lotus', label: 'Cảnh giới cao nhất', value: () => maxStage.value, steps: [4, 9, 12, 15, 18, 21, 24, 28, 32], show: (n) => STAGES[Math.min(n, STAGES.length - 1)].fullName, cur: () => STAGES[maxStage.value].fullName },
  { icon: 'dungeon', label: 'Ải cao nhất (kỷ lục)', value: () => game.campaign.record, steps: [10, 50, 100, 200, 300, 500] },
  { icon: 'sword', label: 'Yêu thú đã hạ', value: () => game.stats.kills, steps: [100, 1000, 10000, 100000] },
  { icon: 'skull', label: 'Boss đã hạ', value: () => game.stats.bossKills, steps: [10, 50, 200, 1000] },
  { icon: 'bolt', label: 'Đột phá thành công', value: () => game.stats.breakthroughs, steps: [10, 30, 60, 100] },
  { icon: 'reborn', label: 'Số lần luân hồi', value: () => game.reincarnation.count, steps: [1, 3, 5, 10, 20] },
]
const ladders = computed(() =>
  LADDERS.map((l) => {
    const v = l.value()
    const next = l.steps.find((s) => s > v) ?? null
    const prev = [...l.steps].reverse().find((s) => s <= v) ?? 0
    return {
      ...l, v, next, done: l.steps.filter((s) => s <= v).length,
      ratio: next ? Math.min(1, (v - prev) / (next - prev)) : 1,
      curText: l.cur ? l.cur() : fmt(v), nextText: next ? (l.show ? l.show(next) : fmt(next)) : 'Hoàn tất',
    }
  }),
)

// Đồ giám
const CODEX = computed(() => [
  { key: 'arts', title: 'Công pháp', defs: ARTS, glyph: ART_GLYPH, owned: game.arts.owned, where: (d) => `Rơi từ ải ${d.minAi} trở đi` },
  { key: 'pets', title: 'Linh thú', defs: PETS, glyph: PET_GLYPH, owned: game.pets.owned, where: (d) => `Rơi từ ải ${d.minAi} trở đi` },
])
const counts = (c) => `${Object.keys(c.defs).filter((id) => c.owned[id]).length}/${Object.keys(c.defs).length}`
const open = computed(() => (sel.value ? CODEX.value.find((c) => c.key === sel.value.kind) : null))
const def = computed(() => (open.value ? open.value.defs[sel.value.id] : null))
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-1.5">
      <button class="min-h-[44px] rounded-lg border text-sm font-bold" :class="sub === 'goals' ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 bg-ink-900/70 text-slate-400'" @click="sub = 'goals'">Cột mốc</button>
      <button class="min-h-[44px] rounded-lg border text-sm font-bold" :class="sub === 'codex' ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 bg-ink-900/70 text-slate-400'" @click="sub = 'codex'">Đồ Giám</button>
    </div>

    <template v-if="sub === 'goals'">
      <div v-for="l in ladders" :key="l.label" class="rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-2">
        <div class="flex items-center gap-2">
          <Icon :name="l.icon" :size="22" class="shrink-0 text-gold-300" />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <b class="truncate text-sm text-white">{{ l.label }}</b>
              <span class="shrink-0 text-xs text-gold-300">{{ l.curText }}</span>
            </div>
            <div class="my-1 h-2 overflow-hidden rounded bg-ink-900"><div class="h-full bg-gradient-to-r from-gold-500 to-gold-300" :style="{ width: l.ratio * 100 + '%' }"></div></div>
            <div class="flex justify-between text-xs text-slate-400">
              <span>Mốc {{ l.done }}/{{ l.steps.length }}</span><span>Kế tiếp: {{ l.nextText }}</span>
            </div>
          </div>
        </div>
      </div>
      <p class="px-1 text-xs text-slate-500">Cột mốc chỉ để theo dõi hành trình; phần thưởng nằm ở Thành Tựu và rương mốc ải.</p>
    </template>

    <template v-else>
      <div v-for="c in CODEX" :key="c.key">
        <div class="mb-1.5 flex items-center justify-between text-sm font-bold text-gold-300"><span>{{ c.title }}</span><span class="text-xs font-normal text-slate-400">{{ counts(c) }}</span></div>
        <div class="grid grid-cols-5 gap-x-2 gap-y-3">
          <ItemIcon
            v-for="(d, id) in c.defs"
            :key="id"
            :glyph="c.glyph[id]"
            :color="ELEMENTS[d.element].css"
            :tint="c.owned[id] ? ELEMENTS[d.element].css : ''"
            :dim="!c.owned[id]"
            :label="c.owned[id] ? d.name : '???'"
            :badge="c.owned[id] || ''"
            @click="sel = { kind: c.key, id }"
          />
        </div>
      </div>
    </template>

    <BottomSheet :open="!!def" :title="def ? (open.owned[sel.id] ? def.name : 'Chưa gặp') : ''" :glyph="def ? open.glyph[sel.id] : ''" :color="def ? ELEMENTS[def.element].css : undefined" @close="sel = null">
      <template v-if="def">
        <p v-if="open.owned[sel.id]">Đã sở hữu · cấp {{ open.owned[sel.id] }}. Hệ {{ ELEMENTS[def.element].name }}.</p>
        <p v-else class="text-slate-400">Chưa sở hữu. {{ open.where(def) }}. Hệ {{ ELEMENTS[def.element].name }}.</p>
      </template>
    </BottomSheet>
  </div>
</template>
