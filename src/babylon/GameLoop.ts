import {
  Scene,
  Vector3,
  Color4,
  ParticleSystem,
  FreeCamera
} from '@babylonjs/core'
import { EngineContext } from './core/EngineContext'
import { AssetManager } from './core/AssetManager'
import { EventBus } from './core/EventBus'
import { InputManager } from './core/InputManager'
import { Player } from './entities/Player'
import { Enemy } from './entities/Enemy'
import { HidingSpots } from './environment/HidingSpots'
import { OfficeLevel } from './environment/OfficeLevel'
import { CollisionSystem } from './systems/CollisionSystem'
import { LevelManager } from './systems/LevelManager'
import { AudioManager } from './systems/AudioManager'
import { ProjectileSystem } from './systems/ProjectileSystem'
import { Props } from './Props'
import { WEAPON_CONFIGS, PROP_CONFIGS, EASTER_EGG_WEAPONS } from '../types/game'
import type { EasterEggWeaponType } from '../types/game'
import { EasterEggMode } from './easter-egg/EasterEggMode'

export class GameLoop {
  private engineContext: EngineContext
  private scene: Scene
  private camera: FreeCamera
  private assetManager: AssetManager
  private player: Player
  private enemy: Enemy
  private hidingSpots: HidingSpots
  private officeLevel: OfficeLevel
  private collisionSystem: CollisionSystem
  private levelManager: LevelManager
  private audio: AudioManager
  private projectileSystem: ProjectileSystem
  private props: Props
  private input: InputManager
  private events: EventBus
  private kickCount: number = 0
  private health: number = 3
  private maxHealth: number = 3
  private isGameOver: boolean = false
  private _gameOverPending: boolean = false
  private isWin: boolean = false
  private score: number = 0
  private inventory: {
    id: string
    type: string
    name: string
    icon: string
    description: string
    duration: number
    active: boolean
    startTime?: number
    category?: string
    count: number
  }[] = []
  private onStateChange: (state: any) => void
  private kickCounted: boolean = false
  private patrolDamageCooldown: number = 0
  private semicircleDetected: boolean = false
  private semicircleRecoveryCooldown: number = 0
  private lastAttackTime: number = -10
  private elapsedTime: number = 0
  private wasPatrolling: boolean = false
  // 复用 Vector3，避免每帧 GC（P0.1）
  private _cameraOffset = new Vector3()
  private _cameraTarget = new Vector3()
  private _clickHandler: ((e: PointerEvent) => void) | null = null
  private canvas: HTMLCanvasElement | null = null
  private easterEggMode: EasterEggMode | null = null
  private isEasterEgg = false
  private _easterFireStart: (() => void) | null = null
  private _easterFireStop: (() => void) | null = null
  private _pendingShake = false
  // 状态推送节流（P1）：离散字段变化即推送，连续数值每 100ms 推送一次
  private _continuousTimer: number = 0
  private _lastPushedState: Record<string, unknown> = {}

  constructor(container: HTMLElement, onStateChange: (state: any) => void) {
    this.onStateChange = onStateChange
    this.events = new EventBus()

    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    container.appendChild(this.canvas)

    this.input = new InputManager()

    this.engineContext = new EngineContext(this.canvas)
    this.scene = this.engineContext.scene
    this.camera = this.engineContext.camera

    this.assetManager = new AssetManager(this.scene, this.engineContext.shadowGen)
    this.levelManager = new LevelManager(this.events)
    this.audio = new AudioManager()
    this.projectileSystem = new ProjectileSystem(this.scene)
    this.props = new Props(this.scene)
  }

  async init(): Promise<void> {
    this.officeLevel = new OfficeLevel(this.scene, this.engineContext.shadowGen, this.assetManager)
    this.hidingSpots = new HidingSpots(this.scene, this.engineContext.shadowGen, this.assetManager)

    this.player = new Player(
      this.scene,
      this.input,
      this.assetManager,
      this.engineContext.shadowGen
    )

    this.enemy = new Enemy(
      this.scene,
      this.assetManager,
      this.engineContext.shadowGen
    )

    this.collisionSystem = new CollisionSystem(
      this.player,
      this.enemy,
      this.hidingSpots,
      this.officeLevel
    )

    this.player.setCollisionSystem(this.collisionSystem)
    this.enemy.setCollisionSystem(this.collisionSystem)

    // 左键：键盘已装备则挡脸，否则踹击
    this._clickHandler = (e: PointerEvent) => {
      if (e.button === 0) {
        if (this.player.isKeyboardEquipped()) {
          this.player.activateBlock(5.0)
        } else {
          this.player.kick()
        }
      }
    }
    this.canvas!.addEventListener('pointerdown', this._clickHandler as EventListener)

  }

