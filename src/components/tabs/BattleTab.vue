<script setup>
// BattleTab.vue - Vượt Ải: ải đang đánh, chip đặc tính, tỉ lệ thắng, thu nhập thụ động, cày ải cũ.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useBattleStore } from '../../stores/battleStore.js'
import { useUiStore } from '../../stores/uiStore.js'
import { MONSTERS, itemName } from '../../game/data.js'
import * as C from '../../game/campaign.js'
import { fmt } from '../../game/format.js'
import { ELEMENTS, elementEdge } from '../../game/elements.js'
import Icon from '../Icon.vue'
import BottomSheet from '../BottomSheet.vue'

const game = useGameStore()
const battle = useBattleStore()
const ui = useUiStore()
const sheet = ref(null) // 'mods' | 'farm' | 'income'

const healPills = computed(() => game.itemCount('hoi_huyet_dan'))
const runItems = computed(() => Object.entries(battle.run.items))
const best = computed(() => game.campaign.best)
const target = computed(() => battle.targetAi())
const farming = computed(() => !!game.campaign.farm && game.campaign.farm <= best.value)
const farmInput = ref(Math.max(1, game.campaign.farm ?? best.value))

// Thanh tiến độ của chương đang đánh: 10 ải, đánh dấu Tiểu Boss / Đại Boss
const strip = computed(() => {
  const first = (C.chapterOf(target.value) - 1) * C.AIS_PER_CHAPTER + 1
  return Array.from({ length: C.AIS_PER_CHAPTER }, (_, i) => {
    const n = first + i
    return { n, kind: C.aiKind(n), done: n <= best.value, current: n === target.value }
  })
})
const cellClass = (c) => {
  if (c.current) return 'border-gold-400 bg-gold-500/25 text-gold-200 ring-1 ring-gold-400'
  if (c.done) return 'border-jade-500/50 bg-jade-500/15 text-jade-300'
  return 'border-ink-600 bg-ink-900 text-slate-500'
}
const cellMark = (c) => ({ mini: '◆', big: '★', lord: '♛' })[c.kind] ?? ''

const expIncome = computed(() => {
  const camp = C.campaignExpBonus(best.value, game.stageIdx)
  return game.expRate.mul(camp / (1 + game.bonus.exp + game.gearStats.exp + camp))
})
const incomeAi = computed(() => C.incomeAi(best.value, game.stageIdx))
const stoneIncome = computed(() => C.campaignStonesPerSecond(best.value, game.stageIdx))
const itemIncome = computed(() => C.campaignItemsPerHour(best.value, game.stageIdx))
const nextKind = computed(() => C.aiKind(target.value))
const nextMods = computed(() => C.aiMods(target.value))
const nextMonster = computed(() => MONSTERS[C.pickAiMonster(target.value, () => 0).id])
const chance = computed(() => Math.round(C.winChance(battle.playerStats(), target.value, 30) * 100))
const chanceClass = computed(() => (chance.value >= 70 ? 'text-jade-300' : chance.value >= 30 ? 'text-gold-300' : 'text-cinnabar-400'))
const chanceBar = computed(() => (chance.value >= 70 ? 'bg-jade-500' : chance.value >= 30 ? 'bg-gold-500' : 'bg-cinnabar-500'))
const edgeMark = computed(() => ({ up: ' ▲', down: ' ▼' })[elementEdge(game.element, nextMonster.value.element)] ?? '')
const stuck = computed(() => !farming.value && chance.value < 30)

// Rương mốc ải kế tiếp và mô tả phần thưởng
const milestone = computed(() => C.MILESTONES[game.campaign.milestone] ?? null)
const milestoneText = computed(() => {
  const i = game.campaign.milestone
  if (!milestone.value) return ''
  const statLabel = { hp: 'khí huyết', atk: 'công kích', def: 'phòng ngự', speed: 'Thân pháp' }
  return C.milestoneReward(i)
    .map((fx) => {
      if (fx.type === 'stones') return 'linh thạch'
      if (fx.type === 'stat') return `+${fx.amount} ${statLabel[fx.stat]} vĩnh viễn`
      if (fx.type === 'item') return `${itemName(fx.id)} x${fx.count}`
      if (fx.type === 'expBonus') return `+${Math.round(fx.amount * 100)}% linh khí vĩnh viễn`
      return ''
    })
    .join(', ')
})

