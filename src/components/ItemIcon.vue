<script setup>
// ItemIcon.vue - Ô biểu tượng vuông: khung theo độ hiếm, glyph theo ngũ hành, huy hiệu cấp, thanh tiến độ.
defineProps({
  glyph: { type: String, default: 'star' },
  color: { type: String, default: '#e8d9a8' }, // màu glyph (ngũ hành)
  frame: { type: String, default: '' }, // màu khung (độ hiếm); trống = khung vàng mờ
  label: { type: String, default: '' }, // tên ngắn dưới ô
  badge: { type: [String, Number], default: '' }, // góc dưới phải (cấp / số lượng)
  progress: { type: Number, default: -1 }, // 0..1, <0 = ẩn
  locked: { type: Boolean, default: false },
  dim: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  dot: { type: Boolean, default: false }, // chấm báo "có thể làm"
})
import Icon from './Icon.vue'
</script>

<template>
  <button type="button" class="item-icon" :class="{ 'is-dim': dim && !locked, 'is-selected': selected }">
    <span class="item-icon__box" :style="{ borderColor: frame || undefined }">
      <Icon :name="locked ? 'lock' : glyph" :size="26" :style="{ color: locked ? '#64748b' : color }" />
      <span v-if="badge !== ''" class="item-icon__badge">{{ badge }}</span>
      <span v-if="dot" class="item-icon__dot"></span>
      <span v-if="progress >= 0" class="item-icon__bar"><i :style="{ width: Math.min(100, progress * 100) + '%' }"></i></span>
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
  border: 1.5px solid var(--gold-dim);
  border-radius: 10px;
  background: radial-gradient(circle at 50% 35%, rgb(40 52 84 / 0.7), rgb(12 16 30 / 0.9));
  transition: transform 0.12s, box-shadow 0.12s;
}
.item-icon:active .item-icon__box {
  transform: scale(0.94);
}
.is-dim .item-icon__box {
  opacity: 0.45;
}
.is-selected .item-icon__box {
  box-shadow: 0 0 0 2px var(--gold-line), 0 0 10px rgb(217 165 58 / 0.4);
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
.item-icon__bar {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 3px;
  height: 3px;
  border-radius: 2px;
  background: rgb(0 0 0 / 0.55);
  overflow: hidden;
}
.item-icon__bar i {
  display: block;
  height: 100%;
  background: #fcd979;
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
