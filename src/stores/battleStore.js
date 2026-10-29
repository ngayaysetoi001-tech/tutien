// =====================================================================
// battleStore.js - Auto-battle Bí Cảnh (trạng thái tạm thời, không lưu vào save)
//
// Vòng đời: idle -> fighting <-> between (nghỉ ngắn giữa các tầng) -> resting
//   fighting : hai bên ra đòn theo Thân pháp (ATB đơn giản theo thời gian thực)
//   between  : vừa hạ yêu thú, chờ ~0.9s rồi tầng kế tiếp
//   resting  : kết thúc lượt (thông quan hoặc tử trận), nghỉ rồi tự lặp nếu bật
// Công thức nằm ở game/battle.js; dữ liệu ở game/data.js.
// =====================================================================
import { defineStore } from 'pinia'
import Decimal from 'break_infinity.js'
import { emit } from '../game/events.js'
import { fmt } from '../game/format.js'
import { dungeonById, itemName, MONSTERS } from '../game/data.js'
import * as B from '../game/battle.js'
import { ELEMENTS, elementEdge, elementMult } from '../game/elements.js'
import * as SK from '../game/skills.js'
import * as EQ from '../game/equipment.js'
import { DUNGEONS } from '../game/data.js'
import { DUNGEON_FLAVOR } from '../game/story.js'
import { useGameStore } from './gameStore.js'


const BETWEEN_DELAY = 0.9 // giây nghỉ giữa các tầng
const REST_AFTER_CLEAR = 3
const REST_AFTER_DEATH = 6
const AUTO_HEAL_BELOW = 0.35

const emptyRun = () => ({ kills: 0, stones: new Decimal(0), items: {}, gear: [], floorReached: 0 })

