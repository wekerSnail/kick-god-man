import * as THREE from 'three'
import { SceneManager } from './SceneManager'
import { Player } from './Player'
import { Enemy } from './Enemy'
import { Props } from './Props'
import { HidingSpots } from './HidingSpots'
import { EventBus } from './core/EventBus'
import { InputManager } from './core/InputManager'

export class GameLoop {
  private sceneManager: SceneManager
  private player: Player
  private enemy: Enemy
  private props: Props
  private hidingSpots: HidingSpots
  private clock: THREE.Clock
  private isRunning: boolean = false
  private kickCount: number = 0
  private health: number = 3
  private maxHealth: number = 3
  private isGameOver: boolean = false
  private isWin: boolean = false
  private score: number = 0
  private inventory: { id: string; type: string; name: string; icon: string; description: string; duration: number; active: boolean; startTime?: number }[] = []
  private onStateChange: (state: any) => void
  private kickCounted: boolean = false
  private level: number = 1
  private kickTarget: number = 5
  private kickTargets: number[] = [5, 10, 20, 35, 50, 70, 100]
  private isLevelTransition: boolean = false
  private levelTransitionTimer: number = 0
  private readonly LEVEL_TRANSITION_DURATION: number = 2
  private particles: THREE.Points[] = []
  private events: EventBus
  private input: InputManager
  private clickHandler: () => void

  constructor(container: HTMLElement, onStateChange: (state: any) => void) {
    this.onStateChange = onStateChange
    this.events = new EventBus()
    this.input = new InputManager()
    this.sceneManager = new SceneManager(container)
    this.player = new Player(this.sceneManager.getScene(), this.input)
    this.enemy = new Enemy(this.sceneManager.getScene())
    this.props = new Props(this.sceneManager.getScene())
    this.hidingSpots = new HidingSpots(this.sceneManager.getScene())
    this.clock = new THREE.Clock()

    this.clickHandler = () => this.player.kick()
    document.addEventListener('click', this.clickHandler)

    this.sceneManager.getCamera().position.set(0, 10, 15)
    this.sceneManager.getCamera().lookAt(0, 0, 0)
  }

  start() {
    this.isRunning = true
    this.clock.start()
    this.animate()
  }

  stop() {
    this.isRunning = false
  }

  private animate() {
    if (!this.isRunning) return

    requestAnimationFrame(() => this.animate())

    const delta = this.clock.getDelta()

    this.update(delta)
    this.render()
  }

