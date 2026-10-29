<script setup>
// SectTab.vue - Tông Môn: gia nhập / đổi tông môn, cấp bậc và đặc quyền, bảng nhiệm vụ, cửa hàng Cống Hiến.
import { computed, ref } from 'vue'
import Decimal from 'break_infinity.js'
import { useGameStore } from '../../stores/gameStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { RANKS, SECTS, SHOP, SWITCH_PENALTY } from '../../game/sect.js'
import { TIERS, templateById } from '../../game/quests.js'
import { ITEMS } from '../../game/data.js'
import { fmt } from '../../game/format.js'
import Icon from '../Icon.vue'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import { GROUP_COLOR, itemGlyph } from '../glyphs.js'

const game = useGameStore()
const sub = ref('quests') // quests | shop
const shopSel = ref(null)

const nextRank = computed(() => RANKS[game.rankIdx + 1] ?? null)
const rankProgress = computed(() => {
  const cur = RANKS[game.rankIdx].need
  const nxt = nextRank.value?.need
  return nxt ? Math.min(1, (game.sect.total - cur) / (nxt - cur)) : 1
})
const perkPercent = (v) => Math.round(v * 100)
const perkLines = computed(() => {
  const p = game.sectPerk
  const labels = { atk: 'Công kích', hp: 'Khí huyết', def: 'Phòng ngự', exp: 'Tốc độ linh khí', skill: 'Sát thương võ kỹ', herb: 'Thảo dược thu hoạch' }
  return Object.entries(p).filter(([, v]) => v > 0).map(([k, v]) => `+${perkPercent(v)}% ${labels[k]}`)
})

function join(id) {
  if (game.sect.id && !window.confirm(`Rời ${game.sectDef.name}? Mất ${Math.round(SWITCH_PENALTY * 100)}% Cống Hiến và cấp bậc.`)) return
  game.joinSect(id)
}

const stoneReward = (q) => new Decimal(1.45).pow(game.stageIdx).mul(Math.round(40 * TIERS[q.tier].reward))
const contribReward = (q) => Math.max(1, Math.round(3 * Math.pow(1.12, game.stageIdx) * TIERS[q.tier].reward))
const ratio = (q) => Math.min(1, game.questProgress(q) / q.target)
const shopLocked = (e) => game.rankIdx < e.rank
</script>

