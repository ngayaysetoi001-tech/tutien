<script setup>
// GameCanvas.vue - Gắn CultivatorScene (PixiJS) vào DOM và đồng bộ state từ store.
// Overlay HTML hiển thị tên cảnh giới và thanh khí huyết khi độ kiếp.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CultivatorScene } from '../pixi/CultivatorScene.js'
import { useGameStore } from '../stores/gameStore.js'
import { useBattleStore } from '../stores/battleStore.js'
import { useUiStore } from '../stores/uiStore.js'
import { DUNGEONS } from '../game/data.js'
import * as B from '../game/battle.js'
import { ELEMENTS } from '../game/elements.js'
import { fmt } from '../game/format.js'
import Icon from './Icon.vue'

const props = defineProps({ active: { type: Boolean, default: true } }) // canvas có đang hiện không
const game = useGameStore()
const battle = useBattleStore()
const ui = useUiStore()
const host = ref(null)
const error = ref('')
let scene = null

/** Đẩy các giá trị cần thiết từ store sang scene (rẻ, gọi mỗi khi chúng đổi). */
function pushState() {
  scene?.setState({
    realmIdx: game.realmIdx,
    fill: game.progress,
    particles: game.settings.particles,
    weapon: game.equippedItems[0]?.rarity ?? null,
    // Bạch Linh xuất hiện sau chương "Đồng Môn"; thêm một đuôi mỗi 3 bậc tu vi (tối đa 9)
    companion: game.story.done >= 2 ? Math.min(9, 1 + Math.floor(Math.max(game.stageIdx, game.stats.maxStage) / 3)) : 0,
  })
}

onMounted(async () => {
  scene = new CultivatorScene()
  try {
    await scene.init(host.value)
    pushState()
    scene.setActive(props.active)
    syncBattle()
  } catch (e) {
    // WebGL không khả dụng... game vẫn chơi được bằng phần UI
    error.value = 'Không khởi tạo được đồ hoạ WebGL: ' + (e?.message ?? e)
  }
})

watch(
  () => [game.realmIdx, game.progress, game.settings.particles, game.equippedItems[0]?.rarity ?? null, game.story.done, game.stageIdx],
  pushState,
)

// Ẩn canvas (sang màn không có cảnh) thì vẽ chậm lại để tiết kiệm pin; logic game vẫn chạy bình thường
/**
 * Cảnh chiến đấu hiển thị ở màn Bí Cảnh: trận thật khi đang đánh, còn không thì xem trước bí cảnh hiện tại
 * (bí cảnh đánh gần nhất, hoặc bí cảnh đầu tiên đã mở) với yêu thú đầu tiên và khí huyết đầy.
 */
const view = computed(() => {
  if (battle.inFight) {
    return { preview: false, dungeon: battle.dungeon, enemy: battle.enemy, hp: battle.hp, maxHp: battle.maxHp }
  }
  if (ui.tab !== 'battle') return null
  const last = DUNGEONS.find((d) => d.id === game.settings.lastDungeon)
  const dungeon = last && game.stageIdx >= last.minStage ? last : (DUNGEONS.find((d) => game.stageIdx >= d.minStage) ?? DUNGEONS[0])
  const [id, tmpl] = B.pickMonster(dungeon, 1, () => 0)
  const stats = B.enemyStats(dungeon, tmpl, 1)
  const maxHp = battle.playerStats().hp
  return {
    preview: true,
    dungeon,
    enemy: { id, name: tmpl.name, kind: tmpl.kind, color: tmpl.color, element: tmpl.element, boss: !!tmpl.boss, hp: stats.hp, maxHp: stats.hp },
    hp: maxHp,
    maxHp,
  }
})

function syncBattle() {
  const v = view.value
  scene?.syncBattle({ active: !!v, dungeonId: v?.dungeon?.id ?? null, enemy: v?.enemy ?? null })
}
watch(
  () => props.active,
  (v) => {
    scene?.setActive(v)
    if (v) syncBattle()
  },
)
// Đổi màn, vào/ra trận, đổi bí cảnh hoặc yêu thú -> cảnh theo kịp
watch(() => [ui.tab, battle.phase, view.value?.dungeon?.id, view.value?.enemy?.kind, view.value?.enemy?.boss], syncBattle)

onBeforeUnmount(() => {
  scene?.destroy()
  scene = null
})
</script>

