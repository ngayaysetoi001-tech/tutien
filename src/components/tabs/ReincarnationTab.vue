<script setup>
// ReincarnationTab.vue - Luân Hồi: đặt lại tiến trình lấy Đạo Vận, mua cường hoá vĩnh viễn.
import { useGameStore } from '../../stores/gameStore.js'
import { MIN_STAGE, PERKS, perkCost } from '../../game/reincarnation.js'
import { STAGES } from '../../game/constants.js'

const game = useGameStore()

const level = (perk) => game.reincarnation.upgrades[perk.id] ?? 0
const maxed = (perk) => level(perk) >= perk.max

function onReincarnate() {
  const msg =
    `Luân hồi từ ${game.stage.fullName} để nhận ${game.daoPreview} Đạo Vận?\n\n` +
    'MẤT: cảnh giới, linh khí, linh thạch, Tụ Linh Trận, đan và chỉ số vĩnh viễn, túi vật phẩm, ải cao nhất đã vượt (kỷ lục vẫn giữ), Linh Điền.\n' +
    'GIỮ: võ kỹ, công pháp, trang bị, cấp Luyện Đan, thành tựu, Đạo Vận và cường hoá.'
  if (window.confirm(msg)) game.reincarnate()
}
</script>

<template>
  <div class="space-y-2">
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="font-bold text-white">Luân Hồi</div>
        <div class="text-xs text-slate-400">Đã luân hồi {{ game.reincarnation.count }} lần</div>
      </div>
      <p class="mt-1 text-xs text-slate-400">
        Từ {{ STAGES[MIN_STAGE].fullName }} trở lên có thể chuyển thế. Cảnh giới càng cao, Đạo Vận nhận càng nhiều. Kiếp sau ngươi được
        căn cốt và hệ ngũ hành mới.
      </p>
      <div class="mt-2 flex items-center justify-between rounded bg-ink-900 px-2 py-1.5 text-sm">
        <span class="text-slate-300">Đạo Vận hiện có</span>
        <b class="text-gold-300">{{ game.reincarnation.dao }}</b>
      </div>
      <button class="btn-danger mt-2 w-full" :disabled="!game.canReincarnate" @click="onReincarnate">
        {{ game.canReincarnate ? `Luân hồi (+${game.daoPreview} Đạo Vận)` : `Cần ${STAGES[MIN_STAGE].fullName}` }}
      </button>
    </div>

    <div v-for="perk in PERKS" :key="perk.id" class="card">
      <div class="flex items-center justify-between">
        <div class="text-sm font-bold text-white">{{ perk.name }}</div>
        <div class="text-xs text-gold-300">Cấp {{ level(perk) }}/{{ perk.max }}</div>
      </div>
      <div class="text-[11px] text-slate-400">{{ perk.desc }}</div>
      <button class="btn-gold mt-1.5 w-full py-1 text-xs" :disabled="maxed(perk) || game.reincarnation.dao < perkCost(perk, level(perk))" @click="game.buyPerk(perk.id)">
        {{ maxed(perk) ? 'Tối đa' : `Nâng cấp - ${perkCost(perk, level(perk))} Đạo Vận` }}
      </button>
    </div>
  </div>
</template>
