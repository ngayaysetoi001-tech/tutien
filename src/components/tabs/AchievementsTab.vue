<script setup>
// AchievementsTab.vue - Thành tựu theo mốc: tiến độ tới mốc kế và nút nhận thưởng.
import { useGameStore } from '../../stores/gameStore.js'
import { ACHIEVEMENTS } from '../../game/achievements.js'

const game = useGameStore()

const tierOf = (a) => game.achTier[a.id] ?? 0
const done = (a) => tierOf(a) >= a.targets.length
const target = (a) => a.targets[Math.min(tierOf(a), a.targets.length - 1)]
const value = (a) => Math.min(game.achievementValue(a.key), target(a))
</script>

<template>
  <div class="space-y-2">
    <div v-for="a in ACHIEVEMENTS" :key="a.id" class="card" :class="{ 'opacity-60': done(a) }">
      <div class="flex items-center justify-between">
        <div class="text-sm font-bold text-white">{{ a.name }}</div>
        <div class="text-xs text-gold-300">Mốc {{ Math.min(tierOf(a) + 1, a.targets.length) }}/{{ a.targets.length }}</div>
      </div>
      <div class="text-xs text-slate-400">{{ a.desc }}</div>
      <div class="mt-1 flex items-center gap-2">
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-black/50">
          <div class="h-full bg-gradient-to-r from-jade-600 to-jade-300" :style="{ width: (value(a) / target(a)) * 100 + '%' }"></div>
        </div>
        <span class="w-20 text-right text-xs text-slate-300">{{ value(a) }}/{{ target(a) }}</span>
        <button class="btn-gold px-2 py-0.5 text-xs" :disabled="!game.achievementClaimable(a)" @click="game.claimAchievement(a.id)">
          {{ done(a) ? 'Xong' : 'Nhận' }}
        </button>
      </div>
    </div>
  </div>
</template>
