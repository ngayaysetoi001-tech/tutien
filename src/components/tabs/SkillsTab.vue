<script setup>
// SkillsTab.vue - Công Pháp: ba tab Võ Kỹ / Công Pháp / Linh Thú dùng chung một bố cục.
//   Võ Kỹ / Linh Thú: hàng ô đang gắn ghim ở đầu; Công Pháp là bị động (học xong cộng chỉ số ngay, không có ô) nên ghim tổng cộng thêm.
//    kho là danh sách gọn (icon, tên, 1 dòng hiệu quả, nút Gắn/Học/Nâng ngay trên hàng),
//   gom nhóm: có thể học/nâng, đang dùng, đã học, chưa học, chưa mở (thu gọn). Bấm hàng để xem chi tiết.
import { computed, ref } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useUiStore } from '../../stores/uiStore.js'
import { ELEMENTS, ELEMENT_IDS } from '../../game/elements.js'
import { BRANCHES, LEARN_COST, branchInfo, MAX_SKILL_SLOTS, SKILLS, SKILL_MAX_LEVEL, canEquip, fragmentId, skillDesc, statusLine, upgradeCost } from '../../game/skills.js'
import { PATHS } from '../../game/paths.js'
import {
  ARTS, ART_LEARN_COST, ART_MAX_LEVEL, AWAKEN_POOL, RESONANCE, RESONANCE_STEPS, SYSTEMS, SYSTEM_IDS, artDesc, artFragmentId, artUpgradeCost, awakenOffer,
  resonanceTier, systemLevels,
} from '../../game/arts.js'
import { perkText } from '../../game/equipment.js'
import { REALMS } from '../../game/constants.js'
import { MAX_PET_SLOTS, PETS, PET_LEARN_COST, PET_MAX_LEVEL, petDesc, petFragmentId, petUpgradeCost } from '../../game/pets.js'
import { ART_GLYPH, PET_GLYPH, SKILL_GLYPH } from '../glyphs.js'
import ItemIcon from '../ItemIcon.vue'
import BottomSheet from '../BottomSheet.vue'
import Icon from '../Icon.vue'

const game = useGameStore()
const ui = useUiStore()
const elCss = (e) => ELEMENTS[e].css

/** Ô trống đầu tiên đã mở; hết ô thì thay ô cuối. */
function freeSlot(slots, count) {
  const free = slots.findIndex((x, i) => i < count && !x)
  return free >= 0 ? free : count - 1
}

// ---------- Cấu hình theo loại: gom về cùng một giao diện ----------
const KINDS = {
  skills: {
    label: 'Võ Kỹ', icon: 'swords', slotTitle: 'Ô võ kỹ', defs: SKILLS, glyph: SKILL_GLYPH, fragLabel: 'Tàn quyển', learnCost: LEARN_COST, maxLevel: SKILL_MAX_LEVEL,
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
    words: { equip: 'Gắn', unequip: 'Tháo', up: 'Nâng', learn: 'Học' },
  },
  arts: {
    label: 'Công Pháp', icon: 'arts', passive: true, defs: ARTS, glyph: ART_GLYPH, fragLabel: 'Tàn quyển', learnCost: ART_LEARN_COST, maxLevel: ART_MAX_LEVEL,
    owned: () => game.arts.owned, slots: () => [],
    frags: (id) => game.itemCount(artFragmentId(id)),
    upCost: artUpgradeCost,
    desc: (id, lv) => artDesc(id, lv, game.sectDef?.element ?? null),
    locked: (id) => game.campaign.record < ARTS[id].minAi,
    lockText: (id) => `Ải ${ARTS[id].minAi}`,
    learn: (id) => game.learnArt(id),
    upgrade: (id) => game.upgradeArt(id),
    words: { up: 'Nâng', learn: 'Học' },
  },
  pets: {
    label: 'Linh Thú', icon: 'paw', slotTitle: 'Linh thú ra trận', defs: PETS, glyph: PET_GLYPH, fragLabel: 'Phách', learnCost: PET_LEARN_COST, maxLevel: PET_MAX_LEVEL,
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
    words: { equip: 'Ra trận', unequip: 'Cất', up: 'Nuôi', learn: 'Thu phục' },
  },
}
// Màn 'pets' (Linh Thú) đứng riêng ngang hàng Công Pháp; màn 'skills' có hai tab Võ Kỹ / Công Pháp
const KIND_IDS = ui.tab === 'pets' ? ['pets'] : ['skills', 'arts']

