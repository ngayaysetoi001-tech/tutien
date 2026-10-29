<script setup>
// ScreenHost.vue - Hiển thị màn hình hiện tại (mỗi tab một màn hình riêng).
//   Nhân Vật : (canvas tu luyện ở trên) nút Tụ Khí / Đột Phá, gợi ý, thông tin nhân vật, nhật ký
//   Bí Cảnh  : (canvas chiến đấu ở trên) danh sách bí cảnh, thu hoạch, nhật ký
//   Còn lại  : tiêu đề + nội dung chiếm toàn bộ chiều cao còn lại
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { nextHints } from '../game/guide.js'
import { SCREEN_COMPONENTS } from './screens.js'
import LogPanel from './LogPanel.vue'
import Icon from './Icon.vue'

const game = useGameStore()
const ui = useUiStore()

const comp = computed(() => SCREEN_COMPONENTS[ui.tab])

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
      <!-- Tiêu đề màn hình (các màn không có cảnh) -->
      <div v-if="!ui.hasCanvas" class="flex items-center gap-2 px-0.5">
        <Icon :name="ui.screen.icon" :size="17" class="text-gold-400" />
        <h1 class="title-rule flex-1 !text-[13px]">{{ ui.screen.label }}</h1>
      </div>

      <!-- Nút hành động: chỉ ở màn Nhân Vật -->
      <div v-if="ui.tab === 'character'" class="grid shrink-0 grid-cols-2 gap-2">
        <button class="btn-jade btn-big" :disabled="game.isFull || game.tribulation.active" @click="game.cultivate()">
          <Icon name="lotus" :size="20" />Tụ Khí
        </button>
        <button class="btn-gold btn-big" :class="{ 'glow-ready': game.canBreakthrough }" :disabled="!game.canBreakthrough" @click="game.breakthrough()">
          <Icon name="bolt" :size="20" />{{ breakLabel }}
        </button>
      </div>

      <!-- Gợi ý việc nên làm -->
      <div
        v-if="ui.tab === 'character' && hint"
        class="flex shrink-0 items-center gap-1.5 rounded-lg border border-gold-500/35 bg-gold-500/10 py-1 pl-2 pr-1 text-[11.5px] leading-snug"
      >
        <Icon name="spark" :size="14" class="shrink-0 text-gold-400" />
        <span class="min-w-0 flex-1 text-gold-200">{{ hint.text }}</span>
        <button v-if="hint.tab" class="btn-gold shrink-0 !px-2 !py-0.5 text-[11px]" @click="ui.go(hint.tab)">Đi</button>
        <button class="shrink-0 px-1.5 text-slate-500 hover:text-slate-300" aria-label="Tắt gợi ý" @click="dismissed.push(hint.id)">✕</button>
      </div>

      <!-- Nội dung màn hình -->
      <div class="panel min-h-0 flex-1 p-2">
        <div class="thin-scroll h-full overflow-y-auto pr-0.5">
          <component :is="comp" />
        </div>
      </div>

      <!-- Nhật ký thu gọn: chỉ ở hai màn có cảnh -->
      <div v-if="ui.hasCanvas" class="shrink-0"><LogPanel /></div>
    </div>
  </Transition>
</template>
