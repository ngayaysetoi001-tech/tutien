<script setup>
// SkillsTab.vue - Võ Kỹ / Công Pháp / Linh Thú (chọn bằng ui.tab): lưới biểu tượng + bảng chi tiết trượt từ đáy.
//   Võ Kỹ    : chiêu thức chủ động, học bằng tàn quyển, trang bị vào ô, tự thi triển khi Vượt Ải.
//   Công Pháp: tăng bị động liên tục, trang bị vào ô công pháp, thăng cấp bằng Công Pháp Tàn Quyển.
//   Linh Thú : ra trận đánh cùng, nuôi lớn bằng Linh Thú Phách.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useUiStore } from '../../stores/uiStore.js'
import { ELEMENTS } from '../../game/elements.js'
import { LEARN_COST, MAX_SKILL_SLOTS, SKILLS, SKILL_MAX_LEVEL, canEquip, fragmentId, skillDesc, upgradeCost } from '../../game/skills.js'
import { PATHS } from '../../game/paths.js'
import {
  ARTS, ART_LEARN_COST, ART_MAX_LEVEL, MAX_ART_SLOTS, artDesc, artFragmentId, artUpgradeCost,
} from '../../game/arts.js'
import { REALMS } from '../../game/constants.js'
import { MAX_PET_SLOTS, PETS, PET_LEARN_COST, PET_MAX_LEVEL, petDesc, petFragmentId, petUpgradeCost } from '../../game/pets.js'
import { ART_GLYPH, PET_GLYPH, SKILL_GLYPH } from '../glyphs.js'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

const game = useGameStore()
const ui = useUiStore()
const sub = computed(() => (ui.tab === 'arts' || ui.tab === 'pets' ? ui.tab : 'skills'))
const sel = ref(null) // id đang xem trong bảng chi tiết
const elCss = (e) => ELEMENTS[e].css

// ---------- Cấu hình theo loại: gom về cùng một giao diện ----------
const KINDS = {
  skills: {
    defs: SKILLS, glyph: SKILL_GLYPH, fragLabel: 'Tàn quyển', learnCost: LEARN_COST, maxLevel: SKILL_MAX_LEVEL,
    owned: () => game.skills.owned, slots: () => game.skills.slots, slotCount: () => game.skillSlots, maxSlots: MAX_SKILL_SLOTS,
    frags: (id) => game.itemCount(fragmentId(id)),
    upCost: upgradeCost,
    desc: (id, lv) => skillDesc(id, lv),
    locked: (id) => !canEquip(id, game.realmIdx, game.path),
    lockText: (id) => (SKILLS[id].path && SKILLS[id].path !== game.path ? `Cần ${PATHS[SKILLS[id].path].name}` : `Cần ${REALMS[SKILLS[id].minRealm ?? 0].name}`),
    slotHint: (i) => (i >= 4 ? 'Đạo lộ Pháp Tu' : REALMS[[0, 1, 2, 4][i]].name),
    learn: (id) => game.learnSkill(id),
    equip: (id) => game.equipSkill(id, freeSlot(game.skills.slots, game.skillSlots)),
    unequip: (i) => game.unequipSkill(i),
    upgrade: (id) => game.upgradeSkill(id),
    words: { equip: 'Trang bị', unequip: 'Tháo', up: 'Thăng cấp', learn: 'Học' },
  },
  arts: {
    defs: ARTS, glyph: ART_GLYPH, fragLabel: 'Tàn quyển', learnCost: ART_LEARN_COST, maxLevel: ART_MAX_LEVEL,
    owned: () => game.arts.owned, slots: () => game.arts.slots, slotCount: () => game.artSlots, maxSlots: MAX_ART_SLOTS,
    frags: (id) => game.itemCount(artFragmentId(id)),
    upCost: artUpgradeCost,
    desc: (id, lv) => artDesc(id, lv, game.sectDef?.element ?? null),
    locked: (id) => game.campaign.record < ARTS[id].minAi,
    lockText: (id) => `Ải ${ARTS[id].minAi}`,
    slotHint: (i) => REALMS[Math.max(0, i - 1)].name,
    learn: (id) => game.learnArt(id),
    equip: (id) => game.equipArt(id, freeSlot(game.arts.slots, game.artSlots)),
    unequip: (i) => game.unequipArt(i),
    upgrade: (id) => game.upgradeArt(id),
    words: { equip: 'Trang bị', unequip: 'Tháo', up: 'Thăng cấp', learn: 'Học' },
  },
  pets: {
    defs: PETS, glyph: PET_GLYPH, fragLabel: 'Phách', learnCost: PET_LEARN_COST, maxLevel: PET_MAX_LEVEL,
    owned: () => game.pets.owned, slots: () => game.pets.active, slotCount: () => game.petSlots, maxSlots: MAX_PET_SLOTS,
    frags: (id) => game.itemCount(petFragmentId(id)),
    upCost: petUpgradeCost,
    desc: (id, lv) => petDesc(id, lv, game.element),
    locked: (id) => game.campaign.record < PETS[id].minAi,
    lockText: (id) => `Ải ${PETS[id].minAi}`,
    slotHint: () => REALMS[4].name,
    learn: (id) => game.learnPet(id),
    equip: (id) => game.equipPet(id, freeSlot(game.pets.active, game.petSlots)),
    unequip: (i) => game.unequipPet(i),
    upgrade: (id) => game.upgradePet(id),
    words: { equip: 'Ra trận', unequip: 'Cất', up: 'Nuôi lớn', learn: 'Thu phục' },
  },
}
const TITLES = { skills: 'Ô võ kỹ', arts: 'Ô công pháp', pets: 'Linh thú ra trận' }
const k = computed(() => KINDS[sub.value])

