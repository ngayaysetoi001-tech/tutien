<script setup>
// ItemIcon.vue - Ô biểu tượng vuông: khung theo độ hiếm, glyph theo ngũ hành, huy hiệu cấp, thanh tiến độ.
const props = defineProps({
  glyph: { type: String, default: 'star' },
  src: { type: String, default: '' }, // ảnh vẽ (huy chương tròn không viền); có thì thay cho glyph
  color: { type: String, default: '#e8d9a8' }, // màu glyph (ngũ hành)
  frame: { type: String, default: '' }, // màu khung (độ hiếm); trống = khung vàng mờ
  label: { type: String, default: '' }, // tên ngắn dưới ô
  badge: { type: [String, Number], default: '' }, // góc dưới phải (cấp / số lượng)
  locked: { type: Boolean, default: false },
  dim: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  dot: { type: Boolean, default: false }, // chấm báo "có thể làm"
  tint: { type: String, default: '' }, // màu nền nhẹ (ngũ hành)
})
import { ref, watch } from 'vue'
import Icon from './Icon.vue'

// Nháy sáng khi huy hiệu (cấp / số lượng) thay đổi: phản hồi khi học, nâng cấp, nhận đồ
const flash = ref(false)
watch(
  () => props.badge,
  (n, o) => {
    if (o === undefined || n === o) return
    flash.value = false
    requestAnimationFrame(() => (flash.value = true))
    setTimeout(() => (flash.value = false), 700)
  },
)
</script>

<template>
  <button type="button" class="item-icon" :class="{ 'is-dim': dim && !locked, 'is-selected': selected, 'is-flash': flash, 'is-round': !!src, 'has-frame': !!frame && !locked, 'is-legend': frame === '#f472b6' }">
    <span class="item-icon__box" :style="{ '--frame': frame || undefined, background: tint ? `radial-gradient(circle at 50% 35%, ${tint}44, rgb(12 16 30 / 0.92))` : undefined }">
      <img v-if="src && !locked" :src="src" alt="" class="item-icon__img" draggable="false" />
      <Icon v-else :name="locked ? 'lock' : glyph" :size="26" :style="{ color: locked ? '#64748b' : color }" />
      <span v-if="badge !== ''" class="item-icon__badge">{{ badge }}</span>
      <span v-if="dot" class="item-icon__dot"></span>
    </span>
    <span v-if="label" class="item-icon__label">{{ label }}</span>
  </button>
</template>

<style scoped>
.item-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
  background: none;
  border: 0;
  padding: 0;
  color: inherit;
}
.item-icon__box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  max-width: 64px;
  border: 1.5px solid var(--frame, var(--gold-dim));
  border-radius: 10px;
  background: radial-gradient(circle at 50% 35%, rgb(40 52 84 / 0.7), rgb(12 16 30 / 0.9));
  transition: transform 0.12s, box-shadow 0.12s;
}
.is-round .item-icon__box {
  border-radius: 50%;
  overflow: visible;
  background: radial-gradient(circle at 50% 35%, rgb(40 52 84 / 0.7), rgb(12 16 30 / 0.9));
}
.item-icon__img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  pointer-events: none;
}
.item-icon:active .item-icon__box {
  transform: scale(0.94);
}
/* Khung có màu (độ hiếm / hệ): viền đôi và ánh sáng cùng màu */
.has-frame .item-icon__box {
  box-shadow: 0 0 9px color-mix(in srgb, var(--frame) 40%, transparent), inset 0 0 7px color-mix(in srgb, var(--frame) 22%, transparent);
}
.has-frame .item-icon__box::after {
  content: '';
  position: absolute;
  inset: 2.5px;
  border: 1px solid color-mix(in srgb, var(--frame) 38%, transparent);
  border-radius: inherit;
  pointer-events: none;
}
.is-legend .item-icon__box {
  animation: legend-glow 2.4s ease-in-out infinite;
}
@keyframes legend-glow {
  0%,
  100% {
    box-shadow: 0 0 8px rgb(244 114 182 / 0.35), inset 0 0 6px rgb(244 114 182 / 0.2);
  }
  50% {
    box-shadow: 0 0 18px rgb(244 114 182 / 0.75), inset 0 0 10px rgb(244 114 182 / 0.35);
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-legend .item-icon__box {
    animation: none;
  }
}
.is-dim .item-icon__box {
  opacity: 0.45;
}
.is-selected .item-icon__box {
  box-shadow: 0 0 0 2px var(--gold-line), 0 0 10px rgb(217 165 58 / 0.4);
}
.is-flash .item-icon__box {
  animation: icon-flash 0.7s ease-out;
}
@keyframes icon-flash {
  0% {
    box-shadow: 0 0 0 0 rgb(252 217 121 / 0.9);
    transform: scale(1.12);
  }
  100% {
    box-shadow: 0 0 0 12px rgb(252 217 121 / 0);
    transform: scale(1);
  }
}
.item-icon__badge {
  position: absolute;
  right: 2px;
  bottom: 1px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 3px;
  border-radius: 5px;
  background: rgb(0 0 0 / 0.65);
  color: #fcd979;
}
.item-icon__dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 2px #0b1020;
}
.item-icon__label {
  max-width: 100%;
  font-size: 12px;
  line-height: 1.15;
  color: #cbd5e1;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
</style>