  start(): void {
    this.engineContext.start((dt) => this.update(dt))
  }

  stop(): void {
  }

  private update(delta: number): void {
    if (this.isGameOver) return

    this.elapsedTime += delta

    if (this._gameOverPending) {
      this._pushStateThrottled(delta)
      return
    }

    // 彩蛋模式：跳过主游戏逻辑，只更新彩蛋子系统
    if (this.isEasterEgg && this.easterEggMode) {
      this.easterEggMode.update(delta)
      this.onStateChange({
        kickCount: this.kickCount,
        health: this.health,
        maxHealth: this.maxHealth,
        isGameOver: this.isGameOver,
        isWin: this.isWin,
        score: this.score,
        inventory: this.inventory,
        potCooldown: 0,
        potActive: false,
        potRemainingTime: 0,
        enemyState: 'normal',
        isHidden: false,
        level: this.levelManager.getLevel(),
        kickTarget: this.levelManager.getKickTarget(),
        isLevelTransition: this.levelManager.getIsTransitioning(),
        equippedWeapon: null,
        isChargingThrow: false,
        attackCooldown: 0,
        comboActive: false,
        invisibleActive: false,
        isPatrolWarning: false,
        isEasterEgg: true,
        easterEggTimeRemaining: this.easterEggMode.timeRemaining,
        easterEggWeaponType: this.easterEggMode.currentWeaponType,
        easterEggWeapons: EASTER_EGG_WEAPONS.map(w => ({ type: w.type, name: w.name })),
        grenadeShake: this._pendingShake
      })
      this._pendingShake = false
      return
    }

    // 先处理投掷输入，让 player.update() 能立即渲染蓄力条
    if (this.input.isActionJustPressed('throwWeapon')) {
      if (this.player.canThrow()) {
        this.player.startThrowCharge()
      }
    }
    if (!this.input.isActionActive('throwWeapon') && this.player.isCharging()) {
      const power = this.player.releaseThrow()
      if (power > 0) {
        const weapon = this.player.getEquippedWeapon()!
        const dir = this.player.getThrowDirection()
        this.projectileSystem.spawn(this.player.getPosition(), dir, power, weapon)
        this.player.unequipWeapon()
      }
    }

    this.player.update(delta)

    const playerPos = this.player.getPosition()
    const dist = 12
    const height = 10
    this._cameraOffset.set(
      playerPos.x - dist * 0.7,
      height,
      playerPos.z + dist * 0.7
    )
    this._cameraTarget.set(playerPos.x, 0, playerPos.z)

    Vector3.LerpToRef(
      this.camera.position,
      this._cameraOffset,
      1 - Math.pow(0.001, delta),
      this.camera.position
    )
    this.camera.setTarget(this._cameraTarget)

    this.enemy.update(
      delta,
      this.player.getPosition(),
      this.player.isInvisible()
    )

    if (this.wasPatrolling && !this.enemy.isPatrolling()) {
      this.audio.play('patrol_end')
    }
    this.wasPatrolling = this.enemy.isPatrolling()

    this.patrolDamageCooldown = Math.max(0, this.patrolDamageCooldown - delta)
    this.semicircleRecoveryCooldown = Math.max(0, this.semicircleRecoveryCooldown - delta)

    if (this.semicircleDetected) {
      if (!this.collisionSystem.isPlayerInSemicircle()) {
        this.semicircleDetected = false
        this.semicircleRecoveryCooldown = 3.0
      }
    } else if (this.semicircleRecoveryCooldown <= 0) {
      if (
        !this.enemy.isStunned() &&
        !this.player.isInvisible() &&
        !this.hidingSpots.isInHidingSpot(this.player.getPosition()) &&
        this.collisionSystem.isPlayerInSemicircle()
      ) {
        this.semicircleDetected = true
        const recentlyAttacked = (this.elapsedTime - this.lastAttackTime) < 3
        if (this.player.getPotActive()) {
          this.health -= 0.5
          this.enemy.showDialogue('你以为你挡着我就看不到你？这个需求就你做了', 3)
        } else if (recentlyAttacked) {
          this.health--
          this.enemy.showDialogue('就是你小子打我，今晚留下来加班', 3)
        } else if (this.enemy.isPatrolling()) {
          this.health--
          this.enemy.showDialogue('巡逻还敢乱跑？给我站住！', 2)
        } else if (this.enemy.isLookingBack()) {
          this.health--
          this.enemy.showDialogue('果然在偷懒！被我抓到了吧', 2)
        } else if (this.enemy.isInMeeting()) {
          this.health--
          this.enemy.showDialogue('开会你都敢溜？胆子不小啊', 2)
        } else {
          this.health--
          this.enemy.showDialogue('你在瞎晃悠什么！', 2)
        }
        this.audio.play('hit')
        if (this.health <= 0) {
          this.gameOver(false)
        }
      }
    }

    if (this.collisionSystem.checkEnemyDetection()) {
      if (this.enemy.isPatrolling()) {
        if (this.patrolDamageCooldown <= 0) {
          this.patrolDamageCooldown = 1.0
          if (this.player.isInvisible()) {
            // invisible: no damage
          } else if (this.player.getPotActive()) {
            if (Math.random() < 0.5) {
              this.health -= 0.5
              this.audio.play('hit')
              if (this.health <= 0) {
                this.gameOver(false)
              }
            }
          } else {
            this.health--
            this.audio.play('hit')
            if (this.health <= 0) {
              this.gameOver(false)
            }
          }
        }
      } else if (this.enemy.isLookingBack()) {
        // 回头期间：不立即扣血，由 LookingBackState 对话结束后判定
      } else {
        if (this.player.isInvisible()) {
          // invisible: no damage
        } else if (this.player.getPotActive()) {
          if (Math.random() < 0.5) {
            this.health -= 0.5
            this.audio.play('hit')
            if (this.health <= 0) {
              this.gameOver(false)
            }
          }
        } else {
          this.health--
          this.audio.play('hit')
          if (this.health <= 0) {
            this.gameOver(false)
          }
        }
      }
    }

    if (this.enemy.isLookingBack()) {
      // 检查玩家是否在隐藏点或使用键盘盾牌
      const isHidden = this.hidingSpots.isInHidingSpot(this.player.getPosition())
      const hasPot = this.player.getPotActive()

      // 如果玩家不在隐藏点且没有使用键盘盾牌，检查距离
      if (!isHidden && !hasPot) {
        const dist = Vector3.Distance(this.player.getPosition(), this.enemy.getPosition())
        if (dist < 6) {
          this.enemy.setLookBackDetected(true)
        }
      }
    }

    if (this.enemy.consumeLookBackGameOver()) {
      this.gameOver(false)
    }

    if ((this.player.getIsKicking() || this.player.getIsSwinging()) && !this.levelManager.getIsTransitioning()) {
      const distance = Vector3.Distance(this.player.getPosition(), this.enemy.getPosition())

      if (this.enemy.isPatrolling()) {
        if (this.player.getIsSwinging() && !this.kickCounted) {
          const weapon = this.player.getEquippedWeapon()
          if (weapon && distance < weapon.swingRange) {
            this.kickCount += weapon.damage
            this.score += 10
            this.kickCounted = true
            this.audio.play('hit')
            if (weapon.stunDuration > 0) {
              // Enemy stun not implemented in simplified version
            }
            this.levelManager.onKick(this.kickCount)
            this.enemy.onAttacked(this.player.getPosition(), this.player.getPotActive())
            this.lastAttackTime = this.elapsedTime
          }
        } else if (this.player.getIsKicking() && !this.kickCounted) {
          if (distance < 2) {
            this.kickCount++
            this.score += 10
            this.kickCounted = true
            this.audio.play('kick')
            if (this.levelManager.onKick(this.kickCount)) {
              this.createVictoryParticles()
            }
            this.enemy.onAttacked(this.player.getPosition(), this.player.getPotActive())
            this.lastAttackTime = this.elapsedTime
          }
        }
      } else if (this.enemy.isInMeeting()) {
        if (this.player.getIsSwinging() && !this.kickCounted) {
          this.audio.play('blocked')
          this.player.unequipWeapon()
          this.kickCounted = true
        }
      } else if (!this.enemy.isLookingBack() && !this.kickCounted) {
        if (this.player.getIsSwinging()) {
          const weapon = this.player.getEquippedWeapon()
          if (weapon && distance < weapon.swingRange) {
            this.kickCount += weapon.damage
            this.score += 10
            this.kickCounted = true
            this.audio.play('hit')
            if (weapon.stunDuration > 0) {
              // Enemy stun not implemented in simplified version
            }
            this.levelManager.onKick(this.kickCount)
            this.enemy.onAttacked(this.player.getPosition(), this.player.getPotActive())
            this.lastAttackTime = this.elapsedTime
          }
        } else if (this.player.getIsKicking() && distance < 2) {
          this.kickCount++
          this.score += 10
          this.kickCounted = true
          this.audio.play('kick')
          if (this.levelManager.onKick(this.kickCount)) {
            this.createVictoryParticles()
          }
          this.enemy.onAttacked(this.player.getPosition(), this.player.getPotActive())
          this.lastAttackTime = this.elapsedTime
        }
      }
    }

    if (!this.player.getIsKicking() && !this.player.getIsSwinging()) {
      this.kickCounted = false
    }

    if (this.enemy.consumePlayerDetected()) {
      if (this.player.getPotActive()) {
        this.health -= 0.5
      } else {
        this.health -= 1
      }
      this.audio.play('hit')
      if (this.health <= 0) {
        this.health = 0
        this.gameOver(false)
      }
    }

    if (this.enemy.getState() === 'attacked') {
      this.enemy.setPlayerUsingKeyboard(this.player.getPotActive())
    }

    this.projectileSystem.update(delta)
    const hitProjectile = this.projectileSystem.checkHit(this.enemy.getPosition(), 1.5)
    if (hitProjectile && !this.kickCounted) {
      if (this.enemy.isInMeeting() || this.enemy.isPatrolling()) {
        this.audio.play('blocked')
      } else {
        this.kickCount += hitProjectile.weapon.damage
        this.score += 10
        this.kickCounted = true
        this.audio.play('hit')
        this.levelManager.onKick(this.kickCount)
      }
    }

    if (this.levelManager.getIsTransitioning()) {
      if (this.levelManager.update(delta)) {
        this.kickCount = 0
      }
    }

    const pickedUp = this.props.update(delta, this.player.getPosition())
    if (pickedUp) {
      const allConfigs = [...PROP_CONFIGS, ...WEAPON_CONFIGS]
      const config = allConfigs.find(c => c.type === pickedUp.type)
      const existing = this.inventory.find(item => item.type === pickedUp.type)
      if (existing) {
        existing.count++
      } else if (this.inventory.length < 6) {
        this.inventory.push({
          id: pickedUp.id,
          type: pickedUp.type,
          name: config?.name ?? pickedUp.type,
          icon: config?.icon ?? '?',
          description: config?.description ?? '',
          duration: pickedUp.duration,
          active: false,
          category: pickedUp.category,
          count: 1
        })
      }
    }

    if (this.player.isKeyboardConsumed()) {
      const kbIndex = this.inventory.findIndex(item => item.type === 'keyboard')
      if (kbIndex !== -1) {
        this.inventory.splice(kbIndex, 1)
      }
    }

    this.updateInventory(delta)

    this._pushStateThrottled(delta)
  }