/** Ô trống đầu tiên đã mở; hết ô thì thay ô cuối. */
function freeSlot(slots, count) {
  const free = slots.findIndex((x, i) => i < count && !x)
  return free >= 0 ? free : count - 1
}

const ids = computed(() => Object.keys(k.value.defs))
const lv = (id) => k.value.owned()[id] ?? 0
const slotOf = (id) => k.value.slots().indexOf(id)
const maxed = (id) => lv(id) >= k.value.maxLevel
const canUp = (id) => lv(id) > 0 && !maxed(id) && k.value.frags(id) >= k.value.upCost(lv(id))
const canLearn = (id) => lv(id) === 0 && k.value.frags(id) >= k.value.learnCost
const progress = (id) => (lv(id) ? (maxed(id) ? 1 : Math.min(1, k.value.frags(id) / k.value.upCost(lv(id)))) : Math.min(1, k.value.frags(id) / k.value.learnCost))
const hasMove = (id) => canLearn(id) || canUp(id)

const sheetDef = computed(() => (sel.value ? k.value.defs[sel.value] : null))
function pick(id) { sel.value = id }

// Tổng cộng của công pháp đang gắn
const BONUS_LABELS = [
  ['exp', 'tốc độ linh khí'], ['hp', 'khí huyết'], ['atk', 'công kích'], ['def', 'phòng ngự'], ['speed', 'Thân pháp'],
  ['stones', 'linh thạch'], ['income', 'thu nhập ải'], ['luck', 'tỉ lệ rơi đồ'], ['elem', 'sát thương khắc hệ'], ['dao', 'Đạo Vận'],
]
const bonusLines = computed(() => BONUS_LABELS.filter(([key]) => game.artBonus[key] > 0).map(([key, label]) => `+${Math.round(game.artBonus[key] * 100)}% ${label}`))
</script>