<template>
  <div class="absolute inset-0">
    <div ref="host" class="absolute inset-0"></div>

    <!-- Bí Cảnh đang đánh: tên và tầng (cảnh giới, linh thạch đã có ở thanh trên) -->
    <div v-if="view" class="pointer-events-none absolute right-2.5 top-2.5">
      <div class="hud-chip border-gold-500/50 text-slate-200">
        <Icon name="dungeon" :size="13" class="text-gold-400" />
        <span class="max-w-[8.5rem] truncate">{{ view.dungeon?.name }}</span>
        <span class="text-gold-300">
          <template v-if="view.preview">{{ battle.phase === 'resting' ? (battle.lastResult === 'clear' ? 'Thông quan' : 'Hồi phục') : 'Sẵn sàng' }}</template>
          <template v-else>{{ battle.floor }}/{{ view.dungeon?.floors }}</template>
        </span>
      </div>
    </div>

    <!-- Bí Cảnh: thanh khí huyết hai bên -->
    <div v-if="view" class="pointer-events-none absolute inset-x-3 bottom-2 flex items-end justify-between gap-3">
      <div class="w-[44%]">
        <div class="mb-0.5 flex items-center gap-1 text-[11px] font-bold text-jade-300 [text-shadow:0_1px_3px_#000]">
          <Icon name="heart" :size="12" />{{ Math.ceil(view.hp) }}/{{ view.maxHp }}
          <span v-if="!view.preview && battle.shield > 0 && battle.clock < battle.shieldUntil" class="flex items-center gap-0.5 text-sky-300">
            <Icon name="shield" :size="11" />{{ battle.shield }}
          </span>
        </div>
        <div class="hp-track"><div class="hp-fill from-jade-600 to-jade-300 bg-gradient-to-r" :style="{ width: (view.maxHp > 0 ? (view.hp / view.maxHp) * 100 : 0) + '%' }"></div></div>
      </div>
      <div v-if="view.enemy" class="w-[44%] text-right">
        <div class="mb-0.5 truncate text-[11px] font-bold [text-shadow:0_1px_3px_#000]" :class="view.enemy.boss ? 'text-cinnabar-400' : 'text-slate-100'">
          <Icon name="heart" :size="11" class="mr-0.5 inline text-cinnabar-400" />{{ fmt(Math.max(0, Math.ceil(view.enemy.hp))) }}/{{ fmt(Math.round(view.enemy.maxHp)) }}
        </div>
        <div class="mb-0.5 truncate text-[11px] font-bold [text-shadow:0_1px_3px_#000]" :class="view.enemy.boss ? 'text-cinnabar-400' : 'text-slate-100'">
          <span :style="{ color: ELEMENTS[view.enemy.element]?.css }">[{{ ELEMENTS[view.enemy.element]?.name }}]</span> {{ view.enemy.name }}
        </div>
        <div class="hp-track">
          <div class="hp-fill ml-auto from-cinnabar-500 to-gold-400 bg-gradient-to-l" :style="{ width: (view.enemy.hp / view.enemy.maxHp) * 100 + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Thanh khí huyết khi độ kiếp -->
    <div v-if="game.tribulation.active" class="pointer-events-none absolute inset-x-6 bottom-3">
      <div class="mb-1 flex items-center justify-between text-xs font-bold text-cinnabar-400 [text-shadow:0_1px_3px_#000]">
        <span class="flex items-center gap-1"><Icon name="bolt" :size="13" />{{ game.tribulation.name }}</span>
        <span>Lôi {{ game.tribulation.bolt }}/{{ game.tribulation.total }}</span>
      </div>
      <div class="hp-track h-3">
        <div class="hp-fill from-cinnabar-500 to-gold-400 bg-gradient-to-r !duration-500" :style="{ width: (game.tribulation.hp / game.tribulation.maxHp) * 100 + '%' }"></div>
      </div>
      <div class="mt-0.5 text-center text-[11px] text-slate-200 [text-shadow:0_1px_3px_#000]">
        Khí huyết {{ game.tribulation.hp }} / {{ game.tribulation.maxHp }}
      </div>
    </div>

    <div v-if="error" class="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-cinnabar-400">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.hud-plaque {
  border: 1px solid rgb(217 165 58 / 0.45);
  border-radius: 8px;
  padding: 4px 10px 5px;
  background: linear-gradient(180deg, rgb(8 12 22 / 0.72), rgb(8 12 22 / 0.45));
  backdrop-filter: blur(3px);
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.4), inset 0 1px 0 rgb(255 255 255 / 0.06);
}
.hud-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid rgb(217 165 58 / 0.3);
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 11px;
  background: rgb(8 12 22 / 0.62);
  backdrop-filter: blur(3px);
}
.hp-track {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgb(217 165 58 / 0.4);
  background: rgb(0 0 0 / 0.65);
  box-shadow: inset 0 1px 3px rgb(0 0 0 / 0.7);
}
.hp-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.15s;
}
</style>
