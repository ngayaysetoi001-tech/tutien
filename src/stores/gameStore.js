// =====================================================================
// gameStore.js - Trái tim của game (Pinia store)
//  * state    : toàn bộ thuộc tính nhân vật, túi đồ, thống kê, cài đặt
//  * getters  : giá trị dẫn xuất (yêu cầu đột phá, linh khí/giây, chỉ số...)
//  * actions  : tụ khí, đột phá, độ kiếp, nâng trận, lưu/tải, offline
// Công thức nằm ở game/formulas.js; hiển thị nằm ở components.
// =====================================================================
import { defineStore } from 'pinia'
import Decimal from 'break_infinity.js'
import {
  AUTOSAVE_INTERVAL,
  BALANCE,
  LOG_LIMIT,
  MAX_STAGE_IDX,
  OFFLINE_CAP_SECONDS,
  LOW_POWER_STEP,
  TIME_BANK_CAP,
  WARP_FACTOR,
  OFFLINE_MIN_SECONDS,
  SPIRIT_ROOTS,
  STAGES,
} from '../game/constants.js'
import * as F from '../game/formulas.js'
import { emit } from '../game/events.js'
import { fmt } from '../game/format.js'
import { ITEMS, MONSTERS, RECIPES, dungeonById, DUNGEONS, itemName } from '../game/data.js'
import { ELEMENT_IDS, elementMult } from '../game/elements.js'
import * as SK from '../game/skills.js'
import * as AR from '../game/arts.js'
import * as PT from '../game/pets.js'
import * as TR from '../game/treasures.js'
import { TALENTS, TALENT_REROLL_COST, rollTalentOffer, talentPerk } from '../game/talents.js'
import { MAX_PARTY, MISSIONS, expeditionSlots, missionEffects, partyPower, successChance } from '../game/expedition.js'
import { BUILDINGS, BUILDING_MAX_LEVEL, buildingCost, buildingNeedStage, dwellingPerks, emptyDwelling } from '../game/dwelling.js'
import { PATHS, PATH_MIN_REALM, pathPerk } from '../game/paths.js'
import * as EQ from '../game/equipment.js'
import { enemyStats, simulateFight } from '../game/battle.js'
import * as C from '../game/campaign.js'
import { MIN_STAGE, daoGain, perkById, perkCost } from '../game/reincarnation.js'
import { AUTOMATIONS, AUTOMATION_INTERVAL, SALVAGE_MAX, SALVAGE_MIN, automationById, automationUnlocked } from '../game/automation.js'
import { CHALLENGES, challengeReward } from '../game/challenges.js'
import {
  DAILY_BONUS_REWARD, DAILY_BONUS_TIME, DAILY_TASK_COUNT, DAILY_TASK_REWARD, DAILY_TEMPLATE_IDS, STREAK_DAYS, dailyArtPool, dailyReward, dayKey, emptyDaily, nextRewardDay, previousDayKey,
} from '../game/daily.js'
import { BOSS_CHOICE_SECONDS, bossChoiceOptions } from '../game/bossChoice.js'
import { CROPS, cropById, mineAmount, mineInfo, plotCount, seedCost, MAX_PLOTS } from '../game/garden.js'
import { RANKS, RANK_PERK_STEP, SHOP, SWITCH_PENALTY, discipleCap, rankIndex, sectById } from '../game/sect.js'
import { BOARD_SIZE, REFRESH_COST_BASE, generateQuest, questReward, questTarget, templateById } from '../game/quests.js'
import {
  GRADES, JOBS, NAMES as DISCIPLE_NAMES, collectResult, levelCap, levelCost, recruitCost, rollGrade,
} from '../game/disciples.js'
import { ELEMENTS } from '../game/elements.js'
import { CHAPTERS, ENDINGS, EXTRAS, REALM_FLAVOR, chapterById } from '../game/story.js'
import { LORE } from '../game/lore.js'
import { EVENT_AUTO_SECONDS, EVENT_INTERVAL, EVENT_RESULT_SECONDS, RANDOM_EVENTS, eventById } from '../game/randomEvents.js'
import { ACHIEVEMENTS, achievementReward } from '../game/achievements.js'
import { useBattleStore } from './battleStore.js'
import { useUiStore } from './uiStore.js'
import {
  clearLocal,
  deserialize,
  exportToFile,
  readFileAsSave,
  readLocal,
  serialize,
  writeLocal,
} from '../services/saveService.js'

// Biến ngoài state (không cần reactive): bộ đếm giờ của vòng lặp và thiên kiếp.
let loopHandle = null
let lastTs = 0
let saveAcc = 0
let tribulationTimer = null
let logId = 0
let discipleSeq = 0

/** Chọn ngẫu nhiên căn cốt theo trọng số. */
function rollSpiritRoot(minIdx = 0) {
  const pool = SPIRIT_ROOTS.slice(minIdx) // Thiên Mệnh: loại bỏ các căn cốt thấp nhất
  const total = pool.reduce((s, r) => s + r.weight, 0)
  let pick = Math.random() * total
  for (const root of pool) {
    pick -= root.weight
    if (pick <= 0) return root
  }
  return pool[0]
}

/** Số giây chờ tới kỳ ngộ kế tiếp. */
function rollEventDelay() {
  return EVENT_INTERVAL[0] + Math.random() * (EVENT_INTERVAL[1] - EVENT_INTERVAL[0])
}

/** State nhân vật mặc định cho một game mới. */
/** Mọi khoá thưởng bổ sung (linh thú, thiên phú, công trình động phủ): cộng gộp ở extraPerk. */
const ZERO_EXTRA = { atk: 0, hp: 0, def: 0, speed: 0, crit: 0, cd: 0, thorns: 0, luck: 0, stones: 0, exp: 0, arts: 0, disciple: 0, dao: 0, pill: 0, double: 0, forge: 0 }

function createPlayerState(minRoot = 0) {
  return {
    name: 'Đạo hữu vô danh',
    createdAt: Date.now(),
    spiritRoot: rollSpiritRoot(minRoot),
    stageIdx: 0,
    exp: new Decimal(0),
    spiritStones: new Decimal(0),
    arrayLevel: 0, // cấp Tụ Linh Trận
    // Thưởng vĩnh viễn (từ đan dược, về sau): cộng thẳng vào chỉ số
    bonus: { hp: 0, atk: 0, def: 0, speed: 0, exp: 0, success: 0 },
    inventory: { herbs: {}, ores: {}, scrolls: {}, pills: {} },
    element: ELEMENT_IDS[Math.floor(Math.random() * ELEMENT_IDS.length)], // hệ ngũ hành chủ đạo
    path: null, // Đạo Lộ (xem paths.js): chọn khi đạt Trúc Cơ, chọn lại sau luân hồi
    talent: null, // Thiên Phú của kiếp này (xem talents.js)
    talentOffer: [], // 3 thiên phú đang chờ chọn (rỗng khi đã chọn)
    daily: emptyDaily(), // điểm danh ngày và nhiệm vụ ngày (giữ khi luân hồi)
    timeBank: 0, // kho thời gian tích luỹ (giây), tiêu để tăng tốc x4; giữ khi luân hồi
    challenge: null, // Kiếp Thử Thách đang theo (xem challenges.js), null = kiếp thường
    challengeDone: false, // đã hoàn thành thử thách trong kiếp này
    dwelling: emptyDwelling(), // cấp các công trình Động Phủ (giữ khi luân hồi)
    expeditions: [], // thám hiểm đang đi: { id, uids, since (ms), seconds }
    pets: { owned: {}, active: [null, null] }, // Linh thú. owned: { id: cấp }, active: id linh thú ra trận
    treasures: { owned: {}, slots: [null, null, null, null] }, // Pháp Bảo: owned { id: phẩm 1..5 }, slots: id đã gắn
    arts: { owned: {}, awaken: {} }, // Công pháp (bị động, học xong là cộng ngay). owned: { id: cấp }, awaken: { id: đặc tính ngộ đạo }
    skills: { owned: {}, slots: [null, null, null, null, null], branch: {} }, // Võ kỹ. owned: { id: cấp }, slots: id đã trang bị, branch: { id: 0|1 } nhánh tiến hoá
    gear: { bag: [], equipped: { weapon: null, armor: null, helm: null, boots: null, ring: null, jade: null } }, // equipped lưu uid
    achTier: {}, // { id thành tựu: số mốc đã nhận }
    stats: {
      breakthroughs: 0, failures: 0, tribulations: 0, playSeconds: 0,
      kills: 0, bossKills: 0, crafted: 0, forged: 0, events: 0, maxStage: 0, reincarnations: 0, harvests: 0, questsDone: 0, dailyTasks: 0, expeditions: 0,
    },
    settings: {
      particles: true, autoSave: true, autoRepeat: true, autoHeal: true, sound: true, music: true, autoBreak: false,
      notify: false, // thông báo trình duyệt khi linh khí đầy lúc tab ở nền
      warp: false, // đang tăng tốc (không lưu)
      auto: Object.fromEntries(AUTOMATIONS.map((a) => [a.id, false])), // tự động hoá đã mở khoá: bật / tắt từng cái
      autoCraft: null, // id công thức tự luyện
      salvageBelow: 1, // tự phân giải đồ có độ hiếm dưới ngưỡng này (1..3), khi bật tự động hoá 'salvage'
    },
    buffs: { success: 0, guard: 0 }, // hiệu ứng đan dược dùng một lần
    alchemy: { level: 1, exp: 0 }, // cấp Luyện Đan
    usage: {}, // số lần đã dùng mỗi vật phẩm (kháng đan)
    // Vượt Ải: best = ải cao nhất đã vượt (mất khi luân hồi), record = cao nhất mọi kiếp, grit = Kiên Trì, farm = ải đang cày
    campaign: { best: 0, record: 0, grit: 0, farm: null, milestone: 0 }, // milestone = số rương mốc ải đã nhận (giữ khi luân hồi)
    reincarnation: { count: 0, dao: 0, totalDao: 0, upgrades: {}, challenges: {} }, // Luân Hồi: Đạo Vận, cường hoá vĩnh viễn, số lần hoàn thành mỗi Kiếp Thử Thách
    garden: { plots: Array(MAX_PLOTS).fill(null) }, // Linh Điền: { crop, readyAt(ms) } hoặc null
    mineAt: Date.now(), // mốc thu khoáng mạch lần cuối (ms)
    expPillUses: 0, // số Tụ Khí Đan đã dùng trong bậc hiện tại (giảm hiệu quả liên tiếp)
    sect: { id: null, contribution: 0, total: 0 }, // Tông Môn (giữ nguyên khi luân hồi)
    quests: [], // bảng nhiệm vụ: { uid, tpl, tier, target, start }
    disciples: [], // đệ tử: { uid, name, element, grade, level, job, since }
    // Cốt truyện: done = số chương chính đã xong, flags = lựa chọn đã làm, align = Nhân Tâm (+) / Sát Đạo (-)
    story: { done: 0, flags: {}, align: 0, extras: {}, seen: {}, lore: {}, ending: null, title: null },
  }
}

