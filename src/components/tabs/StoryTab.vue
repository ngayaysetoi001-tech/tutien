<script setup>
// StoryTab.vue - Cốt Truyện: danh sách chương (đọc lại), Điển Tịch (tri thức thế giới), hành trình đạo tâm.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { CHAPTERS, ENDINGS, EXTRAS } from '../../game/story.js'
import { LORE, LORE_CATS } from '../../game/lore.js'
import Icon from '../Icon.vue'

const game = useGameStore()
const sub = ref('chapters') // chapters | lore
const cat = ref(LORE_CATS[0])
const openLore = ref(null)

const nextIdx = computed(() => game.story.done)
const finished = computed(() => game.story.done >= CHAPTERS.length)
const entries = computed(() => LORE.filter((e) => e.cat === cat.value))
const catUnread = (c) => LORE.filter((e) => e.cat === c && game.loreUnlocked(e) && !game.story.seen[e.id]).length
const loreCount = computed(() => `${LORE.filter((e) => game.loreUnlocked(e)).length}/${LORE.length}`)

function toggleLore(e) {
  if (!game.loreUnlocked(e)) return
  openLore.value = openLore.value === e.id ? null : e.id
  game.markLoreSeen(e.id)
}

function rename() {
  const name = window.prompt('Đổi tên nhân vật (tối đa 16 ký tự):', game.name)
  if (name !== null) game.rename(name)
}

const alignText = computed(() => {
  const a = game.story.align
  return a >= 4 ? 'Nhân tâm sáng tỏ' : a >= 1 ? 'Thiên về nhân từ' : a <= -3 ? 'Sát khí nặng' : a <= -1 ? 'Thiên về sát phạt' : 'Trung lập'
})
</script>

<template>
  <div class="space-y-2">
    <!-- Tóm tắt hành trình -->
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">{{ game.name }}</div>
        <button class="btn-ghost px-2 py-0.5 text-[11px]" @click="rename">Đổi tên</button>
      </div>
      <div v-if="game.story.title" class="text-xs font-bold text-gold-300">Danh hiệu: {{ game.story.title }}</div>
      <div class="mt-1 flex items-center justify-between text-[11px]">
        <span class="text-slate-400">Chương <b class="text-gold-300">{{ Math.min(game.story.done, CHAPTERS.length) }}/{{ CHAPTERS.length }}</b></span>
        <span class="text-slate-400">Đạo tâm: <b class="text-jade-300">{{ alignText }}</b> ({{ game.story.align }})</span>
      </div>
      <div v-if="game.story.ending" class="mt-0.5 text-[11px] text-slate-400">Kết cục: {{ ENDINGS[game.story.ending].name }}</div>
    </div>

    <div class="grid grid-cols-2 gap-1.5">
      <button class="btn-ghost py-1.5 text-xs" :class="sub === 'chapters' ? '!border-gold-500/70 !text-gold-300' : ''" @click="sub = 'chapters'">
        <Icon name="scroll" :size="14" />Chương truyện
      </button>
      <button class="btn-ghost relative py-1.5 text-xs" :class="sub === 'lore' ? '!border-gold-500/70 !text-gold-300' : ''" @click="sub = 'lore'">
        <Icon name="log" :size="14" />Điển Tịch <span class="text-[10px] text-slate-500">{{ loreCount }}</span>
        <span v-if="game.loreUnread > 0" class="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-cinnabar-500"></span>
      </button>
    </div>

    <!-- Chương truyện -->
    <template v-if="sub === 'chapters'">
      <div v-for="(ch, i) in CHAPTERS" :key="ch.id" class="card !py-2" :class="{ 'opacity-50': i > nextIdx }">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate text-sm font-bold" :class="i < nextIdx ? 'text-white' : i === nextIdx ? 'text-gold-300' : 'text-slate-500'">
              {{ i < nextIdx || i === nextIdx ? ch.title : 'Chương ' + (i + 1) + ': ???' }}
            </div>
            <div class="truncate text-[11px] text-slate-400">
              <template v-if="i < nextIdx">Đã hoàn thành</template>
              <template v-else-if="i === nextIdx">{{ game.chapterLock(ch) ?? 'Sẵn sàng, sẽ tự mở' }}</template>
              <template v-else>🔒 Hoàn thành chương trước</template>
            </div>
          </div>
          <button v-if="i < nextIdx" class="btn-ghost shrink-0 px-2 py-1 text-[11px]" @click="game.startStory(ch.id, true)">Đọc lại</button>
          <button v-else-if="i === nextIdx && !game.chapterLock(ch)" class="btn-gold shrink-0 px-2 py-1 text-[11px]" @click="game.checkStory()">Đọc</button>
        </div>
      </div>
      <div v-for="ex in EXTRAS" :key="ex.id" class="card !py-2" :class="{ 'opacity-50': !game.chapterDone(ex.id) }">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="text-sm font-bold" :class="game.chapterDone(ex.id) ? 'text-white' : 'text-slate-500'">
              {{ game.chapterDone(ex.id) ? ex.title : 'Chương phụ: ???' }}
            </div>
            <div class="text-[11px] text-slate-400">{{ game.chapterDone(ex.id) ? 'Đã hoàn thành' : ex.hint }}</div>
          </div>
          <button v-if="game.chapterDone(ex.id)" class="btn-ghost shrink-0 px-2 py-1 text-[11px]" @click="game.startStory(ex.id, true)">Đọc lại</button>
        </div>
      </div>
      <p v-if="finished" class="px-1 text-center text-[11px] text-slate-500">Câu chuyện chính đã khép lại, nhưng vòng luân hồi vẫn quay.</p>
    </template>

    <!-- Điển Tịch -->
    <template v-else>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="c in LORE_CATS"
          :key="c"
          class="relative rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          :class="cat === c ? 'border-gold-500/70 bg-gold-500/15 text-gold-300' : 'border-ink-600 bg-ink-800 text-slate-400'"
          @click="cat = c; openLore = null"
        >
          {{ c }}
          <span v-if="catUnread(c) > 0" class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cinnabar-500"></span>
        </button>
      </div>
      <div v-for="e in entries" :key="e.id" class="card !py-2" :class="{ 'opacity-50': !game.loreUnlocked(e) }">
        <button class="flex w-full items-center justify-between gap-2 text-left" @click="toggleLore(e)">
          <span class="text-sm font-bold" :class="game.loreUnlocked(e) ? 'text-white' : 'text-slate-500'">
            {{ game.loreUnlocked(e) ? e.title : '???' }}
            <span v-if="game.loreUnlocked(e) && !game.story.seen[e.id]" class="ml-1 rounded bg-cinnabar-500/30 px-1 text-[9px] text-cinnabar-400">MỚI</span>
          </span>
          <Icon v-if="game.loreUnlocked(e)" :name="openLore === e.id ? 'up' : 'down'" :size="14" class="text-slate-400" />
          <span v-else class="text-[10px] text-slate-500">🔒</span>
        </button>
        <p v-if="openLore === e.id" class="mt-1.5 text-[13px] leading-relaxed text-slate-300">{{ game.storyText(e.text) }}</p>
        <p v-else-if="!game.loreUnlocked(e) && e.hint" class="mt-0.5 text-[11px] text-slate-500">{{ e.hint }}</p>
      </div>
    </template>
  </div>
</template>
