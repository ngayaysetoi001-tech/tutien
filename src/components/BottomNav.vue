<script setup>
// BottomNav.vue - Thanh điều hướng dưới đáy: 5 nhóm (Tu Luyện, Vượt Ải, Hành Trang, Môn Phái, Thêm).
// Màn con của mỗi nhóm là chip ở đầu màn hình (ScreenHost). Nhóm/màn hiện dần khi mở khoá.
import { useGameStore } from '../stores/gameStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { computed, onMounted, watch } from 'vue'
import { groupOf, groupScreens, unlockedGroups, unlockedScreens } from '../game/screens.js'
import { screenWork } from './badges.js'
import { navImg } from './glyphs.js'

const game = useGameStore()
const ui = useUiStore()

const groups = computed(() => unlockedGroups(game))
const screens = computed(() => unlockedScreens(game))
const currentGroup = computed(() => groupOf(ui.tab))

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

/** Bấm nhóm: về màn con gần nhất đã xem trong nhóm (nếu còn mở), không thì màn đầu tiên. */
function openGroup(id) {
  const list = groupScreens(id, game)
  const last = ui.lastInGroup[id]
  ui.go(list.some((s) => s.id === last) ? last : list[0].id)
}

/** Chấm đỏ của nhóm: có việc làm được ở màn con nào đó (trừ màn đang xem). */
const groupBadge = (id) => groupScreens(id, game).some((s) => s.id !== ui.tab && screenWork(game, s.id))
</script>

<template>
  <nav class="safe-bottom panel mx-2 mb-1 grid shrink-0 gap-0.5 p-0.5" :style="{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }">
    <button v-for="gr in groups" :key="gr.id" class="nav-btn" :data-active="currentGroup === gr.id" @click="openGroup(gr.id)">
      <img :src="navImg(gr.id)" alt="" class="nav-img" draggable="false" />
      <span class="leading-none">{{ gr.label }}</span>
      <span
        v-if="groupBadge(gr.id)"
        class="absolute right-3 top-1 h-2.5 w-2.5 rounded-full bg-cinnabar-500 shadow-[0_0_6px_rgb(229_73_58)]"
      ></span>
    </button>
  </nav>
</template>
