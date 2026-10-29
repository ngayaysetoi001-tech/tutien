<script setup>
// LogPanel.vue - Nhật ký tu luyện / chiến đấu. Thu gọn: một dòng mới nhất; chạm để mở rộng thành danh sách cuộn.
// Khi mở rộng tự cuộn xuống dòng mới nhất, trừ khi người chơi đang kéo lên đọc log cũ.
import { computed, nextTick, ref, watch } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { fmtClock } from '../game/format.js'
import Icon from './Icon.vue'

const game = useGameStore()
const box = ref(null)
const open = ref(false)

const TEXT = { info: 'text-slate-300', good: 'text-jade-300', bad: 'text-cinnabar-400', event: 'text-gold-300' }
const BORDER = { info: 'border-slate-500/50', good: 'border-jade-500/70', bad: 'border-cinnabar-500/70', event: 'border-gold-500/70' }

const last = computed(() => game.log[game.log.length - 1])

async function scrollToEnd() {
  await nextTick()
  if (box.value) box.value.scrollTop = box.value.scrollHeight
}

watch(
  () => game.log.length,
  async () => {
    const el = box.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    await nextTick()
    if (nearBottom) el.scrollTop = el.scrollHeight
  },
  { flush: 'pre' },
)

function toggle() {
  open.value = !open.value
  if (open.value) scrollToEnd()
}
</script>

<template>
  <div class="card flex flex-col overflow-hidden !p-0 transition-[height] duration-200" :class="open ? 'h-32' : 'h-8'">
    <button class="flex h-8 shrink-0 items-center gap-2 px-2.5 text-left" @click="toggle">
      <Icon name="log" :size="15" class="text-gold-400" />
      <span v-if="last && !open" class="min-w-0 flex-1 truncate text-xs" :class="TEXT[last.type] ?? TEXT.info">{{ last.text }}</span>
      <span v-else class="flex-1 text-xs font-bold tracking-wide text-gold-400">Nhật ký</span>
      <Icon :name="open ? 'down' : 'up'" :size="15" class="text-slate-400" />
    </button>
    <div v-show="open" ref="box" class="thin-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto border-t border-ink-600/60 px-2 py-1.5 text-xs leading-relaxed">
      <div v-for="entry in game.log" :key="entry.id" class="border-l-2 pl-1.5" :class="[TEXT[entry.type] ?? TEXT.info, BORDER[entry.type] ?? BORDER.info]">
        <span class="mr-1 text-slate-500">{{ fmtClock(entry.time) }}</span>{{ entry.text }}
      </div>
    </div>
  </div>
</template>