// ---------- Trạng thái một mục ----------
const lvOf = (kd, id) => kd.owned()[id] ?? 0
const slotOf = (kd, id) => kd.slots().indexOf(id)
const maxedOf = (kd, id) => lvOf(kd, id) >= kd.maxLevel
const canUpOf = (kd, id) => lvOf(kd, id) > 0 && !maxedOf(kd, id) && kd.frags(id) >= kd.upCost(lvOf(kd, id))
const canLearnOf = (kd, id) => lvOf(kd, id) === 0 && !kd.locked(id) && kd.frags(id) >= kd.learnCost
const readyOf = (kd, id) => canLearnOf(kd, id) || canUpOf(kd, id)
const progressOf = (kd, id) => {
  const lv = lvOf(kd, id)
  if (!lv) return Math.min(1, kd.frags(id) / kd.learnCost)
  return maxedOf(kd, id) ? 1 : Math.min(1, kd.frags(id) / kd.upCost(lv))
}
const kindHot = (key) => Object.keys(KINDS[key].defs).some((id) => readyOf(KINDS[key], id))

// Mở tab đầu tiên có việc để làm (không có thì Võ Kỹ)
const sub = ref(KIND_IDS.find(kindHot) ?? KIND_IDS[0])
const k = computed(() => KINDS[sub.value])
const elFilter = ref('') // lọc theo ngũ hành (Võ Kỹ, Linh Thú)
const sysFilter = ref('') // lọc theo hệ công pháp (Công Pháp)
const showLocked = ref(false)
const sel = ref(null) // id đang xem chi tiết

function pickTab(key) {
  sub.value = key
  sel.value = null
  elFilter.value = ''
  sysFilter.value = ''
}

// ---------- Gom nhóm kho ----------
const sections = computed(() => {
  const kd = k.value
  const g = { ready: [], used: [], owned: [], learnable: [], locked: [] }
  for (const id of Object.keys(kd.defs)) {
    if (elFilter.value && kd.defs[id].element !== elFilter.value) continue
    if (sysFilter.value && kd.defs[id].sys !== sysFilter.value) continue
    if (slotOf(kd, id) >= 0) g.used.push(id)
    else if (readyOf(kd, id)) g.ready.push(id)
    else if (lvOf(kd, id)) g.owned.push(id)
    else if (kd.locked(id)) g.locked.push(id)
    else g.learnable.push(id)
  }
  return [
    { key: 'ready', title: 'Có thể học / nâng', ids: g.ready, accent: true },
    { key: 'used', title: 'Đang dùng', ids: g.used },
    { key: 'owned', title: 'Đã học', ids: g.owned },
    { key: 'learnable', title: 'Chưa học', ids: g.learnable },
  ].filter((s) => s.ids.length).concat(g.locked.length ? [{ key: 'locked', title: `Chưa mở khoá (${g.locked.length})`, ids: g.locked, fold: true }] : [])
})

// Tổng cộng của công pháp đang gắn
const BONUS_LABELS = [
  ['exp', 'tốc độ linh khí'], ['hp', 'khí huyết'], ['atk', 'công kích'], ['def', 'phòng ngự'], ['speed', 'Thân pháp'],
  ['stones', 'linh thạch'], ['income', 'thu nhập ải'], ['luck', 'tỉ lệ rơi đồ'], ['elem', 'sát thương khắc hệ'], ['dao', 'Đạo Vận'],
]
const bonusLines = computed(() => BONUS_LABELS.filter(([key]) => game.artBonus[key] > 0).map(([key, label]) => `+${Math.round(game.artBonus[key] * 100)}% ${label}`))

// Công Pháp: tổng cấp từng hệ và mốc cộng hưởng
const sysLv = computed(() => systemLevels(game.arts.owned))
const resText = (sys, i) => perkText(RESONANCE[sys][i])
const nextStep = (sys) => RESONANCE_STEPS.find((n) => sysLv.value[sys] < n) ?? null
const awakeKey = (id) => game.arts.awaken[id] ?? null
const sheetDef = computed(() => (sel.value ? k.value.defs[sel.value] : null))
const frameOf = (def) => (def.kind === 'ultimate' ? '#e5493a' : def.path ? PATHS[def.path].css : '')
</script>