const SHEET_TITLES = { mods: 'Đặc tính kẻ địch', farm: 'Cày ải đã vượt', income: 'Thu nhập thụ động' }
const TIPS = [
  { to: 'character', icon: 'bolt', label: 'Đột phá' },
  { to: 'gear', icon: 'gear', label: 'Trang bị' },
  { to: 'skills', icon: 'arts', label: 'Công pháp' },
]

function stepFarm(d) {
  farmInput.value = Math.min(Math.max(1, best.value), Math.max(1, (farmInput.value || 1) + d))
}
</script>

<template>
  <div class="space-y-2.5">
    <!-- Ải đang đánh -->
    <div class="space-y-2">
      <div class="flex items-baseline justify-between">
        <div class="font-bold text-gold-300">{{ C.chapterName(target) }}</div>
        <div class="text-xs text-slate-400">Chương {{ C.chapterOf(target) }}</div>
      </div>
      <div class="grid grid-cols-10 gap-0.5">
        <div v-for="c in strip" :key="c.n" class="flex h-9 flex-col items-center justify-center rounded border text-xs leading-none" :class="cellClass(c)">
          <span class="text-[10px] text-cinnabar-400">{{ cellMark(c) || '&nbsp;' }}</span>
          <span>{{ c.n }}</span>
        </div>
      </div>

      <!-- Kẻ địch: tên + chip đặc tính -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-sm font-bold text-white">
          <span v-if="farming" class="mr-1 rounded bg-gold-500/30 px-1 text-xs text-gold-200">Cày</span>Ải {{ target }}
        </span>
        <span class="rounded bg-cinnabar-500/25 px-1.5 py-0.5 text-xs text-cinnabar-300">{{ C.AI_KINDS[nextKind].name }}</span>
        <span class="text-sm" :style="{ color: ELEMENTS[nextMonster.element].css }">{{ nextMonster.name }} · {{ ELEMENTS[nextMonster.element].name }}{{ edgeMark }}</span>
      </div>
      <div v-if="nextMods.length" class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="m in nextMods"
          :key="m"
          class="min-h-[32px] rounded-full border px-2.5 text-xs font-bold"
          :class="C.ENEMY_MODS[m].kind === 'boss' ? 'border-cinnabar-500/60 bg-cinnabar-500/15 text-cinnabar-300' : 'border-gold-500/40 bg-gold-500/10 text-gold-200'"
          @click="sheet = 'mods'"
        >{{ C.ENEMY_MODS[m].name }}</button>
        <button class="min-h-[32px] px-1 text-slate-500" aria-label="Chi tiết đặc tính" @click="sheet = 'mods'"><Icon name="info" :size="16" /></button>
      </div>

      <!-- Tỉ lệ thắng: một thanh -->
      <div class="relative h-7 overflow-hidden rounded-lg bg-ink-900">
        <div class="h-full opacity-80 transition-all" :class="chanceBar" :style="{ width: Math.max(chance, 3) + '%' }"></div>
        <span class="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold text-white">
          <span>Tỉ lệ thắng ước tính</span><span :class="chanceClass" class="rounded bg-black/50 px-1">{{ chance }}%</span>
        </span>
      </div>
      <div v-if="game.campaign.grit > 0" class="text-xs text-jade-300">Kiên Trì +{{ Math.round(game.campaign.grit * C.GRIT_STEP * 100) }}% chỉ số (mất khi vượt ải)</div>

      <!-- Đang kẹt: 3 lối tăng sức -->
      <div v-if="stuck" class="rounded-lg border border-gold-500/30 bg-gold-500/10 p-2">
        <div class="mb-1.5 text-xs text-gold-200">Kẹt ở ải {{ best }}. Tăng sức để qua ải {{ target }}:</div>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="t in TIPS"
            :key="t.to"
            class="flex min-h-[48px] flex-col items-center justify-center rounded-lg border border-ink-600 bg-ink-900/70 text-xs font-bold text-slate-200"
            @click="ui.go(t.to)"
          ><Icon :name="t.icon" :size="18" class="text-gold-300" />{{ t.label }}</button>
        </div>
      </div>

      <!-- Hành động -->
      <div class="grid grid-cols-3 gap-1.5">
        <button class="btn-jade !px-1 text-xs" :disabled="!battle.inFight || healPills < 1 || battle.hp >= battle.maxHp" @click="battle.useHealPill()">
          <Icon name="pill" :size="16" />Hồi huyết ({{ healPills }})
        </button>
        <button
          class="btn !px-1 text-xs"
          :class="game.settings.autoRepeat ? 'border-jade-500/60 bg-jade-500/20 text-jade-200' : 'border-ink-600 bg-ink-900 text-slate-400'"
          @click="game.settings.autoRepeat = !game.settings.autoRepeat"
        ><Icon name="swords" :size="16" />Tự đánh {{ game.settings.autoRepeat ? 'BẬT' : 'TẮT' }}</button>
        <button
          class="btn !px-1 text-xs"
          :class="game.settings.autoHeal ? 'border-jade-500/60 bg-jade-500/20 text-jade-200' : 'border-ink-600 bg-ink-900 text-slate-400'"
          @click="game.settings.autoHeal = !game.settings.autoHeal"
        ><Icon name="heart" :size="16" />Tự hồi {{ game.settings.autoHeal ? 'BẬT' : 'TẮT' }}</button>
      </div>
    </div>

    <!-- Chọn phần thưởng boss -->
    <div v-if="game.bossChoice" class="space-y-1.5 rounded-lg border border-gold-400 bg-gold-500/10 p-2">
      <div class="text-sm font-bold text-gold-300">Chọn thưởng: {{ C.AI_KINDS[game.bossChoice.kind].name }} ải {{ game.bossChoice.n }}</div>
      <button v-for="(o, i) in game.bossChoice.options" :key="o.id" class="btn-ghost min-h-[44px] w-full text-left text-sm" @click="game.chooseBossReward(i)">{{ o.label }}</button>
      <div class="text-xs text-slate-500">Không chọn sau 10 phút sẽ tự lấy phương án đầu.</div>
    </div>

    <!-- Rương mốc ải -->
    <div v-if="milestone" class="flex items-center gap-2 rounded-lg border px-2.5 py-2" :class="game.milestoneClaimable ? 'border-gold-400 bg-gold-500/10' : 'border-ink-600 bg-ink-900/60'">
      <Icon name="gift" :size="26" class="shrink-0 text-gold-300" />
      <div class="min-w-0 flex-1">
        <div class="flex justify-between text-xs"><b class="text-slate-200">Rương mốc ải {{ milestone.ai }}</b><span class="text-slate-400">{{ game.campaign.record }}/{{ milestone.ai }}</span></div>
        <div class="my-1 h-1.5 overflow-hidden rounded bg-ink-900"><div class="h-full bg-gold-500" :style="{ width: Math.min(100, (game.campaign.record / milestone.ai) * 100) + '%' }"></div></div>
        <div class="truncate text-xs text-slate-400">{{ milestoneText }}</div>
      </div>
      <button class="btn-gold shrink-0 !px-3 text-xs" :disabled="!game.milestoneClaimable" @click="game.claimMilestone()">
        {{ game.milestoneClaimable ? 'Nhận' : `Còn ${milestone.ai - game.campaign.record}` }}
      </button>
    </div>

    <!-- Thu nhập thụ động: chip -->
    <button class="w-full rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-2 text-left" @click="sheet = 'income'">
      <div class="mb-1 flex items-center justify-between text-xs"><b class="text-slate-200">Thu nhập thụ động</b><span class="text-slate-400">Ải {{ best }} · kỷ lục {{ game.campaign.record }}</span></div>
      <div v-if="best > 0" class="flex items-center justify-around text-sm">
        <span class="flex items-center gap-1 text-jade-300"><Icon name="lotus" :size="15" />+{{ Math.round(C.campaignExpBonus(best, game.stageIdx) * 100) }}%</span>
        <span class="flex items-center gap-1 text-gold-300"><Icon name="stone" :size="15" />{{ fmt(stoneIncome) }}/s</span>
        <span v-if="itemIncome.length" class="flex items-center gap-1 text-slate-300"><Icon name="herb" :size="15" />{{ itemIncome.length }} loại/giờ</span>
        <Icon name="info" :size="14" class="text-slate-500" />
      </div>
      <div v-else class="text-xs text-slate-400">Vượt ải đầu tiên để bắt đầu nhận thu nhập.</div>
    </button>

    <button class="btn-ghost min-h-[44px] w-full text-sm" :disabled="best < 1" @click="sheet = 'farm'">
      <Icon name="rest" :size="16" />{{ farming ? `Đang cày ải ${game.campaign.farm}` : 'Cày ải đã vượt' }}
    </button>

    <div class="px-1 text-xs text-slate-500">
      Từ lúc mở game: hạ {{ battle.run.kills }} yêu thú · +{{ fmt(battle.run.stones) }} linh thạch
      <span v-if="battle.run.gear.length"> · trang bị: {{ battle.run.gear.slice(-3).join(', ') }}</span>
      <span v-if="runItems.length"> · <span v-for="([id, n], i) in runItems" :key="id">{{ i ? ', ' : '' }}{{ itemName(id) }} x{{ n }}</span></span>
    </div>

    <!-- Bảng trượt -->
    <BottomSheet :open="!!sheet" :title="SHEET_TITLES[sheet] ?? ''" @close="sheet = null">
      <template v-if="sheet === 'mods'">
        <div v-for="m in nextMods" :key="m" class="mb-1.5">
          <b :class="C.ENEMY_MODS[m].kind === 'boss' ? 'text-cinnabar-400' : 'text-gold-200'">{{ C.ENEMY_MODS[m].name }}</b>
          <span class="text-slate-400"> · {{ C.ENEMY_MODS[m].desc }}</span>
        </div>
        <p v-if="!nextMods.length" class="text-slate-400">Ải này không có đặc tính đặc biệt.</p>
      </template>
      <template v-else-if="sheet === 'income'">
        <template v-if="best > 0">
          <div class="text-jade-300">+{{ Math.round(C.campaignExpBonus(best, game.stageIdx) * 100) }}% tốc độ linh khí (≈ +{{ fmt(expIncome) }}/giây)</div>
          <div class="text-gold-300">+{{ fmt(stoneIncome) }} linh thạch/giây</div>
          <div v-if="incomeAi < best" class="mt-1 text-xs text-slate-500">Đang tính đến ải {{ incomeAi }} (trần theo cảnh giới, đột phá để mở rộng thêm).</div>
          <div v-if="itemIncome.length" class="mt-1 text-slate-300">Mỗi giờ: <span v-for="(it, i) in itemIncome" :key="it.id">{{ i ? ', ' : '' }}{{ itemName(it.id) }} ~{{ it.perHour.toFixed(1) }}</span></div>
        </template>
      </template>
      <template v-else-if="sheet === 'farm'">
        <p class="mb-2 text-slate-400">{{ farming ? `Đang cày ải ${game.campaign.farm}, không tiến lên.` : 'Đang tiến lên. Chọn một ải đã vượt để đánh lặp lại (cày tàn quyển, trang bị).' }}</p>
        <div class="flex items-center gap-2">
          <button class="btn-ghost !px-3" :disabled="best < 1" @click="stepFarm(-1)">−</button>
          <input v-model.number="farmInput" type="number" min="1" :max="Math.max(1, best)" class="h-11 w-20 rounded border border-ink-600 bg-ink-900 px-2 text-center text-white" />
          <button class="btn-ghost !px-3" :disabled="best < 1" @click="stepFarm(1)">+</button>
        </div>
      </template>
      <template #actions>
        <template v-if="sheet === 'farm'">
          <button class="btn-gold" :disabled="best < 1" @click="battle.setFarm(Math.min(best, Math.max(1, farmInput || 1))); sheet = null">Cày ải này</button>
          <button class="btn-ghost" :disabled="!farming" @click="battle.setFarm(null); sheet = null">Tiến lên</button>
        </template>
      </template>
    </BottomSheet>
  </div>
</template>
