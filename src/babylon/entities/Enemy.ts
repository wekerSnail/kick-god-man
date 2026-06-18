import {
  Scene,
  TransformNode,
  Vector3,
  Color3,
  AnimationGroup,
  ShadowGenerator,
  PointLight,
  Sprite
} from '@babylonjs/core'
import type { AssetManager } from '../core/AssetManager'
import { StateMachine } from '../core/StateMachine'
import { NormalState } from '../state/EnemyStates'

const characterModelUrl = `${import.meta.env.BASE_URL}models/characters/boss.glb`

export class Enemy {
  private mesh: TransformNode
  private characterGroup: TransformNode
  private modelRoot: TransformNode | null = null
  private position: Vector3
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

  private playAnimation(name: string, loop: boolean = true): void {
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
    return false
  }

  reportPlayerDetected(): void {
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

  updateMeetingAnimation(dt: number): void {
    if (this.meetingIndicator) {
      this.meetingIndicator.rotation.y += dt * 2
    }
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

  dispose(): void {
    this.mesh.dispose()
  }
}
