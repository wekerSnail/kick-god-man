import * as THREE from 'three'
import type { InputManager } from './core/InputManager'
import type { WeaponConfig } from '../types/game'
import { createWeaponMesh } from './weapons/WeaponModels'

export class Player {
  private mesh: THREE.Group
  private position: THREE.Vector3
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
  private legLeft: THREE.Mesh
  private legRight: THREE.Mesh
  private armLeft: THREE.Mesh
  private armRight: THREE.Mesh
  private body: THREE.Mesh
  private potGroup: THREE.Group
  private isMoving: boolean = false
  private walkCycle: number = 0
  private targetRotation: number = 0
  private potCountdownSprite: THREE.Sprite
  private potCountdownTexture: THREE.CanvasTexture
  private potCountdownCtx: CanvasRenderingContext2D
  private equippedWeapon: WeaponConfig | null = null
  private weaponMesh: THREE.Group | null = null
  private isSwingingWeapon: boolean = false
  private swingTime: number = 0
  private swingCooldown: number = 0
  private isChargingThrow: boolean = false
  private throwChargeTime: number = 0
  private throwChargeSpeed: number = 2.0
  private throwCountdownSprite: THREE.Sprite
  private throwCountdownTexture: THREE.CanvasTexture
  private throwCountdownCtx: CanvasRenderingContext2D
  private cooldownHintSprite: THREE.Sprite
  private cooldownHintTimer: number = 0

  constructor(scene: THREE.Scene, input: InputManager) {
    this.input = input
    this.position = new THREE.Vector3(0, 0, 10)
    this.mesh = new THREE.Group()
    
    this.createCharacterModel()
    this.createKeyboard()
    this.createProgressBar()
    this.createCooldownHint()
    scene.add(this.mesh)
  }

