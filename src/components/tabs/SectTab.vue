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

const game = useGameStore()
const sub = ref('quests') // quests | shop

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
      <div class="title-rule">Bảng nhiệm vụ</div>
      <div v-for="q in game.quests" :key="q.uid" class="card">
        <div class="flex items-center justify-between">
          <div class="text-sm font-bold text-white">{{ templateById(q.tpl).label }} <span class="text-gold-300">x{{ q.target }}</span></div>
          <span class="rounded border px-1.5 py-0.5 text-[11px] font-bold" :style="{ color: TIERS[q.tier].css, borderColor: TIERS[q.tier].css + '66' }">{{ TIERS[q.tier].name }}</span>
        </div>
        <div class="mt-1 flex items-center gap-2">
          <div class="bar h-2.5 flex-1"><div class="bar-fill bg-gradient-to-r from-jade-600 to-jade-300" :style="{ width: ratio(q) * 100 + '%' }"></div></div>
          <span class="w-14 text-right text-xs text-slate-300">{{ Math.min(game.questProgress(q), q.target) }}/{{ q.target }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between gap-2">
          <span class="text-xs text-slate-400">
            +{{ fmt(stoneReward(q)) }} linh thạch<template v-if="game.sect.id"> · +{{ contribReward(q) }} Cống Hiến</template><template v-if="q.tier === 2"> · thảo dược</template>
          </span>
          <button class="btn-gold px-2.5 py-0.5 text-xs" :disabled="!game.questDone(q)" @click="game.claimQuest(q.uid)">Nhận</button>
        </div>
      </div>
      <button class="btn-ghost w-full py-1.5 text-xs" :disabled="game.spiritStones.lt(game.questRefreshCost)" @click="game.refreshQuests()">
        Làm mới nhiệm vụ chưa xong - {{ fmt(game.questRefreshCost) }} linh thạch
      </button>
    </template>

    <!-- Cửa hàng Cống Hiến -->
    <template v-if="game.sect.id && sub === 'shop'">
      <div class="title-rule">Cửa hàng Cống Hiến</div>
      <div v-for="e in SHOP" :key="e.id" class="card flex items-center gap-2 !py-2" :class="{ 'opacity-50': shopLocked(e) }">
        <div class="min-w-0 flex-1">
          <div class="truncate text-xs font-bold text-white">{{ ITEMS[e.item].name }} <span class="text-jade-300">x{{ e.count }}</span></div>
          <div class="truncate text-[11px] text-slate-400">{{ shopLocked(e) ? '🔒 Cần ' + RANKS[e.rank].name : ITEMS[e.item].desc }}</div>
        </div>
        <button class="btn-gold shrink-0 px-2.5 py-1 text-xs" :disabled="shopLocked(e) || game.sect.contribution < e.cost" @click="game.buyShop(e.id)">
          {{ e.cost }}
        </button>
      </div>
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
