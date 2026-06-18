import {
  Scene,
  TransformNode,
  Vector3,
  Color3,
  AnimationGroup,
  PBRMaterial,
  ShadowGenerator,
  MeshBuilder,
  DynamicTexture
} from '@babylonjs/core'
import type { InputManager } from '../core/InputManager'
import type { AssetManager } from '../core/AssetManager'
import type { WeaponConfig } from '../../types/game'
import { createWeaponMesh } from '../weapons/WeaponModels'

const characterModelUrl = `${import.meta.env.BASE_URL}models/characters/player.glb`
const keyboardUrl = `${import.meta.env.BASE_URL}models/Keyboard.glb`

export class Player {
  private mesh: TransformNode
  private modelRoot: TransformNode | null = null
  private position: Vector3
  private speed: number = 5
  private kickCooldown: number = 0
  private kickCooldownMax: number = 5.0
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
  private swingCooldownMax: number = 5.0
  private isChargingThrow: boolean = false
  private throwChargeTime: number = 0
  private throwChargeSpeed: number = 2.0
  private cooldownHintTimer: number = 0
  private animationGroups: AnimationGroup[] = []
  private currentAnimName: string = ''

  private cooldownBarBg: TransformNode | null = null
  private cooldownBarFill: DynamicTexture | null = null
  private cooldownBarMeshes: TransformNode[] = []

  private potCooldownBarBg: TransformNode | null = null
  private potCooldownBarFill: DynamicTexture | null = null
  private potCooldownBarMeshes: TransformNode[] = []
  private potCooldownMax: number = 5.0

  private throwChargeBarBg: TransformNode | null = null
  private throwChargeBarFill: DynamicTexture | null = null
  private throwChargeBarMeshes: TransformNode[] = []

  private keyboardShield: TransformNode | null = null
  private assetManager: AssetManager | null = null

  constructor(
    scene: Scene,
    input: InputManager,
    assetManager: AssetManager,
    _shadowGen: ShadowGenerator
  ) {
    this.scene = scene
    this.input = input
    this.position = new Vector3(0, 0, 5)
    this.mesh = new TransformNode('player', this.scene)
    this.assetManager = assetManager

    this.loadModel(assetManager)
    this.createCooldownBar()
    this.createPotCooldownBar()
    this.createThrowChargeBar()
    this.loadKeyboardShield()
  }

  private createPotCooldownBar(): void {
    this.potCooldownBarBg = new TransformNode('potCooldownBarBg', this.scene)
    this.potCooldownBarBg.parent = this.mesh
    this.potCooldownBarBg.position.y = 2.4

    const bg = MeshBuilder.CreatePlane('potCooldownBg', { width: 1.0, height: 0.12 }, this.scene)
    bg.parent = this.potCooldownBarBg
    bg.billboardMode = TransformNode.BILLBOARDMODE_ALL
    bg.isVisible = false
    this.potCooldownBarMeshes.push(bg)
    const bgMat = new PBRMaterial('potCooldownBgMat', this.scene)
    bgMat.albedoColor = new Color3(0.2, 0.2, 0.2)
    bgMat.emissiveColor = new Color3(0.15, 0.15, 0.15)
    bgMat.alpha = 0.8
    bg.material = bgMat

    const fill = MeshBuilder.CreatePlane('potCooldownFill', { width: 0.96, height: 0.08 }, this.scene)
    fill.parent = this.potCooldownBarBg
    fill.billboardMode = TransformNode.BILLBOARDMODE_ALL
    fill.position.z = -0.01
    fill.isVisible = false
    this.potCooldownBarMeshes.push(fill)

    this.potCooldownBarFill = new DynamicTexture('potCooldownFillTex', { width: 96, height: 8 }, this.scene, false)
    const fillMat = new PBRMaterial('potCooldownFillMat', this.scene)
    fillMat.albedoTexture = this.potCooldownBarFill
    fillMat.emissiveTexture = this.potCooldownBarFill
    fillMat.opacityTexture = this.potCooldownBarFill
    fillMat.albedoColor = new Color3(0, 0, 0)
    fillMat.emissiveColor = new Color3(0, 0, 0)
    fill.material = fillMat

    const ctx = this.potCooldownBarFill.getContext()
    ctx.clearRect(0, 0, 96, 8)
    this.potCooldownBarFill.update()
  }

