import {
  Scene,
  TransformNode,
  Vector3,
  Color3,
  AnimationGroup,
  ShadowGenerator,
  PointLight,
  Sprite,
  SpriteManager,
  DynamicTexture
} from '@babylonjs/core'
import type { AssetManager } from '../core/AssetManager'
import { StateMachine } from '../core/StateMachine'
import { NormalState, AttackedState } from '../state/EnemyStates'
import type { CollisionSystem } from '../systems/CollisionSystem'

const characterModelUrl = new URL('/models/characters/boss.glb', import.meta.url).href

export class Enemy {
  private static readonly _WHITE = Color3.FromHexString('#ffffff')
  private static readonly _tmpDir = new Vector3()
  private static readonly _tmpMove = new Vector3()
  private static readonly _tmpReturnDir = new Vector3()

  private mesh: TransformNode
  private characterGroup: TransformNode
  private modelRoot: TransformNode | null = null
  position: Vector3
  private originalPosition: Vector3
  private scene: Scene
  private animationGroups: AnimationGroup[] = []
  private isWalking: boolean = false
  private currentAnimName: string = ''
  private walkAnimGroup: AnimationGroup | null = null
  private idleAnimGroup: AnimationGroup | null = null
  private collisionSystem: CollisionSystem | null = null

  private stateMachine: StateMachine<Enemy>
  private _nextLookBackTime: number = 8
  private _nextMeetingTime: number = 15
  private _nextPatrolTime: number = 25

  private phoneLight: PointLight | null = null
  private stunIndicator: TransformNode | null = null
  private meetingIndicator: TransformNode | null = null
  private patrolWarningSprite: Sprite | null = null
  private patrolTextSprite: Sprite | null = null
  private patrolWaypoints: Vector3[] = []
  private currentWaypointIndex: number = 0
  private _lastPatrolPos = new Vector3()
  private _stuckCheckTimer: number = 0
  private _stuckDuration: number = 0
  private _stuckSide: number = 1

  private exclSpriteManager: SpriteManager | null = null
  private exclSprite: Sprite | null = null
  private dialogueSpriteManager: SpriteManager | null = null
  private dialogueSprite: Sprite | null = null
  private dialogueDynamicTexture: DynamicTexture | null = null
  private _playerDetectedDuringAttack: boolean = false
  private _playerUsingKeyboardDuringAttack: boolean = false
  private _playerDetectedInLookBack: boolean = false
  private _lookBackGameOverPending: boolean = false
  private meetingSwayTime: number = 0
  // 对话定时器（P4.3 替代 setTimeout）
  private _dialogueTimer: number = 0

  constructor(
    scene: Scene,
    assetManager: AssetManager,
    _shadowGen: ShadowGenerator
  ) {
    this.scene = scene
    this.position = new Vector3(0, 0, -5.8)
    this.originalPosition = this.position.clone()
    this.mesh = new TransformNode('enemy', this.scene)
    this.characterGroup = new TransformNode('character', this.scene)
    this.characterGroup.parent = this.mesh

    this.stateMachine = new StateMachine<Enemy>(this)
    this.stateMachine.start(new NormalState())

    this.loadModel(assetManager)
    this.setupPatrolWaypoints()
  }

  setCollisionSystem(cs: CollisionSystem): void {
    this.collisionSystem = cs
  }

  private async loadModel(assetManager: AssetManager): Promise<void> {
    const result = await assetManager.loadCharacter(
      'enemy',
      characterModelUrl
    )

    const root = result.root
    root.parent = this.characterGroup
    this.modelRoot = root
    this.animationGroups = result.animationGroups

    root.rotation.x = -Math.PI / 2

    const childMeshes = root.getChildMeshes()
    if (childMeshes.length > 0) {
      let minY = Infinity
      let maxY = -Infinity
      childMeshes.forEach(m => {
        m.computeWorldMatrix(true)
        const bi = m.getBoundingInfo()
        minY = Math.min(minY, bi.boundingBox.minimumWorld.y)
        maxY = Math.max(maxY, bi.boundingBox.maximumWorld.y)
      })
      const height = Math.max(0.001, maxY - minY)
      const scale = 1.8 / height
      root.scaling = new Vector3(scale, scale, scale)
    }

    this.mesh.position.copyFrom(this.position)
    this.mesh.rotation.y = Math.PI

    this.walkAnimGroup = this.animationGroups.find(ag =>
      ag.name.toLowerCase().includes('walk')
    ) ?? null
    this.idleAnimGroup = this.animationGroups.find(ag =>
      ag.name.toLowerCase().includes('idle')
    ) ?? null
  }