<template>
  <div class="space-y-3">
    <!-- Ô đang gắn -->
    <div>
      <div class="mb-1.5 text-sm font-bold text-gold-300">{{ TITLES[sub] }}</div>
      <div class="grid gap-2" :class="sub === 'pets' ? 'grid-cols-3' : 'grid-cols-5'">
        <ItemIcon
          v-for="i in k.maxSlots"
          :key="i"
          :glyph="k.slots()[i - 1] ? k.glyph[k.slots()[i - 1]] : 'dots'"
          :color="k.slots()[i - 1] ? elCss(k.defs[k.slots()[i - 1]].element) : '#475569'"
          :locked="i - 1 >= k.slotCount()"
          :dim="!k.slots()[i - 1]"
          :label="i - 1 >= k.slotCount() ? k.slotHint(i - 1) : k.slots()[i - 1] ? k.defs[k.slots()[i - 1]].name : 'Trống'"
          @click="k.slots()[i - 1] && pick(k.slots()[i - 1])"
        />
      </div>
      <div v-if="sub === 'arts'" class="mt-1.5 text-xs text-slate-300">
        <template v-if="bonusLines.length"><span class="text-jade-300">Đang cộng:</span> {{ bonusLines.join(' · ') }}</template>
        <template v-else>Chưa gắn công pháp nào.</template>
      </div>
    </div>

    <!-- Kho: lưới biểu tượng -->
    <div>
      <div class="mb-1.5 text-sm font-bold text-gold-300">Kho {{ sub === 'skills' ? 'võ kỹ' : sub === 'arts' ? 'công pháp' : 'linh thú' }}</div>
      <div class="grid grid-cols-4 gap-x-2 gap-y-3">
        <ItemIcon
          v-for="id in ids"
          :key="id"
          :glyph="k.glyph[id]"
          :color="elCss(k.defs[id].element)"
          :locked="!lv(id) && k.locked(id)"
          :dim="!lv(id)"
          :label="k.defs[id].name"
          :badge="lv(id) ? lv(id) : ''"
          :progress="lv(id) && maxed(id) ? -1 : progress(id)"
          :dot="hasMove(id)"
          :selected="slotOf(id) >= 0"
          @click="pick(id)"
        />
      </div>
      <p class="mt-2 text-xs text-slate-500">
        Viền sáng = đang gắn · chấm đỏ = đủ tàn quyển để học / thăng cấp.
        <template v-if="sub === 'pets'"> Cùng hệ với ngươi: +25%.</template>
      </p>
    </div>

    <!-- Bảng chi tiết -->
    <BottomSheet
      :open="!!sel"
      :title="sheetDef ? sheetDef.name : ''"
      :glyph="sel ? k.glyph[sel] : ''"
      :color="sheetDef ? elCss(sheetDef.element) : undefined"
      @close="sel = null"
    >
      <template v-if="sel && sheetDef">
        <div class="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span class="rounded px-1.5 py-0.5" :style="{ color: elCss(sheetDef.element), background: 'rgb(255 255 255 / 0.06)' }">Hệ {{ ELEMENTS[sheetDef.element].name }}</span>
          <span v-if="sheetDef.kind === 'ultimate'" class="rounded bg-cinnabar-500/60 px-1.5 py-0.5 text-white">Tuyệt kỹ</span>
          <span v-if="sheetDef.path" class="rounded px-1.5 py-0.5 text-ink-900" :style="{ background: PATHS[sheetDef.path].css }">{{ PATHS[sheetDef.path].name }}</span>
          <span v-if="sub === 'arts' && game.sectDef?.element === sheetDef.element" class="text-jade-300">+50% cùng tông</span>
          <span class="ml-auto text-gold-300">{{ lv(sel) ? `Cấp ${lv(sel)}/${k.maxLevel}` : `${k.fragLabel} ${k.frags(sel)}/${k.learnCost}` }}</span>
        </div>
        <p v-if="sub === 'pets'" class="text-slate-400">{{ sheetDef.text }}</p>
        <p>{{ k.desc(sel, lv(sel) || 1) }}</p>
        <p v-if="lv(sel) && !maxed(sel) && sub !== 'pets'" class="text-xs text-slate-500">Cấp sau: {{ k.desc(sel, lv(sel) + 1) }}</p>
        <p v-if="!lv(sel) && k.locked(sel)" class="mt-1 text-xs text-cinnabar-400">
          <Icon name="lock" :size="12" class="inline" /> {{ k.lockText(sel) }}
        </p>
        <p v-if="lv(sel)" class="mt-1 text-xs text-slate-400">{{ k.fragLabel }} đang có: <b class="text-slate-200">{{ k.frags(sel) }}</b></p>
      </template>
      <template #actions>
        <template v-if="sel">
          <template v-if="lv(sel)">
            <button v-if="slotOf(sel) >= 0" class="btn-ghost" @click="k.unequip(slotOf(sel)); sel = null">{{ k.words.unequip }}</button>
            <button v-else class="btn-jade" :disabled="k.locked(sel)" @click="k.equip(sel); sel = null">{{ k.locked(sel) ? k.lockText(sel) : k.words.equip }}</button>
            <button class="btn-gold" :disabled="!canUp(sel)" @click="k.upgrade(sel)">
              {{ k.words.up }}
              <span class="text-xs opacity-90">{{ maxed(sel) ? 'tối đa' : `${k.frags(sel)}/${k.upCost(lv(sel))}` }}</span>
            </button>
          </template>
          <button v-else class="btn-gold" :disabled="!canLearn(sel)" @click="k.learn(sel)">
            {{ k.words.learn }} <span class="text-xs opacity-90">{{ k.frags(sel) }}/{{ k.learnCost }}</span>
          </button>
        </template>
      </template>
    </BottomSheet>
  </div>
</template>
