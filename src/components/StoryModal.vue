<script setup>
// StoryModal.vue - Trình đọc truyện kiểu tiểu thuyết tương tác: lời dẫn / thoại, nhập tên, lựa chọn.
// Chạm vào khung để sang cảnh kế (khi cảnh không có lựa chọn).
import { computed, ref, watch } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { SPEAKERS, chapterById } from '../game/story.js'
import Icon from './Icon.vue'
import Portrait from './Portrait.vue'

const game = useGameStore()

const view = computed(() => game.storyView)
const chapter = computed(() => (view.value ? chapterById(view.value.id) : null))
const scene = computed(() => (view.value ? game.storyCurrent() : null))
const progress = computed(() => {
  if (!chapter.value || !view.value) return 0
  return Math.min(1, Math.max(0, view.value.idx) / chapter.value.scenes.length)
})

const showResult = computed(() => view.value?.phase === 'result')
const isChoice = computed(() => !showResult.value && !!scene.value?.choice)
const isInput = computed(() => !showResult.value && !!scene.value?.input)
const speaker = computed(() => (!showResult.value ? scene.value?.speaker : null))
const speakerColor = computed(() => (speaker.value ? SPEAKERS[speaker.value] ?? '#ffe08a' : null))

const body = computed(() => {
  if (!scene.value) return ''
  if (showResult.value) return game.storyText(view.value.result)
  if (isChoice.value) return game.storyText(scene.value.choice.prompt)
  return game.storyText(scene.value.text)
})

// Ô nhập tên (lấy tên hiện tại làm mặc định)
const nameInput = ref('')
watch(isInput, (on) => {
  if (on) nameInput.value = game.name === 'Đạo hữu vô danh' ? '' : game.name
})
function submitName() {
  game.storySetName(nameInput.value)
}

function tap() {
  if (isChoice.value || isInput.value) return
  game.storyAdvance()
}
</script>

<template>
  <Transition name="modal">
    <div v-if="view && chapter && scene" class="absolute inset-0 z-[60] flex flex-col justify-end bg-black/80 p-3 backdrop-blur-[2px]">
      <div class="flex-1" @click="tap"></div>

      <div class="panel max-h-[80%] overflow-y-auto p-4" @click="tap">
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="title-rule flex-1 !text-xs">{{ chapter.title }}</div>
          <span v-if="view.replay" class="text-[11px] text-slate-500">đọc lại</span>
        </div>
        <div class="mb-2 h-0.5 overflow-hidden rounded bg-white/10">
          <div class="h-full bg-gold-400/70 transition-all duration-300" :style="{ width: progress * 100 + '%' }"></div>
        </div>

        <div class="flex items-start gap-3">
          <Portrait v-if="speaker" :name="speaker" :size="56" class="mt-0.5" />
          <div class="min-w-0 flex-1">
            <div v-if="speaker" class="mb-1 text-sm font-bold" :style="{ color: speakerColor }">{{ speaker }}</div>
            <p class="whitespace-pre-line text-[15px] leading-relaxed" :class="speaker ? 'text-slate-100' : 'italic text-slate-200'">{{ body }}</p>
          </div>
        </div>

        <!-- Hiệu ứng thưởng của lựa chọn -->
        <div v-if="showResult && view.effectsText.length" class="mt-2 text-center text-xs text-jade-300">{{ view.effectsText.join(' · ') }}</div>

        <!-- Nhập tên -->
        <div v-if="isInput" class="mt-3 flex gap-2" @click.stop>
          <input
            v-model="nameInput"
            maxlength="16"
            placeholder="Tên của ngươi"
            class="min-w-0 flex-1 rounded-lg border border-gold-500/40 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-gold-400"
            style="user-select: text"
            @keyup.enter="submitName"
          />
          <button class="btn-gold px-4" :disabled="!nameInput.trim()" @click="submitName">Xác nhận</button>
        </div>

        <!-- Lựa chọn -->
        <div v-else-if="isChoice" class="mt-3 space-y-2" @click.stop>
          <button
            v-for="(opt, i) in scene.choice.options"
            :key="i"
            class="btn-ghost w-full flex-col !items-start gap-0.5 text-left"
            :disabled="!game.optionAvailable(opt)"
            @click="game.storyChoose(i)"
          >
            <span>{{ game.storyText(opt.label) }}</span>
            <span v-if="game.optionLock(opt)" class="text-xs font-normal text-cinnabar-400">🔒 {{ game.optionLock(opt) }}</span>
          </button>
        </div>

        <div v-else class="mt-3 flex items-center justify-end gap-1 text-xs text-slate-500">
          Chạm để tiếp tục <Icon name="down" :size="12" class="animate-bounce" />
        </div>
      </div>
    </div>
  </Transition>
</template>