export const useGameStore = defineStore('game', {
  state: () => ({
    ...createPlayerState(),
    // ---- Trạng thái tạm thời (không lưu vào save) ----
    ready: false,
    log: [],
    fullNotified: false,
    offlineReport: null, // { seconds, exp, stones, capped } -> hiện modal chào mừng
    lastSaveTime: 0,
    tribulation: { active: false, bolt: 0, total: 0, hp: 0, maxHp: 0, name: '' },
    storyView: null, // trình đọc truyện đang mở: { id, idx, replay, phase, result, effectsText }
    storyTimer: 0,
    bossChoice: null, // lựa chọn phần thưởng boss đang chờ: { n, kind, options: [{ label, effects }] }
    bossChoiceAge: 0,
    autoTimer: 0, // đếm giây cho tự động hoá
    event: null, // kỳ ngộ đang chờ người chơi: { id, resultText, effectsText } hoặc null
    eventTimer: 0,
    eventAge: 0, // số giây kỳ ngộ hiện tại đã chờ (tự xử lý nếu bỏ ngỏ)
    eventNext: rollEventDelay(),
  }),

  getters: {
    stage: (s) => STAGES[s.stageIdx],
    realmIdx() {
      return this.stage.realmIdx
    },
    isMaxStage: (s) => s.stageIdx >= MAX_STAGE_IDX,
    requirement: (s) => F.stageRequirement(s.stageIdx),
    expRate() {
      return F.expPerSecond({
        arrayLevel: this.arrayLevel,
        rootMult: this.spiritRoot.mult,
        stageIdx: this.stageIdx,
        arrayPower: 1 + this.pathPerk.array,
        expBonus: this.bonus.exp + this.gearStats.exp + this.gearPerk.exp + this.artBonus.exp + this.extraPerk.exp + C.campaignExpBonus(this.campaign.best, this.stageIdx, 1 + this.artBonus.income, this.incomeCapBonus),
      }).mul(1 + 0.1 * (this.reincarnation.upgrades.tu_chat ?? 0)) // Tu Chất
        .mul(1 + this.sectPerk.exp) // đặc quyền tông môn
    },
    /** Thưởng Phúc Duyên cho tỉ lệ rơi đồ. */
    lootLuck() {
      return 0.1 * (this.reincarnation.upgrades.phuc_duyen ?? 0) + this.artBonus.luck + this.gearPerk.luck + this.extraPerk.luck
    },
    /** Giờ offline tối đa (8 giờ + Bế Quan Dài). */
    offlineCap() {
      return OFFLINE_CAP_SECONDS + 3600 * (this.reincarnation.upgrades.bi_quan ?? 0)
    },
    /** Số mục Điển Tịch đã mở nhưng chưa đọc (chấm đỏ ở tab). */
    loreUnread() {
      return LORE.filter((e) => this.loreUnlocked(e) && !this.story.seen[e.id]).length
    },
    /** Chương chính kế tiếp (hoặc null nếu đã hết). */
    storyNext() {
      return CHAPTERS[this.story.done] ?? null
    },
    sectDef() {
      return sectById(this.sect.id)
    },
    rankIdx() {
      return rankIndex(this.sect.total)
    },
    /** Đặc quyền tông môn đã nhân theo cấp bậc: { atk, hp, def, exp, skill, herb } (phân số). */
    /** Ải trần cộng thêm cho thu nhập thụ động (cường hoá luân hồi Ải Lộ: +5 mỗi cấp). */
    incomeCapBonus() {
      return 5 * (this.reincarnation.upgrades.ai_loc ?? 0)
    },
    sectPerk() {
      const k = 1 + RANK_PERK_STEP * this.rankIdx
      const out = { atk: 0, hp: 0, def: 0, exp: 0, skill: 0, herb: 0 }
      if (this.challenge === 'doc_hanh') return out // Độc Hành: không đặc quyền tông môn
      for (const [key, v] of Object.entries(this.sectDef?.perk ?? {})) out[key] = v * k
      return out
    },
    discipleLimit() {
      return discipleCap(this.rankIdx, !!this.sect.id)
    },
    questRefreshCost() {
      return new Decimal(1.45).pow(this.stageIdx).mul(REFRESH_COST_BASE)
    },
    daoPreview() {
      return this.daoWithArts(daoGain(this.stageIdx))
    },
    canReincarnate() {
      return this.stageIdx >= MIN_STAGE && !this.tribulation.active
    },
    /** Tổng chỉ số từ trang bị đang mặc. */
    gearStats() {
      if (this.challenge === 'tay_khong') return { hp: 0, atk: 0, def: 0, speed: 0, exp: 0 } // Tay Không: trang bị vô hiệu
      return EQ.sumStats(this.equippedItems.filter(Boolean))
    },
    /** Thưởng từ dòng phụ, bộ trang bị và đồ Huyền Thoại đang mặc. */
    gearPerk() {
      if (this.challenge === 'tay_khong') return { ...EQ.ZERO_GEAR_PERK }
      return EQ.gearPerks(this.equippedItems.filter(Boolean))
    },
    /** Bộ trang bị đang kích hoạt (để hiển thị). */
    activeGearSets() {
      if (this.challenge === 'tay_khong') return []
      return EQ.activeSets(this.equippedItems.filter(Boolean))
    },
    /** Thưởng chiến đấu gộp từ Đạo Lộ và trang bị (hồi chiêu giảm tối đa 50%). */
    battlePerk() {
      const p = this.pathPerk
      const g = this.gearPerk
      const e = this.extraPerk
      return {
        crit: p.crit + g.crit + e.crit, critMult: p.critMult + g.critMult, skillDmg: p.skillDmg + g.skillDmg + 0.05 * (this.reincarnation.upgrades.vo_ky ?? 0),
        lifesteal: p.lifesteal + g.lifesteal, cd: Math.min(0.5, p.cd + g.cd + e.cd), extra: g.extra, thorns: g.thorns + e.thorns,
        bossDmg: g.bossDmg, killHeal: g.killHeal, killShield: g.killShield, ignite: g.ignite, hitCd: g.hitCd, // dòng đặc tính có tên
      }
    },
    /** Mảng 6 phần tử theo thứ tự EQ.SLOT_IDS (weapon, armor, helm, boots, ring, jade): món đồ hoặc null */
    equippedItems() {
      const out = []
      for (const slot of EQ.SLOT_IDS) out.push(this.gear.bag.find((it) => it.uid === this.gear.equipped[slot]) ?? null)
      return out
    },
    skillSlots() {
      if (this.challenge === 'don_nhat') return 1 // Đơn Nhất: chỉ một võ kỹ
      return Math.min(SK.MAX_SKILL_SLOTS, SK.slotCount(this.realmIdx) + this.pathPerk.slots)
    },
    /** Đặc quyền của Đạo Lộ đã chọn (mọi khoá, 0 nếu chưa chọn). */
    pathPerk() {
      return pathPerk(this.path)
    },
    /** Có thể chọn Đạo Lộ ngay bây giờ không. */
    /** Có rương mốc ải đang chờ nhận không. */
    milestoneClaimable() {
      const m = C.MILESTONES[this.campaign.milestone]
      return !!m && this.campaign.record >= m.ai
    },
    /** Điểm danh hoặc nhiệm vụ ngày còn chờ nhận (hiện chấm đỏ ở màn Nhân Vật). */
    dailyPending() {
      return (!this.daily.claimed && !!this.daily.day) || this.daily.tasks.some((t) => !t.claimed && this.dailyTaskDone(t))
    },
    /** Đang có thiên phú chờ chọn. */
    talentPending() {
      return !this.talent && this.talentOffer.length > 0
    },
    canChoosePath() {
      return !this.path && this.realmIdx >= PATH_MIN_REALM
    },
    /** Số thám hiểm chạy cùng lúc (theo cấp bậc tông môn). */
    expeditionSlotCount() {
      return expeditionSlots(this.rankIdx)
    },
    /** Số ô linh thú đã mở. */
    petSlots() {
      return PT.petSlotCount(this.realmIdx)
    },
    /** Linh thú đang ra trận (đã học, trong số ô đã mở). */
    activePets() {
      return this.pets.active.slice(0, this.petSlots).filter((id) => id && this.pets.owned[id])
    },
    /** Thưởng bị động từ linh thú ra trận. */
    petPerk() {
      return PT.petPerks(this.activePets, this.pets.owned, this.element)
    },
    /** Thưởng bổ sung gộp từ linh thú (và các nguồn khác về sau) – các khoá ở ZERO_EXTRA. */
    extraPerk() {
      const out = { ...ZERO_EXTRA }
      for (const [k, v] of Object.entries(this.petPerk)) out[k] += v
      for (const [k, v] of Object.entries(dwellingPerks(this.dwelling))) out[k] += v
      for (const [k, v] of Object.entries(talentPerk(this.talent))) out[k] += v
      if (this.challenge !== 'doc_hanh') for (const [k, v] of Object.entries(AR.artPerks(this.arts.owned, this.arts.awaken))) out[k] += v // cộng hưởng hệ + ngộ đạo (Độc Hành: vô hiệu như công pháp)
      return out
    },
    /** Số ô pháp bảo đã mở. */
    treasureSlots() {
      return TR.treasureSlotCount(this.realmIdx)
    },
    /** Thần thông của các pháp bảo đang gắn (cho trận đánh). */
    treasureFx() {
      const slots = this.treasures.slots.slice(0, this.treasureSlots)
      const elements = this.skills.slots.slice(0, this.skillSlots).filter(Boolean).map((id) => SK.SKILLS[id].element)
      return TR.treasureEffects(slots, this.treasures.owned, elements)
    },
    /** Tổng bị động từ mọi công pháp đã học (đã tính thưởng cùng hệ với tông môn). */
    artBonus() {
      if (this.challenge === 'doc_hanh') return { exp: 0, hp: 0, atk: 0, def: 0, speed: 0, stones: 0, income: 0, luck: 0, elem: 0, dao: 0 } // Độc Hành
      const t = AR.totalArtBonus(this.arts.owned, this.sectDef?.element ?? null)
      const k = 1 + this.pathPerk.arts + 0.05 * (this.reincarnation.upgrades.cong_phap ?? 0) + this.extraPerk.arts // Trận Pháp Sư, cường hoá Pháp Duyên
      if (k !== 1) for (const key of Object.keys(t)) t[key] *= k
      return t
    },
    /** Số thành tựu đang có thể nhận thưởng (hiện chấm đỏ ở tab). */
    claimableCount() {
      return ACHIEVEMENTS.filter((a) => this.achievementClaimable(a)).length
    },
    stonesRate: (s) => F.stonesPerSecond(s.stageIdx).add(C.campaignStonesPerSecond(s.campaign.best, s.stageIdx, 1 + s.artBonus.income, s.incomeCapBonus)).mul(1 + s.artBonus.stones + s.extraPerk.stones),
    /** Tiến độ tu vi 0..1 */
    progress() {
      return Math.min(1, this.exp.div(this.requirement).toNumber())
    },
    isFull() {
      return this.exp.gte(this.requirement)
    },
    successChance: (s) => F.successRate(s.stageIdx, s.bonus.success + s.buffs.success),
    combat() {
      const g = this.gearStats
      const b = this.bonus
      const base = F.combatStats(this.stageIdx, {
        hp: b.hp + g.hp, atk: b.atk + g.atk, def: b.def + g.def, speed: b.speed + g.speed,
      })
      const k = 1 + 0.05 * (this.reincarnation.upgrades.than_the ?? 0) // Thân Thể
      const p = this.sectPerk
      const a = this.artBonus
      const gp = this.gearPerk
      const ep = this.extraPerk
      return {
        hp: Math.round(base.hp * k * (1 + p.hp) * (1 + a.hp) * (1 + this.pathPerk.hp) * (1 + gp.hp) * (1 + ep.hp)),
        atk: Math.round(base.atk * k * (1 + p.atk) * (1 + a.atk) * (1 + this.pathPerk.atk) * (1 + gp.atk) * (1 + ep.atk)),
        def: Math.round(base.def * k * (1 + p.def) * (1 + a.def) * (1 + this.pathPerk.def) * (1 + gp.def) * (1 + ep.def)),
        speed: Math.round(base.speed * (1 + a.speed) * (1 + gp.speed) * (1 + ep.speed)),
      }
    },
    /** Lần đột phá kế tiếp có phải độ kiếp không (cấu hình hoặc null) */
    nextTribulation: (s) => F.tribulationFor(s.stageIdx),
    canBreakthrough() {
      return this.isFull && !this.isMaxStage && !this.tribulation.active
    },
    arrayCost: (s) => F.arrayUpgradeCost(s.arrayLevel),
    canUpgradeArray() {
      return !this.tribulation.active && this.spiritStones.gte(this.arrayCost)
    },
    /** Tên bậc kế tiếp, dùng cho nút Đột Phá */
    nextStageName: (s) => (s.stageIdx < MAX_STAGE_IDX ? STAGES[s.stageIdx + 1].fullName : null),
  },

  actions: {
    // ------------------------------------------------------------
    // Nhật ký
    // ------------------------------------------------------------
    /** type: info | good | bad | event */
    addLog(text, type = 'info') {
      this.log.push({ id: ++logId, time: Date.now(), text, type })
      if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT)
    },

    // ------------------------------------------------------------
    // Khởi tạo / vòng lặp
    // ------------------------------------------------------------
    /** Gọi một lần khi mở game: tải save (nếu có) rồi tính offline. */
    init() {
      if (this.ready) return
      const raw = readLocal()
      let loaded = false
      if (raw) {
        try {
          Object.assign(this, deserialize(raw, createPlayerState()))
          loaded = true
          const elapsed = (Date.now() - (raw.savedAt ?? Date.now())) / 1000
          this.addLog(`Trở về động phủ, tiếp tục tu hành. Cảnh giới: ${this.stage.fullName}.`, 'event')
          this.applyOffline(elapsed)
        } catch {
          this.addLog('Save cũ bị hỏng, bắt đầu hành trình mới.', 'bad')
        }
      }
      if (!loaded) {
        this.addLog(`Bước vào con đường tu tiên với ${this.spiritRoot.name}. ${this.spiritRoot.desc}`, 'event')
        this.addLog('Linh khí tự tích luỹ theo thời gian, đầy 100% thì bấm "Đột Phá".', 'info')
      }
      this.refillQuests()
      this.ensureDaily()
      if (!this.talent && this.talentOffer.length === 0) this.talentOffer = rollTalentOffer() // game mới hoặc save cũ: bốc thiên phú
      this.ready = true
      this.save()
    },

    startLoop() {
      if (loopHandle) return
      lastTs = Date.now()
      loopHandle = setInterval(() => this.loopStep(), 100)
    },

    /** Đặt lại mốc đồng hồ của vòng lặp (dùng khi bắt đầu hoặc trong test). */
    syncLoopClock(now = Date.now()) {
      lastTs = now
      saveAcc = 0
    },

    /**
     * Một bước của vòng lặp (gọi mỗi 100 ms). Chế độ thiền định chỉ tick mỗi LOW_POWER_STEP giây để đỡ tốn pin.
     * Trả về true nếu đã chạy một nhịp.
     */
    loopStep(now = Date.now()) {
      const dt = (now - lastTs) / 1000
      if (useUiStore().meditate && dt < LOW_POWER_STEP) return false
      lastTs = now
      // Khoảng nghỉ lớn (máy ngủ / tab bị đóng băng) được xử lý như offline
      if (dt > 5) this.applyOffline(dt)
      else this.warpTick(dt)
      saveAcc += dt
      if (saveAcc >= AUTOSAVE_INTERVAL) {
        saveAcc = 0
        if (this.settings.autoSave) this.save()
      }
      return true
    },

    /** Cộng thời gian vào kho (tối đa TIME_BANK_CAP). */
    addTimeBank(seconds) {
      if (!(seconds > 0)) return
      this.timeBank = Math.min(TIME_BANK_CAP, this.timeBank + seconds)
    },

    /** Một nhịp có tính tăng tốc: bật tăng tốc thì chạy thêm tối đa WARP_FACTOR - 1 nhịp, mỗi nhịp thêm tiêu dt giây trong kho. */
    warpTick(dt) {
      let extra = 0
      if (this.settings.warp) {
        extra = this.timeBank > 0 && dt > 0 ? Math.min(WARP_FACTOR - 1, Math.floor(this.timeBank / dt)) : 0
        if (extra === 0) this.settings.warp = false // hết kho thì tự tắt
      }
      if (extra > 0) this.timeBank = Math.max(0, this.timeBank - extra * dt)
      for (let i = 0; i <= extra; i++) this.tick(dt)
    },

    stopLoop() {
      clearInterval(loopHandle)
      loopHandle = null
      clearTimeout(tribulationTimer)
    },

    /** Một nhịp game: cộng linh khí + linh thạch thụ động. */
    tick(dt) {
      this.stats.playSeconds += dt
      if (this.tribulation.active) return // đang độ kiếp: tạm dừng tu luyện
      this.spiritStones = this.spiritStones.add(this.stonesRate.mul(dt))
      this.gainExp(this.expRate.mul(dt))
      this.grantCampaignItems(dt)
      this.autoTimer += dt
      if (this.autoTimer >= AUTOMATION_INTERVAL) {
        this.autoTimer = 0
        this.runAutomation()
        this.checkChallenge()
        this.ensureDaily()
        if (this.bossChoice) {
          this.bossChoiceAge += AUTOMATION_INTERVAL
          if (this.bossChoiceAge >= BOSS_CHOICE_SECONDS) this.chooseBossReward(0, true)
        }
      }
      // Tự động đột phá các bậc nhỏ (bậc có thiên kiếp luôn phải tự bấm để chuẩn bị đan)
      if (this.settings.autoBreak && this.canBreakthrough && !this.nextTribulation && !this.storyView && !this.event) this.breakthrough()
      this.storyTimer += dt
      if (this.storyTimer >= 1.5) {
        this.storyTimer = 0
        this.checkStory() // tự mở chương truyện khi đủ điều kiện
      }
      if (this.event) {
        // Kỳ ngộ không dừng chiến đấu; bỏ ngỏ thì tự chọn phương án an toàn rồi đóng
        this.eventAge += dt
        if (this.event.phase === 'choose' && this.eventAge >= EVENT_AUTO_SECONDS) {
          this.addLog('Không kịp quyết định, ngươi chọn cách an toàn nhất.', 'info')
          this.chooseEvent(eventById(this.event.id).safe ?? 0)
          this.closeEvent()
        } else if (this.event?.phase === 'result' && this.eventAge >= EVENT_RESULT_SECONDS) {
          this.closeEvent()
        }
      }
      if (this.storyView) return // truyện đang mở: tạm dừng chiến đấu
      useBattleStore().tick(dt) // auto-battle Bí Cảnh (nếu đang trong trận)
      this.eventTimer += dt
      if (this.eventTimer >= this.eventNext) this.triggerEvent()
    },

    /** Cộng linh khí, chặn ở mức yêu cầu đột phá và báo khi đầy. */
    gainExp(amount) {
      const req = this.requirement
      const next = this.exp.add(amount)
      this.exp = next.gt(req) ? req : next
      if (this.isFull && !this.fullNotified) {
        this.fullNotified = true
        this.addLog(
          this.isMaxStage
            ? 'Linh khí đã viên mãn. Đây là cực hạn của phiên bản hiện tại!'
            : 'Linh khí đã đầy, có thể Đột Phá!',
          'good',
        )
      } else if (!this.isFull) {
        this.fullNotified = false
      }
    },

    // ------------------------------------------------------------
    // Offline progress
    // ------------------------------------------------------------
    /** Cộng thưởng cho `elapsedSeconds` giây vắng mặt (tối đa 8 tiếng). */
    applyOffline(elapsedSeconds) {
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < OFFLINE_MIN_SECONDS) return
      const cap = this.offlineCap
      const seconds = Math.min(elapsedSeconds, cap)
      this.addTimeBank(elapsedSeconds - cap) // phần vắng mặt vượt giới hạn không bị mất hẳn mà vào kho thời gian
      const gain = F.offlineGain({
        seconds,
        expRate: this.expRate,
        stonesRate: this.stonesRate,
        exp: this.exp,
        requirement: this.requirement,
      })
      this.gainExp(gain.exp)
      this.spiritStones = this.spiritStones.add(gain.stones)
      this.stats.playSeconds += seconds
      this.offlineReport = {
        seconds,
        exp: gain.exp,
        stones: gain.stones,
        capped: elapsedSeconds > cap,
        full: this.isFull,
        campaign: null,
      }
      this.climbOffline(seconds)
      this.addLog(
        `Bế quan ${Math.floor(seconds / 60)} phút: +${fmt(gain.exp)} linh khí, +${fmt(gain.stones)} linh thạch.`,
        'event',
      )
    },

    dismissOfflineReport() {
      this.offlineReport = null
    },

    // ------------------------------------------------------------
    // Hành động của người chơi
    // ------------------------------------------------------------
    /** Nút "Đột Phá": roll tỉ lệ; thành công ở đại cảnh giới sẽ kích hoạt độ kiếp. */
    breakthrough() {
      if (!this.canBreakthrough) return
      const success = Math.random() < this.successChance
      this.buffs.success = 0 // Phá Cảnh Đan chỉ có tác dụng cho một lần đột phá
      if (!success) {
        this.exp = this.exp.sub(this.requirement.mul(BALANCE.failExpLoss))
        this.fullNotified = false
        this.stats.failures += 1
        this.addLog(
          `Đột phá thất bại! Linh khí tán loạn, hao tổn ${Math.round(BALANCE.failExpLoss * 100)}%.`,
          'bad',
        )
        emit('breakthrough-fail')
        return
      }
      const cfg = this.nextTribulation
      if (cfg) this.startTribulation(cfg)
      else this.advanceStage()
    },

    /** Lên bậc kế tiếp, thưởng linh thạch. */
    advanceStage() {
      const prevRealm = this.realmIdx
      const reward = F.breakthroughReward(this.stageIdx + 1)
      this.stageIdx += 1
      this.expPillUses = 0
      this.exp = new Decimal(0)
      this.fullNotified = false
      this.spiritStones = this.spiritStones.add(reward)
      this.stats.breakthroughs += 1
      this.checkChallenge()
      this.stats.maxStage = Math.max(this.stats.maxStage, this.stageIdx)
      this.addLog(`Đột phá thành công! Tiến vào ${this.stage.fullName}. +${fmt(reward)} linh thạch.`, 'good')
      if (this.realmIdx !== prevRealm && REALM_FLAVOR[this.realmIdx]) this.addLog(REALM_FLAVOR[this.realmIdx], 'event')
      emit('breakthrough-success', { realmChanged: this.realmIdx !== prevRealm, stageName: this.stage.fullName })
    },

    /** Nâng cấp Tụ Linh Trận bằng linh thạch. */
    upgradeArray() {
      if (!this.canUpgradeArray) return
      this.spiritStones = this.spiritStones.sub(this.arrayCost)
      this.arrayLevel += 1
      this.addLog(`Tụ Linh Trận lên cấp ${this.arrayLevel}: ${fmt(this.expRate)} linh khí/giây.`, 'good')
    },

    // ------------------------------------------------------------
    // Túi đồ
    // ------------------------------------------------------------
    /** Thêm vật phẩm vào túi (herbs | ores | scrolls | pills). */
    addItem(group, itemId, count = 1) {
      const bag = this.inventory[group]
      if (!bag) return
      bag[itemId] = (bag[itemId] ?? 0) + count
    },

    /** Nhóm túi đồ của một vật phẩm. */
    itemGroup(id) {
      return ITEMS[id]?.group
    },

    itemCount(id) {
      const group = ITEMS[id]?.group
      return group ? this.inventory[group][id] ?? 0 : 0
    },

    removeItem(id, count = 1) {
      const bag = this.inventory[ITEMS[id]?.group]
      if (!bag || (bag[id] ?? 0) < count) return false
      bag[id] -= count
      if (bag[id] <= 0) delete bag[id]
      return true
    },

    /**
     * Dùng vật phẩm `times` lần (đan dược / lĩnh ngộ tàn quyển). Trả về số lần dùng được.
     * Chỉ số vĩnh viễn giảm hiệu quả theo số lần đã dùng (usageFactor).
     */
    useItem(id, times = 1) {
      const item = ITEMS[id]
      if (!item?.effect || item.effect.type === 'heal') return 0
      if (this.challenge === 'tinh_tam') return 0 // Tịnh Tâm: không dùng đan dược
      const cost = item.useCost ?? 1
      const fx = item.effect
      let used = 0
      for (let i = 0; i < times; i++) {
        if (this.itemCount(id) < cost) break
        if (fx.type === 'exp' && (this.isFull || this.tribulation.active)) break
        if (fx.type === 'buff' && this.buffs[fx.buff] >= fx.amount) break // buff đang có hiệu lực
        this.removeItem(id, cost)
        const factor = F.usageFactor(this.usage[id] ?? 0)
        if (fx.type === 'exp') {
          const raw = this.expRate.mul(fx.seconds)
          const cap = this.requirement.mul(BALANCE.pillExpCap * Math.pow(BALANCE.pillExpStreak, this.expPillUses))
          this.gainExp(raw.gt(cap) ? cap : raw)
          this.expPillUses += 1
        }
        else if (fx.type === 'stat') this.bonus[fx.stat] += fx.amount * factor * (1 + this.pathPerk.pill + this.extraPerk.pill) // Đan Sư: đan mạnh hơn
        else if (fx.type === 'expBonus') this.bonus.exp += fx.amount * factor
        else if (fx.type === 'buff') this.buffs[fx.buff] = fx.amount
        if (fx.type === 'stat' || fx.type === 'expBonus') this.usage[id] = (this.usage[id] ?? 0) + 1
        used++
      }
      if (used > 0) {
        const verb = item.group === 'scrolls' ? 'Lĩnh ngộ' : 'Dùng'
        this.addLog(`${verb} ${itemName(id)}${used > 1 ? ' x' + used : ''}. ${item.desc}`, 'good')
      }
      return used
    },

    /** Bán vật phẩm lấy linh thạch. */
    sellItem(id, count = 1) {
      const item = ITEMS[id]
      const n = Math.min(count, this.itemCount(id))
      if (!item || n <= 0) return 0
      this.removeItem(id, n)
      const gain = new Decimal(item.sell).mul(n)
      this.spiritStones = this.spiritStones.add(gain)
      this.addLog(`Bán ${itemName(id)} x${n}: +${fmt(gain)} linh thạch.`, 'info')
      return n
    },

    // ------------------------------------------------------------
    // Luyện Đan
    // ------------------------------------------------------------
    /** Kiểm tra có luyện được công thức không (đủ bậc, cấp, nguyên liệu, linh thạch). */
    canCraft(recipeId) {
      const r = RECIPES.find((x) => x.id === recipeId)
      if (!r || this.tribulation.active) return false
      if (this.stageIdx < r.minStage || this.alchemy.level < r.minAlchemy) return false
      if (this.spiritStones.lt(r.stones)) return false
      return Object.entries(r.ingredients).every(([id, n]) => this.itemCount(id) >= n)
    },

    /** Luyện `times` lò. Có tỉ lệ ra gấp đôi theo cấp Luyện Đan. Trả về số đan thu được. */
    craft(recipeId, times = 1) {
      const r = RECIPES.find((x) => x.id === recipeId)
      let made = 0
      for (let i = 0; i < times && this.canCraft(recipeId); i++) {
        for (const [id, n] of Object.entries(r.ingredients)) this.removeItem(id, n)
        this.spiritStones = this.spiritStones.sub(r.stones)
        const count = Math.random() < F.alchemyDoubleChance(this.alchemy.level) + this.pathPerk.double + this.extraPerk.double ? 2 : 1
        this.addItem('pills', r.id, count)
        made += count
        this.stats.crafted += count
        this.gainAlchemyExp(2 + r.minAlchemy)
      }
      if (made > 0) this.addLog(`Luyện thành ${itemName(r.id)} x${made}.`, 'good')
      return made
    },

    gainAlchemyExp(amount) {
      const a = this.alchemy
      a.exp += amount
      while (a.level < 30 && a.exp >= F.alchemyExpNeeded(a.level)) {
        a.exp -= F.alchemyExpNeeded(a.level)
        a.level += 1
        this.addLog(`Luyện Đan thuật đạt cấp ${a.level}!`, 'event')
      }
    },

    // ------------------------------------------------------------
    // Hiệu ứng chung (kỳ ngộ, thành tựu)
    // ------------------------------------------------------------
    /** Áp dụng danh sách effects; trả về mảng chuỗi mô tả kết quả để hiển thị. */
    applyEffects(effects) {
      const statLabel = { hp: 'Khí huyết', atk: 'Công kích', def: 'Phòng ngự', speed: 'Thân pháp' }
      const texts = []
      for (const fx of effects) {
        if (fx.type === 'exp') {
          const before = this.exp
          const raw = this.expRate.mul(fx.seconds)
          const cap = this.requirement.mul(BALANCE.rewardExpCap) // trần theo yêu cầu đột phá, không theo sản lượng
          this.gainExp(raw.gt(cap) ? cap : raw)
          texts.push(`+${fmt(this.exp.sub(before))} linh khí`)
        } else if (fx.type === 'expLoss') {
          const loss = this.exp.mul(fx.ratio)
          this.exp = this.exp.sub(loss)
          this.fullNotified = false
          texts.push(`-${fmt(loss)} linh khí`)
        } else if (fx.type === 'stones') {
          const amount = new Decimal(1.45).pow(this.stageIdx).mul(Math.abs(fx.base))
          if (fx.base >= 0) {
            this.spiritStones = this.spiritStones.add(amount)
            texts.push(`+${fmt(amount)} linh thạch`)
          } else {
            const loss = amount.gt(this.spiritStones) ? this.spiritStones : amount
            this.spiritStones = this.spiritStones.sub(loss)
            texts.push(`-${fmt(loss)} linh thạch`)
          }
        } else if (fx.type === 'item') {
          this.addItem(ITEMS[fx.id].group, fx.id, fx.count)
          texts.push(`+${itemName(fx.id)} x${fx.count}`)
        } else if (fx.type === 'stat') {
          this.bonus[fx.stat] += fx.amount
          texts.push(`+${fx.amount} ${statLabel[fx.stat]}`)
        } else if (fx.type === 'expBonus') {
          this.bonus.exp += fx.amount
          texts.push(`+${(fx.amount * 100).toFixed(0)}% tốc độ linh khí`)
        }
      }
      return texts
    },

    // ------------------------------------------------------------
    // Võ kỹ
    // ------------------------------------------------------------
    /** Chọn một trong các thiên phú đang chờ. */
    chooseTalent(id) {
      if (this.talent || !this.talentOffer.includes(id) || !TALENTS[id]) return false
      this.talent = id
      this.talentOffer = []
      this.addLog(`Thiên phú ${TALENTS[id].name}: ${TALENTS[id].text}.`, 'event')
      return true
    },

    /** Bốc lại bộ thiên phú (tốn Đạo Vận), chỉ khi chưa chọn. */
    rerollTalents() {
      const rb = this.reincarnation
      if (this.talent || rb.dao < TALENT_REROLL_COST) return false
      rb.dao -= TALENT_REROLL_COST
      this.talentOffer = rollTalentOffer()
      return true
    },

    /** Chọn Đạo Lộ (một lần, từ Trúc Cơ; luân hồi để chọn lại). Tự trang bị võ kỹ độc quyền nếu đã học. */
    choosePath(id) {
      if (!PATHS[id] || !this.canChoosePath) return false
      this.path = id
      const sk = PATHS[id].skill
      if (this.skills.owned[sk] && !this.skills.slots.includes(sk)) {
        const free = this.skills.slots.findIndex((x, i) => i < this.skillSlots && !x)
        if (free >= 0) this.skills.slots[free] = sk
      }
      this.addLog(`Chọn đạo lộ ${PATHS[id].name}: ${PATHS[id].perkText}.`, 'event')
      return true
    },

    /** Học võ kỹ mới bằng tàn quyển; tự trang bị vào ô trống đầu tiên đã mở. */
    learnSkill(id) {
      const frag = SK.fragmentId(id)
      if (!SK.SKILLS[id] || this.skills.owned[id] || this.itemCount(frag) < SK.LEARN_COST) return false
      this.removeItem(frag, SK.LEARN_COST)
      this.skills.owned[id] = 1
      const free = this.skills.slots.findIndex((x, i) => i < this.skillSlots && !x)
      if (free >= 0 && SK.canEquip(id, this.realmIdx, this.path)) this.skills.slots[free] = id
      this.addLog(`Lĩnh ngộ võ kỹ ${SK.SKILLS[id].name}!`, 'good')
      return true
    },

    upgradeSkill(id) {
      const level = this.skills.owned[id]
      if (!level || level >= SK.SKILL_MAX_LEVEL) return false
      const cost = SK.upgradeCost(level)
      if (this.itemCount(SK.fragmentId(id)) < cost) return false
      this.removeItem(SK.fragmentId(id), cost)
      this.skills.owned[id] = level + 1
      this.addLog(`${SK.SKILLS[id].name} lên cấp ${level + 1}.`, 'good')
      return true
    },

    /** Chọn (hoặc đổi) nhánh tiến hoá của võ kỹ đã đạt cấp tối đa. */
    chooseBranch(id, b) {
      if (!SK.SKILLS[id] || (b !== 0 && b !== 1) || (this.skills.owned[id] ?? 0) < SK.SKILL_MAX_LEVEL) return false
      this.skills.branch[id] = b
      const info = SK.branchInfo(id, b)
      this.addLog(`${SK.SKILLS[id].name}: tiến hoá ${info.name} (${info.kind}: ${info.text}).`, 'good')
      return true
    },

    equipSkill(id, slot) {
      if (!this.skills.owned[id] || slot < 0 || slot >= this.skillSlots || !SK.canEquip(id, this.realmIdx, this.path)) return false
      const prev = this.skills.slots.indexOf(id)
      if (prev >= 0) this.skills.slots[prev] = null
      this.skills.slots[slot] = id
      return true
    },

    unequipSkill(slot) {
      this.skills.slots[slot] = null
    },

    // ------------------------------------------------------------
    // Công trình Động Phủ
    // ------------------------------------------------------------
    /** Nâng một công trình lên một cấp (tốn linh thạch, cần bậc tu vi tương ứng). */
    upgradeBuilding(id) {
      const b = BUILDINGS[id]
      const level = this.dwelling[id]
      if (!b || level === undefined || level >= BUILDING_MAX_LEVEL || this.stageIdx < buildingNeedStage(id, level)) return false
      const cost = buildingCost(id, level)
      if (this.spiritStones.lt(cost)) return false
      this.spiritStones = this.spiritStones.sub(cost)
      this.dwelling[id] = level + 1
      this.addLog(`${b.name} lên cấp ${level + 1} (-${fmt(cost)} linh thạch).`, 'good')
      return true
    },

    // ------------------------------------------------------------
    // Thám hiểm của đệ tử
    // ------------------------------------------------------------
    /** Xác suất thành công của nhiệm vụ `missionId` với đoàn gồm các đệ tử `uids` (để hiển thị trước). */
    expeditionChance(missionId, uids) {
      const party = uids.map((uid) => this.disciples.find((d) => d.uid === uid)).filter(Boolean)
      return successChance(partyPower(party, this.sectDef?.element ?? null), MISSIONS[missionId].diff)
    },

    /** Cử đoàn đệ tử đi thám hiểm. Đệ tử đang đi thì tạm bỏ việc thường. Trả về false nếu không hợp lệ. */
    startExpedition(missionId, uids, now = Date.now()) {
      const m = MISSIONS[missionId]
      if (!m || this.challenge === 'doc_hanh' || this.stageIdx < m.minStage || this.expeditions.length >= this.expeditionSlotCount) return false
      const party = [...new Set(uids)].map((uid) => this.disciples.find((d) => d.uid === uid)).filter(Boolean)
      if (party.length < m.need || party.length > MAX_PARTY || party.some((d) => d.away)) return false
      for (const d of party) {
        this.collectDisciple(d.uid, now) // chốt sản lượng trước khi đi
        d.prevJob = d.job
        d.job = null
        d.away = true
      }
      this.expeditions.push({ id: missionId, uids: party.map((d) => d.uid), since: now, seconds: m.seconds })
      this.addLog(`Cử ${party.length} đệ tử đi ${m.name}.`, 'event')
      return true
    },

    /** Đã đủ thời gian để nhận kết quả chưa. */
    expeditionReady(e, now = Date.now()) {
      return now >= e.since + e.seconds * 1000
    },

    /** Nhận kết quả thám hiểm thứ `index`: tung thành công / thất bại, nhận thưởng, đệ tử về làm việc cũ. Trả về { success, texts } hoặc null. */
    claimExpedition(index, now = Date.now()) {
      const e = this.expeditions[index]
      if (!e || !this.expeditionReady(e, now)) return null
      const m = MISSIONS[e.id]
      const party = e.uids.map((uid) => this.disciples.find((d) => d.uid === uid)).filter(Boolean)
      const success = Math.random() < successChance(partyPower(party, this.sectDef?.element ?? null), m.diff)
      const texts = this.applyEffects(missionEffects(m, this.stageIdx, success, { record: this.campaign.record, path: this.path }))
      if (success && this.sect.id) this.addContribution(m.contribution)
      for (const d of party) {
        d.away = false
        d.job = d.prevJob ?? null
        delete d.prevJob
        d.since = now
      }
      this.expeditions.splice(index, 1)
      if (success) this.stats.expeditions += 1
      this.addLog(`${m.name}: ${success ? 'thành công' : 'thất bại, chỉ mang về chút ít'}. ${texts.join(', ')}.`, success ? 'good' : 'bad')
      return { success, texts }
    },

    // ------------------------------------------------------------
    // Linh thú
    // ------------------------------------------------------------
    /** Thu phục linh thú bằng Linh Thú Phách; tự cho ra trận nếu còn ô trống. */
    learnPet(id) {
      const frag = PT.petFragmentId(id)
      if (!PT.PETS[id] || this.pets.owned[id] || this.itemCount(frag) < PT.PET_LEARN_COST) return false
      this.removeItem(frag, PT.PET_LEARN_COST)
      this.pets.owned[id] = 1
      const free = this.pets.active.findIndex((x, i) => i < this.petSlots && !x)
      if (free >= 0) this.pets.active[free] = id
      this.addLog(`Thu phục linh thú ${PT.PETS[id].name}!`, 'good')
      return true
    },

    upgradePet(id) {
      const level = this.pets.owned[id]
      if (!level || level >= PT.PET_MAX_LEVEL) return false
      const cost = PT.petUpgradeCost(level)
      if (this.itemCount(PT.petFragmentId(id)) < cost) return false
      this.removeItem(PT.petFragmentId(id), cost)
      this.pets.owned[id] = level + 1
      this.addLog(`${PT.PETS[id].name} lên cấp ${level + 1}.`, 'good')
      return true
    },

    equipPet(id, slot) {
      if (!this.pets.owned[id] || slot < 0 || slot >= this.petSlots) return false
      const prev = this.pets.active.indexOf(id)
      if (prev >= 0) this.pets.active[prev] = null
      this.pets.active[slot] = id
      return true
    },

    unequipPet(slot) {
      this.pets.active[slot] = null
    },

    // ------------------------------------------------------------
    // Pháp Bảo (thần thông kích hoạt trong trận)
    // ------------------------------------------------------------
    /** Luyện hoá pháp bảo mới bằng mảnh; tự gắn vào ô trống đầu tiên đã mở. */
    learnTreasure(id) {
      const frag = TR.treasureFragmentId(id)
      if (!TR.TREASURES[id] || this.treasures.owned[id] || this.itemCount(frag) < TR.TREASURE_LEARN_COST) return false
      this.removeItem(frag, TR.TREASURE_LEARN_COST)
      this.treasures.owned[id] = 1
      const free = this.treasures.slots.findIndex((x, i) => i < this.treasureSlots && !x)
      if (free >= 0) this.treasures.slots[free] = id
      this.addLog(`Luyện hoá pháp bảo ${TR.TREASURES[id].name}!`, 'event')
      return true
    },

    /** Nâng phẩm pháp bảo bằng mảnh cùng loại. */
    upgradeTreasure(id) {
      const tier = this.treasures.owned[id]
      if (!tier || tier >= TR.TREASURE_MAX_TIER) return false
      const cost = TR.treasureUpgradeCost(tier)
      if (this.itemCount(TR.treasureFragmentId(id)) < cost) return false
      this.removeItem(TR.treasureFragmentId(id), cost)
      this.treasures.owned[id] = tier + 1
      this.addLog(`${TR.TREASURES[id].name} lên phẩm ${TR.TREASURE_TIERS[tier].name}.`, 'event')
      return true
    },

    equipTreasure(id, slot) {
      if (!this.treasures.owned[id] || slot < 0 || slot >= this.treasureSlots) return false
      const prev = this.treasures.slots.indexOf(id)
      if (prev >= 0) this.treasures.slots[prev] = null
      this.treasures.slots[slot] = id
      return true
    },

    unequipTreasure(slot) {
      this.treasures.slots[slot] = null
    },

    // ------------------------------------------------------------
    // Công pháp (bị động)
    // ------------------------------------------------------------
    /** Học công pháp mới bằng tàn quyển; cộng chỉ số ngay. */
    learnArt(id) {
      const frag = AR.artFragmentId(id)
      if (!AR.ARTS[id] || this.arts.owned[id] || this.itemCount(frag) < AR.ART_LEARN_COST) return false
      this.removeItem(frag, AR.ART_LEARN_COST)
      this.arts.owned[id] = 1
      this.addLog(`Lĩnh ngộ công pháp ${AR.ARTS[id].name}!`, 'good')
      return true
    },

    /** Ngộ đạo: công pháp đạt cấp tối đa chọn một trong ba đặc tính được chào (chọn lại được bằng cách chọn mục khác). */
    awakenArt(id, key) {
      if (!AR.ARTS[id] || (this.arts.owned[id] ?? 0) < AR.ART_MAX_LEVEL || !AR.awakenOffer(id).includes(key)) return false
      this.arts.awaken[id] = key
      this.addLog(`${AR.ARTS[id].name} ngộ đạo: ${AR.AWAKEN_POOL[AR.ARTS[id].sys][key].name}.`, 'good')
      return true
    },

    upgradeArt(id) {
      const level = this.arts.owned[id]
      if (!level || level >= AR.ART_MAX_LEVEL) return false
      const cost = AR.artUpgradeCost(level)
      if (this.itemCount(AR.artFragmentId(id)) < cost) return false
      this.removeItem(AR.artFragmentId(id), cost)
      this.arts.owned[id] = level + 1
      this.addLog(`${AR.ARTS[id].name} lên cấp ${level + 1}.`, 'good')
      return true
    },

    /** Ngũ Hành Quy Nhất: sát thương thêm khi hệ tấn công khắc hệ phòng thủ (1 nếu không khắc). */
    artElementMult(attack, defend) {
      return elementMult(attack, defend) > 1 ? 1 + this.artBonus.elem + this.gearPerk.elem : 1
    },

    /** Đạo Vận nhận được khi luân hồi, đã cộng thưởng công pháp Luân Hồi Bí Điển. */
    daoWithArts(base) {
      return Math.round(base * (1 + this.artBonus.dao + 0.1 * (this.reincarnation.upgrades.khai_thien ?? 0) + this.extraPerk.dao))
    },

    // ------------------------------------------------------------
    // Trang bị
    // ------------------------------------------------------------
    /** Thêm vào túi trang bị; đầy túi thì tự phân giải thành linh thạch. */
    addGear(item) {
      if (this.gear.bag.length >= EQ.BAG_LIMIT) {
        const value = EQ.sellValue(item)
        this.spiritStones = this.spiritStones.add(value)
        this.addLog(`Túi trang bị đầy, tự phân giải ${EQ.itemFullName(item)}: +${fmt(value)} linh thạch.`, 'info')
        return false
      }
      this.gear.bag.push(item)
      return true
    },

    equipGear(uid) {
      const item = this.gear.bag.find((it) => it.uid === uid)
      if (!item) return false
      this.gear.equipped[item.slot] = uid
      return true
    },

    unequipGear(slot) {
      this.gear.equipped[slot] = null
    },

    /** Cường hoá +1 bằng linh thạch (chắc chắn thành công, tối đa +10). */
    // ------------------------------------------------------------
    // Tự động hoá (mở khoá dần, xem automation.js)
    // ------------------------------------------------------------
    automationUnlocked(id) {
      const a = automationById(id)
      return !!a && automationUnlocked(a, this)
    },

    /** Chạy các việc tự động đã mở khoá và đang bật. Mỗi việc cũng có thể gọi riêng ở các test. */
    runAutomation() {
      const on = (id) => this.settings.auto[id] && this.automationUnlocked(id)
      if (on('equip')) this.autoEquipBest()
      if (on('claim')) {
        for (const q of [...this.quests]) if (this.questDone(q)) this.claimQuest(q.uid)
        for (const a of ACHIEVEMENTS) {
          for (let i = 0; i < a.targets.length && this.achievementClaimable(a); i++) this.claimAchievement(a.id)
        }
        while (this.milestoneClaimable) this.claimMilestone()
      }
      if (on('array')) for (let k = 0; k < 20 && this.spiritStones.gte(this.arrayCost.mul(2)); k++) this.upgradeArray()
      if (on('collect')) {
        for (let i = 0; i < plotCount(this.stageIdx); i++) {
          this.harvest(i)
          if (!this.garden.plots[i]) {
            const crop = [...CROPS].reverse().find((c) => this.stageIdx >= c.minStage)
            if (crop && this.spiritStones.gte(seedCost(crop).mul(5))) this.plant(i, crop.id)
          }
        }
        this.collectMine()
        this.collectAllDisciples()
      }
      if (on('craft') && this.settings.autoCraft) {
        for (let k = 0; k < 5 && this.canCraft(this.settings.autoCraft) && this.spiritStones.gte(this.stonesRate.mul(30)); k++) this.craft(this.settings.autoCraft, 1)
      }
      if (on('salvage')) this.autoSalvage()
    },

    /**
     * Phân giải mọi món không mặc có độ hiếm dưới ngưỡng `settings.salvageBelow`. Luôn giữ món đang mặc,
     * đồ Huyền Thoại và món tốt nhất của mỗi ô (để không mất đồ duy nhất khi chưa có gì tốt hơn). Trả về số món đã phân giải.
     */
    autoSalvage() {
      const below = Math.min(SALVAGE_MAX, Math.max(SALVAGE_MIN, Math.floor(this.settings.salvageBelow ?? SALVAGE_MIN)))
      const keep = new Set(Object.values(this.gear.equipped))
      for (const slot of EQ.SLOT_IDS) {
        let best = null
        for (const it of this.gear.bag) if (it.slot === slot && (!best || EQ.gearScore(it) > EQ.gearScore(best))) best = it
        if (best) keep.add(best.uid)
      }
      let n = 0
      for (const it of [...this.gear.bag]) {
        if (it.rarity < below && !it.legend && !keep.has(it.uid) && this.sellGear(it.uid)) n++
      }
      return n
    },

    /** Mỗi ô mặc món có điểm cao nhất trong túi (nếu cao hơn món đang mặc). Trả về số ô đã đổi. */
    autoEquipBest() {
      let changed = 0
      for (const slot of EQ.SLOT_IDS) {
        const worn = this.gear.bag.find((it) => it.uid === this.gear.equipped[slot])
        let best = worn
        for (const it of this.gear.bag) if (it.slot === slot && (!best || EQ.gearScore(it) > EQ.gearScore(best))) best = it
        if (best && best !== worn) {
          this.equipGear(best.uid)
          changed++
        }
      }
      return changed
    },

    // ------------------------------------------------------------
    // Kiếp Thử Thách
    // ------------------------------------------------------------
    /** Đạt bậc mục tiêu của thử thách đang theo thì nhận Đạo Vận (một lần mỗi kiếp). */
    checkChallenge() {
      const def = CHALLENGES[this.challenge]
      if (!def || this.challengeDone || this.stageIdx < def.goalStage) return false
      const rb = this.reincarnation
      const times = (rb.challenges[this.challenge] ?? 0) + 1
      const reward = challengeReward(this.challenge, times)
      rb.challenges[this.challenge] = times
      rb.dao += reward
      rb.totalDao += reward
      this.challengeDone = true
      this.addLog(`Hoàn thành Kiếp Thử Thách ${def.name} (lần ${times}): +${reward} Đạo Vận!`, 'event')
      return true
    },

    /** Đổi lại dòng phụ của một món (tốn linh thạch, khoá được một dòng với giá gấp đôi; không áp dụng cho đồ Phàm hay Huyền Thoại). */
    rerollAffixes(uid, lock = -1) {
      const item = this.gear.bag.find((it) => it.uid === uid)
      if (!item || item.legend || EQ.affixCount(item.rarity) === 0) return false
      const locked = lock >= 0 && !!item.affixes[lock]
      const cost = EQ.rerollCost(item, locked)
      if (this.spiritStones.lt(cost)) return false
      this.spiritStones = this.spiritStones.sub(cost)
      EQ.rerollItemAffixes(item, Math.random, locked ? lock : -1)
      this.addLog(`Đổi dòng phụ ${EQ.itemFullName(item)}: ${EQ.affixText(item)} (-${fmt(cost)} linh thạch).`, 'good')
      return true
    },

    enhanceGear(uid) {
      const item = this.gear.bag.find((it) => it.uid === uid)
      if (!item || item.enh >= EQ.MAX_ENHANCE) return false
      const cost = EQ.enhanceCost(item)
      if (this.spiritStones.lt(cost)) return false
      this.spiritStones = this.spiritStones.sub(cost)
      item.enh += 1
      this.addLog(`Cường hoá ${EQ.itemFullName(item)} (-${fmt(cost)} linh thạch).`, 'good')
      return true
    },

    sellGear(uid) {
      const idx = this.gear.bag.findIndex((it) => it.uid === uid)
      if (idx < 0 || Object.values(this.gear.equipped).includes(uid)) return false
      const item = this.gear.bag[idx]
      const value = EQ.sellValue(item)
      this.spiritStones = this.spiritStones.add(value)
      this.gear.bag.splice(idx, 1)
      this.addLog(`Phân giải ${EQ.itemFullName(item)}: +${fmt(value)} linh thạch.`, 'info')
      return true
    },

    canForge(tier) {
      const r = EQ.FORGE[tier]
      if (!r || this.tribulation.active || this.stageIdx < r.minStage || this.spiritStones.lt(r.stones)) return false
      return Object.entries(r.ingredients).every(([id, n]) => this.itemCount(id) >= n)
    },

    /** Rèn pháp khí ở phẩm cấp `tier` cho ô `slot`: độ hiếm ngẫu nhiên. Trả về món đồ hoặc null. */
    forge(tier, slot) {
      if (!this.canForge(tier) || !EQ.SLOTS[slot]) return null
      const r = EQ.FORGE[tier]
      for (const [id, n] of Object.entries(r.ingredients)) this.removeItem(id, n)
      this.spiritStones = this.spiritStones.sub(r.stones)
      // Luyện Khí Phòng: tăng trọng số các độ hiếm cao
      const weights = EQ.FORGE_RARITY_WEIGHTS.map((w, i) => (i === 0 ? w : w * (1 + this.extraPerk.forge)))
      const item = EQ.generateItem(slot, tier, weights)
      this.addGear(item)
      this.stats.forged += 1
      this.addLog(`Rèn thành ${EQ.itemFullName(item)}!`, item.rarity >= 2 ? 'event' : 'good')
      return item
    },

    // ------------------------------------------------------------
    // Kỳ ngộ ngẫu nhiên
    // ------------------------------------------------------------
    triggerEvent() {
      this.eventTimer = 0
      this.eventNext = rollEventDelay()
      if (this.tribulation.active || this.event || this.storyView) return
      const pool = RANDOM_EVENTS.filter((e) => this.stageIdx >= e.minStage && !e.chainOnly)
      let pick = Math.random() * pool.reduce((n, e) => n + e.weight, 0)
      const ev = pool.find((e) => (pick -= e.weight) <= 0) ?? pool[0]
      this.eventAge = 0
      this.event = { id: ev.id, phase: 'choose', resultText: '', effectsText: [] }
      this.addLog(`Kỳ ngộ: ${ev.title}`, 'event')
    },

    /** Người chơi chọn phương án `idx` của kỳ ngộ hiện tại. */
    chooseEvent(idx) {
      if (!this.event || this.event.phase !== 'choose') return
      const choice = eventById(this.event.id).choices[idx]
      if (!choice) return
      let outcome
      if (choice.fight) {
        const enemy = enemyStats({ power: this.stageIdx, difficulty: 1 }, MONSTERS[choice.fight.monster], choice.fight.floor)
        outcome = simulateFight({ ...this.combat }, enemy).won ? choice.win : choice.lose
      } else {
        let pick = Math.random()
        outcome = choice.outcomes.find((o) => (pick -= o.p) <= 0) ?? choice.outcomes[choice.outcomes.length - 1]
      }
      const texts = this.applyEffects(outcome.effects)
      this.stats.events += 1
      this.eventAge = 0
      Object.assign(this.event, { phase: 'result', resultText: outcome.text, effectsText: texts, next: outcome.next ?? null })
      this.addLog(`${outcome.text} ${texts.join(', ')}`, 'event')
    },

    closeEvent() {
      const next = this.event?.next ?? null
      this.event = null
      this.eventTimer = 0
      if (next && eventById(next)) this.openEvent(next) // chuỗi kỳ ngộ: nối sang bước kế tiếp
    },

    /** Mở thẳng một kỳ ngộ (bước tiếp theo của chuỗi). */
    openEvent(id) {
      const ev = eventById(id)
      if (!ev) return false
      this.eventAge = 0
      this.event = { id: ev.id, phase: 'choose', resultText: '', effectsText: [], next: null }
      this.addLog(`Kỳ ngộ tiếp nối: ${ev.title}`, 'event')
      return true
    },

    // ------------------------------------------------------------
    // Thành tựu
    // ------------------------------------------------------------
    achievementValue(key) {
      if (key === 'stage') return Math.max(this.stageIdx, this.stats.maxStage)
      if (key === 'aiRecord') return this.campaign.record
      if (key === 'skills') return Object.keys(this.skills.owned).length
      if (key === 'expeditionsDone') return this.stats.expeditions
      if (key === 'petLevels') return Object.values(this.pets.owned).reduce((n, v) => n + v, 0)
      if (key === 'dailyTasks') return this.stats.dailyTasks ?? 0
      if (key === 'challengesDone') return Object.values(this.reincarnation.challenges).reduce((n, v) => n + v, 0)
      if (key === 'artLevels') return Object.values(this.arts.owned).reduce((n, v) => n + v, 0)
      if (key === 'playHours') return Math.floor(this.stats.playSeconds / 3600)
      if (key === 'pillsUsed') return Object.values(this.usage).reduce((n, v) => n + v, 0)
      if (key === 'discipleCount') return this.disciples.length
      if (key === 'gearCount') return this.gear.bag.length
      return this.stats[key] ?? 0
    },

    achievementClaimable(ach) {
      const tier = this.achTier[ach.id] ?? 0
      return tier < ach.targets.length && this.achievementValue(ach.key) >= ach.targets[tier]
    },

    claimAchievement(id) {
      const ach = ACHIEVEMENTS.find((a) => a.id === id)
      if (!ach || !this.achievementClaimable(ach)) return false
      const tier = this.achTier[id] ?? 0
      const texts = this.applyEffects(achievementReward(ach, tier))
      this.achTier[id] = tier + 1
      this.addLog(`Thành tựu "${ach.name}" mốc ${tier + 1}: ${texts.join(', ')}.`, 'good')
      return true
    },

    // ------------------------------------------------------------
    // Vượt Ải: nguyên liệu thụ động và leo ải khi offline
    // ------------------------------------------------------------
    /** Nguyên liệu nhận được từ ải cao nhất: số lượng kỳ vọng theo `seconds`, làm tròn ngẫu nhiên. Trả về { id: n }. */
    grantCampaignItems(seconds) {
      const got = {}
      for (const { id, perHour } of C.campaignItemsPerHour(this.campaign.best, this.stageIdx, 1 + this.artBonus.income, this.incomeCapBonus)) {
        const x = (perHour * seconds) / 3600
        const n = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0)
        if (n > 0) {
          this.addItem(ITEMS[id].group, id, n)
          got[id] = n
        }
      }
      return got
    },

    /** Vắng mặt: nguyên liệu thụ động + tiếp tục thử ải kế tiếp (hiệu suất 50%). Ghi vào báo cáo xuất quan. */
    climbOffline(seconds) {
      const items = this.grantCampaignItems(seconds)
      const from = this.campaign.best
      let climb = null
      if (this.settings.autoRepeat) {
        climb = C.simulateOfflineClimb({
          stats: this.combat, best: from, grit: this.campaign.grit, seconds, stageIdx: this.stageIdx,
        })
        if (climb.wins > 0) {
          this.spiritStones = this.spiritStones.add(climb.stones)
          for (const tier of climb.gear) {
            this.addGear(EQ.generateItem(EQ.SLOT_IDS[Math.floor(Math.random() * EQ.SLOT_IDS.length)], tier, EQ.DROP_RARITY_WEIGHTS))
          }
          for (let n = from + 1; n <= climb.best; n++) if (C.aiKind(n) !== 'normal') this.stats.bossKills += 1
          this.stats.kills += climb.wins
          this.campaign.best = climb.best
          this.campaign.record = Math.max(this.campaign.record, climb.best)
        }
        this.campaign.grit = climb.grit
      }
      this.offlineReport.campaign = { from, to: this.campaign.best, items, stones: climb?.stones ?? new Decimal(0), gear: climb?.gear.length ?? 0 }
      if (this.campaign.best > from) this.addLog(`Vắng mặt vượt thêm ${this.campaign.best - from} ải (ải ${from} -> ${this.campaign.best}).`, 'event')
    },

    // ------------------------------------------------------------
    // Luân Hồi
    // ------------------------------------------------------------
    /** Luân hồi chuyển thế: nhận Đạo Vận, đặt lại tiến trình (xem reincarnation.js). Trả về Đạo Vận nhận được. */
    reincarnate(challengeId = null) {
      if (!this.canReincarnate) return 0
      useBattleStore().retreat(true)
      const gain = this.daoWithArts(daoGain(this.stageIdx))
      const from = this.stage.fullName
      const rb = this.reincarnation
      rb.dao += gain
      rb.totalDao += gain
      rb.count += 1
      this.stats.reincarnations += 1
      const fresh = createPlayerState(rb.upgrades.thien_menh ?? 0)
      for (const key of ['stageIdx', 'exp', 'spiritStones', 'bonus', 'inventory', 'usage', 'buffs', 'path', 'talent', 'talentOffer', 'challenge', 'challengeDone', 'spiritRoot', 'element', 'garden', 'mineAt']) {
        this[key] = fresh[key]
      }
      this.arrayLevel = 3 * (rb.upgrades.tuc_hue ?? 0) // Túc Huệ
      this.campaign = { best: 0, record: this.campaign.record, grit: 0, farm: null, milestone: this.campaign.milestone } // ải cao nhất mất, kỷ lục và rương mốc giữ lại
      this.challenge = CHALLENGES[challengeId] ? challengeId : null // Kiếp Thử Thách của kiếp mới
      this.talentOffer = rollTalentOffer() // Thiên Phú: bốc lại cho kiếp mới
      this.quests = [] // nhiệm vụ cũ đo theo thống kê của kiếp trước
      this.refillQuests()
      this.fullNotified = false
      this.event = null
      this.addLog(`Luân hồi từ ${from}: +${gain} Đạo Vận. Kiếp mới: ${this.spiritRoot.name}, hệ ${this.element}.`, 'event')
      if (this.challenge) this.addLog(`Kiếp Thử Thách ${CHALLENGES[this.challenge].name}: ${CHALLENGES[this.challenge].desc}`, 'event')
      this.save()
      return gain
    },

    /** Mua / nâng cấp một cường hoá vĩnh viễn bằng Đạo Vận. */
    buyPerk(id) {
      const perk = perkById(id)
      const level = this.reincarnation.upgrades[id] ?? 0
      if (!perk || level >= perk.max) return false
      const cost = perkCost(perk, level)
      if (this.reincarnation.dao < cost) return false
      this.reincarnation.dao -= cost
      this.reincarnation.upgrades[id] = level + 1
      this.addLog(`${perk.name} lên cấp ${level + 1} (-${cost} Đạo Vận).`, 'good')
      return true
    },

    // ------------------------------------------------------------
    // Linh Điền & Khoáng Mạch (theo giờ thật)
    // ------------------------------------------------------------
    plant(idx, cropId) {
      const crop = cropById(cropId)
      if (!crop || idx < 0 || idx >= plotCount(this.stageIdx) || this.garden.plots[idx]) return false
      if (this.stageIdx < crop.minStage) return false
      const cost = seedCost(crop)
      if (this.spiritStones.lt(cost)) return false
      this.spiritStones = this.spiritStones.sub(cost)
      this.garden.plots[idx] = { crop: cropId, readyAt: Date.now() + crop.seconds * 1000 }
      return true
    },

    /** Thu hoạch luống `idx` nếu cây đã chín; trả về số thảo dược nhận được (0 nếu chưa). */
    harvest(idx, now = Date.now()) {
      const plot = this.garden.plots[idx]
      if (!plot || plot.readyAt > now) return 0
      const crop = cropById(plot.crop)
      const n = Math.max(1, Math.round((crop.yield[0] + Math.floor(Math.random() * (crop.yield[1] - crop.yield[0] + 1))) * (1 + this.sectPerk.herb)))
      this.addItem(ITEMS[crop.id].group, crop.id, n)
      this.garden.plots[idx] = null
      this.stats.harvests += 1
      this.addLog(`Thu hoạch ${itemName(crop.id)} x${n}.`, 'good')
      return n
    },

    harvestAll(now = Date.now()) {
      let count = 0
      for (let i = 0; i < MAX_PLOTS; i++) if (this.harvest(i, now) > 0) count++
      return count
    },

    /** Thu khoáng mạch (tích luỹ tối đa 8 giờ). Trả về số quặng nhận được. */
    collectMine(now = Date.now()) {
      const n = mineAmount(this.stageIdx, (now - this.mineAt) / 1000)
      if (n <= 0) return 0
      const ore = mineInfo(this.stageIdx).ore
      this.addItem('ores', ore, n)
      this.mineAt = now
      this.addLog(`Thu khoáng mạch: ${itemName(ore)} x${n}.`, 'good')
      return n
    },

    // ------------------------------------------------------------
    // Tông Môn
    // ------------------------------------------------------------
    /** Gia nhập (hoặc đổi) tông môn. Đổi tông môn mất 50% Cống Hiến và cấp bậc. */
    joinSect(id) {
      const def = sectById(id)
      if (!def || this.sect.id === id || this.challenge === 'doc_hanh') return false
      if (this.sect.id) {
        this.sect.contribution = Math.floor(this.sect.contribution * (1 - SWITCH_PENALTY))
        this.sect.total = Math.floor(this.sect.total * (1 - SWITCH_PENALTY))
        this.addLog(`Rời ${this.sectDef.name}, mất ${Math.round(SWITCH_PENALTY * 100)}% Cống Hiến.`, 'bad')
      }
      this.sect.id = id
      this.addLog(`Gia nhập ${def.name}. Đặc quyền: ${def.perkText}.`, 'event')
      return true
    },

    /** Cộng Cống Hiến (chỉ khi đã có tông môn). Trả về số điểm thực nhận. */
    addContribution(n) {
      if (!this.sect.id || n <= 0) return 0
      const before = this.rankIdx
      this.sect.contribution += n
      this.sect.total += n
      if (this.rankIdx > before) this.addLog(`Thăng cấp bậc: ${RANKS[this.rankIdx].name}!`, 'event')
      return n
    },

    /** Mua vật phẩm ở cửa hàng tông môn bằng Cống Hiến. */
    buyShop(entryId) {
      const e = SHOP.find((x) => x.id === entryId)
      if (!e || !this.sect.id || this.rankIdx < e.rank || this.sect.contribution < e.cost) return false
      this.sect.contribution -= e.cost
      this.addItem(ITEMS[e.item].group, e.item, e.count)
      this.addLog(`Đổi ${itemName(e.item)} x${e.count} (-${e.cost} Cống Hiến).`, 'good')
      return true
    },

    // ------------------------------------------------------------
    // Nhiệm vụ
    // ------------------------------------------------------------
    questProgress(q) {
      return Math.max(0, this.achievementValue(templateById(q.tpl).key) - q.start)
    },

    questDone(q) {
      return this.questProgress(q) >= q.target
    },

    /** Bổ sung cho đủ BOARD_SIZE nhiệm vụ trên bảng. */
    refillQuests() {
      while (this.quests.length < BOARD_SIZE) {
        this.quests.push(generateQuest(this.stageIdx, this.quests, (key) => this.achievementValue(key)))
      }
    },

    /** Nhận thưởng nhiệm vụ đã xong; nhiệm vụ mới thế chỗ. */
    claimQuest(uid) {
      const idx = this.quests.findIndex((q) => q.uid === uid)
      if (idx < 0 || !this.questDone(this.quests[idx])) return false
      const q = this.quests[idx]
      const r = questReward(q.tier, this.stageIdx)
      const texts = this.applyEffects(r.effects)
      const got = this.addContribution(r.contribution)
      this.quests.splice(idx, 1)
      this.stats.questsDone += 1
      this.refillQuests()
      this.addLog(`Hoàn thành nhiệm vụ "${templateById(q.tpl).label}": ${texts.join(', ')}${got ? `, +${got} Cống Hiến` : ''}.`, 'good')
      return true
    },

    /** Làm mới các nhiệm vụ chưa xong (tốn linh thạch). */
    refreshQuests() {
      const cost = this.questRefreshCost
      if (this.spiritStones.lt(cost)) return false
      this.spiritStones = this.spiritStones.sub(cost)
      this.quests = this.quests.filter((q) => this.questDone(q))
      this.refillQuests()
      return true
    },

    // ------------------------------------------------------------
    // Đệ tử
    // ------------------------------------------------------------
    discipleCtx() {
      return { sectElement: this.sectDef?.element ?? null, herbPerk: this.sectPerk.herb, bonus: this.pathPerk.disciple + this.extraPerk.disciple }
    },

    /** Thu nhận đệ tử mới (tốn linh thạch, giới hạn theo cấp bậc tông môn). */
    recruit() {
      if (this.disciples.length >= this.discipleLimit || this.challenge === 'doc_hanh') return null
      const cost = recruitCost(this.stageIdx, this.disciples.length)
      if (this.spiritStones.lt(cost)) return null
      this.spiritStones = this.spiritStones.sub(cost)
      const d = {
        uid: `d${Date.now().toString(36)}_${++discipleSeq}`,
        name: DISCIPLE_NAMES[Math.floor(Math.random() * DISCIPLE_NAMES.length)],
        element: ELEMENT_IDS[Math.floor(Math.random() * ELEMENT_IDS.length)],
        grade: rollGrade(),
        level: 1,
        job: null,
        since: Date.now(),
      }
      this.disciples.push(d)
      this.addLog(`Thu nhận đệ tử ${d.name} (${GRADES[d.grade].name}, hệ ${ELEMENTS[d.element].name}).`, d.grade >= 2 ? 'event' : 'good')
      return d
    },

    /** Giao việc cho đệ tử (null = nghỉ ngơi). Thu phần đã tích luỹ trước khi đổi việc. */
    assignJob(uid, job, now = Date.now()) {
      const d = this.disciples.find((x) => x.uid === uid)
      if (!d || d.away || (job !== null && !JOBS[job])) return false
      this.collectDisciple(uid, now)
      d.job = job
      d.since = now
      return true
    },

    /** Thu sản lượng của một đệ tử. Trả về true nếu thu được. */
    collectDisciple(uid, now = Date.now()) {
      const d = this.disciples.find((x) => x.uid === uid)
      if (!d || !d.job) return false
      const res = collectResult(d, this.stageIdx, this.discipleCtx(), now)
      if (!res) return false
      if (res.kind === 'stones') this.spiritStones = this.spiritStones.add(res.amount)
      else this.addItem(ITEMS[res.id].group, res.id, res.amount)
      d.since = res.since
      return true
    },

    collectAllDisciples(now = Date.now()) {
      let n = 0
      for (const d of this.disciples) if (this.collectDisciple(d.uid, now)) n++
      return n
    },

    levelUpDisciple(uid) {
      const d = this.disciples.find((x) => x.uid === uid)
      if (!d || d.level >= levelCap(this.stageIdx)) return false
      const cost = levelCost(this.stageIdx, d.level)
      if (this.spiritStones.lt(cost)) return false
      this.collectDisciple(uid) // chốt sản lượng theo cấp cũ
      this.spiritStones = this.spiritStones.sub(cost)
      d.level += 1
      return true
    },

    dismissDisciple(uid) {
      const idx = this.disciples.findIndex((x) => x.uid === uid)
      if (idx < 0 || this.disciples[idx].away) return false // đang thám hiểm thì chưa tiễn được
      this.collectDisciple(uid)
      this.disciples.splice(idx, 1)
      return true
    },

    // ------------------------------------------------------------
    // Cốt truyện
    // ------------------------------------------------------------
    /** Điền tên nhân vật vào văn bản cốt truyện. */
    storyText(text) {
      return String(text ?? '').replaceAll('{name}', this.name)
    },

    /** Chương ải của bí cảnh `id` đã vượt (đánh bại Đại Boss của chương) hoặc tu vi đã vượt xa. */
    clearedDungeon(id) {
      const d = dungeonById(id)
      if (!d) return true
      if (this.campaign.record >= (DUNGEONS.indexOf(d) + 1) * C.AIS_PER_CHAPTER) return true
      // Sau luân hồi ải cao nhất bị xoá nhưng kỷ lục còn; vẫn cho qua nếu tu vi tối đa vượt xa bậc chuẩn
      return this.stats.reincarnations > 0 && Math.max(this.stageIdx, this.stats.maxStage) >= d.minStage + 4
    },

    /** Chương chính kế tiếp đã đủ điều kiện mở chưa. */
    chapterAvailable(ch) {
      if (!ch) return false
      const stage = Math.max(this.stageIdx, this.stats.maxStage)
      return stage >= ch.minStage && (!ch.needClear || this.clearedDungeon(ch.needClear))
    },

    /** Lý do chưa mở chương (null nếu đã mở). */
    chapterLock(ch) {
      const stage = Math.max(this.stageIdx, this.stats.maxStage)
      if (stage < ch.minStage) return `Cần đạt ${STAGES[ch.minStage].fullName}`
      if (ch.needClear && !this.clearedDungeon(ch.needClear)) return `Cần thông quan ${dungeonById(ch.needClear).name}`
      return null
    },

    /** Kiểm tra định kỳ: tự mở chương kế tiếp hoặc chương phụ khi đủ điều kiện và không bận. */
    checkStory() {
      if (!this.ready || this.storyView || this.event || this.tribulation.active || this.offlineReport) return
      const ch = CHAPTERS[this.story.done]
      if (ch && this.chapterAvailable(ch)) {
        this.startStory(ch.id)
        return
      }
      const extra = EXTRAS.find((e) => !this.story.extras[e.id] && e.trigger(this))
      if (extra) this.startStory(extra.id)
    },

    chapterDone(id) {
      const idx = CHAPTERS.findIndex((c) => c.id === id)
      return idx >= 0 ? idx < this.story.done : !!this.story.extras[id]
    },

    /** Mở trình đọc truyện. replay = đọc lại chương đã xong (không thưởng, không đổi lựa chọn). */
    startStory(id, replay = false) {
      const ch = chapterById(id)
      if (!ch || this.storyView || (replay && !this.chapterDone(id))) return false
      this.storyView = { id, idx: -1, replay, phase: 'scene', result: '', effectsText: [] }
      this.storyAdvance()
      return true
    },

    sceneVisible(sc) {
      if (sc.if && ![].concat(sc.if).some((f) => this.story.flags[f])) return false
      if (sc.unless && this.story.flags[sc.unless]) return false
      return true
    },

    /** Cảnh hiện tại trong trình đọc (hoặc null). */
    storyCurrent() {
      const v = this.storyView
      return v ? chapterById(v.id).scenes[v.idx] ?? null : null
    },

    /** Sang cảnh kế tiếp, bỏ qua cảnh không thoả điều kiện cờ; hết chương thì kết thúc. */
    storyAdvance() {
      const v = this.storyView
      if (!v) return
      const scenes = chapterById(v.id).scenes
      v.phase = 'scene'
      v.idx += 1
      while (scenes[v.idx] && !this.sceneVisible(scenes[v.idx])) v.idx += 1
      if (!scenes[v.idx]) this.finishStory()
    },

    optionAvailable(opt) {
      const r = opt.requires
      if (!r) return true
      if (r.align !== undefined && this.story.align < r.align) return false
      if (r.flag && !this.story.flags[r.flag]) return false
      return true
    },

    optionLock(opt) {
      const r = opt.requires
      if (!r) return null
      if (r.align !== undefined && this.story.align < r.align) return `Cần Nhân Tâm từ ${r.align} trở lên (hiện ${this.story.align})`
      if (r.flag && !this.story.flags[r.flag]) return 'Cần có ký ức từ chương trước'
      return null
    },

    /** Chọn phương án `i` của cảnh lựa chọn hiện tại. */
    storyChoose(i) {
      const v = this.storyView
      const sc = this.storyCurrent()
      const opt = sc?.choice?.options[i]
      if (!v || v.phase !== 'scene' || !opt || !this.optionAvailable(opt)) return false
      let texts = []
      if (!v.replay) {
        if (opt.flag) this.story.flags[opt.flag] = true
        if (opt.align) this.story.align = Math.max(-20, Math.min(20, this.story.align + opt.align))
        if (opt.ending) {
          this.story.ending = opt.ending
          this.story.title = ENDINGS[opt.ending].title
        }
        texts = this.applyEffects(opt.effects ?? [])
      }
      v.phase = 'result'
      v.result = opt.result
      v.effectsText = texts
      return true
    },

    /** Đặt tên nhân vật ở cảnh nhập tên. */
    storySetName(name) {
      const v = this.storyView
      const clean = String(name ?? '').trim().slice(0, 16)
      if (!v || !clean) return false
      if (!v.replay) this.name = clean
      this.storyAdvance()
      return true
    },

    /** Đổi tên nhân vật bất cứ lúc nào (tab Nhân Vật). */
    rename(name) {
      const clean = String(name ?? '').trim().slice(0, 16)
      if (!clean) return false
      this.name = clean
      return true
    },

    finishStory() {
      const v = this.storyView
      if (!v) return
      const ch = chapterById(v.id)
      if (!v.replay) {
        const texts = this.applyEffects(ch.reward ?? [])
        if (EXTRAS.some((e) => e.id === ch.id)) this.story.extras[ch.id] = true
        else this.story.done += 1
        for (const id of ch.unlock ?? []) this.story.lore[id] = true
        this.addLog(`Hoàn thành chương “${ch.title}”: ${texts.join(', ')}.`, 'event')
      }
      this.storyView = null
    },

    // ------------------------------------------------------------
    // Điển Tịch
    // ------------------------------------------------------------
    loreAuto(auto) {
      if (!auto) return false
      const maxStage = Math.max(this.stageIdx, this.stats.maxStage)
      if (auto.stage !== undefined) return maxStage >= auto.stage
      if (auto.dungeon) {
        const d = dungeonById(auto.dungeon)
        return this.campaign.record > DUNGEONS.indexOf(d) * C.AIS_PER_CHAPTER || maxStage >= d.minStage + 4
      }
      if (auto.sect) return auto.sect === true ? !!this.sect.id : this.sect.id === auto.sect
      if (auto.flag) return !!this.story.flags[auto.flag]
      if (auto.stat) return (this.stats[auto.stat[0]] ?? 0) >= auto.stat[1]
      return false
    },

    loreUnlocked(entry) {
      return !!this.story.lore[entry.id] || this.loreAuto(entry.auto)
    },

    markLoreSeen(id) {
      this.story.seen[id] = true
    },

    // ------------------------------------------------------------
    // Tiến độ Vượt Ải (battleStore gọi)
    // ------------------------------------------------------------
    /** Vượt ải mới `n`: cập nhật ải cao nhất và kỷ lục, xoá Kiên Trì, thưởng lần đầu cho boss. Trả về linh thạch thưởng thêm (hoặc null). */
    recordAi(n) {
      const c = this.campaign
      c.best = Math.max(c.best, n)
      c.record = Math.max(c.record, n)
      c.grit = 0
      const kind = C.aiKind(n)
      if (kind === 'normal') return null
      const bonus = C.firstClearStones(n)
      this.spiritStones = this.spiritStones.add(bonus)
      this.addLog(`Vượt ải ${n} (${C.AI_KINDS[kind].name})! Thưởng thêm ${fmt(bonus)} linh thạch. Thu nhập thụ động tăng.`, 'good')
      return bonus
    },

    // ------------------------------------------------------------
    // Điểm danh ngày, nhiệm vụ ngày
    // ------------------------------------------------------------
    /** Sang ngày mới (giờ địa phương) thì đặt lại điểm danh và bốc 3 nhiệm vụ ngày; bỏ lỡ một ngày thì chuỗi về 0. */
    ensureDaily(now = Date.now()) {
      const today = dayKey(now)
      const d = this.daily
      if (d.day === today) return false
      const keep = d.day === previousDayKey(now) && d.claimed
      const pool = [...DAILY_TEMPLATE_IDS]
      const tasks = []
      while (tasks.length < DAILY_TASK_COUNT && pool.length) {
        const tpl = templateById(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
        tasks.push({
          tpl: tpl.id, target: Math.max(1, Math.round(questTarget(tpl, 0, this.stageIdx) * 0.6)),
          start: this.achievementValue(tpl.key), claimed: false,
        })
      }
      this.daily = { day: today, streak: keep ? d.streak : 0, claimed: false, bonus: false, tasks }
      return true
    },

    /** Điểm danh nhận thưởng ngày (chuỗi 7 ngày). */
    claimDaily() {
      const d = this.daily
      if (d.claimed || !d.day) return false
      const day = nextRewardDay(d.streak)
      const pool = dailyArtPool(this.campaign.record)
      const texts = this.applyEffects(dailyReward(day, pool[Math.floor(Math.random() * pool.length)]))
      d.streak += 1
      d.claimed = true
      if (day === STREAK_DAYS) this.addTimeBank(3600) // ngày 7: thêm 1 giờ vào kho thời gian
      this.addLog(`Điểm danh ngày ${day}/${STREAK_DAYS} (chuỗi ${d.streak} ngày): ${texts.join(', ')}.`, 'event')
      return true
    },

    dailyProgress(t) {
      return Math.max(0, this.achievementValue(templateById(t.tpl).key) - t.start)
    },

    dailyTaskDone(t) {
      return this.dailyProgress(t) >= t.target
    },

    /** Nhận thưởng nhiệm vụ ngày thứ `i`; xong cả 3 nhận thêm thưởng. */
    claimDailyTask(i) {
      const t = this.daily.tasks[i]
      if (!t || t.claimed || !this.dailyTaskDone(t)) return false
      t.claimed = true
      this.applyEffects(DAILY_TASK_REWARD)
      this.stats.dailyTasks = (this.stats.dailyTasks ?? 0) + 1
      if (!this.daily.bonus && this.daily.tasks.every((x) => x.claimed)) {
        this.daily.bonus = true
        this.addTimeBank(DAILY_BONUS_TIME)
        const texts = this.applyEffects(DAILY_BONUS_REWARD)
        this.addLog(`Xong cả ${DAILY_TASK_COUNT} nhiệm vụ ngày: ${texts.join(', ')}.`, 'event')
      }
      return true
    },

    /** Có thưởng điểm danh hoặc nhiệm vụ ngày chờ nhận. */
    // ------------------------------------------------------------
    // Chọn phần thưởng boss
    // ------------------------------------------------------------
    /** Mở lựa chọn 1 trong 3 phần thưởng sau khi lần đầu hạ boss ải `n`. Lựa chọn cũ chưa chọn được tự chốt phương án đầu. */
    offerBossChoice(n, kind) {
      if (this.bossChoice) this.chooseBossReward(0, true)
      this.bossChoice = { n, kind, options: bossChoiceOptions({ n, kind, path: this.path }) }
      this.bossChoiceAge = 0
      this.addLog(`Hạ ${C.AI_KINDS[kind].name} ải ${n}: chọn một trong ba phần thưởng!`, 'event')
    },

    /** Chọn phương án `i` của lựa chọn phần thưởng boss (`auto`: hết giờ tự chọn). */
    chooseBossReward(i, auto = false) {
      const bc = this.bossChoice
      const opt = bc?.options[i]
      if (!opt) return false
      const texts = this.applyEffects(opt.effects)
      this.bossChoice = null
      this.bossChoiceAge = 0
      this.addLog(`${auto ? 'Tự chọn' : 'Chọn'} phần thưởng ải ${bc.n}: ${texts.join(', ')}.`, 'good')
      return true
    },

    /** Nhận rương mốc ải kế tiếp nếu đã đạt mốc. */
    claimMilestone() {
      if (!this.milestoneClaimable) return false
      const tier = this.campaign.milestone
      const texts = this.applyEffects(C.milestoneReward(tier))
      this.campaign.milestone = tier + 1
      this.addLog(`Rương mốc ải ${C.MILESTONES[tier].ai}: ${texts.join(', ')}.`, 'event')
      return true
    },

    /** Thua: cộng 1 điểm Kiên Trì (tối đa GRIT_MAX). Trả về số điểm hiện tại. */
    addGrit() {
      this.campaign.grit = Math.min(C.GRIT_MAX, (this.campaign.grit ?? 0) + 1)
      return this.campaign.grit
    },

    // ------------------------------------------------------------
    // Lôi Kiếp: mini-event từng đạo thiên lôi, mỗi đạo cách nhau ~1.3s
    // ------------------------------------------------------------
    startTribulation(cfg) {
      useBattleStore().retreat(true) // đang trong bí cảnh thì rút lui trước khi độ kiếp
      const maxHp = this.combat.hp
      this.tribulation = { active: true, bolt: 0, total: cfg.bolts, hp: maxHp, maxHp, name: cfg.name }
      this.addLog(`${cfg.name} giáng xuống! ${cfg.bolts} đạo thiên lôi đang ngưng tụ...`, 'event')
      emit('tribulation-start', { total: cfg.bolts })
      tribulationTimer = setTimeout(() => this.strikeBolt(cfg), 2200)
    },

    strikeBolt(cfg) {
      const t = this.tribulation
      if (!t.active) return
      const raw = F.boltDamage(cfg, t.bolt, this.combat.def)
      const damage = Math.max(1, Math.round(raw * (1 - this.buffs.guard))) // Hộ Kiếp Đan
      t.bolt += 1
      t.hp = Math.max(0, t.hp - damage)
      this.addLog(
        `Đạo lôi thứ ${t.bolt}/${t.total} giáng xuống: -${damage} khí huyết (còn ${t.hp}/${t.maxHp}).`,
        t.hp > 0 ? 'info' : 'bad',
      )
      emit('tribulation-bolt', { index: t.bolt, total: t.total, damage, hpRatio: t.hp / t.maxHp })

      if (t.hp <= 0) tribulationTimer = setTimeout(() => this.endTribulation(false), 1400)
      else if (t.bolt >= t.total) tribulationTimer = setTimeout(() => this.endTribulation(true), 1600)
      else tribulationTimer = setTimeout(() => this.strikeBolt(cfg), 1300)
    },

    endTribulation(survived) {
      this.tribulation.active = false
      this.buffs.guard = 0
      if (survived) {
        this.stats.tribulations += 1
        this.addLog('Vượt qua thiên kiếp! Mây đen tan, thiên địa quang đãng.', 'good')
        this.advanceStage()
      } else {
        this.exp = this.requirement.mul(1 - BALANCE.tribulationFailExpLoss)
        this.fullNotified = false
        this.stats.failures += 1
        this.addLog(
          `Độ kiếp thất bại, đạo cơ tổn thương: mất ${Math.round(BALANCE.tribulationFailExpLoss * 100)}% linh khí.`,
          'bad',
        )
        emit('breakthrough-fail')
      }
      emit('tribulation-end', { survived })
    },

    // ------------------------------------------------------------
    // Lưu / tải / xuất / nhập
    // ------------------------------------------------------------
    /** Ghi savegame vào LocalStorage. */
    save() {
      this.lastSaveTime = Date.now()
      return writeLocal(serialize(this, this.lastSaveTime))
    },

    exportSave() {
      exportToFile(serialize(this))
      this.addLog('Đã xuất file save.', 'info')
    },

    /** Nhập save từ File do người chơi chọn. Ném Error nếu file hỏng. */
    async importSave(file) {
      const raw = await readFileAsSave(file)
      const patch = deserialize(raw, createPlayerState())
      useBattleStore().retreat(true)
      clearTimeout(tribulationTimer)
      this.tribulation = { active: false, bolt: 0, total: 0, hp: 0, maxHp: 0, name: '' }
      Object.assign(this, patch)
      this.event = null
      this.storyView = null
      this.quests = []
      this.refillQuests()
      this.fullNotified = this.isFull
      this.addLog(`Đã nạp save: ${this.stage.fullName}.`, 'event')
      this.save()
    },

    /** Xoá toàn bộ tiến trình và bắt đầu lại (căn cốt mới). */
    resetGame() {
      useBattleStore().retreat(true)
      clearTimeout(tribulationTimer)
      clearLocal()
      Object.assign(this, createPlayerState())
      this.event = null
      this.tribulation = { active: false, bolt: 0, total: 0, hp: 0, maxHp: 0, name: '' }
      this.log = []
      this.fullNotified = false
      this.offlineReport = null
      this.addLog(`Luân hồi chuyển thế với ${this.spiritRoot.name}. ${this.spiritRoot.desc}`, 'event')
      this.refillQuests()
      this.save()
    },
  },
})
