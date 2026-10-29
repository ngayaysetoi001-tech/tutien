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
  if (useUiStore().tab === 'battle') emit(name, payload)
}

const emptyRun = () => ({ kills: 0, stones: new Decimal(0), items: {}, gear: [], wins: 0 })

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
    reflectUntil: 0,
    reflectAmt: 0,
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
      this.dotUntil = this.lifestealUntil = this.rageUntil = this.reflectUntil = 0
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
      // Mỗi ải bắt đầu với khí huyết đầy
      this.maxHp = this.playerStats().hp
      this.hp = this.maxHp
      this.enemy = {
        id, name: tmpl.name, kind: tmpl.kind, color: tmpl.color, element: tmpl.element, boss, tier: kind, ...stats, maxHp: stats.hp,
      }
      this.phase = 'fighting'
      this.nextPlayer = this.clock + 0.5
      this.nextEnemy = this.clock + B.actionInterval(stats.speed) * 0.8
      this.slowUntil = 0 // làm chậm và độc không kéo sang yêu thú mới
      this.dotUntil = 0
      fx('battle-enemy-spawn', { name: tmpl.name, kind: tmpl.kind, color: tmpl.color, boss })
      if (n % C.AIS_PER_CHAPTER === 1 && n > game.campaign.best) {
        game.addLog(`Bước vào ${C.chapterName(n)}, chương ${C.chapterOf(n)}.`, 'event')
        if (C.themeOf(n).round === 0 && DUNGEON_FLAVOR[C.themeOf(n).dungeon.id]) game.addLog(DUNGEON_FLAVOR[C.themeOf(n).dungeon.id], 'info')
      }
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
      this.processDot()
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
      for (let i = 0; i < game.skillSlots; i++) {
        const id = game.skills.slots[i]
        if (!id || (this.cd[id] ?? 0) > this.clock) continue
        if (!SK.canEquip(id, game.realmIdx)) continue // tuyệt kỹ chưa đủ cảnh giới (ví dụ sau luân hồi)
        const kind = SK.SKILLS[id].kind
        if (kind === 'heal' && this.hp / this.maxHp > 0.8) continue
        if (kind === 'shield' && this.clock < this.shieldUntil) continue
        if (kind === 'haste' && this.clock < this.hasteUntil) continue
        if (kind === 'dot' && this.clock < this.dotUntil) continue
        if (kind === 'lifesteal' && this.clock < this.lifestealUntil) continue
        if (kind === 'rage' && this.clock < this.rageUntil) continue
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
      else this.basicAttack(stats)
      const haste = this.clock < this.hasteUntil ? 1 + this.hasteAmt : 1
      this.nextPlayer += B.actionInterval(stats.speed * haste)
      if (this.enemy && this.enemy.hp <= 0) this.onKill()
    },

    /** Công kích đang có: nhân thêm khi Cuồng Bạo còn hiệu lực. */
    atkNow(stats) {
      return stats.atk * (this.clock < this.rageUntil ? 1 + this.rageAmt : 1)
    },

    /** Hút máu: đòn đánh hồi khí huyết theo sát thương gây ra nếu Huyết Thực còn hiệu lực. */
    lifestealFrom(damage) {
      if (this.clock >= this.lifestealUntil) return
      const heal = Math.round(damage * this.lifestealAmt)
      if (heal > 0) this.hp = Math.min(this.maxHp, this.hp + heal)
    },

    /** Độc: mỗi giây gây sát thương cho đến khi hết hiệu lực hoặc địch chết. */
    processDot() {
      while (this.enemy && this.nextDot <= this.clock && this.nextDot <= this.dotUntil + 1e-9) {
        const game = useGameStore()
        const mult = elementMult(game.element, this.enemy.element)
        const damage = Math.max(1, Math.round(this.dotDmg * (100 / (100 + this.enemy.def)) * mult))
        this.enemy.hp = Math.max(0, this.enemy.hp - damage)
        this.nextDot += 1
        this.lifestealFrom(damage)
        fx('battle-hit', { target: 'enemy', damage, crit: false, skill: true, color: ELEMENTS[game.element]?.color, edge: elementEdge(game.element, this.enemy.element) })
        if (this.enemy.hp <= 0) {
          this.onKill()
          return
        }
      }
    },

    basicAttack(stats) {
      const game = useGameStore()
      const mult = elementMult(game.element, this.enemy.element) * game.artElementMult(game.element, this.enemy.element)
      const { damage, crit } = B.rollHit(this.atkNow(stats), this.enemy.def, Math.random, B.CRIT_CHANCE, mult)
      this.enemy.hp = Math.max(0, this.enemy.hp - damage)
      this.lifestealFrom(damage)
      fx('battle-hit', { target: 'enemy', damage, crit, edge: elementEdge(game.element, this.enemy.element) })
    },

    castSkill(id, stats) {
      const game = useGameStore()
      const skill = SK.SKILLS[id]
      const level = game.skills.owned[id]
      const lv = SK.skillLevelMult(level)
      const attack = ['damage', 'stun', 'execute', 'ultimate'].includes(skill.kind)
      const power = skill.power * lv * (attack || skill.kind === 'dot' ? 1 + game.sectPerk.skill : 1)
      this.cd[id] = this.clock + SK.skillCooldown(id, level)
      fx('battle-skill', { name: skill.name, color: ELEMENTS[skill.element].color, kind: SK.visualKind(skill.kind), element: skill.element, seconds: skill.seconds })
      if (attack) {
        let pw = power
        // Tuyệt Sát: gấp bội khi địch sắp gục
        if (skill.kind === 'execute' && this.enemy.hp / this.enemy.maxHp < skill.threshold) pw *= 1 + skill.bonus
        const mult = elementMult(skill.element, this.enemy.element) * game.artElementMult(skill.element, this.enemy.element)
        const { damage, crit } = B.rollHit(this.atkNow(stats) * pw, this.enemy.def, Math.random, B.CRIT_CHANCE, mult)
        this.enemy.hp = Math.max(0, this.enemy.hp - damage)
        this.lifestealFrom(damage)
        if (skill.slow) {
          this.slowUntil = this.clock + skill.seconds
          this.slowAmt = skill.slow
        }
        if (skill.kind === 'stun') this.nextEnemy = Math.max(this.nextEnemy, this.clock + skill.seconds) // choáng: mất lượt ra đòn
        fx('battle-hit', { target: 'enemy', damage, crit, skill: true, color: ELEMENTS[skill.element].color, edge: elementEdge(skill.element, this.enemy.element) })
      } else if (skill.kind === 'dot') {
        this.dotUntil = this.clock + skill.seconds
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
      if (this.clock < this.shieldUntil && this.shield > 0) {
        const absorbed = Math.min(this.shield, damage)
        this.shield -= absorbed
        damage -= absorbed
      }
      this.hp = Math.max(0, this.hp - damage)
      const slow = this.clock < this.slowUntil ? 1 - this.slowAmt : 1
      this.nextEnemy += B.actionInterval(this.enemy.speed * slow)
      fx('battle-hit', { target: 'player', damage, crit: false, edge: elementEdge(this.enemy.element, game.element) })
      // Phản Chấn: trả lại một phần sát thương nhận vào
      if (damage > 0 && this.clock < this.reflectUntil) {
        const back = Math.max(1, Math.round(damage * this.reflectAmt))
        this.enemy.hp = Math.max(0, this.enemy.hp - back)
        fx('battle-hit', { target: 'enemy', damage: back, crit: false, skill: true, color: ELEMENTS.tho.color, edge: 'none' })
        if (this.enemy.hp <= 0 && this.hp > 0) {
          this.onKill()
          return
        }
      }
      if (this.hp <= 0) this.onDeath()
    },

    /** Hạ yêu thú: nhận thưởng; nếu là ải mới thì tiến lên (thưởng lần đầu cho boss). */
    onKill() {
      const game = useGameStore()
      const n = this.ai
      const kind = this.enemy.tier
      const tmpl = MONSTERS[this.enemy.id]
      const stones = C.aiStoneReward(n, kind, game.stageIdx).mul(1 + game.artBonus.stones)
      const loot = [...C.rollAiLoot(n, kind, Math.random, game.lootLuck), ...rollArtDrops(n, kind, Math.random, game.lootLuck)]

      game.spiritStones = game.spiritStones.add(stones)
      game.gainExp(game.expRate.mul(C.aiExpSeconds(n, kind, game.stageIdx)))
      this.run.kills += 1
      game.stats.kills += 1
      if (kind !== 'normal') {
        game.stats.bossKills += 1
        game.addContribution(C.aiContribution(n, kind)) // Cống Hiến tông môn
      }
      this.run.stones = this.run.stones.add(stones)
      // Trang bị rơi: tỉ lệ theo loại ải; phẩm cấp theo bối cảnh (tối đa phẩm cao nhất)
      if (Math.random() < C.AI_KINDS[kind].gear * (1 + game.lootLuck)) {
        const slot = EQ.SLOT_IDS[Math.floor(Math.random() * EQ.SLOT_IDS.length)]
        const gear = EQ.generateItem(slot, C.themeOf(n).idx, EQ.DROP_RARITY_WEIGHTS)
        game.addGear(gear)
        this.run.gear.push(EQ.itemFullName(gear))
        game.addLog(`Rơi trang bị: ${EQ.itemFullName(gear)}!`, gear.rarity >= 2 ? 'event' : 'good')
      }
      for (const { id, count } of loot) {
        game.addItem(game.itemGroup(id), id, count)
        this.run.items[id] = (this.run.items[id] ?? 0) + count
      }
      const lootText = loot.length ? ', ' + loot.map((l) => `${itemName(l.id)} x${l.count}`).join(', ') : ''
      game.addLog(`Hạ ${this.enemy.name} (ải ${n}): +${fmt(stones)} linh thạch${lootText}.`, loot.length ? 'good' : 'info')
      fx('battle-enemy-die', { boss: this.enemy.boss })
      this.enemy = null

      if (n > game.campaign.best) {
        const bonus = game.recordAi(n) // ải mới: cập nhật tiến độ, thưởng lần đầu, xoá Kiên Trì
        if (bonus) this.run.stones = this.run.stones.add(bonus)
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
      if (!this.inFight || this.hp >= this.maxHp) return false
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
