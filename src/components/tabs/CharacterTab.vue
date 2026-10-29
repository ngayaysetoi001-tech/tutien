<script setup>
// CharacterTab.vue - Thông tin nhân vật: căn cốt, chỉ số, thống kê.
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { fmt, fmtDuration, fmtPercent } from '../../game/format.js'
import { ELEMENTS } from '../../game/elements.js'
import Icon from '../Icon.vue'
import { useUiStore } from '../../stores/uiStore.js'
import { SKILLS } from '../../game/skills.js'

// Vòng tương khắc: Kim > Mộc > Thổ > Thủy > Hỏa > Kim
const BEAT_TARGET = { kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim' }
const BEATEN_BY = Object.fromEntries(Object.entries(BEAT_TARGET).map(([a, b]) => [b, a]))

const game = useGameStore()
const ui = useUiStore()
const learned = computed(() => Object.keys(game.skills.owned).length)
const worn = computed(() => game.equippedItems.filter(Boolean).length)

const statRows = computed(() => [
  { label: 'Khí huyết', icon: 'heart', value: game.combat.hp, color: 'text-cinnabar-400' },
  { label: 'Công kích', icon: 'sword', value: game.combat.atk, color: 'text-gold-300' },
  { label: 'Phòng ngự', icon: 'shield', value: game.combat.def, color: 'text-sky-300' },
  { label: 'Thân pháp', icon: 'speed', value: game.combat.speed, color: 'text-jade-300' },
])
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">{{ game.name }}</div>
        <div class="text-xs text-gold-300">{{ game.stage.fullName }}</div>
      </div>
      <div class="mt-1 text-xs">
        Hệ ngũ hành: <b :style="{ color: ELEMENTS[game.element].css }">{{ ELEMENTS[game.element].name }}</b>
        <span class="text-slate-500">(khắc {{ ELEMENTS[BEAT_TARGET[game.element]].name }}, bị {{ ELEMENTS[BEATEN_BY[game.element]].name }} khắc)</span>
      </div>
      <div class="mt-1 text-xs text-slate-400">
        {{ game.spiritRoot.name }} (x{{ game.spiritRoot.mult }}) - {{ game.spiritRoot.desc }}
      </div>
    </div>

    <!-- Lối tắt tới các màn hình của nhân vật -->
    <div class="grid grid-cols-2 gap-2">
      <button class="card flex items-center gap-2 !py-2 text-left transition hover:brightness-125" @click="ui.go('skills')">
        <Icon name="skills" :size="22" class="text-jade-300" />
        <span>
          <span class="block text-xs font-bold text-white">Công Pháp</span>
          <span class="text-[11px] text-slate-400">{{ learned }}/{{ Object.keys(SKILLS).length }} đã học · {{ game.skillSlots }} ô</span>
        </span>
      </button>
      <button class="card flex items-center gap-2 !py-2 text-left transition hover:brightness-125" @click="ui.go('gear')">
        <Icon name="gear" :size="22" class="text-gold-300" />
        <span>
          <span class="block text-xs font-bold text-white">Trang Bị</span>
          <span class="text-[11px] text-slate-400">{{ worn }}/3 đang mặc · {{ game.gear.bag.length }} trong túi</span>
        </span>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div v-for="row in statRows" :key="row.label" class="card flex items-center gap-2.5 py-2">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-600 bg-black/30" :class="row.color">
          <Icon :name="row.icon" :size="18" />
        </span>
        <div>
          <div class="text-[11px] text-slate-400">{{ row.label }}</div>
          <div class="text-base font-bold leading-tight" :class="row.color">{{ fmt(row.value) }}</div>
        </div>
      </div>
    </div>

    <div class="card space-y-0.5 text-xs text-slate-300">
      <div class="flex justify-between"><span>Linh khí/giây</span><b class="text-jade-300">{{ fmt(game.expRate) }}</b></div>
      <div class="flex justify-between"><span>Linh thạch/giây</span><b class="text-gold-300">{{ fmt(game.stonesRate) }}</b></div>
      <div class="flex justify-between"><span>Tỉ lệ đột phá</span><b>{{ fmtPercent(game.successChance) }}</b></div>
      <div v-if="game.bonus.exp > 0" class="flex justify-between">
        <span>Thưởng linh khí vĩnh viễn</span><b class="text-jade-300">+{{ fmtPercent(game.bonus.exp) }}</b>
      </div>
      <div class="flex justify-between"><span>Luyện Đan</span><b>Cấp {{ game.alchemy.level }}</b></div>
      <div v-if="game.nextTribulation" class="flex justify-between">
        <span>Thiên kiếp kế tiếp</span><b class="text-cinnabar-400">{{ game.nextTribulation.bolts }} đạo lôi</b>
      </div>
      <div class="my-1 border-t border-ink-600"></div>
      <div class="flex justify-between"><span>Đột phá thành công</span><b>{{ game.stats.breakthroughs }}</b></div>
      <div class="flex justify-between"><span>Thất bại</span><b>{{ game.stats.failures }}</b></div>
      <div class="flex justify-between"><span>Thiên kiếp đã vượt</span><b>{{ game.stats.tribulations }}</b></div>
      <div class="flex justify-between"><span>Yêu thú đã hạ</span><b>{{ game.stats.kills }} ({{ game.stats.bossKills }} boss)</b></div>
      <div class="flex justify-between"><span>Tổng thời gian tu luyện</span><b>{{ fmtDuration(game.stats.playSeconds) }}</b></div>
    </div>
  </div>
</template>
