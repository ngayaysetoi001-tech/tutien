<script setup>
// UpdateBanner.vue - Dải "Có bản mới": kiểm tra version.json định kỳ, bấm để lưu rồi tải lại bản mới.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { fetchLatestBuildId, isNewerBuild, reloadUrl } from '../services/version.js'
import Icon from './Icon.vue'

const game = useGameStore()
const latest = ref('')
const CHECK_EVERY = 5 * 60 * 1000
let timer = null

async function check() {
  const id = await fetchLatestBuildId()
  if (id && isNewerBuild(__BUILD_ID__, id)) latest.value = id
}
const onVisible = () => document.visibilityState === 'visible' && check()
function update() {
  game.save()
  window.location.replace(reloadUrl(window.location.href, latest.value))
}

onMounted(() => {
  check()
  timer = setInterval(check, CHECK_EVERY)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <button
    v-if="latest"
    class="absolute inset-x-2 top-2 z-40 flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gold-400 bg-ink-900/95 px-3 text-sm font-bold text-gold-200 shadow-lg shadow-black/60"
    @click="update"
  >
    <Icon name="refine" :size="16" />Có bản mới · bấm để cập nhật (tự lưu trước)
  </button>
</template>
