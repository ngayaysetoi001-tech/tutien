<script setup>
// ProgressBar.vue - Thanh Tu Vi (value: 0..1): viền vàng, vệt sáng chạy, vạch chia 25%, nhấp nháy khi đầy.
defineProps({
  value: { type: Number, required: true },
  label: { type: String, default: '' },
  full: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }, // thanh mỏng cho thanh trên
})
</script>

<template>
  <div class="bar" :class="compact ? 'h-[18px]' : 'h-7'">
    <div
      class="bar-fill"
      :class="full ? 'animate-pulse bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500' : 'bg-gradient-to-r from-jade-600 via-jade-400 to-jade-300'"
      :style="{ width: Math.max(2, Math.min(1, value) * 100) + '%' }"
    ></div>
    <!-- vạch chia 25% -->
    <div class="pointer-events-none absolute inset-0 flex">
      <div v-for="i in 4" :key="i" class="flex-1" :class="i < 4 ? 'border-r border-white/10' : ''"></div>
    </div>
    <div :class="compact ? 'text-[10px]' : 'text-[11px]'" class="absolute inset-0 flex items-center justify-center font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
      {{ label }}
    </div>
  </div>
</template>