  private update(delta: number) {
    if (this.isGameOver) return

    this.player.update(delta)

    const cameraPos = this.player.getCameraPosition()
    const cameraTarget = this.player.getCameraTarget()
    this.sceneManager.getCamera().position.lerp(cameraPos, 0.15)
    this.sceneManager.getCamera().lookAt(cameraTarget)

    this.enemy.update(
      delta,
      this.player.getPosition(),
      this.player.getIsKicking(),
      this.player.getPotActive()
    )

    const pickedProp = this.props.update(delta, this.player.getPosition())
    if (pickedProp && this.inventory.length < 3) {
      this.addProp(pickedProp)
    }

    if (this.enemy.isActuallyLooking()) {
      const isHidden = this.hidingSpots.isInHidingSpot(this.player.getPosition())
      const hasInvisible = this.inventory.some(p => p.type === 'invisible' && p.active)
      const hasPot = this.player.getPotActive()

      if (!isHidden && !hasInvisible && !hasPot) {
        this.health--
        if (this.health <= 0) {
          this.gameOver(false)
        }
      }
    }

    if (this.player.getIsKicking() && !this.enemy.isLookingBack() && !this.isLevelTransition) {
      const distance = this.player.getPosition().distanceTo(this.enemy.getPosition())
      if (distance < 2 && !this.kickCounted) {
        this.kickCount++
        this.score += 10
        this.kickCounted = true

        if (this.kickCount >= this.kickTarget) {
          if (this.level >= this.kickTargets.length) {
            this.createVictoryParticles()
            this.gameOver(true)
          } else {
            this.isLevelTransition = true
            this.levelTransitionTimer = this.LEVEL_TRANSITION_DURATION
            this.createVictoryParticles()
          }
        }
      }
    }

    if (!this.player.getIsKicking()) {
      this.kickCounted = false
    }

    if (this.isLevelTransition) {
      this.levelTransitionTimer -= delta
      this.updateParticles(delta)
      if (this.levelTransitionTimer <= 0) {
        this.isLevelTransition = false
        this.level++
        this.kickTarget = this.kickTargets[this.level - 1]
        this.kickCount = 0
        this.clearParticles()
      }
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
      level: this.level,
      kickTarget: this.kickTarget,
      isLevelTransition: this.isLevelTransition,
      levelTransitionTimer: this.levelTransitionTimer
    })
  }

  private addProp(prop: any) {
    const config = {
      id: prop.id,
      type: prop.type,
      name: this.getPropName(prop.type),
      icon: this.getPropIcon(prop.type),
      description: this.getPropDescription(prop.type),
      duration: prop.duration,
      active: false
    }
    this.inventory.push(config)
  }

  private getPropName(type: string): string {
    const names: { [key: string]: string } = {
      speed: '加速鞋',
      invisible: '隐身药水',
      noise: '噪音器',
      power: '力量手套'
    }
    return names[type] || '未知道具'
  }

  private getPropIcon(type: string): string {
    const icons: { [key: string]: string } = {
      speed: '👟',
      invisible: '🧪',
      noise: '📢',
      power: '🧤'
    }
    return icons[type] || '❓'
  }

  private getPropDescription(type: string): string {
    const descriptions: { [key: string]: string } = {
      speed: '移动速度x2',
      invisible: '不被发现',
      noise: '吸引神人注意力',
      power: '踹击计数+2'
    }
    return descriptions[type] || '未知效果'
  }

  private updateInventory(_delta: number) {
    this.inventory = this.inventory.filter(item => {
      if (item.active && item.startTime) {
        const elapsed = Date.now() - item.startTime
        if (elapsed >= item.duration) {
          return false
        }
      }
      return true
    })
  }

  useProp(index: number) {
    if (index >= 0 && index < this.inventory.length) {
      const prop = this.inventory[index]
      if (!prop.active) {
        prop.active = true
        prop.startTime = Date.now()
      }
    }
  }

  private gameOver(win: boolean) {
    this.isGameOver = true
    this.isWin = win
    this.isRunning = false
  }

  private render() {
    this.sceneManager.update()
  }

  resize() {
    this.sceneManager.resize()
  }

  dispose() {
    this.isRunning = false
    document.removeEventListener('click', this.clickHandler)
    this.player.dispose()
    this.enemy.dispose()
    this.sceneManager.dispose()
    this.props.dispose()
    this.hidingSpots.dispose()
    this.input.dispose()
    this.events.clear()
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

  private createVictoryParticles() {
    const scene = this.sceneManager.getScene()
    const particleCount = 100
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const velocities: number[] = []

    const colorOptions = [
      new THREE.Color(0xffd700),
      new THREE.Color(0xff6b6b),
      new THREE.Color(0x4caf50),
      new THREE.Color(0x2196f3),
      new THREE.Color(0x9c27b0)
    ]

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4
      positions[i * 3 + 1] = Math.random() * 2 + 1
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4

      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      velocities.push(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8
      )
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1
    })

    const particles = new THREE.Points(geometry, material)
    particles.userData.velocities = velocities
    particles.userData.life = 0
    scene.add(particles)
    this.particles.push(particles)
  }

  private updateParticles(delta: number) {
    this.particles.forEach(particles => {
      const positions = particles.geometry.attributes.position.array as Float32Array
      const velocities = particles.userData.velocities as number[]
      particles.userData.life += delta

      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3] += velocities[i * 3] * delta
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta

        velocities[i * 3 + 1] -= 9.8 * delta
      }

      particles.geometry.attributes.position.needsUpdate = true
      ;(particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - particles.userData.life / 2)
    })
  }

  private clearParticles() {
    const scene = this.sceneManager.getScene()
    this.particles.forEach(particles => {
      scene.remove(particles)
      particles.geometry.dispose()
      ;(particles.material as THREE.PointsMaterial).dispose()
    })
    this.particles = []
  }

  restart() {
    this.kickCount = 0
    this.health = 3
    this.maxHealth = 3
    this.isGameOver = false
    this.isWin = false
    this.score = 0
    this.inventory = []
    this.level = 1
    this.kickTarget = this.kickTargets[0]
    this.kickCounted = false
    this.isRunning = true
    this.clock.start()
    this.animate()
  }
}
