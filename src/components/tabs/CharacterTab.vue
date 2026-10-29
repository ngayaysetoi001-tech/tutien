<script setup>
// CharacterTab.vue - Thông tin nhân vật: căn cốt, chỉ số, thống kê.
import { computed } from 'vue'
import { useGameStore } from '../../stores/gameStore.js'
import { fmt, fmtDuration, fmtPercent } from '../../game/format.js'
import { ELEMENTS } from '../../game/elements.js'
import Icon from '../Icon.vue'
import { useUiStore } from '../../stores/uiStore.js'
import { SKILLS } from '../../game/skills.js'
import { PATHS, PATH_IDS, PATH_MIN_REALM } from '../../game/paths.js'
import { CHALLENGES } from '../../game/challenges.js'
import { GRADE_COLORS, GRADE_NAMES, TALENTS, TALENT_REROLL_COST } from '../../game/talents.js'
import { STREAK_DAYS, nextRewardDay } from '../../game/daily.js'
import { QUEST_TEMPLATES } from '../../game/quests.js'
import { REALMS, STAGES } from '../../game/constants.js'
const STAGES_TEXT = (i) => STAGES[i].fullName

// Vòng tương khắc: Kim > Mộc > Thổ > Thủy > Hỏa > Kim
const BEAT_TARGET = { kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim' }
const BEATEN_BY = Object.fromEntries(Object.entries(BEAT_TARGET).map(([a, b]) => [b, a]))

const game = useGameStore()
const ui = useUiStore()
const learned = computed(() => Object.keys(game.skills.owned).length)
const worn = computed(() => game.equippedItems.filter(Boolean).length)

const statRows = computed(() => [
  { label: 'Khí huyết', icon: 'heart', value: game.combat.hp, color: 'text-cinnabar-400' },
  { label: 'Công kích', icon: 'sword', value: game.combat.atk, color: 'text-gold-300' },
  { label: 'Phòng ngự', icon: 'shield', value: game.combat.def, color: 'text-sky-300' },
  { label: 'Thân pháp', icon: 'speed', value: game.combat.speed, color: 'text-jade-300' },
])
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">{{ game.name }}</div>
        <div class="text-xs text-gold-300">{{ game.stage.fullName }}</div>
      </div>
      <div class="mt-1 text-xs">
        Hệ ngũ hành: <b :style="{ color: ELEMENTS[game.element].css }">{{ ELEMENTS[game.element].name }}</b>
        <span class="text-slate-500">(khắc {{ ELEMENTS[BEAT_TARGET[game.element]].name }}, bị {{ ELEMENTS[BEATEN_BY[game.element]].name }} khắc)</span>
      </div>
      <div class="mt-1 text-xs text-slate-400">
        {{ game.spiritRoot.name }} (x{{ game.spiritRoot.mult }}) - {{ game.spiritRoot.desc }}
      </div>
    </div>

    <!-- Điểm danh và nhiệm vụ ngày -->
    <div class="card space-y-1.5">
      <div class="flex items-center justify-between">
        <div class="title-rule !m-0 flex-1">Điểm danh</div>
        <div class="ml-2 text-xs text-slate-400">Chuỗi {{ game.daily.streak }} ngày</div>
      </div>
      <div class="grid grid-cols-7 gap-0.5">
        <div
          v-for="d in STREAK_DAYS"
          :key="d"
          class="rounded border py-0.5 text-center text-[10px]"
          :class="d <= game.daily.streak % STREAK_DAYS || (game.daily.claimed && game.daily.streak > 0 && game.daily.streak % STREAK_DAYS === 0)
            ? 'border-jade-500/60 bg-jade-500/20 text-jade-200'
            : d === nextRewardDay(game.daily.streak) && !game.daily.claimed ? 'border-gold-400 text-gold-200' : 'border-ink-600 text-slate-500'"
        >
          {{ d }}
        </div>
      </div>
      <button class="btn-gold w-full py-1 text-xs" :disabled="game.daily.claimed" @click="game.claimDaily()">
        {{ game.daily.claimed ? 'Hôm nay đã điểm danh' : `Điểm danh nhận thưởng ngày ${nextRewardDay(game.daily.streak)}` }}
      </button>
      <div class="text-[11px] font-semibold text-slate-300">Nhiệm vụ ngày</div>
      <div v-for="(t, i) in game.daily.tasks" :key="i" class="flex items-center justify-between gap-2 text-xs">
        <span :class="t.claimed ? 'text-slate-500 line-through' : 'text-slate-300'">
          {{ QUEST_TEMPLATES.find((x) => x.id === t.tpl).label }}: {{ Math.min(game.dailyProgress(t), t.target) }}/{{ t.target }}
        </span>
        <button class="btn-jade !px-2 !py-0.5 text-[11px]" :disabled="t.claimed || !game.dailyTaskDone(t)" @click="game.claimDailyTask(i)">
          {{ t.claimed ? 'Đã nhận' : 'Nhận' }}
        </button>
      </div>
      <div v-if="game.daily.tasks.length" class="text-[11px] text-slate-500">Xong cả {{ game.daily.tasks.length }} nhiệm vụ: thưởng thêm.</div>
    </div>

    <!-- Kiếp Thử Thách đang theo -->
    <div v-if="game.challenge" class="card space-y-0.5 border-gold-500/60">
      <div class="flex items-center justify-between">
        <div class="font-bold text-gold-300">Kiếp Thử Thách: {{ CHALLENGES[game.challenge].name }}</div>
        <div class="text-xs" :class="game.challengeDone ? 'text-jade-300' : 'text-slate-400'">{{ game.challengeDone ? 'Đã hoàn thành' : `Mục tiêu: ${STAGES_TEXT(CHALLENGES[game.challenge].goalStage)}` }}</div>
      </div>
      <p class="text-[11px] text-slate-400">{{ CHALLENGES[game.challenge].desc }}</p>
    </div>

    <!-- Thiên Phú của kiếp này -->
    <div v-if="game.talent || game.talentOffer.length" class="card space-y-1.5">
      <div class="flex items-center justify-between">
        <div class="title-rule !m-0 flex-1">Thiên Phú</div>
        <div v-if="game.talent" class="ml-2 text-xs font-bold" :style="{ color: GRADE_COLORS[TALENTS[game.talent].grade] }">{{ TALENTS[game.talent].name }}</div>
      </div>
      <p v-if="game.talent" class="text-[11px] text-slate-300">{{ TALENTS[game.talent].text }}. Kiếp sau bốc lại.</p>
      <template v-else>
        <p class="text-[11px] text-jade-300">Chọn một thiên phú cho kiếp này (kiếp sau bốc lại).</p>
        <div v-for="id in game.talentOffer" :key="id" class="rounded border border-ink-600 bg-ink-900 p-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold" :style="{ color: GRADE_COLORS[TALENTS[id].grade] }">
              {{ TALENTS[id].name }} <span class="text-[10px] font-normal text-slate-500">{{ GRADE_NAMES[TALENTS[id].grade] }}</span>
            </span>
            <button class="btn-gold !px-3 !py-0.5 text-xs" @click="game.chooseTalent(id)">Chọn</button>
          </div>
          <p class="mt-0.5 text-[11px] text-slate-300">{{ TALENTS[id].text }}</p>
        </div>
        <button class="btn-ghost w-full py-1 text-xs" :disabled="game.reincarnation.dao < TALENT_REROLL_COST" @click="game.rerollTalents()">
          Bốc lại ({{ TALENT_REROLL_COST }} Đạo Vận)
        </button>
      </template>
    </div>

    <!-- Đạo Lộ: chọn một lần từ Trúc Cơ -->
    <div class="card space-y-1.5">
      <div class="flex items-center justify-between">
        <div class="title-rule !m-0 flex-1">Đạo Lộ</div>
        <div v-if="game.path" class="ml-2 text-xs font-bold" :style="{ color: PATHS[game.path].css }">{{ PATHS[game.path].name }}</div>
      </div>
      <template v-if="game.path">
        <p class="text-[11px] text-slate-300">{{ PATHS[game.path].perkText }}.</p>
        <p class="text-[11px] text-slate-500">Võ kỹ độc quyền: {{ SKILLS[PATHS[game.path].skill].name }}. Luân hồi để chọn lại đạo lộ.</p>
      </template>
      <p v-else-if="!game.canChoosePath" class="text-[11px] text-slate-400">Đạt {{ REALMS[PATH_MIN_REALM].name }} để chọn đạo lộ (mỗi kiếp chọn một lần).</p>
      <template v-else>
        <p class="text-[11px] text-jade-300">Hãy chọn đạo lộ cho kiếp này, mỗi hướng có đặc quyền và võ kỹ độc quyền riêng.</p>
        <div v-for="id in PATH_IDS" :key="id" class="rounded border border-ink-600 bg-ink-900 p-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold" :style="{ color: PATHS[id].css }">{{ PATHS[id].name }}</span>
            <button class="btn-gold !px-3 !py-0.5 text-xs" @click="game.choosePath(id)">Chọn</button>
          </div>
          <p class="mt-0.5 text-[11px] text-slate-400">{{ PATHS[id].desc }}</p>
          <p class="text-[11px] text-slate-300">{{ PATHS[id].perkText }}. Võ kỹ độc quyền: {{ SKILLS[PATHS[id].skill].name }}.</p>
        </div>
      </template>
    </div>

    <!-- Lối tắt tới các màn hình của nhân vật -->
    <div class="grid grid-cols-2 gap-2">
      <button class="card flex items-center gap-2 !py-2 text-left transition hover:brightness-125" @click="ui.go('skills')">
        <Icon name="skills" :size="22" class="text-jade-300" />
        <span>
          <span class="block text-xs font-bold text-white">Công Pháp</span>
          <span class="text-[11px] text-slate-400">{{ learned }}/{{ Object.keys(SKILLS).length }} đã học · {{ game.skillSlots }} ô</span>
        </span>
      </button>
      <button class="card flex items-center gap-2 !py-2 text-left transition hover:brightness-125" @click="ui.go('gear')">
        <Icon name="gear" :size="22" class="text-gold-300" />
        <span>
          <span class="block text-xs font-bold text-white">Trang Bị</span>
          <span class="text-[11px] text-slate-400">{{ worn }}/3 đang mặc · {{ game.gear.bag.length }} trong túi</span>
        </span>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div v-for="row in statRows" :key="row.label" class="card flex items-center gap-2.5 py-2">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-600 bg-black/30" :class="row.color">
          <Icon :name="row.icon" :size="18" />
        </span>
        <div>
          <div class="text-[11px] text-slate-400">{{ row.label }}</div>
          <div class="text-base font-bold leading-tight" :class="row.color">{{ fmt(row.value) }}</div>
        </div>
      </div>
    </div>

    <div class="card space-y-0.5 text-xs text-slate-300">
      <div class="flex justify-between"><span>Linh khí/giây</span><b class="text-jade-300">{{ fmt(game.expRate) }}</b></div>
      <div class="flex justify-between"><span>Linh thạch/giây</span><b class="text-gold-300">{{ fmt(game.stonesRate) }}</b></div>
      <div class="flex justify-between"><span>Tỉ lệ đột phá</span><b>{{ fmtPercent(game.successChance) }}</b></div>
      <div v-if="game.bonus.exp > 0" class="flex justify-between">
        <span>Thưởng linh khí vĩnh viễn</span><b class="text-jade-300">+{{ fmtPercent(game.bonus.exp) }}</b>
      </div>
      <div class="flex justify-between"><span>Luyện Đan</span><b>Cấp {{ game.alchemy.level }}</b></div>
      <div v-if="game.nextTribulation" class="flex justify-between">
        <span>Thiên kiếp kế tiếp</span><b class="text-cinnabar-400">{{ game.nextTribulation.bolts }} đạo lôi</b>
      </div>
      <div class="my-1 border-t border-ink-600"></div>
      <div class="flex justify-between"><span>Đột phá thành công</span><b>{{ game.stats.breakthroughs }}</b></div>
      <div class="flex justify-between"><span>Thất bại</span><b>{{ game.stats.failures }}</b></div>
      <div class="flex justify-between"><span>Thiên kiếp đã vượt</span><b>{{ game.stats.tribulations }}</b></div>
      <div class="flex justify-between"><span>Yêu thú đã hạ</span><b>{{ game.stats.kills }} ({{ game.stats.bossKills }} boss)</b></div>
      <div class="flex justify-between"><span>Tổng thời gian tu luyện</span><b>{{ fmtDuration(game.stats.playSeconds) }}</b></div>
    </div>
  </div>
</template>