export const useBattleStore = defineStore('battle', {
  state: () => ({
    phase: 'idle', // idle | fighting | between | resting
    dungeonId: null,
    floor: 0,
    timer: 0, // đếm ngược cho between / resting
    clock: 0, // đồng hồ trận đấu hiện tại (giây)
    enemy: null, // { id, name, kind, color, boss, hp, maxHp, atk, def, speed }
    hp: 0,
    maxHp: 0,
    nextPlayer: 0,
    nextEnemy: 0,
    run: emptyRun(),
    lastResult: '', // 'clear' | 'dead' | 'retreat' | ''
    // Công pháp & hiệu ứng trạng thái trong trận (thời điểm tính theo `clock`)
    cd: {}, // { id công pháp: thời điểm hồi xong }
    shield: 0,
    shieldUntil: 0,
    hasteUntil: 0,
    hasteAmt: 0,
    slowUntil: 0,
    slowAmt: 0,
  }),

  getters: {
    active: (s) => s.phase !== 'idle',
    inFight: (s) => s.phase === 'fighting' || s.phase === 'between',
    dungeon: (s) => (s.dungeonId ? dungeonById(s.dungeonId) : null),
    hpRatio: (s) => (s.maxHp > 0 ? s.hp / s.maxHp : 0),
  },

  actions: {
    /** Kiên Trì của bí cảnh đang đánh: +5% chỉ số mỗi lần tử trận gần đây (xoá khi hạ boss). */
    gritMult() {
      const grit = useGameStore().dungeons[this.dungeonId]?.grit ?? 0
      return 1 + B.GRIT_STEP * grit
    },

    /** Chỉ số chiến đấu thực tế trong trận = chỉ số nhân vật x Kiên Trì. */
    playerStats() {
      const c = useGameStore().combat
      const k = this.gritMult()
      return { hp: Math.round(c.hp * k), atk: Math.round(c.atk * k), def: Math.round(c.def * k), speed: c.speed }
    },

    /** Vào bí cảnh. Trả về false nếu không đủ điều kiện. */
    enter(dungeonId) {
      const game = useGameStore()
      const dungeon = dungeonById(dungeonId)
      if (!dungeon || game.tribulation.active || this.inFight) return false
      if (game.stageIdx < dungeon.minStage) return false
      this.dungeonId = dungeonId
      this.floor = 1
      this.maxHp = this.playerStats().hp
      this.hp = this.maxHp
      this.run = emptyRun()
      this.lastResult = ''
      this.cd = {}
      this.shield = this.shieldUntil = this.hasteUntil = this.slowUntil = 0
      game.settings.lastDungeon = dungeonId
      emit('battle-start', { dungeonId })
      game.addLog(`Tiến vào ${dungeon.name}, tầng 1/${dungeon.floors}.`, 'event')
      if (DUNGEON_FLAVOR[dungeonId]) game.addLog(DUNGEON_FLAVOR[dungeonId], 'info')
      this.spawnEnemy()
      return true
    },

    /** Rút lui giữa chừng (người chơi bấm, hoặc bắt đầu độ kiếp). */
    retreat(silent = false) {
      if (!this.active) return
      if (this.phase === 'resting') {
        this.lastResult = 'retreat' // huỷ tự động lặp đang chờ
      } else {
        this.finish('retreat', 0, silent)
      }
      this.phase = 'idle'
    },

    spawnEnemy() {
      const game = useGameStore()
      const dungeon = this.dungeon
      const [id, tmpl] = B.pickMonster(dungeon, this.floor)
      const stats = B.enemyStats(dungeon, tmpl, this.floor, Math.random)
      this.enemy = {
        id, name: tmpl.name, kind: tmpl.kind, color: tmpl.color, element: tmpl.element, boss: !!tmpl.boss, ...stats, maxHp: stats.hp,
      }
      this.phase = 'fighting'
      this.nextPlayer = this.clock + 0.5
      this.nextEnemy = this.clock + B.actionInterval(stats.speed) * 0.8
      this.slowUntil = 0 // làm chậm không kéo sang yêu thú mới
      game.recordFloor(dungeon.id, this.floor)
      this.run.floorReached = Math.max(this.run.floorReached, this.floor)
      emit('battle-enemy-spawn', { name: tmpl.name, kind: tmpl.kind, color: tmpl.color, boss: !!tmpl.boss })
      if (tmpl.boss) game.addLog(`Boss xuất hiện: ${tmpl.name}!`, 'bad')
    },

    /** Mỗi nhịp game (gọi từ gameStore.tick). */
    tick(dt) {
      if (this.phase === 'idle') return
      const game = useGameStore()

      if (this.phase === 'resting') {
        this.timer -= dt
        if (this.timer <= 0) this.afterRest()
        return
      }
      if (this.phase === 'between') {
        this.timer -= dt
        if (this.timer <= 0) this.spawnEnemy()
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
        const kind = SK.SKILLS[id].kind
        if (kind === 'heal' && this.hp / this.maxHp > 0.8) continue
        if (kind === 'shield' && this.clock < this.shieldUntil) continue
        if (kind === 'haste' && this.clock < this.hasteUntil) continue
        return id
      }
      return null
    },

    /** Lượt ra đòn của người chơi: thi triển công pháp nếu sẵn sàng, ngược lại đánh thường. */
    playerAct() {
      const game = useGameStore()
      const stats = this.playerStats()
      const skillId = this.readySkill()
      if (skillId) this.castSkill(skillId, stats)
      else this.basicAttack(stats)
      const haste = this.clock < this.hasteUntil ? 1 + this.hasteAmt : 1
      this.nextPlayer += B.actionInterval(stats.speed * haste)
      if (this.enemy && this.enemy.hp <= 0) this.onKill()
    },

    basicAttack(stats) {
      const game = useGameStore()
      const mult = elementMult(game.element, this.enemy.element)
      const { damage, crit } = B.rollHit(stats.atk, this.enemy.def, Math.random, B.CRIT_CHANCE, mult)
      this.enemy.hp = Math.max(0, this.enemy.hp - damage)
      emit('battle-hit', { target: 'enemy', damage, crit, edge: elementEdge(game.element, this.enemy.element) })
    },

    castSkill(id, stats) {
      const skill = SK.SKILLS[id]
      const level = useGameStore().skills.owned[id]
      const power = skill.power * SK.skillLevelMult(level) * (skill.kind === 'damage' ? 1 + useGameStore().sectPerk.skill : 1)
      this.cd[id] = this.clock + SK.skillCooldown(id, level)
      emit('battle-skill', { name: skill.name, color: ELEMENTS[skill.element].color, kind: skill.kind, element: skill.element, seconds: skill.seconds })
      if (skill.kind === 'damage') {
        const mult = elementMult(skill.element, this.enemy.element)
        const { damage, crit } = B.rollHit(stats.atk * power, this.enemy.def, Math.random, B.CRIT_CHANCE, mult)
        this.enemy.hp = Math.max(0, this.enemy.hp - damage)
        if (skill.slow) {
          this.slowUntil = this.clock + skill.seconds
          this.slowAmt = skill.slow
        }
        emit('battle-hit', { target: 'enemy', damage, crit, skill: true, color: ELEMENTS[skill.element].color, edge: elementEdge(skill.element, this.enemy.element) })
      } else if (skill.kind === 'heal') {
        const amount = Math.round(this.maxHp * power)
        this.hp = Math.min(this.maxHp, this.hp + amount)
        emit('battle-heal', { amount })
      } else if (skill.kind === 'shield') {
        this.shield = Math.round(this.maxHp * power)
        this.shieldUntil = this.clock + skill.seconds
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
      emit('battle-hit', { target: 'player', damage, crit: false, edge: elementEdge(this.enemy.element, game.element) })
      if (this.hp <= 0) this.onDeath()
    },

    /** Hạ yêu thú: nhận linh thạch, linh khí, vật phẩm; sang tầng mới hoặc thông quan. */
    onKill() {
      const game = useGameStore()
      const dungeon = this.dungeon
      const tmpl = MONSTERS[this.enemy.id]
      const stones = B.stoneReward(dungeon, tmpl, this.floor, game.stageIdx)
      const loot = B.rollLoot(dungeon, tmpl, this.floor, Math.random, game.lootLuck)

      game.spiritStones = game.spiritStones.add(stones)
      game.gainExp(game.expRate.mul(B.expRewardSeconds(this.floor, tmpl.boss, game.stageIdx, dungeon.power)))
      this.run.kills += 1
      game.stats.kills += 1
      if (tmpl.boss) {
        game.stats.bossKills += 1
        game.addContribution(B.bossContribution(dungeon, game.stageIdx)) // Cống Hiến tông môn
      }
      this.run.stones = this.run.stones.add(stones)
      // Trang bị rơi: boss 40%, yêu thú thường 3%; phẩm cấp theo bí cảnh
      if (Math.random() < (tmpl.boss ? B.GEAR_DROP_BOSS : B.GEAR_DROP_NORMAL) * (1 + game.lootLuck)) {
        const slot = EQ.SLOT_IDS[Math.floor(Math.random() * EQ.SLOT_IDS.length)]
        const gear = EQ.generateItem(slot, DUNGEONS.indexOf(dungeon), EQ.DROP_RARITY_WEIGHTS)
        game.addGear(gear)
        this.run.gear.push(EQ.itemFullName(gear))
        game.addLog(`Rơi trang bị: ${EQ.itemFullName(gear)}!`, gear.rarity >= 2 ? 'event' : 'good')
      }
      for (const { id, count } of loot) {
        game.addItem(game.itemGroup(id), id, count)
        this.run.items[id] = (this.run.items[id] ?? 0) + count
      }
      const lootText = loot.length ? ', ' + loot.map((l) => `${itemName(l.id)} x${l.count}`).join(', ') : ''
      game.addLog(`Hạ ${this.enemy.name}: +${fmt(stones)} linh thạch${lootText}.`, loot.length ? 'good' : 'info')
      emit('battle-enemy-die', { boss: this.enemy.boss })
      this.enemy = null

      if (this.floor >= dungeon.floors) {
        const bonus = B.clearBonus(dungeon, game.stageIdx)
        game.spiritStones = game.spiritStones.add(bonus)
        this.run.stones = this.run.stones.add(bonus)
        game.recordClear(dungeon.id) // cũng xoá Kiên Trì
        game.addLog(`Thông quan ${dungeon.name}! Thưởng thêm ${fmt(bonus)} linh thạch.`, 'good')
        this.finish('clear', REST_AFTER_CLEAR)
        return
      }
      this.floor += 1
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * B.FLOOR_HEAL)
      this.phase = 'between'
      this.timer = BETWEEN_DELAY
    },

    onDeath() {
      const game = useGameStore()
      const grit = game.addGrit(this.dungeonId)
      game.addLog(
        `Bị ${this.enemy.name} đánh bại ở tầng ${this.floor}. Nghỉ ${REST_AFTER_DEATH} giây... Kiên Trì +${Math.round(B.GRIT_STEP * grit * 100)}% cho lượt sau.`,
        'bad',
      )
      this.enemy = null
      this.finish('dead', REST_AFTER_DEATH)
    },

    /** Kết thúc lượt: dọn cảnh, chuyển sang resting (hoặc idle nếu rút lui). */
    finish(result, restSeconds, silent = false) {
      const game = useGameStore()
      this.lastResult = result
      this.enemy = null
      this.phase = 'resting'
      this.timer = restSeconds
      emit('battle-end', { result })
      if (result === 'retreat' && !silent) game.addLog('Rút khỏi bí cảnh.', 'info')
    },

    /** Hết thời gian nghỉ: tự vào lại nếu bật "tự động lặp", ngược lại về idle. */
    afterRest() {
      const game = useGameStore()
      this.phase = 'idle'
      if (game.settings.autoRepeat && this.dungeonId && this.lastResult !== 'retreat') this.enter(this.dungeonId)
    },

    /** Dùng Hồi Huyết Đan trong trận. `auto` = tự động (không báo lỗi). */
    useHealPill(auto = false) {
      const game = useGameStore()
      if (!this.inFight || this.hp >= this.maxHp) return false
      if (game.itemCount('hoi_huyet_dan') < 1) return false
      game.removeItem('hoi_huyet_dan', 1)
      const heal = Math.round(this.maxHp * 0.5)
      this.hp = Math.min(this.maxHp, this.hp + heal)
      emit('battle-heal', { amount: heal })
      game.addLog(`${auto ? 'Tự động dùng' : 'Dùng'} Hồi Huyết Đan: +${heal} khí huyết.`, 'good')
      return true
    },
  },
})
