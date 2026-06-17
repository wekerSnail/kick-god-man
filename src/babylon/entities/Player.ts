import {
  Scene,
  TransformNode,
  Vector3,
  AnimationGroup,
  PBRMaterial,
  ShadowGenerator
} from '@babylonjs/core'
import type { InputManager } from '../core/InputManager'
import type { AssetManager } from '../core/AssetManager'
import type { WeaponConfig } from '../../types/game'
import { createWeaponMesh } from '../weapons/WeaponModels'

export class Player {
  private mesh: TransformNode
  private position: Vector3
  private speed: number = 5
  private kickCooldown: number = 0
  private isKicking: boolean = false
  private kickAnimationTime: number = 0
  private potCooldown: number = 0
  private potActive: boolean = false
  private potStartTime: number = 0
  private comboActive: boolean = false
  private invisibleActive: boolean = false
  private invisibleStartTime: number = 0
  private invisibleDuration: number = 5
  private input: InputManager
  private scene: Scene
  private isMoving: boolean = false
  private targetRotation: number = 0
  private equippedWeapon: WeaponConfig | null = null
  private weaponMesh: TransformNode | null = null
  private isSwingingWeapon: boolean = false
  private swingTime: number = 0
  private swingCooldown: number = 0
  private isChargingThrow: boolean = false
  private throwChargeTime: number = 0
  private throwChargeSpeed: number = 2.0
  private cooldownHintTimer: number = 0
  private animationGroups: AnimationGroup[] = []

  constructor(
    scene: Scene,
    input: InputManager,
    assetManager: AssetManager,
    _shadowGen: ShadowGenerator
  ) {
    this.scene = scene
    this.input = input
    this.position = new Vector3(0, 0, 10)
    this.mesh = new TransformNode('player', this.scene)

    this.loadModel(assetManager)
  }

  private async loadModel(assetManager: AssetManager): Promise<void> {
    const result = await assetManager.loadCharacter(
      'player',
      '/src/assets/kenney_mini-characters/Models/GLB format/character-male-a.glb'
    )

    const root = result.root
    root.parent = this.mesh
    this.animationGroups = result.animationGroups

    const boundingInfo = root.getBoundingInfo()
    const height = boundingInfo.boundingBox.extendSizeWorld.y * 2
    const scale = 1.8 / height
    root.scaling = new Vector3(scale, scale, scale)

    this.mesh.position = this.position.clone()
  }

  kick(): void {
    const noCooldown = this.comboActive
    if (!noCooldown && (this.kickCooldown > 0 || this.isKicking || this.potActive)) {
      return
    }
    if (this.isKicking || this.potActive) return
    if (this.equippedWeapon) {
      this.swingWeapon()
      return
    }
    this.isKicking = true
    this.kickAnimationTime = 0.3
    this.kickCooldown = 5.0
    this.playAnimation('kick', false)
  }

  equipWeapon(weapon: WeaponConfig): void {
    this.unequipWeapon()
    this.equippedWeapon = weapon
    this.weaponMesh = createWeaponMesh(weapon.type, this.scene)
    this.weaponMesh.parent = this.mesh
    this.weaponMesh.position = new Vector3(0.4, 1.3, 0)
  }

  unequipWeapon(): void {
    if (this.weaponMesh) {
      this.weaponMesh.dispose()
      this.weaponMesh = null
    }
    this.equippedWeapon = null
    this.isSwingingWeapon = false
  }

  private swingWeapon(): void {
    const noCooldown = this.comboActive
    if (!this.equippedWeapon || this.isSwingingWeapon) return
    if (!noCooldown && this.swingCooldown > 0) {
      return
    }
    this.isSwingingWeapon = true
    this.swingTime = this.equippedWeapon.swingDuration
    this.swingCooldown = 5.0
  }

  private updateWeaponSwing(delta: number): void {
    if (this.isSwingingWeapon && this.equippedWeapon) {
      this.swingTime -= delta
      const progress = 1 - (this.swingTime / this.equippedWeapon.swingDuration)
      if (this.weaponMesh) {
        this.weaponMesh.rotation.x = -Math.PI * 0.8 * Math.sin(progress * Math.PI)
      }
      if (this.swingTime <= 0) {
        this.isSwingingWeapon = false
        if (this.weaponMesh) this.weaponMesh.rotation.x = 0
      }
    }
    if (this.swingCooldown > 0) {
      this.swingCooldown -= delta
    }
  }

  hasEquippedWeapon(): boolean {
    return this.equippedWeapon !== null
  }

  getEquippedWeapon(): WeaponConfig | null {
    return this.equippedWeapon
  }

  getIsSwinging(): boolean {
    return this.isSwingingWeapon
  }

  canThrow(): boolean {
    if (!this.equippedWeapon) return false
    const type = this.equippedWeapon.type
    return type === 'mace' || type === 'bat'
  }

  startThrowCharge(): void {
    if (!this.canThrow() || this.isChargingThrow) return
    this.isChargingThrow = true
    this.throwChargeTime = 0
  }

  releaseThrow(): number {
    if (!this.isChargingThrow) return 0
    const power = (Math.sin(this.throwChargeTime * Math.PI * 2) + 1) / 2
    this.isChargingThrow = false
    this.throwChargeTime = 0
    return power
  }

  cancelThrow(): void {
    this.isChargingThrow = false
    this.throwChargeTime = 0
  }

  isCharging(): boolean {
    return this.isChargingThrow
  }

