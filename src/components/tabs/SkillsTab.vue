<script setup>
// SkillsTab.vue - Công pháp: học bằng tàn quyển, thăng cấp, trang bị vào các ô (tự thi triển trong Bí Cảnh).
import { useGameStore } from '../../stores/gameStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { LEARN_COST, SKILLS, SKILL_MAX_LEVEL, fragmentId, skillDesc, upgradeCost } from '../../game/skills.js'

const game = useGameStore()

const slotLabel = (i) => (i === 0 ? '' : i === 1 ? 'Mở ở Trúc Cơ' : 'Mở ở Kim Đan')
const equippedAt = (id) => game.skills.slots.indexOf(id)
const frags = (id) => game.itemCount(fragmentId(id))

/** Trang bị vào ô trống đầu tiên đã mở, nếu hết ô thì thay ô cuối. */
function equip(id) {
  const free = game.skills.slots.findIndex((x, i) => i < game.skillSlots && !x)
  game.equipSkill(id, free >= 0 ? free : game.skillSlots - 1)
}
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="title-rule mb-1.5">Ô công pháp (tự thi triển khi hồi chiêu xong)</div>
      <div class="grid grid-cols-3 gap-1.5">
        <div
          v-for="i in 3"
          :key="i"
          class="rounded border px-1.5 py-2 text-center text-[11px]"
          :class="i - 1 < game.skillSlots ? 'border-ink-600 bg-ink-900' : 'border-ink-700 bg-ink-900/40 text-slate-600'"
        >
          <template v-if="i - 1 < game.skillSlots">
            <div v-if="game.skills.slots[i - 1]" :style="{ color: ELEMENTS[SKILLS[game.skills.slots[i - 1]].element].css }" class="font-bold">
              {{ SKILLS[game.skills.slots[i - 1]].name }}
            </div>
            <div v-else class="text-slate-500">Trống</div>
          </template>
          <template v-else>🔒 {{ slotLabel(i - 1) }}</template>
        </div>
      </div>
    </div>

    <div v-for="(skill, id) in SKILLS" :key="id" class="card">
      <div class="flex items-center justify-between">
        <div class="text-sm font-bold" :style="{ color: ELEMENTS[skill.element].css }">
          {{ skill.name }}
          <span class="text-[10px] font-normal text-slate-400">({{ ELEMENTS[skill.element].name }})</span>
        </div>
        <div v-if="game.skills.owned[id]" class="text-xs text-gold-300">Cấp {{ game.skills.owned[id] }}/{{ SKILL_MAX_LEVEL }}</div>
        <div v-else class="text-[11px] text-slate-400">Tàn quyển {{ frags(id) }}/{{ LEARN_COST }}</div>
      </div>
      <p class="mt-0.5 text-[11px] text-slate-400">{{ skillDesc(id, game.skills.owned[id] ?? 1) }}</p>

      <div class="mt-1.5 flex gap-1.5">
        <template v-if="game.skills.owned[id]">
          <button v-if="equippedAt(id) >= 0" class="btn-ghost flex-1 py-1 text-xs" @click="game.unequipSkill(equippedAt(id))">Tháo</button>
          <button v-else class="btn-jade flex-1 py-1 text-xs" @click="equip(id)">Trang bị</button>
          <button
            class="btn-gold flex-1 py-1 text-xs"
            :disabled="game.skills.owned[id] >= SKILL_MAX_LEVEL || frags(id) < upgradeCost(game.skills.owned[id])"
            @click="game.upgradeSkill(id)"
          >
            Thăng cấp ({{ frags(id) }}/{{ game.skills.owned[id] >= SKILL_MAX_LEVEL ? '-' : upgradeCost(game.skills.owned[id]) }})
          </button>
        </template>
        <button v-else class="btn-gold w-full py-1 text-xs" :disabled="frags(id) < LEARN_COST" @click="game.learnSkill(id)">
          Học ({{ LEARN_COST }} tàn quyển)
        </button>
      </div>
    </div>
  </div>
</template>