  private _pushStateThrottled(delta: number): void {
    // 离散字段：变化即推送
    const discreteKickCount = this.kickCount
    const discreteHealth = this.health
    const discreteMaxHealth = this.maxHealth
    const discreteIsGameOver = this.isGameOver
    const discreteIsWin = this.isWin
    const discreteScore = this.score
    const discreteEnemyState = this.enemy.getState()
    const discreteIsHidden = this.hidingSpots.isInHidingSpot(this.player.getPosition())
    const discreteLevel = this.levelManager.getLevel()
    const discreteKickTarget = this.levelManager.getKickTarget()
    const discreteIsLevelTransition = this.levelManager.getIsTransitioning()
    const discreteEquippedWeaponType = this.player.getEquippedWeapon()?.type ?? null
    const discreteIsCharging = this.player.isCharging()
    const discreteCombo = this.player.isComboActive()
    const discreteInvisible = this.player.isInvisible()
    const discretePatrol = this.enemy.isPatrolling()
    const discreteInventoryLen = this.inventory.length

    const prev = this._lastPushedState
    const discreteChanged =
      prev['kickCount'] !== discreteKickCount ||
      prev['health'] !== discreteHealth ||
      prev['maxHealth'] !== discreteMaxHealth ||
      prev['isGameOver'] !== discreteIsGameOver ||
      prev['isWin'] !== discreteIsWin ||
      prev['score'] !== discreteScore ||
      prev['enemyState'] !== discreteEnemyState ||
      prev['isHidden'] !== discreteIsHidden ||
      prev['level'] !== discreteLevel ||
      prev['kickTarget'] !== discreteKickTarget ||
      prev['isLevelTransition'] !== discreteIsLevelTransition ||
      prev['equippedWeaponType'] !== discreteEquippedWeaponType ||
      prev['isCharging'] !== discreteIsCharging ||
      prev['combo'] !== discreteCombo ||
      prev['invisible'] !== discreteInvisible ||
      prev['patrol'] !== discretePatrol ||
      prev['inventoryLen'] !== discreteInventoryLen

    // 连续字段：100ms 节流
    this._continuousTimer += delta
    const continuousDue = this._continuousTimer >= 0.1

    if (!discreteChanged && !continuousDue) return

    if (continuousDue) this._continuousTimer = 0

    // 记录离散字段快照
    prev['kickCount'] = discreteKickCount
    prev['health'] = discreteHealth
    prev['maxHealth'] = discreteMaxHealth
    prev['isGameOver'] = discreteIsGameOver
    prev['isWin'] = discreteIsWin
    prev['score'] = discreteScore
    prev['enemyState'] = discreteEnemyState
    prev['isHidden'] = discreteIsHidden
    prev['level'] = discreteLevel
    prev['kickTarget'] = discreteKickTarget
    prev['isLevelTransition'] = discreteIsLevelTransition
    prev['equippedWeaponType'] = discreteEquippedWeaponType
    prev['isCharging'] = discreteIsCharging
    prev['combo'] = discreteCombo
    prev['invisible'] = discreteInvisible
    prev['patrol'] = discretePatrol
    prev['inventoryLen'] = discreteInventoryLen

    this.onStateChange({
      kickCount: this.kickCount,
      health: this.health,
      maxHealth: this.maxHealth,
      isGameOver: this.isGameOver,
      isWin: this.isWin,
      score: this.score,
      inventory: this.inventory,
      potCooldown: this.player.getPotCooldown(),
      potActive: this.player.getPotActive(),
      potRemainingTime: this.player.getPotRemainingTime(),
      enemyState: this.enemy.getState(),
      isHidden: this.hidingSpots.isInHidingSpot(this.player.getPosition()),
      level: this.levelManager.getLevel(),
      kickTarget: this.levelManager.getKickTarget(),
      isLevelTransition: this.levelManager.getIsTransitioning(),
      equippedWeapon: this.player.getEquippedWeapon(),
      isChargingThrow: this.player.isCharging(),
      attackCooldown: this.player.getAttackCooldown(),
      comboActive: this.player.isComboActive(),
      invisibleActive: this.player.isInvisible(),
      isPatrolWarning: this.enemy.isPatrolling(),
      isEasterEgg: false,
      easterEggTimeRemaining: 0,
      easterEggWeaponType: null
    })
  }

