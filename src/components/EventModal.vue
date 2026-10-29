<script setup>
// EventModal.vue - Hộp thoại kỳ ngộ ngẫu nhiên: chọn phương án, xem kết quả.
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { eventById } from '../game/randomEvents.js'

const game = useGameStore()
const ev = computed(() => (game.event ? eventById(game.event.id) : null))
</script>

<template>
  <Transition name="modal">
  <div v-if="game.event && ev" class="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-5 backdrop-blur-[2px]">
    <div class="panel w-full max-w-sm p-4">
      <h2 class="title-rule mb-2 !text-base">{{ ev.title }}</h2>
      <p class="mb-3 text-sm text-slate-300">{{ ev.text }}</p>

      <div v-if="game.event.phase === 'choose'" class="space-y-2">
        <button v-for="(choice, i) in ev.choices" :key="i" class="btn-ghost w-full text-left" @click="game.chooseEvent(i)">
          {{ choice.label }}<span v-if="choice.fight" class="ml-1 text-xs text-cinnabar-400">(giao chiến)</span>
        </button>
      </div>

      <div v-else>
        <p class="mb-2 rounded bg-ink-900 p-2 text-sm text-slate-100">{{ game.event.resultText }}</p>
        <div v-if="game.event.effectsText.length" class="mb-3 text-center text-xs text-jade-300">
          {{ game.event.effectsText.join(' · ') }}
        </div>
        <div v-if="game.event.next" class="mb-2 text-center text-xs italic text-gold-300">… câu chuyện còn tiếp …</div>
        <button class="btn-gold w-full" @click="game.closeEvent()">Tiếp tục</button>
      </div>
    </div>
  </div>
  </Transition>
</template>
