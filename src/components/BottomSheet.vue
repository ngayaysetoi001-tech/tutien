<script setup>
// BottomSheet.vue - Bảng trượt từ đáy màn hình: chi tiết một mục + nút hành động.
import Icon from './Icon.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  glyph: { type: String, default: '' },
  color: { type: String, default: '#e8d9a8' },
})
const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-back" @click.self="emit('close')">
        <div class="sheet panel" role="dialog">
          <div class="sheet__grab" aria-hidden="true"></div>
          <div class="sheet__head">
            <Icon v-if="glyph" :name="glyph" :size="22" :style="{ color }" />
            <b class="sheet__title" :style="{ color }">{{ title }}</b>
            <button class="sheet__x" aria-label="Đóng" @click="emit('close')"><Icon name="down" :size="20" /></button>
          </div>
          <div class="sheet__body thin-scroll"><slot /></div>
          <div v-if="$slots.actions" class="sheet__actions"><slot name="actions" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-back {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(0 0 0 / 0.55);
}
.sheet {
  width: 100%;
  max-width: 560px;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px 16px 0 0;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
}
.sheet__grab {
  width: 38px;
  height: 4px;
  margin: -4px auto 8px;
  border-radius: 2px;
  background: rgb(217 165 58 / 0.45);
}
.sheet__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.sheet__title {
  flex: 1;
  font-size: 17px;
}
.sheet__x {
  width: 44px;
  height: 44px;
  margin: -8px -8px -8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  background: none;
  border: 0;
}
.sheet__body {
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.45;
  color: #cbd5e1;
}
.sheet__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.sheet__actions :deep(button) {
  flex: 1;
  min-height: 44px;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.18s;
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.2s ease-out;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
