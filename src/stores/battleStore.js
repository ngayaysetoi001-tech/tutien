// =====================================================================
// battleStore.js - Vượt Ải: auto-battle liên tục (trạng thái tạm thời, không lưu vào save)
//
// Vòng đời: fighting -> between (nghỉ ngắn sau khi thắng) -> fighting ải kế
//                     \-> resting (thua, nghỉ vài giây) -> thử lại cùng ải với Kiên Trì
//   idle: tạm dừng (độ kiếp, hoặc người chơi tắt "Tự chiến đấu"); tự chạy lại khi được phép.
// Mục tiêu mỗi lượt: ải kế tiếp chưa vượt (campaign.best + 1), hoặc ải đang cày (campaign.farm).
// Công thức ở game/campaign.js và game/battle.js.
// =====================================================================
import { defineStore } from 'pinia'
import Decimal from 'break_infinity.js'
import { emit } from '../game/events.js'
import { fmt } from '../game/format.js'
import { itemName, MONSTERS } from '../game/data.js'
import * as B from '../game/battle.js'
import * as C from '../game/campaign.js'
import { rollArtDrops } from '../game/arts.js'
import { rollTreasureDrops } from '../game/treasures.js'
import { PETS, petLevelMult, rollPetDrops } from '../game/pets.js'
import { ELEMENTS, elementEdge, elementMult } from '../game/elements.js'
import * as SK from '../game/skills.js'
import * as EQ from '../game/equipment.js'
import { useGameStore } from './gameStore.js'
import { DUNGEON_FLAVOR } from '../game/story.js'
import { useUiStore } from './uiStore.js'

const BETWEEN_DELAY = 0.9 // giây nghỉ giữa các ải
const REST_AFTER_DEATH = 5
const AUTO_HEAL_BELOW = 0.35

/** Hiệu ứng hình ảnh/âm thanh chỉ phát khi người chơi đang xem màn Vượt Ải (trận vẫn chạy ngầm ở màn khác). */
const fx = (name, payload) => {
  const ui = useUiStore()
  if (ui.tab === 'battle' && !ui.meditate) emit(name, payload)
}

const emptyRun = () => ({ kills: 0, items: {}, gear: [], wins: 0 })

