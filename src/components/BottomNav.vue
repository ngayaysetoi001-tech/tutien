<script setup>
// BottomNav.vue - Thanh điều hướng dưới đáy: mỗi ô là một màn hình riêng (13 màn, 2 hàng x 7 cột).
import { useGameStore } from '../stores/gameStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { SCREENS } from '../game/screens.js'
import Icon from './Icon.vue'

const game = useGameStore()
const ui = useUiStore()

/** Chấm đỏ báo có việc ở màn hình đó. */
function badge(id) {
  if (id === 'story') return game.loreUnread > 0 || (game.storyNext && !game.chapterLock(game.storyNext))
  if (id === 'achievements') return game.claimableCount > 0
  if (id === 'sect') return game.quests.some((q) => game.questDone(q))
  return false
}
</script>

<template>
  <nav class="safe-bottom panel mx-2 mb-1 grid shrink-0 grid-cols-7 gap-0.5 p-0.5">
    <button v-for="s in SCREENS" :key="s.id" class="nav-btn" :data-active="ui.tab === s.id" @click="ui.go(s.id)">
      <Icon :name="s.icon" :size="17" />
      <span class="leading-none">{{ s.label }}</span>
      <span
        v-if="badge(s.id)"
        class="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-cinnabar-500 shadow-[0_0_6px_rgb(229_73_58)]"
      ></span>
    </button>
  </nav>
</template>
