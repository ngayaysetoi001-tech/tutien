<script setup>
// TreeTab.vue - Cây kỹ năng của Đạo Lộ: 8 nút (4 Võ Kỹ, 1 Tuyệt Kỹ, 3 Bí Kỹ) tự mở theo cảnh giới, nâng cấp bằng điểm kỹ năng.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useUiStore } from '../../stores/uiStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { PATHS, PATH_IDS } from '../../game/paths.js'
import { REALMS } from '../../game/constants.js'
import { TREES, TREE_COLS, TREE_EDGES, TREE_POS, TREE_SKILLS, treeMaxLevel, treeUpgradeCost } from '../../game/skilltree.js'
import { comboHints, skillDesc, statusLine } from '../../game/skills.js'
import { PATH_GLYPH, skillImg } from '../glyphs.js'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

const game = useGameStore()
const ui = useUiStore()
const view = ref(game.path ?? 'kiem') // đạo lộ đang xem (xem trước được cả cây của đạo lộ khác)
const sel = ref(null)

const tree = computed(() => TREES[view.value])
const own = computed(() => view.value === game.path)
const pts = computed(() => game.skills.points)
const elCss = (e) => ELEMENTS[e].css
const level = (nd) => (own.value ? game.skillLevel(nd.id) : 0)
const unlocked = (nd) => level(nd) > 0
const maxed = (nd) => level(nd) >= treeMaxLevel(nd.id)
const cost = (nd) => (unlocked(nd) && !maxed(nd) ? treeUpgradeCost(nd.id, level(nd)) : 0)
const canUp = (nd) => unlocked(nd) && !maxed(nd) && pts.value >= cost(nd)
const frame = (nd) => (nd.col === 'tuyet' ? '#e5493a' : nd.col === 'bi' ? '#7fb8ff' : '')
const lockText = (nd) => (own.value ? `Mở ở ${REALMS[nd.minRealm].name}` : `Cần chọn ${PATHS[view.value].name}`)

// Đường nối giữa các nút: toạ độ tâm ô trong lưới 3 x 4
const pos = (n) => ({ x: TREE_POS[n].c + 0.5, y: TREE_POS[n].r + 0.5 })
const edges = computed(() => TREE_EDGES.map(([a, b]) => ({ a: pos(a), b: pos(b), on: own.value && unlocked(tree.value[b - 1]) })))
const cellStyle = (nd) => ({ gridColumn: TREE_POS[nd.n].c + 1, gridRow: TREE_POS[nd.n].r + 1 })

const nd = computed(() => (sel.value ? TREE_SKILLS[sel.value] : null))
const activeIds = computed(() => game.activeTreeIds)
</script>

