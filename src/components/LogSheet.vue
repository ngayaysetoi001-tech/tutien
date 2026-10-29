<script setup>
// LogSheet.vue - Bảng nhật ký đầy đủ, mở từ nút trên thanh trên (dùng được ở mọi màn hình).
import { nextTick, ref, watch } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { fmtClock } from '../game/format.js'
import Icon from './Icon.vue'

const game = useGameStore()
const ui = useUiStore()
const box = ref(null)

const TEXT = { info: 'text-slate-300', good: 'text-jade-300', bad: 'text-cinnabar-400', event: 'text-gold-300' }
const BORDER = { info: 'border-slate-500/50', good: 'border-jade-500/70', bad: 'border-cinnabar-500/70', event: 'border-gold-500/70' }

// Mở ra thì cuộn xuống dòng mới nhất
watch(
  () => ui.logOpen,
  async (open) => {
    if (!open) return
    await nextTick()
    if (box.value) box.value.scrollTop = box.value.scrollHeight
  },
)
</script>

<template>
  <Transition name="modal">
    <div v-if="ui.logOpen" class="absolute inset-0 z-30 flex flex-col justify-end bg-black/60" @click.self="ui.logOpen = false">
      <div class="panel mx-2 mb-2 flex max-h-[70%] min-h-[40%] flex-col p-2">
        <div class="mb-1 flex items-center justify-between">
          <h2 class="title-rule flex-1 !text-[12px]"><Icon name="log" :size="14" />Nhật ký</h2>
          <button class="btn-ghost !px-2 !py-0.5 text-xs" @click="ui.logOpen = false">Đóng</button>
        </div>
        <div ref="box" class="thin-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto text-xs leading-relaxed">
          <div v-for="entry in game.log" :key="entry.id" class="border-l-2 pl-1.5" :class="[TEXT[entry.type] ?? TEXT.info, BORDER[entry.type] ?? BORDER.info]">
            <span class="mr-1 text-slate-500">{{ fmtClock(entry.time) }}</span>{{ entry.text }}
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
