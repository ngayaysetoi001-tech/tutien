<script setup>
// SkillsTab.vue - Công Pháp: hai tab con.
//   Võ Kỹ    : chiêu thức chủ động, học bằng tàn quyển, trang bị vào ô, tự thi triển khi Vượt Ải.
//   Công Pháp: tăng bị động liên tục, trang bị vào ô công pháp, thăng cấp bằng Công Pháp Tàn Quyển.
import { ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { LEARN_COST, SKILLS, SKILL_MAX_LEVEL, canEquip, fragmentId, skillDesc, upgradeCost } from '../../game/skills.js'
import {
  ARTS, ART_LEARN_COST, ART_MAX_LEVEL, MAX_ART_SLOTS, artDesc, artFragmentId, artUpgradeCost,
} from '../../game/arts.js'
import { REALMS } from '../../game/constants.js'

const game = useGameStore()
const sub = ref('skills') // 'skills' | 'arts'
const SUBS = [
  { id: 'skills', label: 'Võ Kỹ' },
  { id: 'arts', label: 'Công Pháp' },
]

// ---------- Võ kỹ ----------
const skillSlotLabel = (i) => `Mở ở ${REALMS[[0, 1, 2, 4][i]].name}`
const equippedAt = (id) => game.skills.slots.indexOf(id)
const frags = (id) => game.itemCount(fragmentId(id))
const realmLocked = (id) => !canEquip(id, game.realmIdx)

/** Trang bị vào ô trống đầu tiên đã mở, nếu hết ô thì thay ô cuối. */
function equip(id) {
  const free = game.skills.slots.findIndex((x, i) => i < game.skillSlots && !x)
  game.equipSkill(id, free >= 0 ? free : game.skillSlots - 1)
}

// ---------- Công pháp ----------
const artSlotLabel = (i) => `Mở ở ${REALMS[Math.max(0, i - 1)].name}`
const artEquippedAt = (id) => game.arts.slots.indexOf(id)
const artFrags = (id) => game.itemCount(artFragmentId(id))
const sectElement = () => game.sectDef?.element ?? null
const artLocked = (id) => game.campaign.record < ARTS[id].minAi

function equipArt(id) {
  const free = game.arts.slots.findIndex((x, i) => i < game.artSlots && !x)
  game.equipArt(id, free >= 0 ? free : game.artSlots - 1)
}

const BONUS_LABELS = [
  ['exp', 'tốc độ linh khí'], ['hp', 'khí huyết'], ['atk', 'công kích'], ['def', 'phòng ngự'], ['speed', 'Thân pháp'],
  ['stones', 'linh thạch'], ['income', 'thu nhập ải'], ['luck', 'tỉ lệ rơi đồ'], ['elem', 'sát thương khắc hệ'], ['dao', 'Đạo Vận'],
]
const bonusLines = () => BONUS_LABELS.filter(([k]) => game.artBonus[k] > 0).map(([k, label]) => `+${Math.round(game.artBonus[k] * 100)}% ${label}`)
</script>

<template>
  <div class="space-y-2">
    <div class="grid grid-cols-2 gap-1.5">
      <button
        v-for="t in SUBS"
        :key="t.id"
        class="rounded border py-1.5 text-sm font-bold transition"
        :class="sub === t.id ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 bg-ink-900 text-slate-400'"
        @click="sub = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ===== Võ Kỹ ===== -->
    <template v-if="sub === 'skills'">
      <div class="card">
        <div class="title-rule mb-1.5">Ô võ kỹ (tự thi triển khi hồi chiêu xong)</div>
        <div class="grid grid-cols-4 gap-1.5">
          <div
            v-for="i in 4"
            :key="i"
            class="rounded border px-1 py-2 text-center text-[11px]"
            :class="i - 1 < game.skillSlots ? 'border-ink-600 bg-ink-900' : 'border-ink-700 bg-ink-900/40 text-slate-600'"
          >
            <template v-if="i - 1 < game.skillSlots">
              <div v-if="game.skills.slots[i - 1]" :style="{ color: ELEMENTS[SKILLS[game.skills.slots[i - 1]].element].css }" class="font-bold">
                {{ SKILLS[game.skills.slots[i - 1]].name }}
              </div>
              <div v-else class="text-slate-500">Trống</div>
            </template>
            <template v-else>🔒 {{ skillSlotLabel(i - 1) }}</template>
          </div>
        </div>
      </div>

      <div v-for="(skill, id) in SKILLS" :key="id" class="card">
        <div class="flex items-center justify-between">
          <div class="text-sm font-bold" :style="{ color: ELEMENTS[skill.element].css }">
            {{ skill.name }}
            <span class="text-[10px] font-normal text-slate-400">({{ ELEMENTS[skill.element].name }})</span>
            <span v-if="skill.kind === 'ultimate'" class="ml-1 rounded bg-cinnabar-500/60 px-1 text-[10px] font-normal text-white">Tuyệt kỹ</span>
          </div>
          <div v-if="game.skills.owned[id]" class="text-xs text-gold-300">Cấp {{ game.skills.owned[id] }}/{{ SKILL_MAX_LEVEL }}</div>
          <div v-else class="text-[11px] text-slate-400">Tàn quyển {{ frags(id) }}/{{ LEARN_COST }}</div>
        </div>
        <p class="mt-0.5 text-[11px] text-slate-400">{{ skillDesc(id, game.skills.owned[id] ?? 1) }}</p>

        <div class="mt-1.5 flex gap-1.5">
          <template v-if="game.skills.owned[id]">
            <button v-if="equippedAt(id) >= 0" class="btn-ghost flex-1 py-1 text-xs" @click="game.unequipSkill(equippedAt(id))">Tháo</button>
            <button v-else class="btn-jade flex-1 py-1 text-xs" :disabled="realmLocked(id)" @click="equip(id)">
              {{ realmLocked(id) ? `Cần ${REALMS[skill.minRealm].name}` : 'Trang bị' }}
            </button>
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
    </template>

    <!-- ===== Công Pháp (bị động) ===== -->
    <template v-else>
      <div class="card">
        <div class="title-rule mb-1.5">Ô công pháp (tăng bị động liên tục)</div>
        <div class="grid grid-cols-5 gap-1">
          <div
            v-for="i in MAX_ART_SLOTS"
            :key="i"
            class="rounded border px-0.5 py-2 text-center text-[10px] leading-tight"
            :class="i - 1 < game.artSlots ? 'border-ink-600 bg-ink-900' : 'border-ink-700 bg-ink-900/40 text-slate-600'"
          >
            <template v-if="i - 1 < game.artSlots">
              <div v-if="game.arts.slots[i - 1]" :style="{ color: ELEMENTS[ARTS[game.arts.slots[i - 1]].element].css }" class="font-bold">
                {{ ARTS[game.arts.slots[i - 1]].name }}
              </div>
              <div v-else class="text-slate-500">Trống</div>
            </template>
            <template v-else>🔒 {{ artSlotLabel(i - 1) }}</template>
          </div>
        </div>
        <div class="mt-1.5 text-[11px] text-slate-300">
          <template v-if="bonusLines().length"><span class="text-jade-300">Đang cộng:</span> {{ bonusLines().join(' · ') }}</template>
          <template v-else>Chưa trang bị công pháp nào. Hạ Tiểu Boss trở lên hoặc đổi ở cửa hàng tông môn để có tàn quyển.</template>
        </div>
        <div v-if="game.sectDef" class="mt-0.5 text-[11px] text-slate-500">
          Công pháp hệ <b :style="{ color: ELEMENTS[game.sectDef.element].css }">{{ ELEMENTS[game.sectDef.element].name }}</b> (cùng tông môn) được +50% hiệu quả.
        </div>
      </div>

      <div v-for="(art, id) in ARTS" :key="id" class="card" :class="{ 'opacity-60': artLocked(id) && !game.arts.owned[id] }">
        <div class="flex items-center justify-between">
          <div class="text-sm font-bold" :style="{ color: ELEMENTS[art.element].css }">
            {{ art.name }}
            <span class="text-[10px] font-normal text-slate-400">({{ ELEMENTS[art.element].name }})</span>
            <span v-if="sectElement() === art.element" class="ml-1 text-[10px] font-normal text-jade-300">+50% cùng hệ</span>
          </div>
          <div v-if="game.arts.owned[id]" class="text-xs text-gold-300">Cấp {{ game.arts.owned[id] }}/{{ ART_MAX_LEVEL }}</div>
          <div v-else class="text-[11px] text-slate-400">Tàn quyển {{ artFrags(id) }}/{{ ART_LEARN_COST }}</div>
        </div>
        <p class="mt-0.5 text-[11px] text-slate-400">
          {{ artDesc(id, game.arts.owned[id] ?? 1, sectElement()) }}
          <template v-if="game.arts.owned[id] && game.arts.owned[id] < ART_MAX_LEVEL"> (cấp sau: {{ artDesc(id, game.arts.owned[id] + 1, sectElement()) }})</template>
          <span v-if="artLocked(id) && !game.arts.owned[id]" class="text-cinnabar-400"> · rơi từ ải {{ art.minAi }} trở đi</span>
        </p>

        <div class="mt-1.5 flex gap-1.5">
          <template v-if="game.arts.owned[id]">
            <button v-if="artEquippedAt(id) >= 0" class="btn-ghost flex-1 py-1 text-xs" @click="game.unequipArt(artEquippedAt(id))">Tháo</button>
            <button v-else class="btn-jade flex-1 py-1 text-xs" @click="equipArt(id)">Trang bị</button>
            <button
              class="btn-gold flex-1 py-1 text-xs"
              :disabled="game.arts.owned[id] >= ART_MAX_LEVEL || artFrags(id) < artUpgradeCost(game.arts.owned[id])"
              @click="game.upgradeArt(id)"
            >
              Thăng cấp ({{ artFrags(id) }}/{{ game.arts.owned[id] >= ART_MAX_LEVEL ? '-' : artUpgradeCost(game.arts.owned[id]) }})
            </button>
          </template>
          <button v-else class="btn-gold w-full py-1 text-xs" :disabled="artFrags(id) < ART_LEARN_COST" @click="game.learnArt(id)">
            Học ({{ ART_LEARN_COST }} tàn quyển)
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