<template>
  <div class="space-y-2">
    <!-- Ba tab lớn -->
    <div v-if="KIND_IDS.length > 1" class="grid grid-cols-2 gap-1.5">
      <button
        v-for="key in KIND_IDS"
        :key="key"
        class="relative flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border text-sm font-bold transition"
        :class="sub === key ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 bg-ink-900/70 text-slate-400'"
        @click="pickTab(key)"
      >
        <Icon :name="KINDS[key].icon" :size="16" />{{ KINDS[key].label }}
        <span v-if="kindHot(key)" class="absolute right-1.5 top-1 h-2.5 w-2.5 rounded-full bg-cinnabar-500"></span>
      </button>
    </div>

    <!-- Công Pháp (bị động): tổng cộng đang có, ghim ở đầu -->
    <div v-if="k.passive" class="sticky top-0 z-10 -mx-0.5 rounded-lg border border-ink-600 bg-ink-900 px-2.5 py-2">
      <div class="text-xs font-bold text-gold-300">Đang cộng cho nhân vật</div>
      <div class="mt-0.5 text-sm text-jade-300">{{ bonusLines.length ? bonusLines.join(' · ') : 'Học công pháp để cộng chỉ số, không cần gắn.' }}</div>
      <div class="mt-1.5 grid grid-cols-4 gap-1">
        <button
          v-for="sys in SYSTEM_IDS"
          :key="sys"
          class="rounded-lg border px-1 py-1 text-center"
          :class="sysFilter === sys ? 'bg-ink-800' : 'bg-ink-900/60'"
          :style="{ borderColor: sysFilter === sys ? SYSTEMS[sys].css : 'rgb(75 90 125 / 0.45)' }"
          @click="sysFilter = sysFilter === sys ? '' : sys"
        >
          <div class="text-xs font-bold" :style="{ color: SYSTEMS[sys].css }">{{ SYSTEMS[sys].name }}</div>
          <div class="text-[11px] text-slate-300">{{ sysLv[sys] }}<template v-if="nextStep(sys)">/{{ nextStep(sys) }}</template></div>
          <div class="mt-0.5 flex justify-center gap-0.5"><i v-for="n in 3" :key="n" class="h-1.5 w-3 rounded-sm" :style="{ background: n <= resonanceTier(sysLv[sys]) ? SYSTEMS[sys].css : '#334155' }"></i></div>
        </button>
      </div>
      <p class="mt-1 text-[11px] text-slate-500">Tổng cấp một hệ đạt {{ RESONANCE_STEPS.join(' / ') }} thì mở cộng hưởng. Bấm hệ để lọc.</p>
    </div>

    <!-- Ô đang gắn: ghim ở đầu -->
    <div v-else class="sticky top-0 z-10 -mx-0.5 rounded-lg border border-ink-600 bg-ink-900 px-2 pb-1.5 pt-1">
      <div class="mb-1 flex items-center justify-between text-xs">
        <b class="text-gold-300">{{ k.slotTitle }}</b>
        <span v-if="sub === 'pets'" class="text-slate-500">cùng hệ: +25%</span>
      </div>
      <div class="grid gap-1.5" :class="sub === 'pets' ? 'grid-cols-3' : 'grid-cols-5'">
        <ItemIcon
          v-for="i in k.maxSlots"
          :key="i"
          :glyph="k.slots()[i - 1] ? k.glyph[k.slots()[i - 1]] : 'dots'"
          :color="k.slots()[i - 1] ? elCss(k.defs[k.slots()[i - 1]].element) : '#475569'"
          :tint="k.slots()[i - 1] ? elCss(k.defs[k.slots()[i - 1]].element) : ''"
          :locked="i - 1 >= k.slotCount()"
          :dim="!k.slots()[i - 1]"
          @click="k.slots()[i - 1] && (sel = k.slots()[i - 1])"
        />
      </div>
      <div v-if="k.slotCount() < k.maxSlots" class="mt-1 text-[11px] text-slate-500">Ô kế tiếp mở ở: {{ k.slotHint(k.slotCount()) }}</div>
    </div>

    <!-- Lọc ngũ hành -->
    <div v-if="!k.passive" class="flex gap-1 overflow-x-auto no-bar">
      <button
        class="min-h-[34px] shrink-0 rounded-full border px-3 text-xs font-bold"
        :class="!elFilter ? 'border-gold-400 bg-gold-500/20 text-gold-200' : 'border-ink-600 text-slate-400'"
        @click="elFilter = ''"
      >Tất cả</button>
      <button
        v-for="e in ELEMENT_IDS"
        :key="e"
        class="min-h-[34px] shrink-0 rounded-full border px-3 text-xs font-bold"
        :style="elFilter === e ? { color: elCss(e), borderColor: elCss(e), background: elCss(e) + '22' } : {}"
        :class="elFilter === e ? '' : 'border-ink-600 text-slate-400'"
        @click="elFilter = elFilter === e ? '' : e"
      >{{ ELEMENTS[e].name }}</button>
    </div>

    <!-- Kho: danh sách gọn -->
    <template v-for="s in sections" :key="s.key">
      <button v-if="s.fold" class="flex w-full items-center justify-between rounded-lg border border-ink-600 bg-ink-900/60 px-3 py-2 text-sm text-slate-400" @click="showLocked = !showLocked">
        <span class="flex items-center gap-1.5"><Icon name="lock" :size="14" />{{ s.title }}</span>
        <Icon :name="showLocked ? 'up' : 'down'" :size="16" />
      </button>
      <div v-else class="px-0.5 text-xs font-bold" :class="s.accent ? 'text-cinnabar-400' : 'text-gold-300'">{{ s.title }}</div>

      <div v-if="!s.fold || showLocked" class="space-y-1.5">
        <div
          v-for="id in s.ids"
          :key="id"
          class="flex min-h-[60px] items-center gap-2 rounded-lg border px-2 py-1.5"
          :class="s.accent ? 'border-gold-400/60 bg-gold-500/10' : slotOf(k, id) >= 0 ? 'border-gold-500/40 bg-ink-800/60' : 'border-ink-600 bg-ink-900/60'"
          @click="sel = id"
        >
          <div class="w-11 shrink-0">
            <ItemIcon
              :glyph="k.glyph[id]"
              :color="elCss(k.defs[id].element)"
              :tint="elCss(k.defs[id].element)"
              :frame="frameOf(k.defs[id])"
              :locked="s.fold"
              :badge="lvOf(k, id) || ''"
              :progress="lvOf(k, id) && maxedOf(k, id) ? -1 : progressOf(k, id)"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-bold" :style="{ color: elCss(k.defs[id].element) }">{{ k.defs[id].name }}</div>
            <div class="truncate text-xs text-slate-400">
              <template v-if="s.fold">{{ k.lockText(id) }}</template>
              <template v-else>{{ k.desc(id, lvOf(k, id) || 1) }}</template>
            </div>
          </div>
          <div v-if="!s.fold" class="flex shrink-0 gap-1" @click.stop>
            <template v-if="lvOf(k, id)">
              <template v-if="!k.passive">
                <button v-if="slotOf(k, id) >= 0" class="btn-ghost !px-2 text-xs" @click="k.unequip(slotOf(k, id))">{{ k.words.unequip }}</button>
                <button v-else class="btn-jade !px-2 text-xs" :disabled="k.locked(id)" @click="k.equip(id)">{{ k.words.equip }}</button>
              </template>
              <button class="btn-gold !px-2 text-xs" :disabled="!canUpOf(k, id)" @click="k.upgrade(id)">
                <Icon name="up" :size="14" />{{ maxedOf(k, id) ? 'Max' : `${k.frags(id)}/${k.upCost(lvOf(k, id))}` }}
              </button>
            </template>
            <button v-else class="btn-gold !px-2 text-xs" :disabled="!canLearnOf(k, id)" @click="k.learn(id)">
              {{ k.words.learn }} {{ k.frags(id) }}/{{ k.learnCost }}
            </button>
          </div>
        </div>
      </div>
    </template>
    <p v-if="!sections.length" class="py-6 text-center text-sm text-slate-500">Không có mục nào thuộc hệ này.</p>

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
          <span class="ml-auto text-gold-300">{{ lvOf(k, sel) ? `Cấp ${lvOf(k, sel)}/${k.maxLevel}` : `${k.fragLabel} ${k.frags(sel)}/${k.learnCost}` }}</span>
        </div>
        <p v-if="sub === 'pets'" class="text-slate-400">{{ sheetDef.text }}</p>
        <p>{{ k.desc(sel, lvOf(k, sel) || 1) }}</p>
        <p v-if="lvOf(k, sel) && !maxedOf(k, sel) && sub !== 'pets'" class="text-xs text-jade-300">Cấp sau: {{ k.desc(sel, lvOf(k, sel) + 1) }}</p>
        <p v-if="sub === 'skills' && statusLine(sel)" class="mt-1 text-xs text-gold-200">{{ statusLine(sel) }}</p>
        <p v-if="sub === 'arts'" class="mt-1 text-xs" :style="{ color: SYSTEMS[sheetDef.sys].css }">Hệ {{ SYSTEMS[sheetDef.sys].name }}: tổng cấp {{ sysLv[sheetDef.sys] }}. Cộng hưởng {{ RESONANCE_STEPS.map((n, i) => n + ' → ' + resText(sheetDef.sys, i)).join(' · ') }}</p>
        <!-- Nhánh tiến hoá (võ kỹ cấp tối đa) -->
        <div v-if="sub === 'skills' && lvOf(k, sel) >= SKILL_MAX_LEVEL" class="mt-2">
          <div class="mb-1 text-xs font-bold text-gold-300">Nhánh tiến hoá</div>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="(b, i) in BRANCHES"
              :key="b.name"
              class="min-h-[52px] rounded-lg border px-2 py-1 text-left text-sm"
              :class="game.skills.branch[sel] === i ? 'border-gold-400 bg-gold-500/15 text-gold-200' : 'border-ink-600 bg-ink-900/60 text-slate-300'"
              @click="game.chooseBranch(sel, i)"
            ><b>{{ branchInfo(sel, i).name }}</b><span class="block text-xs text-slate-400">{{ b.name }}: {{ b.text }}</span></button>
          </div>
        </div>
        <!-- Ngộ đạo (công pháp cấp tối đa) -->
        <div v-if="sub === 'arts' && lvOf(k, sel) >= ART_MAX_LEVEL" class="mt-2">
          <div class="mb-1 text-xs font-bold text-gold-300">Ngộ đạo: chọn một đặc tính</div>
          <div class="space-y-1.5">
            <button
              v-for="key in awakenOffer(sel)"
              :key="key"
              class="min-h-[48px] w-full rounded-lg border px-2.5 py-1 text-left text-sm"
              :class="awakeKey(sel) === key ? 'border-gold-400 bg-gold-500/15 text-gold-200' : 'border-ink-600 bg-ink-900/60 text-slate-300'"
              @click="game.awakenArt(sel, key)"
            ><b>{{ AWAKEN_POOL[sheetDef.sys][key].name }}</b><span class="block text-xs text-slate-400">{{ AWAKEN_POOL[sheetDef.sys][key].text }}</span></button>
          </div>
        </div>
        <p v-if="!lvOf(k, sel) && k.locked(sel)" class="mt-1 text-xs text-cinnabar-400"><Icon name="lock" :size="12" class="inline" /> {{ k.lockText(sel) }}</p>
        <p v-if="lvOf(k, sel)" class="mt-1 text-xs text-slate-400">{{ k.fragLabel }} đang có: <b class="text-slate-200">{{ k.frags(sel) }}</b></p>
      </template>
      <template #actions>
        <template v-if="sel">
          <template v-if="lvOf(k, sel)">
            <template v-if="!k.passive">
              <button v-if="slotOf(k, sel) >= 0" class="btn-ghost" @click="k.unequip(slotOf(k, sel)); sel = null">{{ k.words.unequip }}</button>
              <button v-else class="btn-jade" :disabled="k.locked(sel)" @click="k.equip(sel); sel = null">{{ k.locked(sel) ? k.lockText(sel) : k.words.equip }}</button>
            </template>
            <button class="btn-gold" :disabled="!canUpOf(k, sel)" @click="k.upgrade(sel)">
              {{ k.words.up }} <span class="text-xs opacity-90">{{ maxedOf(k, sel) ? 'tối đa' : `${k.frags(sel)}/${k.upCost(lvOf(k, sel))}` }}</span>
            </button>
          </template>
          <button v-else class="btn-gold" :disabled="!canLearnOf(k, sel)" @click="k.learn(sel)">
            {{ k.words.learn }} <span class="text-xs opacity-90">{{ k.frags(sel) }}/{{ k.learnCost }}</span>
          </button>
        </template>
      </template>
    </BottomSheet>
  </div>
</template>