  private updateInventory(_delta: number): void {
    this.inventory = this.inventory.filter(item => {
      if (item.active && item.startTime) {
        const elapsed = Date.now() - item.startTime
        if (elapsed >= item.duration) {
          if (item.type === 'combo') {
            this.player.setComboActive(false)
          }
          if (item.type === 'invisible') {
            this.player.setInvisible(false)
          }
          return false
        }
      }
      if (item.count <= 0 && !item.active) {
        return false
      }
      return true
    })
  }

  useProp(index: number): void {
    if (index >= 0 && index < this.inventory.length) {
      const prop = this.inventory[index]
      if (prop.category === 'weapon') {
        const weaponConfig = WEAPON_CONFIGS.find(w => w.type === prop.type)
        if (weaponConfig) {
          this.player.unequipKeyboard()
          this.player.equipWeapon(weaponConfig)
          prop.count--
          if (prop.count <= 0) {
            this.inventory.splice(index, 1)
          }
        }
      } else if (prop.type === 'keyboard') {
        this.player.unequipWeapon()
        this.player.equipKeyboard()
        return
      } else if (!prop.active) {
        prop.active = true
        prop.startTime = Date.now()
        prop.count--
        if (prop.type === 'combo') {
          this.player.setComboActive(true)
        }
        if (prop.type === 'invisible') {
          this.player.setInvisible(true)
        }
      }
    }
  }

