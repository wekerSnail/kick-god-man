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

const characterModelUrl = `${import.meta.env.BASE_URL}models/characters/boss.glb`

export class Enemy {
  private mesh: TransformNode
  private characterGroup: TransformNode
  private modelRoot: TransformNode | null = null
  position: Vector3
  private originalPosition: Vector3
  private scene: Scene
  private animationGroups: AnimationGroup[] = []
  private isWalking: boolean = false
  private currentAnimName: string = ''

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

  constructor(
    scene: Scene,
    assetManager: AssetManager,
    _shadowGen: ShadowGenerator
  ) {
    this.scene = scene
    this.position = new Vector3(0, 0, -8.8)
    this.originalPosition = this.position.clone()
    this.mesh = new TransformNode('enemy', this.scene)
    this.characterGroup = new TransformNode('character', this.scene)
    this.characterGroup.parent = this.mesh

    this.stateMachine = new StateMachine<Enemy>(this)
    this.stateMachine.start(new NormalState())

    this.loadModel(assetManager)
    this.setupPatrolWaypoints()
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

    this.mesh.position = this.position.clone()
    this.mesh.rotation.y = Math.PI
  }

  private setupPatrolWaypoints(): void {
    this.patrolWaypoints = [
      new Vector3(0, 0, -10),
      new Vector3(-5, 0, -10),
      new Vector3(-5, 0, -5),
      new Vector3(5, 0, -5),
      new Vector3(5, 0, -10),
      new Vector3(0, 0, -10)
    ]
  }

  update(delta: number, _playerPosition: Vector3, _playerIsInvisible: boolean): void {
    this.stateMachine.update(delta)
    this.updateWalkAnimation(delta)
  }

  playAnimation(name: string, loop: boolean = true): void {
    if (this.currentAnimName === name) return
    this.currentAnimName = name
    this.animationGroups.forEach(ag => ag.stop())
    const anim = this.animationGroups.find(ag =>
      ag.name.toLowerCase().includes(name.toLowerCase())
    )
    if (anim) {
      anim.loopAnimation = loop
      anim.start()
    }
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
      this.dialogueDynamicTexture = new DynamicTexture('dialogueTex', { width: 512, height: 128 }, this.scene, false)
      this.dialogueSpriteManager = new SpriteManager('dialogueMgr', '', 1, { width: 512, height: 128 }, this.scene)
      this.dialogueSpriteManager.texture = this.dialogueDynamicTexture
    }

    if (!this.dialogueSprite) {
      this.dialogueSprite = new Sprite('dialogue', this.dialogueSpriteManager)
      this.dialogueSprite.width = 4
      this.dialogueSprite.height = 1
      this.dialogueSprite.invertV = true
    }

    const ctx = this.dialogueDynamicTexture!.getContext() as any
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 512, 128)

    ctx.fillStyle = '#333333'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = this.wrapText(text, 12)
    const lineHeight = 40
    const startY = 64 - (lines.length - 1) * lineHeight / 2
    lines.forEach((line, i) => {
      ctx.fillText(line, 256, startY + i * lineHeight)
    })

    this.dialogueDynamicTexture!.update()

    this.dialogueSprite.position = new Vector3(this.position.x, this.position.y + 3.4, this.position.z)
    this.dialogueSprite.isVisible = true

    setTimeout(() => {
      if (this.dialogueSprite) {
        this.dialogueSprite.isVisible = false
      }
    }, duration * 1000)
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
      this.phoneLight.diffuse = Color3.FromHexString('#ffffff')
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

  startPatrolWalk(): void {
    this.currentWaypointIndex = 1
  }

  moveAlongPatrol(dt: number, speed: number): boolean {
    if (this.currentWaypointIndex >= this.patrolWaypoints.length) {
      this.isWalking = false
      return true
    }

    const target = this.patrolWaypoints[this.currentWaypointIndex]
    const direction = target.subtract(this.position)
    const distance = direction.length()

    if (distance < 0.5) {
      this.currentWaypointIndex++
      if (this.currentWaypointIndex >= this.patrolWaypoints.length) {
        this.isWalking = false
        return true
      }
      return false
    }

    this.isWalking = true
    direction.normalize()
    this.position.addInPlace(direction.scaleInPlace(speed * dt))
    this.mesh.position = this.position.clone()

    const targetRotation = Math.atan2(direction.x, direction.z)
    const currentRotation = this.mesh.rotation.y
    const rotationDiff = targetRotation - currentRotation
    const normalizedDiff = Math.atan2(Math.sin(rotationDiff), Math.cos(rotationDiff))
    this.mesh.rotation.y += normalizedDiff * 10 * dt

    return false
  }

  returnToStart(dt: number, speed: number): boolean {
    const direction = this.originalPosition.subtract(this.position)
    const distance = direction.length()

    if (distance < 0.5) {
      this.position = this.originalPosition.clone()
      this.mesh.position = this.position.clone()
      this.isWalking = false
      return true
    }

    this.isWalking = true
    direction.normalize()
    this.position.addInPlace(direction.scaleInPlace(speed * dt))
    this.mesh.position = this.position.clone()

    const targetRotation = Math.atan2(direction.x, direction.z)
    const currentRotation = this.mesh.rotation.y
    const rotationDiff = targetRotation - currentRotation
    const normalizedDiff = Math.atan2(Math.sin(rotationDiff), Math.cos(rotationDiff))
    this.mesh.rotation.y += normalizedDiff * 10 * dt

    return false
  }

  updateWalkAnimation(_delta: number): void {
    if (!this.modelRoot) return

    if (this.isWalking) {
      this.playAnimation('Walk')
    } else {
      this.playAnimation('Idle')
    }
  }

  checkPatrolDetection(_range: number, _halfAngle: number): boolean {
    return false
  }

  reportPatrolDamage(): void {
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

  getHeadPosition(): Vector3 {
    return new Vector3(this.position.x, this.position.y + 2, this.position.z)
  }

  setRotationY(angle: number): void {
    this.mesh.rotation.y = angle
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
