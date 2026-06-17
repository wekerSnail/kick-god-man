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
  private progressBar: THREE.Group
  private progressFill: THREE.Mesh
  private equippedWeapon: WeaponConfig | null = null
  private weaponMesh: THREE.Group | null = null
  private isSwingingWeapon: boolean = false
  private swingTime: number = 0
  private swingCooldown: number = 0
  private isChargingThrow: boolean = false
  private throwChargeTime: number = 0
  private throwChargeSpeed: number = 2.0
  private throwProgressBar: THREE.Group
  private throwProgressFill: THREE.Mesh

  constructor(scene: THREE.Scene, input: InputManager) {
    this.input = input
    this.position = new THREE.Vector3(0, 0, 10)
    this.mesh = new THREE.Group()
    
    this.createCharacterModel()
    this.createKeyboard()
    this.createProgressBar()
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
    this.progressBar = new THREE.Group()
    this.progressBar.position.set(0, 2.8, 0)
    this.progressBar.visible = false

    const bgGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.05)
    const bgMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const bg = new THREE.Mesh(bgGeometry, bgMaterial)
    this.progressBar.add(bg)

    const fillGeometry = new THREE.BoxGeometry(0.78, 0.08, 0.06)
    const fillMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4CAF50,
      emissive: 0x4CAF50,
      emissiveIntensity: 0.3
    })
    this.progressFill = new THREE.Mesh(fillGeometry, fillMaterial)
    this.progressFill.position.z = 0.01
    this.progressBar.add(this.progressFill)

    this.mesh.add(this.progressBar)

    this.throwProgressBar = new THREE.Group()
    this.throwProgressBar.position.set(0, 3.0, 0)
    this.throwProgressBar.visible = false

    const throwBgGeom = new THREE.BoxGeometry(0.8, 0.08, 0.05)
    const throwBgMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const throwBg = new THREE.Mesh(throwBgGeom, throwBgMat)
    this.throwProgressBar.add(throwBg)

    const throwFillGeom = new THREE.BoxGeometry(0.78, 0.06, 0.06)
    const throwFillMat = new THREE.MeshStandardMaterial({ 
      color: 0xFF9800,
      emissive: 0xFF9800,
      emissiveIntensity: 0.3
    })
    this.throwProgressFill = new THREE.Mesh(throwFillGeom, throwFillMat)
    this.throwProgressFill.position.z = 0.01
    this.throwProgressBar.add(this.throwProgressFill)

    this.mesh.add(this.throwProgressBar)
  }

  kick() {
    if (this.kickCooldown > 0 || this.isKicking || this.potActive) return
    if (this.equippedWeapon) {
      this.swingWeapon()
      return
    }
    this.isKicking = true
    this.kickAnimationTime = 0.3
    this.kickCooldown = 1.0
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
    if (!this.equippedWeapon || this.swingCooldown > 0 || this.isSwingingWeapon) return
    this.isSwingingWeapon = true
    this.swingTime = this.equippedWeapon.swingDuration
    this.swingCooldown = this.equippedWeapon.swingDuration + 0.2
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
    this.throwProgressBar.visible = false
    return power
  }

  cancelThrow(): void {
    this.isChargingThrow = false
    this.throwChargeTime = 0
    this.throwProgressBar.visible = false
  }

  isCharging(): boolean {
    return this.isChargingThrow
  }

  private updateThrowCharge(delta: number): void {
    if (this.isChargingThrow) {
      this.throwChargeTime += delta * this.throwChargeSpeed
      const power = (Math.sin(this.throwChargeTime * Math.PI * 2) + 1) / 2
      this.throwProgressBar.visible = true
      this.throwProgressFill.scale.x = Math.max(0.01, power)
      this.throwProgressFill.position.x = -0.39 + 0.39 * power

      const mat = this.throwProgressFill.material as THREE.MeshStandardMaterial
      if (power > 0.7) {
        mat.color.setHex(0xF44336)
        mat.emissive.setHex(0xF44336)
      } else if (power > 0.4) {
        mat.color.setHex(0xFF9800)
        mat.emissive.setHex(0xFF9800)
      } else {
        mat.color.setHex(0x4CAF50)
        mat.emissive.setHex(0x4CAF50)
      }
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

      this.progressBar.visible = true
      const progress = this.potStartTime / 5.0
      this.progressFill.scale.x = Math.max(0.01, progress)
      this.progressFill.position.x = -0.39 + 0.39 * progress
      
      if (progress > 0.5) {
        (this.progressFill.material as THREE.MeshStandardMaterial).color.setHex(0x4CAF50)
        ;(this.progressFill.material as THREE.MeshStandardMaterial).emissive.setHex(0x4CAF50)
      } else if (progress > 0.25) {
        (this.progressFill.material as THREE.MeshStandardMaterial).color.setHex(0xFFC107)
        ;(this.progressFill.material as THREE.MeshStandardMaterial).emissive.setHex(0xFFC107)
      } else {
        (this.progressFill.material as THREE.MeshStandardMaterial).color.setHex(0xF44336)
        ;(this.progressFill.material as THREE.MeshStandardMaterial).emissive.setHex(0xF44336)
      }
    } else {
      const targetY = 1.0
      const targetZ = 0.3
      this.potGroup.position.y += (targetY - this.potGroup.position.y) * 0.2
      this.potGroup.position.z += (targetZ - this.potGroup.position.z) * 0.2
      this.potGroup.rotation.x = -Math.PI / 6
      this.potGroup.rotation.z = Math.PI / 8
      this.progressBar.visible = false
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