export const useBattleStore = defineStore('battle', {
  state: () => ({
    phase: 'idle', // idle | fighting | between | resting
    ai: 0, // số thứ tự ải đang đánh (0 = chưa vào)
    timer: 0, // đếm ngược cho between / resting
    clock: 0, // đồng hồ trận đấu (giây)
    enemy: null, // { id, name, kind, color, boss, tier, hp, maxHp, atk, def, speed }
    hp: 0,
    maxHp: 0,
    nextPlayer: 0,
    nextEnemy: 0,
    run: emptyRun(), // thu hoạch từ lúc mở game
    lastResult: '', // 'win' | 'dead' | ''
    // Công pháp & hiệu ứng trạng thái trong trận (thời điểm tính theo `clock`)
    cd: {}, // { id công pháp: thời điểm hồi xong }
    shield: 0,
    shieldUntil: 0,
    hasteUntil: 0,
    hasteAmt: 0,
    slowUntil: 0,
    slowAmt: 0,
    dotUntil: 0, // Độc/sát thương theo thời gian lên địch hiện tại
    dotDmg: 0, // sát thương mỗi giây (đã tính công kích lúc tung chiêu)
    nextDot: 0,
    lifestealUntil: 0,
    lifestealAmt: 0,
    rageUntil: 0,
    rageAmt: 0,
    critUntil: 0,
    critAmt: 0,
    reflectUntil: 0,
    reflectAmt: 0,
    petNext: {}, // thời điểm ra đòn kế tiếp của từng linh thú (theo clock)
    // Trạng thái lên địch (xem STATUS ở skills.js)
    burnUntil: 0,
    burnDmg: 0,
    nextBurn: 0,
    chillUntil: 0,
    pierceUntil: 0,
    comboName: '', // liên kích vừa xảy ra (hiện trên cảnh trận)
    comboUntil: 0,
    hitCount: 0, // số đòn thường đã đánh (Thất Tinh Kiếm)
    nextHeal: 0, // thời điểm Càn Khôn Đỉnh hồi máu kế tiếp
    lethalUsed: false, // Hộ Thân Linh Phù đã dùng ở ải này chưa
    dotElem: 'moc', // hệ của chiêu độc đang cháy (Mộc: Độc, Hỏa: Thiêu)
  }),

  getters: {
    active: (s) => s.phase !== 'idle',
    inFight: (s) => s.phase === 'fighting' || s.phase === 'between',
    /** Bối cảnh (bí cảnh gốc) của ải đang đánh hoặc ải mục tiêu. */
    dungeon() {
      return C.themeOf(this.ai || 1).dungeon
    },
    kind() {
      return C.aiKind(this.ai || 1)
    },
    hpRatio: (s) => (s.maxHp > 0 ? s.hp / s.maxHp : 0),
  },

  actions: {
    /** Ải sẽ đánh ở lượt này: đang cày thì ải cày, không thì ải kế tiếp chưa vượt. */
    targetAi() {
      const c = useGameStore().campaign
      return c.farm && c.farm <= c.best ? c.farm : c.best + 1
    },

    /** Kiên Trì: +5% chỉ số mỗi lần thua liên tiếp ở ải đang kẹt (xoá khi vượt ải). */
    gritMult() {
      return 1 + C.GRIT_STEP * (useGameStore().campaign.grit ?? 0)
    },

    /** Chỉ số chiến đấu thực tế trong trận = chỉ số nhân vật x Kiên Trì. */
    playerStats() {
      const c = useGameStore().combat
      const k = this.gritMult()
      return { hp: Math.round(c.hp * k), atk: Math.round(c.atk * k), def: Math.round(c.def * k), speed: c.speed }
    },

    /** Bắt đầu (hoặc tiếp tục) vượt ải ở ải mục tiêu. Trả về false nếu đang không thể. */
    start() {
      const game = useGameStore()
      if (game.tribulation.active || this.active) return false
      this.ai = this.targetAi()
      this.lastResult = ''
      this.cd = {}
      this.shield = this.shieldUntil = this.hasteUntil = this.slowUntil = 0
      this.dotUntil = this.lifestealUntil = this.rageUntil = this.reflectUntil = this.critUntil = 0
      this.burnUntil = this.chillUntil = this.pierceUntil = 0
      this.comboUntil = 0
      this.hitCount = 0
      this.nextHeal = this.clock + 20
      this.petNext = {}
      emit('battle-start', { dungeonId: this.dungeon.id })
      this.spawnEnemy()
      return true
    },

    /** Dừng trận hiện tại (độ kiếp, luân hồi...). Nếu "Tự chiến đấu" còn bật thì sẽ tự chạy lại. */
    retreat() {
      if (!this.active) return
      this.enemy = null
      this.phase = 'idle'
      emit('battle-end', { result: 'retreat' })
    },

    /** Đổi sang cày ải `n` (<= ải cao nhất đã vượt), hoặc null để quay về tiến lên. */
    setFarm(n) {
      const game = useGameStore()
      const c = game.campaign
      c.farm = n && n >= 1 && n <= c.best ? Math.floor(n) : null
      if (this.phase === 'fighting') this.retreat() // tick kế tiếp vào lại ở ải mới; các pha nghỉ tự lấy ải mới
    },

    spawnEnemy() {
      const game = useGameStore()
      const n = this.ai
      const { id, tmpl, kind } = C.pickAiMonster(n)
      const stats = C.aiEnemyStats(n, tmpl, kind, Math.random)
      const boss = kind !== 'normal'
      const mods = C.aiMods(n)
      // Mỗi ải bắt đầu với khí huyết đầy
      this.maxHp = this.playerStats().hp
      this.hp = this.maxHp
      this.enemy = {
        id, name: tmpl.name, kind: tmpl.kind, color: tmpl.color, element: tmpl.element, boss, tier: kind, ...stats, maxHp: stats.hp,
        mods, revived: false, enraged: false, reborn: false, hits: 0,
      }
      this.phase = 'fighting'
      this.nextPlayer = this.clock + 0.5
      this.nextEnemy = this.clock + B.actionInterval(stats.speed) * 0.8
      // Pháp Bảo: Hỗn Nguyên Chung (lá chắn đầu ải), Hộ Thân Linh Phù (làm mới mỗi ải)
      this.lethalUsed = false
      const fxT = game.treasureFx
      if (fxT.shield > 0) {
        this.shield = Math.round(this.maxHp * fxT.shield)
        this.shieldUntil = this.clock + 10
      }
      this.slowUntil = 0 // làm chậm và độc không kéo sang yêu thú mới
      this.dotUntil = 0
      this.burnUntil = this.chillUntil = this.pierceUntil = 0
      fx('battle-enemy-spawn', { name: tmpl.name, kind: tmpl.kind, color: tmpl.color, boss })
      if (n % C.AIS_PER_CHAPTER === 1 && n > game.campaign.best) {
        game.addLog(`Bước vào ${C.chapterName(n)}, chương ${C.chapterOf(n)}.`, 'event')
        if (C.themeOf(n).round === 0 && DUNGEON_FLAVOR[C.themeOf(n).dungeon.id]) game.addLog(DUNGEON_FLAVOR[C.themeOf(n).dungeon.id], 'info')
      }
      if (mods.length) game.addLog(`${tmpl.name} mang: ${mods.map((m) => C.ENEMY_MODS[m].name).join(', ')}.`, 'info')
      if (boss) game.addLog(`${C.AI_KINDS[kind].name} xuất hiện ở ải ${n}: ${tmpl.name}!`, 'bad')
    },

    /** Mỗi nhịp game (gọi từ gameStore.tick). */
    tick(dt) {
      const game = useGameStore()
      if (this.phase === 'idle') {
        if (game.settings.autoRepeat) this.start()
        return
      }

      if (this.phase === 'resting') {
        this.timer -= dt
        if (this.timer <= 0) this.afterRest()
        return
      }
      if (this.phase === 'between') {
        this.timer -= dt
        if (this.timer <= 0) {
          this.ai = this.targetAi()
          this.spawnEnemy()
        }
        return
      }

      // fighting: đồng bộ khí huyết tối đa nếu vừa đột phá / dùng đan
      const maxHp = this.playerStats().hp
      if (maxHp !== this.maxHp) {
        this.hp = Math.min(maxHp, this.hp * (maxHp / this.maxHp))
        this.maxHp = maxHp
      }
      if (game.settings.autoHeal && this.hp / this.maxHp < AUTO_HEAL_BELOW) this.useHealPill(true)

      this.clock += dt
      this.processTreasureHeal()
      this.processDot()
      this.processBurn()
      this.processPets()
      let guard = 0 // chặn vòng lặp vô hạn khi tick quá lớn
      while (this.phase === 'fighting' && guard++ < 50) {
        if (Math.min(this.nextPlayer, this.nextEnemy) > this.clock) break
        if (this.nextPlayer <= this.nextEnemy) this.playerAct()
        else this.enemyAct()
      }
    },

    /** Công pháp đã trang bị, đã hồi chiêu và có ích ở thời điểm hiện tại (theo thứ tự ô). */
    readySkill() {
      const game = useGameStore()
      // Kỹ năng của cây (tự thi triển, thứ tự ưu tiên trong activeTreeIds) rồi tới kỹ năng chung đã gắn
      const ids = [...game.activeTreeIds, ...game.skills.slots.slice(0, game.skillSlots)]
      for (const id of ids) {
        if (!id || (this.cd[id] ?? 0) > this.clock) continue
        if (!SK.isTreeSkill(id) && !SK.canEquip(id, game.realmIdx, game.path)) continue // tuyệt kỹ chưa đủ cảnh giới (ví dụ sau luân hồi)
        const kind = SK.skillDef(id).kind
        if (kind === 'heal' && this.hp / this.maxHp > 0.8) continue
        if (kind === 'shield' && this.clock < this.shieldUntil) continue
        if (kind === 'haste' && this.clock < this.hasteUntil) continue
        if (kind === 'dot' && this.clock < this.dotUntil) continue
        if (kind === 'lifesteal' && this.clock < this.lifestealUntil) continue
        if (kind === 'rage' && this.clock < this.rageUntil) continue
        if (kind === 'crit' && this.clock < this.critUntil) continue
        if (kind === 'reflect' && this.clock < this.reflectUntil) continue
        if (kind === 'stun' && this.nextEnemy > this.clock + 0.5) continue // địch đang bị choáng thì chưa tung
        return id
      }
      return null
    },

    /** Lượt ra đòn của người chơi: thi triển công pháp nếu sẵn sàng, ngược lại đánh thường. */
    playerAct() {
      const stats = this.playerStats()
      const skillId = this.readySkill()
      if (skillId) this.castSkill(skillId, stats)
      else {
        this.basicAttack(stats)
        // Huyền Thoại: có xác suất đánh thêm một đòn
        const extra = useGameStore().battlePerk.extra
        if (extra > 0 && this.enemy && this.enemy.hp > 0 && Math.random() < extra) this.basicAttack(stats)
      }
      const haste = this.clock < this.hasteUntil ? 1 + this.hasteAmt : 1
      this.nextPlayer += B.actionInterval(stats.speed * haste)
      if (this.enemy && this.enemy.hp <= 0) this.onKill()
    },

    /**
     * Gây sát thương lên yêu thú đang đánh (qua đây để đặc tính có tác dụng: Kháng Võ Kỹ, Hồi Sinh, Cuồng Hóa, Tái Sinh).
     * `skill`: sát thương từ võ kỹ hoặc độc. Trả về sát thương thực tế.
     */
    hurtEnemy(amount, skill = false) {
      const e = this.enemy
      let dmg = amount
      if (skill && e.mods.includes('khang_vo_ky')) dmg = Math.max(1, Math.round(dmg * 0.7))
      const bd = e.boss ? useGameStore().battlePerk.bossDmg : 0
      if (bd > 0) dmg = Math.max(1, Math.round(dmg * (1 + bd))) // dòng đặc tính: sát thương lên boss
      e.hp = Math.max(0, e.hp - dmg)
      this.enemyPhase()
      return dmg
    },

    /** Các mốc hành vi theo khí huyết của yêu thú: sống lại, cuồng hóa, tái sinh. */
    enemyPhase() {
      const e = this.enemy
      const game = useGameStore()
      if (e.hp <= 0) {
        if (e.mods.includes('hoi_sinh') && !e.revived) {
          e.revived = true
          e.hp = Math.round(e.maxHp * 0.4)
          game.addLog(`${e.name} hồi sinh với 40% khí huyết!`, 'bad')
        }
        return
      }
      const ratio = e.hp / e.maxHp
      if (e.mods.includes('cuong_hoa') && !e.enraged && ratio < 0.4) {
        e.enraged = true
        e.atk = Math.round(e.atk * 1.35)
        e.speed *= 1.2
        game.addLog(`${e.name} Cuồng Hóa: công kích và tốc độ tăng mạnh!`, 'bad')
      }
      if (e.mods.includes('tai_sinh') && !e.reborn && ratio < 0.5) {
        e.reborn = true
        e.hp = Math.min(e.maxHp, e.hp + Math.round(e.maxHp * 0.25))
        game.addLog(`${e.name} Huyết Hồn Tái Sinh, hồi 25% khí huyết!`, 'bad')
      }
    },

    /** Linh thú ra trận: thợ săn cắn địch, tiên hạc hồi khí huyết, theo chu kỳ riêng của từng con. */
    processPets() {
      const game = useGameStore()
      for (const id of game.activePets) {
        const p = PETS[id]
        if ((p.kind !== 'hunter' && p.kind !== 'healer') || !this.enemy) continue
        const next = (this.petNext[id] ??= this.clock + p.interval)
        if (this.clock < next) continue
        this.petNext[id] = Math.max(next + p.interval, this.clock) // lỡ nhịp (tick thưa) thì không dồn đòn
        const mult = petLevelMult(game.pets.owned[id])
        if (p.kind === 'hunter') {
          const elem = elementMult(p.element, this.enemy.element) * game.artElementMult(p.element, this.enemy.element)
          const raw = Math.max(1, Math.round(this.playerStats().atk * p.power * mult * (100 / (100 + this.enemyDef())) * elem))
          const damage = this.hurtEnemy(raw)
          fx('battle-hit', { target: 'enemy', damage, crit: false, skill: true, color: ELEMENTS[p.element].color, edge: elementEdge(p.element, this.enemy.element) })
          if (this.enemy.hp <= 0) {
            this.onKill()
            return
          }
        } else {
          const amount = Math.round(this.maxHp * p.heal * mult)
          this.hp = Math.min(this.maxHp, this.hp + amount)
          fx('battle-heal', { amount })
        }
      }
    },

    /** Phòng ngự thực của địch: Phá Giáp giảm 15%. */
    enemyDef() {
      return this.enemy.def * (this.clock < this.pierceUntil ? SK.STATUS.pierce.defMult : 1)
    },

    /** Địch đang mang trạng thái `name` (burn | chill | pierce | poison) không. */
    hasStatus(name) {
      if (name === 'burn') return this.clock < this.burnUntil || (this.clock < this.dotUntil && this.dotElem === 'hoa')
      if (name === 'chill') return this.clock < this.chillUntil
      if (name === 'pierce') return this.clock < this.pierceUntil
      return this.clock < this.dotUntil && this.dotElem === 'moc'
    },

    /** Gây trạng thái theo hệ của chiêu vừa trúng. */
    applyStatus(element, atk) {
      const name = SK.STATUS_OF_ELEMENT[element]
      const st = SK.STATUS[name]
      if (!st || !st.seconds) return
      if (name === 'burn') {
        if (this.clock >= this.burnUntil) this.nextBurn = this.clock + 1
        this.burnUntil = this.clock + st.seconds
        this.burnDmg = atk * st.dps
      } else if (name === 'chill') {
        this.chillUntil = this.clock + st.seconds
        if (this.slowUntil < this.chillUntil) this.slowUntil = this.chillUntil
        this.slowAmt = Math.max(this.clock < this.slowUntil ? this.slowAmt : 0, st.slow)
      } else if (name === 'pierce') {
        this.pierceUntil = this.clock + st.seconds
      }
    },

    /** Công kích đang có: nhân thêm khi Cuồng Bạo còn hiệu lực. */
    atkNow(stats) {
      return stats.atk * (this.clock < this.rageUntil ? 1 + this.rageAmt : 1)
    },

    /** Hút máu: đòn đánh hồi khí huyết theo sát thương gây ra nếu Huyết Thực còn hiệu lực. */
    lifestealFrom(damage) {
      const rate = (this.clock < this.lifestealUntil ? this.lifestealAmt : 0) + useGameStore().battlePerk.lifesteal + useGameStore().treasureFx.lifesteal // hút máu nền (Thể Tu, trang bị, Huyết Sát Châu)
      if (rate <= 0) return
      const heal = Math.round(damage * rate)
      if (heal > 0) this.hp = Math.min(this.maxHp, this.hp + heal)
    },

    /** Độc: mỗi giây gây sát thương cho đến khi hết hiệu lực hoặc địch chết. */
    processDot() {
      while (this.enemy && this.nextDot <= this.clock && this.nextDot <= this.dotUntil + 1e-9) {
        const game = useGameStore()
        const mult = elementMult(game.element, this.enemy.element)
        const damage = this.hurtEnemy(Math.max(1, Math.round(this.dotDmg * (100 / (100 + this.enemyDef())) * mult)), true)
        this.nextDot += 1
        this.lifestealFrom(damage)
        fx('battle-hit', { target: 'enemy', damage, crit: false, skill: true, color: ELEMENTS[game.element]?.color, edge: elementEdge(game.element, this.enemy.element) })
        if (this.enemy.hp <= 0) {
          this.onKill()
          return
        }
      }
    },

    /** Càn Khôn Đỉnh: hồi khí huyết theo chu kỳ. */
    processTreasureHeal() {
      const heal = useGameStore().treasureFx.heal
      if (!heal) return
      if (this.clock < this.nextHeal) return
      this.nextHeal = Math.max(this.nextHeal + heal.interval, this.clock)
      const amount = Math.round(this.maxHp * heal.pct)
      this.hp = Math.min(this.maxHp, this.hp + amount)
      fx('battle-heal', { amount })
    },

    /** Thiêu: mỗi giây cháy một phần công kích cho đến khi hết hiệu lực. */
    processBurn() {
      while (this.enemy && this.clock < this.burnUntil + 1 && this.nextBurn <= this.clock && this.nextBurn <= this.burnUntil + 1e-9) {
        const damage = this.hurtEnemy(Math.max(1, Math.round(this.burnDmg * (100 / (100 + this.enemyDef())) * elementMult('hoa', this.enemy.element))), true)
        this.nextBurn += 1
        fx('battle-hit', { target: 'enemy', damage, crit: false, skill: true, color: ELEMENTS.hoa.color, edge: elementEdge('hoa', this.enemy.element) })
        if (this.enemy.hp <= 0) {
          this.onKill()
          return
        }
      }
    },

    basicAttack(stats) {
      const game = useGameStore()
      const mult = elementMult(game.element, this.enemy.element) * game.artElementMult(game.element, this.enemy.element)
      const bossCrit = this.enemy.boss ? game.treasureFx.bossCrit : 0 // Thiên Cơ La Bàn
      const { damage: raw, crit } = B.rollHit(this.atkNow(stats), this.enemyDef(), Math.random, B.CRIT_CHANCE + game.battlePerk.crit + bossCrit + (this.clock < this.critUntil ? this.critAmt : 0), mult, B.CRIT_MULT + game.battlePerk.critMult)
      const damage = this.hurtEnemy(raw)
      this.lifestealFrom(damage)
      fx('battle-hit', { target: 'enemy', damage, crit, edge: elementEdge(game.element, this.enemy.element) })
      // Thất Tinh Kiếm: mỗi n đòn thường, một đòn gây thêm sát thương
      const perk = game.battlePerk
      if (perk.ignite > 0 && this.enemy.hp > 0 && Math.random() < perk.ignite) this.applyStatus('hoa', this.atkNow(stats)) // dòng đặc tính: gây Thiêu
      const nth = game.treasureFx.nth
      this.hitCount += 1
      if (perk.hitCd > 0 && this.hitCount % 5 === 0) for (const id of Object.keys(this.cd)) this.cd[id] -= perk.hitCd // mỗi 5 đòn giảm hồi chiêu
      if (nth && this.hitCount % nth.n === 0 && this.enemy.hp > 0) {
        const extra = this.hurtEnemy(Math.max(1, Math.round(this.atkNow(stats) * nth.mult * (100 / (100 + this.enemyDef())) * mult)), true)
        this.lifestealFrom(extra)
        fx('battle-hit', { target: 'enemy', damage: extra, crit: true, skill: true, color: ELEMENTS[game.element]?.color, edge: elementEdge(game.element, this.enemy.element) })
      }
    },

    castSkill(id, stats) {
      const game = useGameStore()
      const skill = SK.skillDef(id)
      const level = game.skillLevel(id)
      const branch = game.skills.branch?.[id] ?? null
      const lv = SK.skillLevelMult(level, id) * SK.branchPower(branch) // nhánh Cường Lực: +30% hiệu lực
      const attack = SK.isAttack(skill.kind)
      const power = skill.power * lv * (attack || skill.kind === 'dot' ? 1 + game.sectPerk.skill : 1) * (attack ? 1 + game.battlePerk.skillDmg : 1)
      this.cd[id] = this.clock + SK.skillCooldown(id, level, branch) * (1 - game.battlePerk.cd) // Pháp Tu: hồi chiêu nhanh hơn; nhánh Tốc Biến
      fx('battle-skill', { name: skill.name, color: ELEMENTS[skill.element].color, kind: SK.visualKind(skill.kind), element: skill.element, seconds: skill.seconds })
      if (attack) {
        let pw = power
        // Tuyệt Sát: gấp bội khi địch sắp gục
        if (skill.kind === 'execute' && this.enemy.hp / this.enemy.maxHp < skill.threshold) pw *= 1 + skill.bonus
        // Liên kích: địch đang mang trạng thái hợp với hệ của chiêu
        const combo = SK.COMBOS.find((c) => c.element === skill.element && this.hasStatus(c.status))
        if (combo) {
          pw *= combo.mult
          this.comboName = combo.name
          this.comboUntil = this.clock + 1.6
          game.addLog(`Liên kích ${combo.name}! ${skill.name} gây thêm ${Math.round((combo.mult - 1) * 100)}% sát thương.`, 'good')
        }
        const mult = elementMult(skill.element, this.enemy.element) * game.artElementMult(skill.element, this.enemy.element)
        const { damage: raw, crit } = B.rollHit(this.atkNow(stats) * pw, this.enemyDef(), Math.random, B.CRIT_CHANCE + game.battlePerk.crit + (this.enemy.boss ? game.treasureFx.bossCrit : 0) + (this.clock < this.critUntil ? this.critAmt : 0), mult, B.CRIT_MULT + game.battlePerk.critMult)
        const damage = this.hurtEnemy(raw, true)
        this.lifestealFrom(damage)
        if (skill.slow) {
          this.slowUntil = this.clock + skill.seconds
          this.slowAmt = skill.slow
        }
        if (skill.kind === 'stun') this.nextEnemy = Math.max(this.nextEnemy, this.clock + skill.seconds) // choáng: mất lượt ra đòn
        this.applyStatus(skill.element, this.atkNow(stats))
        // Phong Lôi Phiến: tung võ kỹ tấn công thì ra đòn nhanh hơn 3 giây
        const ch = game.treasureFx.haste
        if (ch > 0 && (this.clock >= this.hasteUntil || this.hasteAmt < ch)) {
          this.hasteAmt = Math.max(ch, this.clock < this.hasteUntil ? this.hasteAmt : 0)
          this.hasteUntil = Math.max(this.hasteUntil, this.clock + 3)
        }
        fx('battle-hit', { target: 'enemy', damage, crit, skill: true, color: ELEMENTS[skill.element].color, edge: elementEdge(skill.element, this.enemy.element) })
      } else if (skill.kind === 'dot') {
        this.dotUntil = this.clock + skill.seconds
        this.dotElem = skill.element
        this.dotDmg = this.atkNow(stats) * power
        this.nextDot = this.clock + 1
      } else if (skill.kind === 'heal') {
        const amount = Math.round(this.maxHp * power)
        this.hp = Math.min(this.maxHp, this.hp + amount)
        fx('battle-heal', { amount })
      } else if (skill.kind === 'shield') {
        this.shield = Math.round(this.maxHp * power)
        this.shieldUntil = this.clock + skill.seconds
      } else if (skill.kind === 'lifesteal') {
        this.lifestealAmt = power
        this.lifestealUntil = this.clock + skill.seconds
      } else if (skill.kind === 'crit') {
        this.critAmt = power
        this.critUntil = this.clock + skill.seconds
      } else if (skill.kind === 'rage') {
        this.rageAmt = power
        this.rageUntil = this.clock + skill.seconds
      } else if (skill.kind === 'reflect') {
        this.reflectAmt = power
        this.reflectUntil = this.clock + skill.seconds
      } else {
        this.hasteAmt = power
        this.hasteUntil = this.clock + skill.seconds
      }
    },

    enemyAct() {
      const game = useGameStore()
      const mult = elementMult(this.enemy.element, game.element)
      let { damage } = B.rollHit(this.enemy.atk, this.playerStats().def, Math.random, 0, mult)
      this.enemy.hits += 1
      if (this.enemy.mods.includes('nhat_chem') && this.enemy.hits % 4 === 0) {
        damage = Math.round(damage * 2.5)
        game.addLog(`${this.enemy.name} tung Nhát Chém Ngàn Cân!`, 'bad')
      }
      if (this.clock < this.shieldUntil && this.shield > 0) {
        const absorbed = Math.min(this.shield, damage)
        this.shield -= absorbed
        damage -= absorbed
      }
      this.hp = Math.max(0, this.hp - damage)
      if (damage > 0 && this.enemy.mods.includes('hut_mau')) this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + Math.round(damage * 0.4))
      const slow = this.clock < this.slowUntil ? 1 - this.slowAmt : 1
      this.nextEnemy += B.actionInterval(this.enemy.speed * slow)
      fx('battle-hit', { target: 'player', damage, crit: false, edge: elementEdge(this.enemy.element, game.element) })
      // Phản Chấn: trả lại một phần sát thương nhận vào
      const reflect = (this.clock < this.reflectUntil ? this.reflectAmt : 0) + game.battlePerk.thorns // Phản Chấn Thể + Huyền Thoại
      if (damage > 0 && reflect > 0) {
        const back = Math.max(1, Math.round(damage * reflect))
        this.hurtEnemy(back, true)
        fx('battle-hit', { target: 'enemy', damage: back, crit: false, skill: true, color: ELEMENTS.tho.color, edge: 'none' })
        if (this.enemy.hp <= 0 && this.hp > 0) {
          this.onKill()
          return
        }
      }
      if (this.hp <= 0 && !this.lethalUsed && game.treasureFx.lethal > 0) {
        // Hộ Thân Linh Phù: chặn một đòn chí mạng mỗi ải
        this.lethalUsed = true
        this.hp = Math.max(1, Math.round(this.maxHp * game.treasureFx.lethal))
        game.addLog('Hộ Thân Linh Phù cứu mạng, hồi khí huyết!', 'good')
      }
      if (this.hp <= 0) this.onDeath()
    },

    /** Hạ yêu thú: nhận thưởng; nếu là ải mới thì tiến lên (thưởng lần đầu cho boss). */
    onKill() {
      const game = useGameStore()
      const n = this.ai
      const kind = this.enemy.tier
      const tmpl = MONSTERS[this.enemy.id]
      const loot = [...C.rollAiLoot(n, kind, Math.random, game.lootLuck), ...rollArtDrops(n, kind, Math.random, game.lootLuck), ...rollPetDrops(n, kind, Math.random, game.lootLuck), ...rollTreasureDrops(n, kind, Math.random, game.lootLuck)]
        .filter(({ id }) => !(id.startsWith('qk_') && SK.SKILLS[id.slice(3)]?.path && SK.SKILLS[id.slice(3)].path !== game.path)) // võ kỹ độc quyền chỉ rơi cho đúng đạo lộ

      game.gainExp(game.expRate.mul(C.aiExpSeconds(n, kind, game.stageIdx)))
      this.run.kills += 1
      game.stats.kills += 1
      if (kind !== 'normal') {
        game.stats.bossKills += 1
        game.addContribution(C.aiContribution(n, kind)) // Cống Hiến tông môn
      }
      // Dòng đặc tính: hạ yêu thú hồi máu / có lá chắn
      const bp = game.battlePerk
      if (bp.killHeal > 0) this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * bp.killHeal))
      if (bp.killShield > 0) {
        this.shield = Math.max(this.clock < this.shieldUntil ? this.shield : 0, Math.round(this.maxHp * bp.killShield))
        this.shieldUntil = this.clock + 8
      }
      // Tụ Linh Bình: hạ boss thì hồi khí huyết
      const bk = game.treasureFx.bossKill
      if (bk > 0 && kind !== 'normal') this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * bk))
      // Trang bị rơi: tỉ lệ theo loại ải; phẩm cấp theo bối cảnh (tối đa phẩm cao nhất)
      if (Math.random() < C.AI_KINDS[kind].gear * (1 + game.lootLuck)) {
        const slot = EQ.SLOT_IDS[Math.floor(Math.random() * EQ.SLOT_IDS.length)]
        // Chúa Tể: 60% rơi đồ Huyền Thoại đặc hiệu cố định, còn lại là đồ thường
        const gear = kind === 'lord' && Math.random() < 0.6 ? EQ.generateLegend(slot, C.gearTierOf(n)) : EQ.generateItem(slot, C.gearTierOf(n), EQ.DROP_RARITY_WEIGHTS)
        game.addGear(gear)
        this.run.gear.push(EQ.itemFullName(gear))
        if (this.run.gear.length > 50) this.run.gear.shift() // tránh phình bộ nhớ khi để chạy nhiều giờ
        game.addLog(`Rơi trang bị: ${EQ.itemFullName(gear)}!`, gear.rarity >= 2 ? 'event' : 'good')
      }
      for (const { id, count } of loot) {
        game.addItem(game.itemGroup(id), id, count)
        this.run.items[id] = (this.run.items[id] ?? 0) + count
      }
      const lootText = loot.length ? ', ' + loot.map((l) => `${itemName(l.id)} x${l.count}`).join(', ') : ''
      game.addLog(`Hạ ${this.enemy.name} (ải ${n})${lootText}.`, loot.length ? 'good' : 'info')
      fx('battle-enemy-die', { boss: this.enemy.boss })
      this.enemy = null

      if (n > game.campaign.best) {
        game.recordAi(n) // ải mới: cập nhật tiến độ, tăng thu nhập thụ động, xoá Kiên Trì
        if (kind !== 'normal') game.offerBossChoice(n, kind) // chọn 1 trong 3 phần thưởng
      }
      this.run.wins += 1
      this.lastResult = 'win'
      this.phase = 'between'
      this.timer = BETWEEN_DELAY
    },

    onDeath() {
      const game = useGameStore()
      const grit = game.addGrit()
      game.addLog(
        `Bị ${this.enemy.name} đánh bại ở ải ${this.ai}. Nghỉ ${REST_AFTER_DEATH} giây, thử lại với Kiên Trì +${Math.round(C.GRIT_STEP * grit * 100)}%.`,
        'bad',
      )
      this.enemy = null
      this.lastResult = 'dead'
      this.phase = 'resting'
      this.timer = REST_AFTER_DEATH
      emit('battle-end', { result: 'dead' })
    },

    /** Hết thời gian nghỉ sau khi thua: thử lại nếu "Tự chiến đấu" còn bật. */
    afterRest() {
      const game = useGameStore()
      this.phase = 'idle'
      if (game.settings.autoRepeat) this.start()
    },

    /** Dùng Hồi Huyết Đan trong trận. `auto` = tự động (không báo lỗi). */
    useHealPill(auto = false) {
      const game = useGameStore()
      if (!this.inFight || this.hp >= this.maxHp || game.challenge === 'tinh_tam') return false // Tịnh Tâm: không dùng đan
      if (game.itemCount('hoi_huyet_dan') < 1) return false
      game.removeItem('hoi_huyet_dan', 1)
      const heal = Math.round(this.maxHp * 0.5)
      this.hp = Math.min(this.maxHp, this.hp + heal)
      fx('battle-heal', { amount: heal })
      game.addLog(`${auto ? 'Tự động dùng' : 'Dùng'} Hồi Huyết Đan: +${heal} khí huyết.`, 'good')
      return true
    },
  },
})