  private gameOver(win: boolean): void {
    if (this._gameOverPending || this.isGameOver) return
    if (win) {
      this.isGameOver = true
      this.isWin = true
    } else {
      this._gameOverPending = true
      this.isWin = false
      setTimeout(() => {
        this.isGameOver = true
        this._pushStateThrottled(0)
      }, 3000)
    }
  }

  resize(): void {
    this.engineContext.engine.resize()
  }

  dispose(): void {
    if (this._clickHandler && this.canvas) {
      this.canvas.removeEventListener('pointerdown', this._clickHandler as EventListener)
    }
    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
      this.canvas = null
    }
    this.player.dispose()
    this.enemy.dispose()
    this.hidingSpots.dispose()
    this.officeLevel.dispose()
    this.assetManager.dispose()
    this.input.dispose()
    this.events.clear()
    this.audio.dispose()
    this.projectileSystem.dispose()
    this.props.dispose()
    this.engineContext.dispose()
  }

  getKickCount(): number {
    return this.kickCount
  }

  getHealth(): number {
    return this.health
  }

  getMaxHealth(): number {
    return this.maxHealth
  }

  getScore(): number {
    return this.score
  }

  getIsGameOver(): boolean {
    return this.isGameOver
  }

  getIsWin(): boolean {
    return this.isWin
  }

  async startEasterEgg(onComplete?: () => void): Promise<void> {
    this.isEasterEgg = true
    this.isGameOver = false
    this.isWin = false
    this.health = this.maxHealth
    this.easterEggMode = new EasterEggMode()
    this.easterEggMode.init(this.scene, this.assetManager, this.enemy, this.player, this.camera, this.canvas!)
    await this.easterEggMode.start(() => {
      this.stopEasterEgg()
      onComplete?.()
    })
    this.easterEggMode.setShakeCallback(() => { this._pendingShake = true })

    // 注册射击输入
    this._easterFireStart = () => this.easterEggMode?.onFireStart()
    this._easterFireStop = () => this.easterEggMode?.onFireStop()
    this.canvas?.addEventListener('mousedown', this._easterFireStart)
    this.canvas?.addEventListener('mouseup', this._easterFireStop)
  }

  stopEasterEgg(): void {
    // 移除射击输入
    if (this._easterFireStart) {
      this.canvas?.removeEventListener('mousedown', this._easterFireStart)
      this._easterFireStart = null
    }
    if (this._easterFireStop) {
      this.canvas?.removeEventListener('mouseup', this._easterFireStop)
      this._easterFireStop = null
    }
    this.easterEggMode?.dispose()
    this.easterEggMode = null
    this.isEasterEgg = false

    // 重置敌人检测状态，避免彩蛋模式结束后立即触发游戏结束
    this.enemy.setLookBackDetected(false)
    this.enemy.consumeLookBackGameOver()

    // 恢复敌人到正常状态（传送回原位）
    this.enemy.position = new Vector3(0, 0, 0)
    this.enemy.syncPosition()

    // 重置生命值，避免残留低血量
    this.health = this.maxHealth
  }

  switchEasterEggWeapon(type: EasterEggWeaponType): void {
    this.easterEggMode?.switchWeapon(type)
  }

  advanceLevelAfterEasterEgg(): void {
    this.levelManager.advanceLevel()
    this.kickCount = 0
    this.kickCounted = false
  }

  private createVictoryParticles(): void {
    const particleSystem = new ParticleSystem('victory', 100, this.scene)
    const playerPos = this.player.getPosition()
    particleSystem.emitter = new Vector3(playerPos.x, playerPos.y + 1, playerPos.z)

    particleSystem.createBoxEmitter(
      new Vector3(-1, 2, -1),
      new Vector3(1, 4, 1),
      new Vector3(-2, 0, -2),
      new Vector3(2, 0, 2)
    )

    particleSystem.color1 = Color4.FromHexString('#FFD700FF')
    particleSystem.color2 = Color4.FromHexString('#FF6B6BFF')
    particleSystem.colorDead = Color4.FromHexString('#00000000')

    particleSystem.minSize = 0.05
    particleSystem.maxSize = 0.15
    particleSystem.minLifeTime = 0.5
    particleSystem.maxLifeTime = 1.5
    particleSystem.emitRate = 50
    particleSystem.gravity = new Vector3(0, -9.8, 0)

    particleSystem.targetStopDuration = 0.3
    particleSystem.disposeOnStop = true
    particleSystem.start()
  }

  restart(): void {
    this.kickCount = 0
    this.health = 3
    this.maxHealth = 3
    this.isGameOver = false
    this._gameOverPending = false
    this.isWin = false
    this.score = 0
    this.inventory = []
    this.kickCounted = false
    this.levelManager.reset()
    this.start()
  }

  completeLevelTransition(): void {
    this.levelManager.completeTransition()
    this.kickCount = 0
    this.kickCounted = false
  }
}
