<script setup>
// CharacterTab.vue - Bảng điều khiển nhân vật: chỉ số dạng chip, "việc cần làm" mở bảng trượt, thống kê thu gọn.
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { useUiStore } from '../../stores/uiStore.js'
import { fmt, fmtDuration, fmtPercent } from '../../game/format.js'
import { ELEMENTS } from '../../game/elements.js'
import { SKILLS } from '../../game/skills.js'
import { PATHS, PATH_IDS, PATH_MIN_REALM } from '../../game/paths.js'
import { CHALLENGES } from '../../game/challenges.js'
import { GRADE_COLORS, GRADE_NAMES, TALENTS, TALENT_REROLL_COST } from '../../game/talents.js'
import { STREAK_DAYS, nextRewardDay } from '../../game/daily.js'
import { QUEST_TEMPLATES } from '../../game/quests.js'
import { REALMS, STAGES } from '../../game/constants.js'
import { screenUnlocked } from '../../game/screens.js'
import { PATH_GLYPH } from '../glyphs.js'
import Icon from '../Icon.vue'
import BottomSheet from '../BottomSheet.vue'

// Vòng tương khắc: Kim > Mộc > Thổ > Thủy > Hỏa > Kim
const BEAT_TARGET = { kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim' }
const BEATEN_BY = Object.fromEntries(Object.entries(BEAT_TARGET).map(([a, b]) => [b, a]))

const game = useGameStore()
const ui = useUiStore()
const backupHidden = ref(false) // ẩn nhắc sao lưu đến khi tải lại trang
const sheet = ref(null) // 'daily' | 'talent' | 'path' | 'challenge' | 'rates'
const learned = computed(() => Object.keys(game.skills.owned).length)
const worn = computed(() => game.equippedItems.filter(Boolean).length)

const statRows = computed(() => [
  { label: 'Khí huyết', icon: 'heart', value: game.combat.hp, color: 'text-cinnabar-400' },
  { label: 'Công kích', icon: 'sword', value: game.combat.atk, color: 'text-gold-300' },
  { label: 'Phòng ngự', icon: 'shield', value: game.combat.def, color: 'text-sky-300' },
  { label: 'Thân pháp', icon: 'speed', value: game.combat.speed, color: 'text-jade-300' },
])

// Danh sách khởi đầu cho người mới: 4 bước, tự tick theo tiến trình, tắt được (nhớ trong LocalStorage)
const TOUR_KEY = 'tutien-tour-off'
const tourOff = ref(false)
try { tourOff.value = localStorage.getItem(TOUR_KEY) === '1' } catch { /* bỏ qua */ }
// Các bước hệ thống mới (trang bị, liên kích, pháp bảo) chỉ hiện khi màn tương ứng đã mở khoá
const tour = computed(() =>
  [
    { id: 'break', icon: 'bolt', text: 'Đột phá khi thanh linh khí đầy', done: game.stats.breakthroughs > 0, go: null },
    { id: 'array', icon: 'home', text: 'Nâng Tụ Linh Trận ở Động Phủ', done: game.arrayLevel > 0, go: 'dwelling' },
    { id: 'battle', icon: 'dungeon', text: 'Vượt ải đầu tiên ở Vượt Ải', done: game.campaign.record > 0, go: 'battle' },
    { id: 'skill', icon: 'arts', text: 'Học và gắn một võ kỹ', done: game.skills.slots.some(Boolean), go: 'skills' },
    { id: 'gear', icon: 'gear', text: 'Mặc món trang bị đầu tiên', done: game.equippedItems.some(Boolean), go: 'gear', show: screenUnlocked('gear', game) },
    { id: 'combo', icon: 'swords', text: 'Gắn 2 võ kỹ khác hệ để tạo liên kích', done: game.skills.slots.filter(Boolean).length >= 2, go: 'skills', show: screenUnlocked('skills', game) && game.skillSlots >= 2 },
    { id: 'treasure', icon: 'refine', text: 'Luyện hoá và gắn một Pháp Bảo', done: game.treasures.slots.some(Boolean), go: 'treasure', show: screenUnlocked('treasure', game) },
  ].filter((t) => t.show !== false),
)
const tourShow = computed(() => !tourOff.value && tour.value.some((t) => !t.done))
const tourLeft = computed(() => tour.value.filter((t) => !t.done).length)
watchEffect(() => { ui.tourShown = tourShow.value })
onBeforeUnmount(() => { ui.tourShown = false })
function closeTour() {
  tourOff.value = true
  try { localStorage.setItem(TOUR_KEY, '1') } catch { /* bỏ qua */ }
}

// Các ô "việc cần làm": mỗi ô một biểu tượng, một dòng trạng thái, chấm đỏ khi cần làm ngay
const tiles = computed(() => {
  const out = []
  out.push({
    id: 'daily', icon: 'calendar', title: 'Điểm danh',
    status: game.daily.claimed ? `Chuỗi ${game.daily.streak} ngày` : 'Nhận thưởng ngày', hot: game.dailyPending,
  })
  if (game.talent || game.talentOffer.length) {
    out.push({
      id: 'talent', icon: 'sparkles', title: 'Thiên Phú',
      status: game.talent ? TALENTS[game.talent].name : 'Chọn ngay', hot: game.talentPending,
      color: game.talent ? GRADE_COLORS[TALENTS[game.talent].grade] : undefined,
    })
  }
  out.push({
    id: 'path', icon: game.path ? PATH_GLYPH[game.path] : 'target', title: 'Đạo Lộ',
    status: game.path ? PATHS[game.path].name : game.canChoosePath ? 'Chọn ngay' : `Mở ở ${REALMS[PATH_MIN_REALM].name}`, hot: game.canChoosePath,
    color: game.path ? PATHS[game.path].css : undefined,
  })
  if (game.challenge) {
    out.push({ id: 'challenge', icon: 'alert', title: 'Thử Thách', status: game.challengeDone ? 'Đã xong' : CHALLENGES[game.challenge].name, hot: false })
  }
  return out
})
const sheetTitle = computed(() => ({ daily: 'Điểm danh & nhiệm vụ', talent: 'Thiên Phú', path: 'Đạo Lộ', challenge: 'Kiếp Thử Thách', rates: 'Tốc độ & thống kê' }[sheet.value] ?? ''))
const sheetGlyph = computed(() => ({ daily: 'calendar', talent: 'sparkles', path: 'target', challenge: 'alert', rates: 'log' }[sheet.value] ?? ''))
const streakOn = (d) => d <= game.daily.streak % STREAK_DAYS || (game.daily.claimed && game.daily.streak > 0 && game.daily.streak % STREAK_DAYS === 0)

function pickTalent(id) {
  game.chooseTalent(id)
  sheet.value = null
}
function pickPath(id) {
  game.choosePath(id)
  sheet.value = null
}
</script>

<template>
  <div class="space-y-3">
    <!-- Nhân vật -->
    <div class="flex items-center gap-2 px-0.5">
      <div class="min-w-0 flex-1">
        <div class="truncate font-bold text-white">{{ game.name }}</div>
        <div class="truncate text-xs text-slate-400">{{ game.spiritRoot.name }} ×{{ game.spiritRoot.mult }}</div>
      </div>
      <span
        class="shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold"
        :style="{ color: ELEMENTS[game.element].css, borderColor: ELEMENTS[game.element].css + '88' }"
      >
        Hệ {{ ELEMENTS[game.element].name }}
        <span class="font-normal opacity-80">khắc {{ ELEMENTS[BEAT_TARGET[game.element]].name }}</span>
      </span>
    </div>

    <!-- Nhắc sao lưu save -->
    <div v-if="game.backupDue && !backupHidden" class="flex items-center gap-2 rounded-lg border border-gold-400/60 bg-gold-500/10 px-2.5 py-1.5 text-sm">
      <Icon name="info" :size="18" class="shrink-0 text-gold-300" />
      <span class="min-w-0 flex-1 text-gold-200">Lâu rồi chưa sao lưu save.</span>
      <button class="btn-gold !px-3 text-xs" @click="game.exportSave()">Xuất save</button>
      <button class="px-1.5 text-slate-500" aria-label="Ẩn" @click="backupHidden = true">✕</button>
    </div>

    <!-- Khởi đầu -->
    <div v-if="tourShow" class="rounded-lg border border-gold-500/40 bg-gold-500/10 p-2">
      <div class="mb-1 flex items-center justify-between text-sm">
        <b class="text-gold-300">Khởi đầu · còn {{ tourLeft }} bước</b>
        <button class="px-2 text-xs text-slate-500" @click="closeTour">Ẩn</button>
      </div>
      <div v-for="t in tour" :key="t.id" class="flex min-h-[40px] items-center gap-2 text-sm" :class="t.done ? 'text-slate-500 line-through' : 'text-slate-200'">
        <Icon :name="t.done ? 'check' : t.icon" :size="18" :class="t.done ? 'text-jade-300' : 'text-gold-300'" />
        <span class="flex-1">{{ t.text }}</span>
        <button v-if="!t.done && t.go" class="btn-gold !px-3 text-xs" @click="ui.go(t.go)">Đi</button>
      </div>
    </div>

    <!-- 4 chỉ số -->
    <div class="grid grid-cols-4 gap-1.5">
      <div v-for="row in statRows" :key="row.label" class="flex flex-col items-center rounded-lg border border-ink-600 bg-ink-900/60 px-1 py-1.5" :title="row.label">
        <Icon :name="row.icon" :size="20" :class="row.color" />
        <b class="mt-0.5 text-sm leading-tight" :class="row.color">{{ fmt(row.value) }}</b>
        <span class="text-[11px] text-slate-500">{{ row.label }}</span>
      </div>
    </div>

    <!-- Tốc độ: một hàng chip -->
    <button class="flex w-full items-center justify-around rounded-lg border border-ink-600 bg-ink-900/60 px-1 py-2 text-sm" @click="sheet = 'rates'">
      <span class="flex items-center gap-1 text-jade-300"><Icon name="lotus" :size="16" /><b>{{ fmt(game.expRate.mul(60)) }}</b><span class="text-xs text-slate-500">/phút</span></span>
      <span class="flex items-center gap-1 text-gold-300"><Icon name="stone" :size="16" /><b>{{ fmt(game.stonesRate.mul(60)) }}</b><span class="text-xs text-slate-500">/phút</span></span>
      <span class="flex items-center gap-1 text-slate-200"><Icon name="bolt" :size="16" /><b>{{ fmtPercent(game.successChance) }}</b></span>
      <Icon name="info" :size="14" class="text-slate-500" />
    </button>

    <!-- Việc cần làm -->
    <div>
      <div class="mb-1.5 text-sm font-bold text-gold-300">Việc cần làm</div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="t in tiles"
          :key="t.id"
          class="relative flex min-h-[56px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition active:scale-[0.97]"
          :class="t.hot ? 'border-gold-400/70 bg-gold-500/10' : 'border-ink-600 bg-ink-900/60'"
          @click="sheet = t.id"
        >
          <Icon :name="t.icon" :size="24" :style="{ color: t.color ?? '#e8d9a8' }" />
          <span class="min-w-0">
            <span class="block text-sm font-bold text-white">{{ t.title }}</span>
            <span class="block truncate text-xs" :style="{ color: t.color ?? '#94a3b8' }">{{ t.status }}</span>
          </span>
          <span v-if="t.hot" class="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-cinnabar-500 shadow-[0_0_6px_rgb(229_73_58)]"></span>
        </button>
        <button class="flex min-h-[56px] items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-2 text-left transition active:scale-[0.97]" @click="ui.go('skills')">
          <Icon name="swords" :size="24" class="text-jade-300" />
          <span>
            <span class="block text-sm font-bold text-white">Võ Kỹ</span>
            <span class="block text-xs text-slate-400">{{ learned }}/{{ Object.keys(SKILLS).length }} · {{ game.skillSlots }} ô</span>
          </span>
        </button>
        <button class="flex min-h-[56px] items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-2 text-left transition active:scale-[0.97]" @click="ui.go('gear')">
          <Icon name="gear" :size="24" class="text-gold-300" />
          <span>
            <span class="block text-sm font-bold text-white">Trang Bị</span>
            <span class="block text-xs text-slate-400">{{ worn }}/3 · túi {{ game.gear.bag.length }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- ===== Bảng trượt ===== -->
    <BottomSheet :open="!!sheet" :title="sheetTitle" :glyph="sheetGlyph" @close="sheet = null">
      <!-- Điểm danh -->
      <template v-if="sheet === 'daily'">
        <div class="mb-1 text-xs text-slate-400">Chuỗi {{ game.daily.streak }} ngày</div>
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="d in STREAK_DAYS"
            :key="d"
            class="rounded border py-1 text-center text-xs"
            :class="streakOn(d)
              ? 'border-jade-500/60 bg-jade-500/20 text-jade-200'
              : d === nextRewardDay(game.daily.streak) && !game.daily.claimed ? 'border-gold-400 text-gold-200' : 'border-ink-600 text-slate-500'"
          >
            {{ d }}
          </div>
        </div>
        <button class="btn-gold mt-2 min-h-[44px] w-full" :disabled="game.daily.claimed" @click="game.claimDaily()">
          {{ game.daily.claimed ? 'Hôm nay đã điểm danh' : `Nhận thưởng ngày ${nextRewardDay(game.daily.streak)}` }}
        </button>
        <div class="mb-1 mt-3 text-sm font-bold text-slate-200">Nhiệm vụ ngày</div>
        <div v-for="(t, i) in game.daily.tasks" :key="i" class="flex items-center justify-between gap-2 border-b border-ink-700 py-1.5 last:border-0">
          <span :class="t.claimed ? 'text-slate-500 line-through' : 'text-slate-300'">
            {{ QUEST_TEMPLATES.find((x) => x.id === t.tpl).label }} · {{ Math.min(game.dailyProgress(t), t.target) }}/{{ t.target }}
          </span>
          <button class="btn-jade min-h-[40px] shrink-0 !px-3" :disabled="t.claimed || !game.dailyTaskDone(t)" @click="game.claimDailyTask(i)">
            {{ t.claimed ? 'Đã nhận' : 'Nhận' }}
          </button>
        </div>
        <p v-if="game.daily.tasks.length" class="mt-1 text-xs text-slate-500">Xong cả {{ game.daily.tasks.length }} nhiệm vụ: thưởng thêm.</p>
      </template>

      <!-- Thiên Phú -->
      <template v-else-if="sheet === 'talent'">
        <p v-if="game.talent">
          <b :style="{ color: GRADE_COLORS[TALENTS[game.talent].grade] }">{{ TALENTS[game.talent].name }}</b>
          <span class="text-xs text-slate-500"> · {{ GRADE_NAMES[TALENTS[game.talent].grade] }}</span><br />
          {{ TALENTS[game.talent].text }}. Kiếp sau bốc lại.
        </p>
        <template v-else>
          <p class="mb-2 text-jade-300">Chọn một thiên phú cho kiếp này (kiếp sau bốc lại).</p>
          <div v-for="id in game.talentOffer" :key="id" class="mb-2 rounded-lg border border-ink-600 bg-ink-900 p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold" :style="{ color: GRADE_COLORS[TALENTS[id].grade] }">
                {{ TALENTS[id].name }} <span class="text-xs font-normal text-slate-500">{{ GRADE_NAMES[TALENTS[id].grade] }}</span>
              </span>
              <button class="btn-gold min-h-[40px] !px-4" @click="pickTalent(id)">Chọn</button>
            </div>
            <p class="mt-0.5 text-sm text-slate-300">{{ TALENTS[id].text }}</p>
          </div>
          <button class="btn-ghost min-h-[44px] w-full" :disabled="game.reincarnation.dao < TALENT_REROLL_COST" @click="game.rerollTalents()">
            Bốc lại <Icon name="spark" :size="14" />{{ TALENT_REROLL_COST }} Đạo Vận
          </button>
        </template>
      </template>

      <!-- Đạo Lộ -->
      <template v-else-if="sheet === 'path'">
        <template v-if="game.path">
          <p><b :style="{ color: PATHS[game.path].css }">{{ PATHS[game.path].name }}</b>: {{ PATHS[game.path].perkText }}.</p>
          <p class="mt-1 text-xs text-slate-500">Võ kỹ độc quyền: {{ SKILLS[PATHS[game.path].skill].name }}. Luân hồi để chọn lại đạo lộ.</p>
        </template>
        <p v-else-if="!game.canChoosePath" class="text-slate-400">Đạt {{ REALMS[PATH_MIN_REALM].name }} để chọn đạo lộ (mỗi kiếp chọn một lần).</p>
        <template v-else>
          <p class="mb-2 text-jade-300">Chọn đạo lộ cho kiếp này: mỗi hướng có đặc quyền và võ kỹ độc quyền riêng.</p>
          <div v-for="id in PATH_IDS" :key="id" class="mb-2 rounded-lg border border-ink-600 bg-ink-900 p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-1.5 font-bold" :style="{ color: PATHS[id].css }"><Icon :name="PATH_GLYPH[id]" :size="18" />{{ PATHS[id].name }}</span>
              <button class="btn-gold min-h-[40px] !px-4" @click="pickPath(id)">Chọn</button>
            </div>
            <p class="mt-0.5 text-sm text-slate-400">{{ PATHS[id].desc }}</p>
            <p class="text-xs text-slate-300">{{ PATHS[id].perkText }}. Võ kỹ độc quyền: {{ SKILLS[PATHS[id].skill].name }}.</p>
          </div>
        </template>
      </template>

      <!-- Thử thách -->
      <template v-else-if="sheet === 'challenge' && game.challenge">
        <p><b class="text-gold-300">{{ CHALLENGES[game.challenge].name }}</b></p>
        <p class="text-slate-400">{{ CHALLENGES[game.challenge].desc }}</p>
        <p class="mt-1 text-xs" :class="game.challengeDone ? 'text-jade-300' : 'text-slate-400'">
          {{ game.challengeDone ? 'Đã hoàn thành' : `Mục tiêu: ${STAGES[CHALLENGES[game.challenge].goalStage].fullName}` }}
        </p>
      </template>

      <!-- Tốc độ và thống kê -->
      <template v-else-if="sheet === 'rates'">
        <div class="space-y-1 text-sm">
          <div class="flex justify-between"><span>Linh khí / phút</span><b class="text-jade-300">{{ fmt(game.expRate.mul(60)) }}</b></div>
          <div class="flex justify-between"><span>Linh thạch / phút</span><b class="text-gold-300">{{ fmt(game.stonesRate.mul(60)) }}</b></div>
          <div class="flex justify-between"><span>Tỉ lệ đột phá</span><b>{{ fmtPercent(game.successChance) }}</b></div>
          <div v-if="game.bonus.exp > 0" class="flex justify-between"><span>Thưởng linh khí vĩnh viễn</span><b class="text-jade-300">+{{ fmtPercent(game.bonus.exp) }}</b></div>
          <div class="flex justify-between"><span>Luyện Đan</span><b>Cấp {{ game.alchemy.level }}</b></div>
          <div v-if="game.nextTribulation" class="flex justify-between">
            <span>Thiên kiếp kế tiếp</span><b class="text-cinnabar-400">{{ game.nextTribulation.bolts }} đạo lôi</b>
          </div>
          <div class="my-2 border-t border-ink-600"></div>
          <div class="flex justify-between"><span>Đột phá thành công</span><b>{{ game.stats.breakthroughs }}</b></div>
          <div class="flex justify-between"><span>Thất bại</span><b>{{ game.stats.failures }}</b></div>
          <div class="flex justify-between"><span>Thiên kiếp đã vượt</span><b>{{ game.stats.tribulations }}</b></div>
          <div class="flex justify-between"><span>Yêu thú đã hạ</span><b>{{ game.stats.kills }} ({{ game.stats.bossKills }} boss)</b></div>
          <div class="flex justify-between"><span>Tổng thời gian tu luyện</span><b>{{ fmtDuration(game.stats.playSeconds) }}</b></div>
          <div class="mt-2 text-xs text-slate-500">Hệ {{ ELEMENTS[game.element].name }} bị {{ ELEMENTS[BEATEN_BY[game.element]].name }} khắc. {{ game.spiritRoot.desc }}</div>
        </div>
      </template>
    </BottomSheet>
  </div>
</template>
