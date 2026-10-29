<script setup>
// BottomNav.vue - Thanh điều hướng dưới đáy: mỗi ô là một màn hình riêng (tối đa 13 màn, 7 cột). Màn hiện dần khi mở khoá.
import { useGameStore } from '../stores/gameStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { computed, onMounted, watch } from 'vue'
import { unlockedScreens } from '../game/screens.js'
import Icon from './Icon.vue'

const game = useGameStore()
const ui = useUiStore()

const screens = computed(() => unlockedScreens(game))
// Chia đều các hàng: 8 màn -> 2 hàng x 4 cột chứ không phải 7 + 1
const cols = computed(() => {
  const rows = Math.ceil(screens.value.length / 7)
  return Math.ceil(screens.value.length / rows)
})

onMounted(() => {
  if (ui.legacySeen) ui.markSeen(screens.value.map((s) => s.id))
})
// Đang ở màn bị khoá (ví dụ sau luân hồi): quay về Nhân Vật
watch(
  () => [ui.tab, screens.value.length],
  () => {
    if (!screens.value.some((s) => s.id === ui.tab)) ui.go('character')
  },
)

/** Chấm đỏ báo có việc ở màn hình đó. */
function badge(id) {
  if (id === 'story') return game.loreUnread > 0 || (game.storyNext && !game.chapterLock(game.storyNext))
  if (id === 'achievements') return game.claimableCount > 0
  if (id === 'sect') return game.quests.some((q) => game.questDone(q))
  if (id === 'battle') return game.milestoneClaimable || !!game.bossChoice
  if (id === 'character') return game.dailyPending || game.canChoosePath || game.talentPending
  return !ui.seen[id] // màn vừa mở khoá, chưa ghé lần nào
}
</script>

<template>
  <nav class="safe-bottom panel mx-2 mb-1 grid shrink-0 gap-0.5 p-0.5" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }">
    <button v-for="s in screens" :key="s.id" class="nav-btn" :data-active="ui.tab === s.id" @click="ui.go(s.id)">
      <Icon :name="s.icon" :size="17" />
      <span class="leading-none">{{ s.label }}</span>
      <span
        v-if="badge(s.id)"
        class="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-cinnabar-500 shadow-[0_0_6px_rgb(229_73_58)]"
      ></span>
    </button>
  </nav>
</template>