  private createCharacterModel() {
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4A90D9 })
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    this.body.position.y = 1.2
    this.body.castShadow = true
    this.mesh.add(this.body)

    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16)
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD5B8 })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 2.0
    head.castShadow = true
    this.mesh.add(head)

    const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8)
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.08, 2.05, 0.22)
    this.mesh.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.08, 2.05, 0.22)
    this.mesh.add(rightEye)

    const mouthGeometry = new THREE.TorusGeometry(0.04, 0.015, 8, 16, Math.PI)
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0xE74C3C })
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial)
    mouth.position.set(0, 1.92, 0.22)
    mouth.rotation.x = Math.PI / 4
    this.mesh.add(mouth)

    const hairGeometry = new THREE.SphereGeometry(0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x3D2314 })
    const hair = new THREE.Mesh(hairGeometry, hairMaterial)
    hair.position.y = 2.1
    this.mesh.add(hair)

    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2C5F8A })

    this.legLeft = new THREE.Mesh(legGeometry, legMaterial)
    this.legLeft.position.set(-0.15, 0.4, 0)
    this.legLeft.castShadow = true
    this.mesh.add(this.legLeft)

    this.legRight = new THREE.Mesh(legGeometry, legMaterial)
    this.legRight.position.set(0.15, 0.4, 0)
    this.legRight.castShadow = true
    this.mesh.add(this.legRight)

    const shoeGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.25)
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x1A1A1A })

    const shoeLeft = new THREE.Mesh(shoeGeometry, shoeMaterial)
    shoeLeft.position.set(0, 0.05, 0.05)
    shoeLeft.castShadow = true
    this.legLeft.add(shoeLeft)

    const shoeRight = new THREE.Mesh(shoeGeometry, shoeMaterial)
    shoeRight.position.set(0, 0.05, 0.05)
    shoeRight.castShadow = true
    this.legRight.add(shoeRight)

    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8)
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x4A90D9 })

    this.armLeft = new THREE.Mesh(armGeometry, armMaterial)
    this.armLeft.position.set(-0.4, 1.6, 0)
    this.armLeft.castShadow = true
    this.mesh.add(this.armLeft)

    this.armRight = new THREE.Mesh(armGeometry, armMaterial)
    this.armRight.position.set(0.4, 1.6, 0)
    this.armRight.castShadow = true
    this.mesh.add(this.armRight)

    const handGeometry = new THREE.SphereGeometry(0.08, 8, 8)
    const handMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD5B8 })

    const handLeft = new THREE.Mesh(handGeometry, handMaterial)
    handLeft.position.set(0, -0.3, 0)
    this.armLeft.add(handLeft)

    const handRight = new THREE.Mesh(handGeometry, handMaterial)
    handRight.position.set(0, -0.3, 0)
    this.armRight.add(handRight)

    this.mesh.position.copy(this.position)
  }

  private createKeyboard() {
    this.potGroup = new THREE.Group()

    const baseGeometry = new THREE.BoxGeometry(0.5, 0.03, 0.2)
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x2A2A2A })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.castShadow = true
    this.potGroup.add(base)

    const keyRows = 4
    const keysPerRow = 12
    const keyWidth = 0.035
    const keyHeight = 0.035
    const keyGap = 0.003

    for (let row = 0; row < keyRows; row++) {
      for (let col = 0; col < keysPerRow; col++) {
        const keyGeometry = new THREE.BoxGeometry(keyWidth, 0.015, keyHeight)
        const isSpecial = row === 3 && (col === 0 || col === 11)
        const keyMaterial = new THREE.MeshStandardMaterial({ 
          color: isSpecial ? 0x666666 : 0x444444 
        })
        const key = new THREE.Mesh(keyGeometry, keyMaterial)
        
        const x = -0.2 + col * (keyWidth + keyGap) + keyWidth / 2
        const z = -0.07 + row * (keyHeight + keyGap) + keyHeight / 2
        
        key.position.set(x, 0.02, z)
        this.potGroup.add(key)
      }
    }

    const spaceKeyGeometry = new THREE.BoxGeometry(0.25, 0.015, 0.035)
    const spaceKeyMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 })
    const spaceKey = new THREE.Mesh(spaceKeyGeometry, spaceKeyMaterial)
    spaceKey.position.set(0, 0.02, 0.1)
    this.potGroup.add(spaceKey)

    this.potGroup.position.set(-0.55, 1.0, 0.3)
    this.potGroup.rotation.x = -Math.PI / 6
    this.potGroup.rotation.z = Math.PI / 8
    this.mesh.add(this.potGroup)
  }

  private createProgressBar() {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    this.potCountdownCtx = canvas.getContext('2d')!
    this.potCountdownTexture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: this.potCountdownTexture, transparent: true })
    this.potCountdownSprite = new THREE.Sprite(spriteMat)
    this.potCountdownSprite.position.set(0, 3.0, 0)
    this.potCountdownSprite.scale.set(1.5, 0.4, 1)
    this.potCountdownSprite.visible = false
    this.mesh.add(this.potCountdownSprite)

    const throwCanvas = document.createElement('canvas')
    throwCanvas.width = 256
    throwCanvas.height = 64
    this.throwCountdownCtx = throwCanvas.getContext('2d')!
    this.throwCountdownTexture = new THREE.CanvasTexture(throwCanvas)
    const throwSpriteMat = new THREE.SpriteMaterial({ map: this.throwCountdownTexture, transparent: true })
    this.throwCountdownSprite = new THREE.Sprite(throwSpriteMat)
    this.throwCountdownSprite.position.set(0, 3.2, 0)
    this.throwCountdownSprite.scale.set(1.5, 0.4, 1)
    this.throwCountdownSprite.visible = false
    this.mesh.add(this.throwCountdownSprite)
  }

  private updatePotCountdown() {
    if (!this.potActive) {
      this.potCountdownSprite.visible = false
      return
    }
    this.potCountdownSprite.visible = true
    const time = Math.ceil(this.potStartTime)
    const ctx = this.potCountdownCtx
    ctx.clearRect(0, 0, 256, 64)
    ctx.fillStyle = '#4CAF50'
    ctx.font = 'bold 36px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`🛡️ ${time}s`, 128, 44)
    this.potCountdownTexture.needsUpdate = true
  }

  private createCooldownHint() {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#FF6B6B'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('攻击冷却中...', 128, 44)
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0 })
    this.cooldownHintSprite = new THREE.Sprite(spriteMat)
    this.cooldownHintSprite.position.set(0, 3.2, 0)
    this.cooldownHintSprite.scale.set(1.8, 0.45, 1)
    this.mesh.add(this.cooldownHintSprite)
  }

  private showAttackCooldownHint() {
    this.cooldownHintTimer = 1.0
    ;(this.cooldownHintSprite.material as THREE.SpriteMaterial).opacity = 1
  }

  kick() {
    const noCooldown = this.comboActive
    if (!noCooldown && (this.kickCooldown > 0 || this.isKicking || this.potActive)) {
      if (this.kickCooldown > 0) {
        this.showAttackCooldownHint()
      }
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
  }

  equipWeapon(weapon: WeaponConfig): void {
    this.unequipWeapon()
    this.equippedWeapon = weapon
    this.weaponMesh = createWeaponMesh(weapon.type)
    this.weaponMesh.position.set(0, -0.35, 0)
    this.armRight.add(this.weaponMesh)
  }

  unequipWeapon(): void {
    if (this.weaponMesh) {
      this.armRight.remove(this.weaponMesh)
      this.weaponMesh = null
    }
    this.equippedWeapon = null
    this.isSwingingWeapon = false
  }

  private swingWeapon(): void {
    const noCooldown = this.comboActive
    if (!this.equippedWeapon || this.isSwingingWeapon) return
    if (!noCooldown && this.swingCooldown > 0) {
      this.showAttackCooldownHint()
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
      this.armRight.rotation.x = -Math.PI * 0.8 * Math.sin(progress * Math.PI)
      if (this.weaponMesh) {
        this.weaponMesh.rotation.z = Math.PI * 0.3 * Math.sin(progress * Math.PI)
      }
      if (this.swingTime <= 0) {
        this.isSwingingWeapon = false
        this.armRight.rotation.x = 0
        if (this.weaponMesh) this.weaponMesh.rotation.z = 0
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
    this.throwCountdownSprite.visible = false
    return power
  }

  cancelThrow(): void {
    this.isChargingThrow = false
    this.throwChargeTime = 0
    this.throwCountdownSprite.visible = false
  }

  isCharging(): boolean {
    return this.isChargingThrow
  }

  private updateThrowCharge(delta: number): void {
    if (this.isChargingThrow) {
      this.throwChargeTime += delta * this.throwChargeSpeed
      const power = (Math.sin(this.throwChargeTime * Math.PI * 2) + 1) / 2
      this.throwCountdownSprite.visible = true

      const ctx = this.throwCountdownCtx
      ctx.clearRect(0, 0, 256, 64)

      let color = '#4CAF50'
      if (power > 0.7) color = '#F44336'
      else if (power > 0.4) color = '#FF9800'

      ctx.fillStyle = '#333'
      ctx.fillRect(20, 15, 216, 34)
      ctx.fillStyle = color
      ctx.fillRect(22, 17, Math.max(2, 212 * power), 30)

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`蓄力 ${Math.round(power * 100)}%`, 128, 40)

      this.throwCountdownTexture.needsUpdate = true
    } else {
      this.throwCountdownSprite.visible = false
    }
  }

  getThrowDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1)
    dir.applyQuaternion(this.mesh.quaternion)
    return dir.normalize()
  }

  private usePot() {
    if (this.potCooldown > 0 || this.potActive) return
    
    this.potActive = true
    this.potStartTime = 5.0
  }

  update(delta: number) {
    const moveSpeed = this.speed * delta
    const direction = new THREE.Vector3()

    if (this.input.isActionActive('moveForward')) direction.z -= 1
    if (this.input.isActionActive('moveBackward')) direction.z += 1
    if (this.input.isActionActive('moveLeft')) direction.x -= 1
    if (this.input.isActionActive('moveRight')) direction.x += 1

    this.isMoving = direction.length() > 0

    if (this.isMoving) {
      direction.normalize()
      this.position.add(direction.multiplyScalar(moveSpeed))
      this.position.x = Math.max(-14, Math.min(14, this.position.x))
      this.position.z = Math.max(-14, Math.min(14, this.position.z))
      
      this.targetRotation = Math.atan2(direction.x, direction.z)
    }

    this.mesh.position.copy(this.position)
    
    const currentRotation = this.mesh.rotation.y
    const rotationDiff = this.targetRotation - currentRotation
    const normalizedDiff = Math.atan2(Math.sin(rotationDiff), Math.cos(rotationDiff))
    this.mesh.rotation.y += normalizedDiff * 10 * delta

    this.updateWalkAnimation(delta)
    this.updateKeyboardPosition()
    this.updateWeaponSwing(delta)
    this.updateThrowCharge(delta)

    if (this.cooldownHintTimer > 0) {
      this.cooldownHintTimer -= delta
      const mat = this.cooldownHintSprite.material as THREE.SpriteMaterial
      mat.opacity = Math.max(0, this.cooldownHintTimer)
      if (this.cooldownHintTimer <= 0) {
        mat.opacity = 0
      }
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
      this.animateKick()
      if (this.kickAnimationTime <= 0) {
        this.isKicking = false
        this.resetKickAnimation()
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

  private updateWalkAnimation(delta: number) {
    if (this.isMoving && !this.isKicking) {
      this.walkCycle += delta * 8
      const legSwing = Math.sin(this.walkCycle) * 0.4
      this.legLeft.rotation.x = legSwing
      this.legRight.rotation.x = -legSwing
      this.armLeft.rotation.x = -legSwing * 0.6
      this.armRight.rotation.x = legSwing * 0.6
    } else if (!this.isKicking) {
      this.walkCycle = 0
      this.legLeft.rotation.x *= 0.9
      this.legRight.rotation.x *= 0.9
      this.armLeft.rotation.x *= 0.9
      this.armRight.rotation.x *= 0.9
    }
  }

  private updateKeyboardPosition() {
    if (this.potActive) {
      const targetY = 1.8
      const targetZ = 0.4
      this.potGroup.position.y += (targetY - this.potGroup.position.y) * 0.2
      this.potGroup.position.z += (targetZ - this.potGroup.position.z) * 0.2
      this.potGroup.rotation.x = -Math.PI / 2
      this.potGroup.rotation.z = 0
      this.updatePotCountdown()
    } else {
      const targetY = 1.0
      const targetZ = 0.3
      this.potGroup.position.y += (targetY - this.potGroup.position.y) * 0.2
      this.potGroup.position.z += (targetZ - this.potGroup.position.z) * 0.2
      this.potGroup.rotation.x = -Math.PI / 6
      this.potGroup.rotation.z = Math.PI / 8
      this.potCountdownSprite.visible = false
    }
  }

  private animateKick() {
    const progress = 1 - (this.kickAnimationTime / 0.3)
    this.legRight.rotation.x = -Math.PI / 2 * Math.sin(progress * Math.PI)
    this.armRight.rotation.x = Math.PI / 4 * Math.sin(progress * Math.PI)
  }

  private resetKickAnimation() {
    this.legRight.rotation.x = 0
    this.armRight.rotation.x = 0
  }

  getPosition(): THREE.Vector3 {
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

  private setMeshOpacity(opacity: number): void {
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        mat.transparent = opacity < 1
        mat.opacity = opacity
        mat.needsUpdate = true
      }
    })
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

  getCameraPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, 8, this.position.z + 6)
  }

  getCameraTarget(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, 0, this.position.z - 3)
  }

  dispose(): void {
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        const mat = child.material
        if (Array.isArray(mat)) mat.forEach(m => m.dispose())
        else if (mat) mat.dispose()
      }
    })
    this.mesh.parent?.remove(this.mesh)
  }
}