<template>
  <div class="space-y-3">
    <!-- Đầu trang: điểm kỹ năng -->
    <div class="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-2">
      <Icon name="sparkles" :size="22" class="shrink-0 text-gold-300" />
      <div class="min-w-0 flex-1">
        <div class="text-sm font-bold text-gold-200">Điểm kỹ năng: {{ pts.toFixed(1) }}</div>
        <div class="text-xs text-slate-400">+{{ (game.skillPointRate * 60).toFixed(2) }} điểm/phút, nhận theo thời gian</div>
      </div>
      <button class="btn-gold shrink-0 !px-3 text-xs" :disabled="!own || pts < 1" @click="game.autoSpendSkillPoints()">Tự dồn điểm</button>
    </div>

    <!-- Chọn cây xem -->
    <div class="grid grid-cols-4 gap-1.5">
      <button
        v-for="id in PATH_IDS"
        :key="id"
        class="flex min-h-[44px] flex-col items-center justify-center rounded-lg border text-xs font-bold transition"
        :class="view === id ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 bg-ink-900/70 text-slate-400'"
        @click="view = id"
      >
        <Icon :name="PATH_GLYPH[id]" :size="16" :style="{ color: PATHS[id].css }" />{{ PATHS[id].name }}
        <span v-if="game.path === id" class="text-[10px] font-normal text-jade-300">đang theo</span>
      </button>
    </div>

    <div v-if="!game.path" class="rounded-lg border border-gold-500/35 bg-gold-500/10 p-2.5 text-sm text-gold-200">
      Chọn Đạo Lộ khi đạt Trúc Cơ để mở cây kỹ năng.
      <button class="btn-gold mt-1.5 min-h-[40px] w-full text-sm" @click="ui.go('character')">Đi chọn Đạo Lộ</button>
    </div>
    <div v-else-if="!own" class="text-xs text-slate-500">Đang xem trước cây {{ PATHS[view].name }}. Đạo lộ hiện tại của bạn là {{ PATHS[game.path].name }}.</div>

    <!-- Tiêu đề 3 cột -->
    <div class="grid grid-cols-3 text-center text-xs font-bold text-gold-300">
      <span>{{ TREE_COLS.vo }}</span><span>{{ TREE_COLS.tuyet }}</span><span>{{ TREE_COLS.bi }}</span>
    </div>

    <!-- Cây: lưới 3 cột x 4 hàng + đường nối -->
    <div class="relative">
      <svg class="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 3 4" preserveAspectRatio="none">
        <line
          v-for="(e, i) in edges"
          :key="i"
          :x1="e.a.x" :y1="e.a.y" :x2="e.b.x" :y2="e.b.y"
          vector-effect="non-scaling-stroke"
          :stroke="e.on ? '#fcd979' : '#334155'"
          :stroke-width="e.on ? 2.5 : 2"
          :stroke-dasharray="e.on ? '' : '4 4'"
        />
      </svg>
      <div class="tree-grid relative grid grid-cols-3 grid-rows-4 gap-y-3">
        <div v-for="n in tree" :key="n.id" :style="cellStyle(n)" class="flex justify-center">
          <div class="w-[78%] max-w-[88px]">
            <ItemIcon
              :src="skillImg(n.id)"
              :glyph="'star'"
              :color="elCss(n.element)"
              :frame="unlocked(n) ? (activeIds.includes(n.id) ? '#fcd979' : frame(n)) : '#334155'"
              :locked="!unlocked(n)"
              :dim="!unlocked(n)"
              :label="n.name"
              :badge="unlocked(n) ? level(n) : ''"
              :dot="canUp(n)"
              @click="sel = n.id"
            />
          </div>
        </div>
      </div>
    </div>
    <p class="px-1 text-xs text-slate-500">Nút sáng viền vàng đang tự thi triển trong trận. Chấm đỏ = đủ điểm để nâng cấp. Bấm nút để xem chi tiết.</p>

    <!-- Chi tiết nút -->
    <BottomSheet :open="!!nd" :title="nd ? nd.name : ''" :color="nd ? elCss(nd.element) : undefined" @close="sel = null">
      <template v-if="nd">
        <div class="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span class="rounded px-1.5 py-0.5" :style="{ color: elCss(nd.element), background: 'rgb(255 255 255 / 0.06)' }">Hệ {{ ELEMENTS[nd.element].name }}</span>
          <span class="rounded bg-ink-700 px-1.5 py-0.5 text-slate-300">{{ TREE_COLS[nd.col] }}</span>
          <span class="ml-auto text-gold-300">{{ unlocked(nd) ? `Cấp ${level(nd)}/${treeMaxLevel(nd.id)}` : lockText(nd) }}</span>
        </div>
        <p>{{ skillDesc(nd.id, level(nd) || 1) }}</p>
        <p v-if="unlocked(nd) && !maxed(nd)" class="text-xs text-jade-300">Cấp sau: {{ skillDesc(nd.id, level(nd) + 1) }}</p>
        <p v-if="statusLine(nd.id)" class="mt-1 text-xs text-gold-200">{{ statusLine(nd.id) }}</p>
        <ul v-if="comboHints(nd.id, activeIds).length" class="mt-1 space-y-0.5 text-xs">
          <li v-for="h in comboHints(nd.id, activeIds)" :key="h.text" :class="h.ok ? 'text-jade-300' : 'text-slate-500'">{{ h.ok ? '✓' : '○' }} {{ h.text }}</li>
        </ul>
        <p v-if="own && !unlocked(nd)" class="mt-1 text-xs text-cinnabar-400"><Icon name="lock" :size="12" class="inline" /> {{ lockText(nd) }}: nút tự mở, không cần học.</p>
      </template>
      <template #actions>
        <button v-if="nd && own" class="btn-gold" :disabled="!canUp(nd)" @click="game.upgradeTreeNode(nd.id)">
          <template v-if="!unlocked(nd)">Chưa mở</template>
          <template v-else-if="maxed(nd)">Đã tối đa</template>
          <template v-else>Nâng cấp <Icon name="sparkles" :size="14" />{{ cost(nd) }} điểm</template>
        </button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
/* Tên nút có nền đặc để đường nối không cắt ngang chữ */
.tree-grid :deep(.item-icon__label) {
  position: relative;
  z-index: 1;
  padding: 0 4px;
  border-radius: 4px;
  background: #0b1020;
}
</style>
