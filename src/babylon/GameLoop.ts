import {
  Scene,
  Vector3,
  Color4,
  ParticleSystem,
  MeshBuilder,
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
import { WEAPON_CONFIGS } from '../types/game'

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
  private wasPatrolling: boolean = false
  private _clickHandler: (() => void) | null = null
  private canvas: HTMLCanvasElement | null = null

  constructor(container: HTMLElement, onStateChange: (state: any) => void) {
    this.onStateChange = onStateChange
    this.events = new EventBus()
    this.input = new InputManager()

    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    container.appendChild(this.canvas)

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
      this.hidingSpots
    )

    this._clickHandler = () => this.player.kick()
    setTimeout(() => {
      document.addEventListener('click', this._clickHandler!)
    }, 100)

    this.inventory.push({
      id: 'starter-mace',
      type: 'mace',
      name: '狼牙棒',
      icon: '鎚',
      description: '击中算5次，造成眩晕3秒',
      duration: 0,
      active: false,
      category: 'weapon',
      count: 1
    })

  }

  start(): void {
    this.engineContext.start((dt) => this.update(dt))
  }

  stop(): void {
  }

  private update(delta: number): void {
    if (this.isGameOver) return

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
    const cameraOffset = new Vector3(
      playerPos.x - dist * 0.7,
      height,
      playerPos.z + dist * 0.7
    )
    const cameraTarget = new Vector3(playerPos.x, 0, playerPos.z)

    this.camera.position = Vector3.Lerp(
      this.camera.position,
      cameraOffset,
      1 - Math.pow(0.001, delta)
    )
    this.camera.setTarget(cameraTarget)

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
      const dist = Vector3.Distance(this.player.getPosition(), this.enemy.getPosition())
      if (dist < 6) {
        this.enemy.setLookBackDetected(true)
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
      const allConfigs = [...WEAPON_CONFIGS]
      const config = allConfigs.find(c => c.type === pickedUp.type)
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

    this.updateInventory(delta)

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
      isPatrolWarning: this.enemy.isPatrolling()
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
          this.player.equipWeapon(weaponConfig)
          prop.count--
          if (prop.count <= 0) {
            this.inventory.splice(index, 1)
          }
        }
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
    this.isGameOver = true
    this.isWin = win
  }

  resize(): void {
    this.engineContext.engine.resize()
  }

  dispose(): void {
    if (this._clickHandler) {
      document.removeEventListener('click', this._clickHandler)
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

  private createVictoryParticles(): void {
    const particleSystem = new ParticleSystem('victory', 100, this.scene)
    const emitter = MeshBuilder.CreateBox('emitter', { size: 0.1 }, this.scene)
    emitter.position = this.player.getPosition().clone()
    emitter.position.y += 1
    emitter.isVisible = false
    particleSystem.emitter = emitter

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