  private setupPatrolWaypoints(): void {
    // 基础路径点：办公室内的关键位置（房间大小20，从-10到10）
    const possibleWaypoints = [
      new Vector3(-7, 0, -8),   // 左下方
      new Vector3(-7, 0, -4),   // 左侧中间
      new Vector3(-7, 0, 0),    // 左上方
      new Vector3(-3, 0, 0),    // 上方偏左
      new Vector3(0, 0, 0),     // 上方中间
      new Vector3(3, 0, 0),     // 上方偏右
      new Vector3(7, 0, 0),     // 右上方
      new Vector3(7, 0, -4),    // 右侧中间
      new Vector3(7, 0, -8),    // 右下方
      new Vector3(3, 0, -8),    // 下方偏右
      new Vector3(0, 0, -8),    // 下方中间
      new Vector3(-3, 0, -8),   // 下方偏左
    ]

    // 随机选择3-8个路径点
    const numPoints = 3 + Math.floor(Math.random() * 6)
    const shuffled = [...possibleWaypoints].sort(() => Math.random() - 0.5)
    this.patrolWaypoints = shuffled.slice(0, numPoints)

    // 确保路径点之间有足够的距离（至少3单位）
    this.patrolWaypoints = this.patrolWaypoints.filter((point, index) => {
      if (index === 0) return true
      const prev = this.patrolWaypoints[index - 1]
      const dist = Vector3.Distance(prev, point)
      return dist > 3
    })

    // 如果过滤后路径点太少，使用默认路径
    if (this.patrolWaypoints.length < 2) {
      this.patrolWaypoints = [
        new Vector3(0, 0, -8),
        new Vector3(-6, 0, -8),
        new Vector3(-6, 0, -2),
        new Vector3(6, 0, -2),
        new Vector3(6, 0, -8),
      ]
    }
  }

  update(delta: number, _playerPosition: Vector3, _playerIsInvisible: boolean): void {
    this.stateMachine.update(delta)
    this.updateWalkAnimation(delta)

    // 对话计时器（P4.3 替代 setTimeout）
    if (this._dialogueTimer > 0) {
      this._dialogueTimer -= delta
      if (this._dialogueTimer <= 0) {
        this._dialogueTimer = 0
        if (this.dialogueSprite) this.dialogueSprite.isVisible = false
      }
    }
  }

  playAnimation(name: string, loop: boolean = true): boolean {
    let targetAnim: AnimationGroup | null = null
    if (name === 'Walk') {
      targetAnim = this.walkAnimGroup
    } else if (name === 'Idle') {
      targetAnim = this.idleAnimGroup
    } else {
      targetAnim = this.animationGroups.find(ag =>
        ag.name.toLowerCase().includes(name.toLowerCase())
      ) ?? null
    }

    if (!targetAnim) {
      this.currentAnimName = ''
      return false
    }

    if (this.currentAnimName === name && targetAnim.isPlaying) return true

    this.animationGroups.forEach(ag => {
      if (ag.isPlaying) ag.stop()
    })
    this.currentAnimName = name
    targetAnim.loopAnimation = loop
    targetAnim.reset()
    targetAnim.start()
    return true
  }

  resetWalking(): void {
    this.isWalking = false
  }

  showExclamation(show: boolean): void {
    if (show) {
      if (!this.exclSpriteManager) {
        const tex = new DynamicTexture('exclTex', { width: 128, height: 128 }, this.scene, false)
        const ctx = tex.getContext() as any
        ctx.fillStyle = '#FF0000'
        ctx.font = 'bold 100px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('!', 64, 64)
        tex.update()

        this.exclSpriteManager = new SpriteManager('exclMgr', '', 1, 128, this.scene)
        this.exclSpriteManager.texture = tex
      }
      if (!this.exclSprite) {
        this.exclSprite = new Sprite('excl', this.exclSpriteManager)
        this.exclSprite.width = 0.8
        this.exclSprite.height = 0.8
        this.exclSprite.invertV = true
      }
      this.exclSprite.position = new Vector3(this.position.x, this.position.y + 2.8, this.position.z)
      this.exclSprite.isVisible = true
    } else {
      if (this.exclSprite) {
        this.exclSprite.isVisible = false
      }
    }
  }