  private updateThrowCharge(delta: number): void {
    if (this.isChargingThrow) {
      this.throwChargeTime += delta * this.throwChargeSpeed
    }
  }

  getThrowDirection(): Vector3 {
    const forward = new Vector3(0, 0, 1)
    const rotationY = this.mesh.rotation.y
    const cos = Math.cos(rotationY)
    const sin = Math.sin(rotationY)
    return new Vector3(
      forward.x * cos + forward.z * sin,
      0,
      -forward.x * sin + forward.z * cos
    ).normalize()
  }

  private usePot(): void {
    if (this.potCooldown > 0 || this.potActive) return
    this.potActive = true
    this.potStartTime = 5.0
  }

  private playAnimation(name: string, loop: boolean = true): void {
    this.animationGroups.forEach(ag => ag.stop())
    const anim = this.animationGroups.find(ag =>
      ag.name.toLowerCase().includes(name.toLowerCase())
    )
    if (anim) {
      anim.loopAnimation = loop
      anim.start()
    }
  }

  update(delta: number): void {
    const direction = Vector3.Zero()

    if (this.input.isActionActive('moveForward')) direction.z -= 1
    if (this.input.isActionActive('moveBackward')) direction.z += 1
    if (this.input.isActionActive('moveLeft')) direction.x -= 1
    if (this.input.isActionActive('moveRight')) direction.x += 1

    this.isMoving = direction.length() > 0

    if (this.isMoving) {
      direction.normalize()
      this.position.addInPlace(direction.scaleInPlace(this.speed * delta))
      this.position.x = Math.max(-14, Math.min(14, this.position.x))
      this.position.z = Math.max(-14, Math.min(14, this.position.z))
      this.targetRotation = Math.atan2(direction.x, direction.z)
    }

    this.mesh.position = this.position.clone()

    const currentRotation = this.mesh.rotation.y
    const rotationDiff = this.targetRotation - currentRotation
    const normalizedDiff = Math.atan2(Math.sin(rotationDiff), Math.cos(rotationDiff))
    this.mesh.rotation.y += normalizedDiff * 10 * delta

    this.updateWalkAnimation(delta)
    this.updateWeaponSwing(delta)
    this.updateThrowCharge(delta)

    if (this.cooldownHintTimer > 0) {
      this.cooldownHintTimer -= delta
    }

    this.updateInvisible(delta)

    if (this.input.isActionJustPressed('usePot')) {
      this.usePot()
    }

    if (this.kickCooldown > 0) {
      this.kickCooldown -= delta
    }

    if (this.isKicking) {
      this.kickAnimationTime -= delta
      if (this.kickAnimationTime <= 0) {
        this.isKicking = false
        this.playAnimation('idle')
      }
    }

    if (this.potActive) {
      this.potStartTime -= delta
      if (this.potStartTime <= 0) {
        this.potActive = false
        this.potCooldown = 5.0
      }
    }

    if (this.potCooldown > 0) {
      this.potCooldown -= delta
    }
  }

  private updateWalkAnimation(_delta: number): void {
    if (this.isMoving && !this.isKicking) {
      this.playAnimation('walk')
    } else if (!this.isKicking && !this.isSwingingWeapon) {
      this.playAnimation('idle')
    }
  }

  private updateInvisible(delta: number): void {
    if (!this.invisibleActive) return
    this.invisibleStartTime -= delta
    if (this.invisibleStartTime <= 0) {
      this.setInvisible(false)
      return
    }
    if (this.invisibleStartTime < 1.5) {
      const flicker = Math.sin(this.invisibleStartTime * 12) > 0 ? 0.4 : 0.8
      this.setMeshOpacity(flicker)
    }
  }

  private setMeshOpacity(opacity: number): void {
    this.mesh.getChildMeshes().forEach(child => {
      const mat = child.material as PBRMaterial
      if (mat) {
        mat.alpha = opacity
        if (opacity < 1) {
          mat.transparencyMode = PBRMaterial.MATERIAL_ALPHABLEND
        } else {
          mat.transparencyMode = PBRMaterial.MATERIAL_OPAQUE
        }
      }
    })
  }

  getPosition(): Vector3 {
    return this.position
  }

  getIsKicking(): boolean {
    return this.isKicking
  }

  getPotActive(): boolean {
    return this.potActive
  }

  getPotCooldown(): number {
    return this.potCooldown
  }

  getPotRemainingTime(): number {
    return this.potStartTime
  }

  getKickCooldown(): number {
    return this.kickCooldown
  }

  getSwingCooldown(): number {
    return this.swingCooldown
  }

  getAttackCooldown(): number {
    return Math.max(this.kickCooldown, this.swingCooldown)
  }

  setComboActive(active: boolean): void {
    this.comboActive = active
  }

  isComboActive(): boolean {
    return this.comboActive
  }

  setInvisible(active: boolean): void {
    this.invisibleActive = active
    if (active) {
      this.invisibleStartTime = this.invisibleDuration
      this.setMeshOpacity(0.4)
    } else {
      this.setMeshOpacity(1.0)
    }
  }

  isInvisible(): boolean {
    return this.invisibleActive
  }

  getCameraPosition(): Vector3 {
    return new Vector3(this.position.x, 8, this.position.z + 6)
  }

  getCameraTarget(): Vector3 {
    return new Vector3(this.position.x, 0, this.position.z - 3)
  }

  dispose(): void {
    this.mesh.dispose()
  }
}