<template>
  <div class="space-y-2">
    <!-- Chưa có tông môn -->
    <template v-if="!game.sect.id">
      <div class="card text-xs text-slate-300">
        Gia nhập một tông môn để nhận <b class="text-gold-300">đặc quyền</b>, tích <b class="text-gold-300">Cống Hiến</b> từ nhiệm vụ và boss,
        đổi vật phẩm quý và thu nhận thêm đệ tử.
      </div>
      <div v-for="s in SECTS" :key="s.id" class="card">
        <div class="flex items-center justify-between">
          <div class="font-bold" :style="{ color: ELEMENTS[s.element].css }">{{ s.name }}</div>
          <div class="text-xs text-slate-400">Hệ {{ ELEMENTS[s.element].name }}</div>
        </div>
        <div class="text-xs text-slate-400">{{ s.desc }}</div>
        <div class="mt-0.5 text-xs text-jade-300">{{ s.perkText }}</div>
        <button class="btn-gold mt-1.5 w-full py-1 text-xs" @click="join(s.id)">Gia nhập</button>
      </div>
    </template>

    <!-- Đã có tông môn -->
    <template v-else>
      <div class="card">
        <div class="flex items-center justify-between">
          <div class="font-bold" :style="{ color: ELEMENTS[game.sectDef.element].css }">{{ game.sectDef.name }}</div>
          <div class="text-xs text-gold-300">{{ RANKS[game.rankIdx].name }}</div>
        </div>
        <div class="mt-1.5 flex items-center gap-2">
          <div class="bar h-2.5 flex-1"><div class="bar-fill bg-gradient-to-r from-gold-500 to-gold-300" :style="{ width: rankProgress * 100 + '%' }"></div></div>
          <span class="text-xs text-slate-400">{{ game.sect.total }}<template v-if="nextRank"> / {{ nextRank.need }}</template></span>
        </div>
        <div class="mt-1 flex items-center justify-between text-xs">
          <span class="flex items-center gap-1 text-gold-300"><Icon name="spark" :size="12" />Cống Hiến: <b>{{ game.sect.contribution }}</b></span>
          <span class="text-slate-500">Đệ tử tối đa {{ game.discipleLimit }}</span>
        </div>
        <div class="mt-1 text-xs text-jade-300">{{ perkLines.join(' · ') }}</div>
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <button v-for="t in [{ id: 'quests', label: 'Nhiệm Vụ', icon: 'quest' }, { id: 'shop', label: 'Cửa Hàng', icon: 'bag' }]" :key="t.id"
          class="btn-ghost py-1.5 text-xs" :class="sub === t.id ? '!border-gold-500/70 !text-gold-300' : ''" @click="sub = t.id">
          <Icon :name="t.icon" :size="14" />{{ t.label }}
        </button>
      </div>
    </template>

    <!-- Nhiệm vụ (dùng được cả khi chưa có tông môn, nhưng không có Cống Hiến) -->
    <template v-if="game.sect.id ? sub === 'quests' : true">
      <div class="text-sm font-bold text-gold-300">Bảng nhiệm vụ</div>
      <div v-for="q in game.quests" :key="q.uid" class="flex items-center gap-2 rounded-lg border px-2.5 py-2" :class="game.questDone(q) ? 'border-gold-400/70 bg-gold-500/10' : 'border-ink-600 bg-ink-900/60'">
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm font-bold text-white">{{ templateById(q.tpl).label }} <span class="text-gold-300">x{{ q.target }}</span></span>
            <span class="shrink-0 rounded border px-1.5 text-[11px] font-bold" :style="{ color: TIERS[q.tier].css, borderColor: TIERS[q.tier].css + '66' }">{{ TIERS[q.tier].name }}</span>
          </div>
          <div class="my-1 flex items-center gap-2">
            <div class="bar h-2 flex-1"><div class="bar-fill bg-gradient-to-r from-jade-600 to-jade-300" :style="{ width: ratio(q) * 100 + '%' }"></div></div>
            <span class="text-xs text-slate-300">{{ Math.min(game.questProgress(q), q.target) }}/{{ q.target }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="flex items-center gap-0.5 text-gold-300"><Icon name="stone" :size="12" />{{ fmt(stoneReward(q)) }}</span>
            <span v-if="game.sect.id" class="flex items-center gap-0.5"><Icon name="spark" :size="12" />{{ contribReward(q) }}</span>
            <Icon v-if="q.tier === 2" name="herb" :size="12" class="text-jade-300" />
          </div>
        </div>
        <button class="btn-gold shrink-0 !px-3 text-xs" :disabled="!game.questDone(q)" @click="game.claimQuest(q.uid)">Nhận</button>
      </div>
      <button class="btn-ghost min-h-[44px] w-full text-sm" :disabled="game.spiritStones.lt(game.questRefreshCost)" @click="game.refreshQuests()">
        <Icon name="refine" :size="16" />Làm mới nhiệm vụ chưa xong <Icon name="stone" :size="14" class="text-gold-400" />{{ fmt(game.questRefreshCost) }}
      </button>
    </template>

    <!-- Cửa hàng Cống Hiến -->
    <template v-if="game.sect.id && sub === 'shop'">
      <div class="flex items-center justify-between text-sm font-bold text-gold-300">
        <span>Cửa hàng Cống Hiến</span><span class="flex items-center gap-1 text-xs font-normal"><Icon name="spark" :size="12" />{{ game.sect.contribution }}</span>
      </div>
      <div class="grid grid-cols-4 gap-x-2 gap-y-3">
        <ItemIcon
          v-for="e in SHOP"
          :key="e.id"
          :glyph="itemGlyph(e.item, ITEMS[e.item].group)"
          :color="GROUP_COLOR[ITEMS[e.item].group]"
          :label="ITEMS[e.item].name.replace(/ Tàn Quyển/, '')"
          :badge="e.cost"
          :locked="shopLocked(e)"
          :dot="!shopLocked(e) && game.sect.contribution >= e.cost"
          @click="shopSel = e"
        />
      </div>
      <BottomSheet :open="!!shopSel" :title="shopSel ? ITEMS[shopSel.item].name : ''" :glyph="shopSel ? itemGlyph(shopSel.item, ITEMS[shopSel.item].group) : ''" @close="shopSel = null">
        <template v-if="shopSel">
          <p>{{ ITEMS[shopSel.item].desc }}</p>
          <p class="mt-1 text-xs text-slate-400">Nhận x{{ shopSel.count }} · giá {{ shopSel.cost }} Cống Hiến (đang có {{ game.sect.contribution }})</p>
          <p v-if="shopLocked(shopSel)" class="mt-1 text-xs text-cinnabar-400">Cần bậc {{ RANKS[shopSel.rank].name }}</p>
        </template>
        <template #actions>
          <button v-if="shopSel" class="btn-gold" :disabled="shopLocked(shopSel) || game.sect.contribution < shopSel.cost" @click="game.buyShop(shopSel.id)">
            Đổi <Icon name="spark" :size="14" />{{ shopSel.cost }}
          </button>
        </template>
      </BottomSheet>
    </template>

    <!-- Đổi tông môn -->
    <div v-if="game.sect.id" class="card">
      <div class="title-rule mb-1.5">Đổi tông môn</div>
      <div class="grid grid-cols-2 gap-1.5">
        <button v-for="s in SECTS.filter((x) => x.id !== game.sect.id)" :key="s.id" class="btn-ghost py-1 text-xs" @click="join(s.id)">
          <span :style="{ color: ELEMENTS[s.element].css }">{{ s.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