  showDialogue(text: string, duration: number = 3): void {
    if (!this.dialogueSpriteManager) {
      this.dialogueDynamicTexture = new DynamicTexture('dialogueTex', { width: 512, height: 192 }, this.scene, false)
      this.dialogueSpriteManager = new SpriteManager('dialogueMgr', '', 1, { width: 512, height: 192 }, this.scene)
      this.dialogueSpriteManager.texture = this.dialogueDynamicTexture
    }

    if (!this.dialogueSprite) {
      this.dialogueSprite = new Sprite('dialogue', this.dialogueSpriteManager)
      this.dialogueSprite.width = 5
      this.dialogueSprite.height = 1.5
      this.dialogueSprite.invertV = true
    }

    const ctx = this.dialogueDynamicTexture!.getContext() as any
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 512, 192)

    ctx.fillStyle = '#333333'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = this.wrapText(text, 10)
    const lineHeight = 60
    const startY = 96 - (lines.length - 1) * lineHeight / 2
    lines.forEach((line, i) => {
      ctx.fillText(line, 256, startY + i * lineHeight)
    })

    this.dialogueDynamicTexture!.update()

    this.dialogueSprite.position = new Vector3(this.position.x, this.position.y + 3.8, this.position.z)
    this.dialogueSprite.isVisible = true
    this._dialogueTimer = duration
  }

  private wrapText(text: string, maxChars: number): string[] {
    const lines: string[] = []
    let current = ''
    for (const char of text) {
      current += char
      if (current.length >= maxChars) {
        lines.push(current)
        current = ''
      }
    }
    if (current) lines.push(current)
    return lines
  }

  scheduleNextLookBack(): void {
    this._nextLookBackTime = 6 + Math.random() * 8
  }

  showPhone(show: boolean): void {
    if (show) {
      if (!this.phoneLight) {
        this.phoneLight = new PointLight('phoneLight', new Vector3(0.3, 1.5, 0.3), this.scene)
        this.phoneLight.parent = this.mesh
        this.phoneLight.intensity = 0
        this.phoneLight.range = 3
      }
    } else {
      if (this.phoneLight) {
        this.phoneLight.intensity = 0
      }
    }
  }

  updatePhoneFlash(timer: number): void {
    if (this.phoneLight) {
      this.phoneLight.intensity = Math.sin(timer * 10) > 0 ? 2 : 0
      this.phoneLight.diffuse = Enemy._WHITE
    }
  }

  checkPlayerDetection(): boolean {
    return this._playerDetectedInLookBack
  }

  reportPlayerDetected(): void {
    this._lookBackGameOverPending = true
  }

  setLookBackDetected(detected: boolean): void {
    this._playerDetectedInLookBack = detected
  }

  consumeLookBackGameOver(): boolean {
    const result = this._lookBackGameOverPending
    this._lookBackGameOverPending = false
    return result
  }

  showStunIndicator(show: boolean): void {
    if (show && !this.stunIndicator) {
      this.stunIndicator = new TransformNode('stunIndicator', this.scene)
      this.stunIndicator.parent = this.mesh
      this.stunIndicator.position.y = 2.5
    }
    if (this.stunIndicator) {
      this.stunIndicator.setEnabled(show)
    }
  }

  updateStunEffect(timer: number): void {
    if (this.stunIndicator) {
      this.stunIndicator.rotation.y += 0.1
      this.stunIndicator.position.y = 2.5 + Math.sin(timer * 3) * 0.1
    }
  }

  showMeetingIndicator(show: boolean): void {
    if (show && !this.meetingIndicator) {
      this.meetingIndicator = new TransformNode('meetingIndicator', this.scene)
      this.meetingIndicator.parent = this.mesh
      this.meetingIndicator.position.y = 2.5
    }
    if (this.meetingIndicator) {
      this.meetingIndicator.setEnabled(show)
    }
  }

  updateMeetingSway(dt: number): void {
    this.meetingSwayTime += dt
    this.mesh.rotation.x = Math.sin(this.meetingSwayTime * 3) * 0.03
    this.mesh.rotation.z = Math.cos(this.meetingSwayTime * 2.5) * 0.02
    if (this.meetingIndicator) {
      this.meetingIndicator.rotation.y += dt * 2
    }
  }

  resetMeetingSway(): void {
    this.meetingSwayTime = 0
    this.mesh.rotation.x = 0
    this.mesh.rotation.z = 0
  }

  showPatrolWarning(show: boolean): void {
    if (this.patrolWarningSprite) {
      this.patrolWarningSprite.isVisible = show
    }
  }

  showPatrolText(show: boolean): void {
    if (this.patrolTextSprite) {
      this.patrolTextSprite.isVisible = show
    }
  }

  regeneratePatrolWaypoints(): void {
    this.setupPatrolWaypoints()
  }

  startPatrolWalk(): void {
    this.regeneratePatrolWaypoints()
    this.currentWaypointIndex = 1
    this._lastPatrolPos.copyFrom(this.position)
    this._stuckCheckTimer = 0
    this._stuckDuration = 0
    this._stuckSide = Math.random() < 0.5 ? 1 : -1
  }

  moveAlongPatrol(dt: number, speed: number): boolean {
    if (this.currentWaypointIndex >= this.patrolWaypoints.length) {
      this.isWalking = false
      return true
    }

    const target = this.patrolWaypoints[this.currentWaypointIndex]
    target.subtractToRef(this.position, Enemy._tmpDir)
    const distance = Enemy._tmpDir.length()

    if (distance < 0.5) {
      this.currentWaypointIndex++
      if (this.currentWaypointIndex >= this.patrolWaypoints.length) {
        this.isWalking = false
        return true
      }
      this.isWalking = true
      return false
    }

    // 朝向路径点移动
    this.isWalking = true
    const moveDir = Enemy._tmpMove
    Enemy._tmpDir.normalizeToRef(moveDir)

    // 卡住检测：每0.5秒检查一次累积位移，如果位移太小说明被卡住
    this._stuckCheckTimer += dt
    if (this._stuckCheckTimer >= 0.5) {
      const distMoved = Vector3.Distance(this.position, this._lastPatrolPos)
      if (distMoved < 0.3) {
        this._stuckDuration += 0.5
      } else {
        this._stuckDuration = 0
      }
      this._lastPatrolPos.copyFrom(this.position)
      this._stuckCheckTimer = 0
    }

    // 被卡住时用垂直方向绕行（选定一个方向不切换）
    if (this._stuckDuration > 0) {
      if (this._stuckDuration > 3) {
        // 卡住超过3秒，跳过当前路径点
        this._stuckDuration = 0
        this.currentWaypointIndex++
        if (this.currentWaypointIndex >= this.patrolWaypoints.length) {
          this.isWalking = false
          return true
        }
        return false
      }
      const perpX = -moveDir.z
      const perpZ = moveDir.x
      moveDir.set(perpX * this._stuckSide, 0, perpZ * this._stuckSide).normalize()
    }

    const newX = this.position.x + moveDir.x * speed * dt
    const newZ = this.position.z + moveDir.z * speed * dt
    const clampedX = Math.max(-9, Math.min(9, newX))
    const clampedZ = Math.max(-9, Math.min(9, newZ))

    if (this.collisionSystem) {
      const result = this.collisionSystem.slideMove(this.position.x, this.position.z, clampedX, clampedZ, 0.4)
      this.position.x = result.x
      this.position.z = result.z
    } else {
      this.position.x = clampedX
      this.position.z = clampedZ
    }

    this.mesh.position.copyFrom(this.position)
    this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z)

    return false
  }

  returnToStart(dt: number, speed: number): boolean {
    this.originalPosition.subtractToRef(this.position, Enemy._tmpReturnDir)
    const distance = Enemy._tmpReturnDir.length()

    if (distance < 0.5) {
      this.position.copyFrom(this.originalPosition)
      this.mesh.position.copyFrom(this.position)
      this.isWalking = false
      // 重置旋转到初始朝向（面向桌子）
      this.mesh.rotation.y = Math.PI
      return true
    }

    this.isWalking = true
    Enemy._tmpReturnDir.normalize()
    const newX = this.position.x + Enemy._tmpReturnDir.x * speed * dt
    const newZ = this.position.z + Enemy._tmpReturnDir.z * speed * dt

    if (this.collisionSystem) {
      const result = this.collisionSystem.slideMove(this.position.x, this.position.z, newX, newZ, 0.4)
      this.position.x = result.x
      this.position.z = result.z
    } else {
      this.position.x = newX
      this.position.z = newZ
    }
    this.mesh.position.copyFrom(this.position)

    const targetRotation = Math.atan2(Enemy._tmpReturnDir.x, Enemy._tmpReturnDir.z)
    const currentRotation = this.mesh.rotation.y
    const rotationDiff = targetRotation - currentRotation
    const normalizedDiff = Math.atan2(Math.sin(rotationDiff), Math.cos(rotationDiff))
    this.mesh.rotation.y += normalizedDiff * 10 * dt

    return false
  }

  updateWalkAnimation(_delta: number): void {
    if (!this.modelRoot) return

    if (this.isWalking) {
      // 尝试播放走路动画，如果找不到则播放默认动画
      if (!this.playAnimation('Walk')) {
        this.playAnimation('Run')  // 备选：跑步动画
      }
    } else {
      this.playAnimation('Idle')
    }
  }

  checkPatrolDetection(_range: number, _halfAngle: number): boolean {
    // 实际的检测逻辑在 CollisionSystem.checkPatrolVision() 中实现
    // 这个方法保留接口兼容性，但检测逻辑已移至 CollisionSystem
    return false
  }

  reportPatrolDamage(): void {
    // 实际的伤害逻辑在 GameLoop 中通过 CollisionSystem.checkEnemyDetection() 实现
  }

  onAttacked(playerPosition: Vector3, playerIsUsingKeyboard: boolean): void {
    this._playerDetectedDuringAttack = false
    this._playerUsingKeyboardDuringAttack = playerIsUsingKeyboard
    this.stateMachine.forceState(new AttackedState(), playerPosition)
  }

  setPlayerDetected(detected: boolean): void {
    this._playerDetectedDuringAttack = detected
  }

  setPlayerUsingKeyboard(using: boolean): void {
    this._playerUsingKeyboardDuringAttack = using
  }

  isPlayerUsingKeyboard(): boolean {
    return this._playerUsingKeyboardDuringAttack
  }

  consumePlayerDetected(): boolean {
    const result = this._playerDetectedDuringAttack
    this._playerDetectedDuringAttack = false
    return result
  }

  get nextLookBackTime(): number {
    return this._nextLookBackTime
  }

  set nextLookBackTime(value: number) {
    this._nextLookBackTime = value
  }

  get nextMeetingTime(): number {
    return this._nextMeetingTime
  }

  set nextMeetingTime(value: number) {
    this._nextMeetingTime = value
  }

  get nextPatrolTime(): number {
    return this._nextPatrolTime
  }

  set nextPatrolTime(value: number) {
    this._nextPatrolTime = value
  }

  getState(): string {
    return this.stateMachine.stateName
  }

  isLookingBack(): boolean {
    return this.stateMachine.stateName === 'looking_back'
  }

  isStunned(): boolean {
    return this.stateMachine.stateName === 'stunned'
  }

  isInMeeting(): boolean {
    return this.stateMachine.stateName === 'meeting'
  }

  isPatrolling(): boolean {
    return this.stateMachine.stateName === 'patrolling'
  }

  getPosition(): Vector3 {
    return this.position
  }

  setRotationY(angle: number): void {
    this.mesh.rotation.y = angle
  }

  /**
   * 同步 position 到 mesh（用于外部直接修改 position 后调用）
   */
  syncPosition(): void {
    this.mesh.position.copyFrom(this.position)
  }

  /**
   * 隐藏/显示敌人模型
   */
  setVisible(visible: boolean): void {
    this.mesh.setEnabled(visible)
  }

  getRotationY(): number {
    return this.mesh.rotation.y
  }

  rotateTowards(targetAngle: number, speed: number, dt: number): void {
    const current = this.mesh.rotation.y
    const diff = targetAngle - current
    const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff))
    this.mesh.rotation.y += normalizedDiff * speed * dt
  }

  dispose(): void {
    this.mesh.dispose()
  }
}