  private createCooldownBar(): void {
    this.cooldownBarBg = new TransformNode('cooldownBarBg', this.scene)
    this.cooldownBarBg.parent = this.mesh
    this.cooldownBarBg.position.y = 2.2

    const bg = MeshBuilder.CreatePlane('cooldownBg', { width: 1.0, height: 0.12 }, this.scene)
    bg.parent = this.cooldownBarBg
    bg.billboardMode = TransformNode.BILLBOARDMODE_ALL
    bg.isVisible = false
    this.cooldownBarMeshes.push(bg)
    const bgMat = new PBRMaterial('cooldownBgMat', this.scene)
    bgMat.albedoColor = new Color3(0.2, 0.2, 0.2)
    bgMat.emissiveColor = new Color3(0.15, 0.15, 0.15)
    bgMat.alpha = 0.8
    bg.material = bgMat

    const fill = MeshBuilder.CreatePlane('cooldownFill', { width: 0.96, height: 0.08 }, this.scene)
    fill.parent = this.cooldownBarBg
    fill.billboardMode = TransformNode.BILLBOARDMODE_ALL
    fill.position.z = -0.01
    fill.isVisible = false
    this.cooldownBarMeshes.push(fill)

    this.cooldownBarFill = new DynamicTexture('cooldownFillTex', { width: 96, height: 8 }, this.scene, false)
    const fillMat = new PBRMaterial('cooldownFillMat', this.scene)
    fillMat.albedoTexture = this.cooldownBarFill
    fillMat.emissiveTexture = this.cooldownBarFill
    fillMat.opacityTexture = this.cooldownBarFill
    fillMat.albedoColor = new Color3(0, 0, 0)
    fillMat.emissiveColor = new Color3(0, 0, 0)
    fill.material = fillMat

    const ctx = this.cooldownBarFill.getContext()
    ctx.clearRect(0, 0, 96, 8)
    this.cooldownBarFill.update()
  }

  private updateCooldownBarVisual(progress: number): void {
    if (!this.cooldownBarFill) return
    const ctx = this.cooldownBarFill.getContext()
    const w = 96
    const h = 8
    ctx.clearRect(0, 0, w, h)

    if (progress <= 0) {
      this.cooldownBarMeshes.forEach(m => m.isVisible = false)
      return
    }

    this.cooldownBarMeshes.forEach(m => m.isVisible = true)
    const fillW = Math.floor(w * progress)

    ctx.fillStyle = '#22C55E'
    ctx.fillRect(0, 0, fillW, h)

    this.cooldownBarFill.update()
  }

  private updatePotCooldownBarVisual(progress: number): void {
    if (!this.potCooldownBarFill) return
    const ctx = this.potCooldownBarFill.getContext()
    const w = 96
    const h = 8
    ctx.clearRect(0, 0, w, h)

    if (progress <= 0) {
      this.potCooldownBarMeshes.forEach(m => m.isVisible = false)
      return
    }

    this.potCooldownBarMeshes.forEach(m => m.isVisible = true)
    const fillW = Math.floor(w * progress)

    ctx.fillStyle = '#3B82F6'
    ctx.fillRect(0, 0, fillW, h)

    this.potCooldownBarFill.update()
  }

  private createThrowChargeBar(): void {
    this.throwChargeBarBg = new TransformNode('throwChargeBarBg', this.scene)
    this.throwChargeBarBg.parent = this.mesh
    this.throwChargeBarBg.position.y = 2.6

    const bg = MeshBuilder.CreatePlane('throwChargeBg', { width: 1.0, height: 0.12 }, this.scene)
    bg.parent = this.throwChargeBarBg
    bg.billboardMode = TransformNode.BILLBOARDMODE_ALL
    bg.isVisible = false
    this.throwChargeBarMeshes.push(bg)
    const bgMat = new PBRMaterial('throwChargeBgMat', this.scene)
    bgMat.albedoColor = new Color3(0.2, 0.2, 0.2)
    bgMat.emissiveColor = new Color3(0.15, 0.15, 0.15)
    bgMat.alpha = 0.8
    bg.material = bgMat

    const fill = MeshBuilder.CreatePlane('throwChargeFill', { width: 0.96, height: 0.08 }, this.scene)
    fill.parent = this.throwChargeBarBg
    fill.billboardMode = TransformNode.BILLBOARDMODE_ALL
    fill.position.z = -0.01
    fill.isVisible = false
    this.throwChargeBarMeshes.push(fill)

    this.throwChargeBarFill = new DynamicTexture('throwChargeFillTex', { width: 96, height: 8 }, this.scene, false)
    const fillMat = new PBRMaterial('throwChargeFillMat', this.scene)
    fillMat.albedoTexture = this.throwChargeBarFill
    fillMat.emissiveTexture = this.throwChargeBarFill
    fillMat.opacityTexture = this.throwChargeBarFill
    fillMat.albedoColor = new Color3(0, 0, 0)
    fillMat.emissiveColor = new Color3(0, 0, 0)
    fill.material = fillMat

    const ctx = this.throwChargeBarFill.getContext()
    ctx.clearRect(0, 0, 96, 8)
    this.throwChargeBarFill.update()
  }

  private updateThrowChargeBarVisual(progress: number): void {
    if (!this.throwChargeBarFill) return
    const ctx = this.throwChargeBarFill.getContext()
    const w = 96
    const h = 8
    ctx.clearRect(0, 0, w, h)

    if (progress <= 0) {
      this.throwChargeBarMeshes.forEach(m => m.isVisible = false)
      return
    }

    this.throwChargeBarMeshes.forEach(m => m.isVisible = true)
    const fillW = Math.floor(w * progress)

    ctx.fillStyle = '#F97316'
    ctx.fillRect(0, 0, fillW, h)

    this.throwChargeBarFill.update()
  }

