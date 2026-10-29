<script setup>
// Icon.vue - Bộ icon nét mảnh (SVG nội tuyến, đổi màu theo `currentColor`).
import { computed } from 'vue'
import { GLYPHS } from './glyphs.js'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
})

// Mỗi icon vẽ trong khung 24x24, stroke 1.7, không tô nền.
const PATHS = {
  character: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/>',
  skills: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a4.25 4.25 0 0 1 0 8.5 4.25 4.25 0 0 0 0 8.5"/><circle cx="12" cy="7.8" r="1"/><circle cx="12" cy="16.2" r="1"/>',
  gear: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/><path d="M12 8v8M9 12h6"/>',
  dungeon: '<path d="M2.5 20L9 8l4 7 3-5 5.5 10z"/><path d="M9 8l-1-3"/>',
  bag: '<path d="M6 8h12l1 12H5z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/><path d="M9.5 13h5"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  garden: '<path d="M5 19c0-8 5-13.5 14.5-14.5C19 14 14 19.5 5 19z"/><path d="M5 19c3-4.5 6-7.5 10-9.5"/>',
  reborn: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/><circle cx="12" cy="12" r="1.5"/>',
  trophy: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  stone: '<path d="M6.5 4h11l3.5 5-9 11.5L3 9z"/><path d="M3 9h18M9 4l3 5 3-5M12 9v11.5"/>',
  lotus: '<path d="M12 20.5c-4.2 0-8-2-9-6 3 0 5 1 6 3 0-4 1-8 3-11.5 2 3.5 3 7.5 3 11.5 1-2 3-3 6-3-1 4-4.800 6-9 6z"/>',
  bolt: '<path d="M13.5 2L4.5 14h6.5l-1 8 9.500-12.500h-6.500z"/>',
  heart: '<path d="M12 20.500s-8-4.800-8-10.500a4.500 4.500 0 0 1 8-2.800 4.500 4.500 0 0 1 8 2.800c0 5.700-8 10.500-8 10.500z"/>',
  sword: '<path d="M5 19L17.500 6.500"/><path d="M14 6h4.500v4.500"/><path d="M4 20.500l3-3M7.500 14.500l2 2"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8.500-7 10-4-1.500-7-5-7-10V6z"/>',
  speed: '<path d="M3 12h9M6 7.500h9M6 16.500h9"/><path d="M15 9l6 3-6 3"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.500 2.500M15.500 15.500L18 18M18 6l-2.500 2.500M8.500 15.500L6 18"/>',
  log: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 13h6"/>',
  sect: '<path d="M3 9l9-5 9 5"/><path d="M5 9v10M9 9v10M15 9v10M19 9v10"/><path d="M3 20h18"/>',
  disciple: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.500 2.500-6 6-6s6 2.500 6 6"/><path d="M15 14.500c3 0 5 2 5 5"/>',
  quest: '<path d="M5 21V4"/><path d="M5 4h12l-2.500 4 2.500 4H5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M9 8h6M9 12h6"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  pill: '<circle cx="12" cy="12" r="7.500"/><path d="M12 4.500v15M4.500 12h15"/>',
  herb: '<path d="M12 21V10"/><path d="M12 14c-4 0-6-2.500-6-6 4 0 6 2.500 6 6zM12 12c0-3 2-5.500 6-5.500 0 3.500-2 5.500-6 5.500z"/>',
  scroll: '<path d="M7 4h11a2 2 0 0 1 2 2v1H9v11a2 2 0 0 1-4 0V6a2 2 0 0 1 2-2z"/><path d="M9 18h9a2 2 0 0 0 2-2V7"/>',
}

const inner = computed(() => PATHS[props.name] ?? GLYPHS[props.name] ?? '')
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
    v-html="inner"
  ></svg>
</template>
