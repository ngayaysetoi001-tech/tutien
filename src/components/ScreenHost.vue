<script setup>
// ScreenHost.vue - Hiển thị màn hình hiện tại (mỗi tab một màn hình riêng).
//   Nhân Vật : (canvas tu luyện ở trên) nút Đột Phá, gợi ý, thông tin nhân vật, nhật ký
//   Vượt Ải  : (canvas chiến đấu ở trên) ải đang đánh, thu nhập thụ động, cày ải, nhật ký
//   Còn lại  : tiêu đề + nội dung chiếm toàn bộ chiều cao còn lại
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { nextHints } from '../game/guide.js'
import { nextGoal } from '../game/goals.js'
import { groupOf, groupScreens } from '../game/screens.js'
import { SCREEN_COMPONENTS } from './screens.js'
import LogPanel from './LogPanel.vue'
import { isNewScreen, screenWork } from './badges.js'
import Icon from './Icon.vue'

const game = useGameStore()
const ui = useUiStore()

const comp = computed(() => SCREEN_COMPONENTS[ui.tab])
const goal = computed(() => nextGoal(game))
// Chip chuyển màn con trong cùng nhóm (chỉ hiện khi nhóm có từ 2 màn đã mở)
const chips = computed(() => {
  const list = groupScreens(groupOf(ui.tab), game)
  return list.length > 1 ? list : []
})

// Gợi ý việc nên làm: gợi ý ưu tiên cao nhất chưa bị người chơi tắt (tắt đến khi tải lại trang)
const dismissed = ref([])
const hint = computed(() => nextHints(game).find((h) => !dismissed.value.includes(h.id)) ?? null)

const breakLabel = computed(() => {
  if (game.isMaxStage) return 'Cực hạn'
  const rate = Math.round(game.successChance * 100)
  return game.nextTribulation ? `Độ Kiếp ${rate}%` : `Đột Phá ${rate}%`
})
</script>

<template>
  <Transition name="tab" mode="out-in">
    <div :key="ui.tab" class="flex h-full min-h-0 flex-col gap-1.5 px-2.5 pt-1.5">
      <!-- Mục tiêu kế tiếp -->
      <button
        v-if="goal"
        class="relative shrink-0 overflow-hidden rounded border border-ink-600 bg-ink-900/70 px-2 py-0.5 text-left text-xs leading-tight text-slate-300"
        @click="goal.tab && ui.go(goal.tab)"
      >
        <span class="absolute inset-y-0 left-0 bg-jade-500/20" :style="{ width: Math.round(goal.progress * 100) + '%' }"></span>
        <span class="relative">🎯 {{ goal.label }}</span>
      </button>

      <!-- Chip chuyển màn con của nhóm -->
      <div v-if="chips.length" class="flex shrink-0 gap-1 overflow-x-auto no-bar">
        <button
          v-for="c in chips"
          :key="c.id"
          class="flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border px-2.5 text-[13px] font-bold transition"
          :class="ui.tab === c.id ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 bg-ink-900/70 text-slate-400'"
          @click="ui.go(c.id)"
        >
          <Icon :name="c.icon" :size="16" />{{ c.label }}
          <span v-if="ui.tab !== c.id && (screenWork(game, c.id) || isNewScreen(ui, c.id))" class="h-2 w-2 rounded-full bg-cinnabar-500"></span>
        </button>
      </div>
      <h1 v-else-if="!ui.hasCanvas" class="title-rule px-0.5 !text-sm"><Icon :name="ui.screen.icon" :size="17" class="text-gold-400" />{{ ui.screen.label }}</h1>

      <!-- Nút hành động: chỉ ở màn Nhân Vật -->
      <div v-if="ui.tab === 'character'" class="shrink-0">
        <button class="btn-gold btn-big w-full" :class="{ 'glow-ready': game.canBreakthrough }" :disabled="!game.canBreakthrough" @click="game.breakthrough()">
          <Icon name="bolt" :size="20" />{{ breakLabel }}
        </button>
      </div>

      <!-- Gợi ý việc nên làm -->
      <div
        v-if="ui.tab === 'character' && hint && !ui.tourShown"
        class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gold-500/35 bg-gold-500/10 py-1 pl-2 pr-1 text-xs leading-snug"
      >
        <Icon name="spark" :size="14" class="shrink-0 text-gold-400" />
        <span class="min-w-0 flex-1 text-gold-200">{{ hint.text }}</span>
        <button v-if="hint.tab" class="btn-gold shrink-0 !px-2 !py-0.5 text-xs" @click="ui.go(hint.tab)">Đi</button>
        <button class="shrink-0 px-1.5 text-slate-500 hover:text-slate-300" aria-label="Tắt gợi ý" @click="dismissed.push(hint.id)">✕</button>
      </div>

      <!-- Nội dung màn hình -->
      <div class="thin-scroll min-h-0 flex-1 overflow-y-auto pb-2">
        <component :is="comp" />
      </div>

      <!-- Nhật ký thu gọn: chỉ ở hai màn có cảnh -->
      <div v-if="ui.hasCanvas" class="shrink-0"><LogPanel /></div>
    </div>
  </Transition>
</template>