  private async loadKeyboardShield(): Promise<void> {
    if (!this.assetManager) return

    this.keyboardShield = new TransformNode('keyboardShield', this.scene)
    this.keyboardShield.parent = this.mesh
    this.keyboardShield.position = new Vector3(-0.4, 1.0, 0.3)
    this.keyboardShield.rotation.x = -Math.PI / 6
    this.keyboardShield.rotation.z = Math.PI / 8

    const keyboard = await this.assetManager.loadProp('playerKeyboard', keyboardUrl)
    keyboard.parent = this.keyboardShield
    keyboard.scaling = new Vector3(0.5, 0.5, 0.5)
  }

  private updateKeyboardPosition(): void {
    if (!this.keyboardShield) return

    if (this.potActive) {
      const targetY = 1.6
      const targetZ = 0.8
      this.keyboardShield.position.y += (targetY - this.keyboardShield.position.y) * 0.2
      this.keyboardShield.position.z += (targetZ - this.keyboardShield.position.z) * 0.2
      this.keyboardShield.rotation.x = -Math.PI / 2
      this.keyboardShield.rotation.z = 0
    } else {
      const targetY = 1.0
      const targetZ = 0.3
      this.keyboardShield.position.y += (targetY - this.keyboardShield.position.y) * 0.2
      this.keyboardShield.position.z += (targetZ - this.keyboardShield.position.z) * 0.2
      this.keyboardShield.rotation.x = -Math.PI / 6
      this.keyboardShield.rotation.z = Math.PI / 8
    }
  }

  private async loadModel(assetManager: AssetManager): Promise<void> {
    const result = await assetManager.loadCharacter(
      'player',
      characterModelUrl
    )

    const root = result.root
    root.parent = this.mesh
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
    this.kickCooldown = this.kickCooldownMax
    this.playAnimation('Sprint', false)
  }

  equipWeapon(weapon: WeaponConfig): void {
    this.unequipWeapon()
    this.equippedWeapon = weapon
    this.weaponMesh = createWeaponMesh(weapon.type, this.scene)
    this.weaponMesh.parent = this.mesh
    this.weaponMesh.position = new Vector3(0.4, 1.0, 0.3)
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
    this.swingCooldown = this.swingCooldownMax
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
    if (this.currentAnimName === name) return
    this.animationGroups.forEach(ag => ag.stop())
    this.currentAnimName = name
    const anim = this.animationGroups.find(ag =>
      ag.name.toLowerCase().includes(name.toLowerCase())
    )
    if (anim) {
      anim.loopAnimation = loop
      anim.reset()
      anim.start()
    } else {
      this.currentAnimName = ''
    }
  }

  update(delta: number): void {
    const direction = Vector3.Zero()

    if (this.input.isActionActive('moveForward')) direction.z -= 1
    if (this.input.isActionActive('moveBackward')) direction.z += 1
    if (this.input.isActionActive('moveLeft')) direction.x += 1
    if (this.input.isActionActive('moveRight')) direction.x -= 1

    this.isMoving = direction.length() > 0

    if (this.isMoving) {
      direction.normalize()
      this.position.addInPlace(direction.scaleInPlace(this.speed * delta))
      this.position.x = Math.max(-9, Math.min(9, this.position.x))
      this.position.z = Math.max(-9, Math.min(9, this.position.z))
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

    const maxCooldown = Math.max(this.kickCooldown, this.swingCooldown)
    const progress = maxCooldown > 0 ? maxCooldown / this.kickCooldownMax : 0
    this.updateCooldownBarVisual(progress)

    const potProgress = this.potCooldown > 0 ? this.potCooldown / this.potCooldownMax : 0
    this.updatePotCooldownBarVisual(potProgress)

    const throwProgress = this.isChargingThrow ? (Math.sin(this.throwChargeTime * Math.PI * 2) + 1) / 2 : 0
    this.updateThrowChargeBarVisual(throwProgress)

    this.updateKeyboardPosition()
  }

  private updateWalkAnimation(_delta: number): void {
    if (!this.modelRoot) return

    if (this.isMoving && !this.isKicking) {
      this.playAnimation('Walk')
    } else if (!this.isKicking && !this.isSwingingWeapon) {
      this.playAnimation('Idle')
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
    return new Vector3(this.position.x - 8.4, 10, this.position.z + 8.4)
  }

  getCameraTarget(): Vector3 {
    return new Vector3(this.position.x, 0, this.position.z)
  }

  dispose(): void {
    if (this.cooldownBarBg) {
      this.cooldownBarBg.dispose()
    }
    if (this.potCooldownBarBg) {
      this.potCooldownBarBg.dispose()
    }
    if (this.throwChargeBarBg) {
      this.throwChargeBarBg.dispose()
    }
    if (this.keyboardShield) {
      this.keyboardShield.dispose()
    }
    this.mesh.dispose()
  }
}
