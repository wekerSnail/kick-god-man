import * as THREE from 'three'

export class Enemy {
  private mesh: THREE.Group
  private position: THREE.Vector3
  private state: 'normal' | 'phone_flashing' | 'looking_back' = 'normal'
  private phoneFlashTimer: number = 0
  private nextLookBackTime: number = 8
  private phoneMesh: THREE.Mesh
  private phoneLight: THREE.PointLight
  private head: THREE.Mesh
  private body: THREE.Mesh
  private warningIndicator: THREE.Group
  private exclamationMark: THREE.Mesh
  private questionMark: THREE.Mesh
  
  private animationState: 'sitting' | 'standing_up' | 'turning' | 'looking' | 'turning_back' | 'sitting_down' = 'sitting'
  private animationProgress: number = 0
  private lookTimer: number = 0
  private readonly STAND_UP_DURATION: number = 0.5
  private readonly TURN_DURATION: number = 0.4
  private readonly LOOK_DURATION: number = 2
  private readonly SIT_DOWN_DURATION: number = 0.5

  constructor(scene: THREE.Scene) {
    this.position = new THREE.Vector3(0, 0, -10)
    this.mesh = new THREE.Group()
    this.mesh.position.copy(this.position)
    
    this.createDesk()
    this.createComputer()
    this.createChair()
    this.createCharacterModel()
    this.createPhone()
    this.createWarningIndicator()
    
    scene.add(this.mesh)

    this.scheduleNextLookBack()
  }

  private createCharacterModel() {
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF6B6B })
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    this.body.position.y = 1.2
    this.body.castShadow = true
    this.mesh.add(this.body)

    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16)
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD5B8 })
    this.head = new THREE.Mesh(headGeometry, headMaterial)
    this.head.position.y = 2.0
    this.head.castShadow = true
    this.mesh.add(this.head)

    const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8)
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.08, 0.04, -0.22)
    this.head.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.08, 0.04, -0.22)
    this.head.add(rightEye)

    const mouthGeometry = new THREE.TorusGeometry(0.04, 0.015, 8, 16, Math.PI)
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0xE74C3C })
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial)
    mouth.position.set(0, -0.08, -0.22)
    mouth.rotation.x = Math.PI / 4
    this.head.add(mouth)

    const hairGeometry = new THREE.SphereGeometry(0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x3D2314 })
    const hair = new THREE.Mesh(hairGeometry, hairMaterial)
    hair.position.y = 0.08
    this.head.add(hair)

    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2C5F8A })

    const legLeft = new THREE.Mesh(legGeometry, legMaterial)
    legLeft.position.set(-0.15, -0.6, 0)
    legLeft.castShadow = true
    this.body.add(legLeft)

    const legRight = new THREE.Mesh(legGeometry, legMaterial)
    legRight.position.set(0.15, -0.6, 0)
    legRight.castShadow = true
    this.body.add(legRight)

    const shoeGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.25)
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x1A1A1A })

    const shoeLeft = new THREE.Mesh(shoeGeometry, shoeMaterial)
    shoeLeft.position.set(0, -0.45, 0.05)
    shoeLeft.castShadow = true
    legLeft.add(shoeLeft)

    const shoeRight = new THREE.Mesh(shoeGeometry, shoeMaterial)
    shoeRight.position.set(0, -0.45, 0.05)
    shoeRight.castShadow = true
    legRight.add(shoeRight)

    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8)
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xFF6B6B })

    const armLeft = new THREE.Mesh(armGeometry, armMaterial)
    armLeft.position.set(-0.4, 1.6, -0.15)
    armLeft.rotation.x = Math.PI / 3
    armLeft.castShadow = true
    this.mesh.add(armLeft)

    const armRight = new THREE.Mesh(armGeometry, armMaterial)
    armRight.position.set(0.4, 1.6, -0.15)
    armRight.rotation.x = Math.PI / 3
    armRight.castShadow = true
    this.mesh.add(armRight)
  }

  private createChair() {
    const seatGeometry = new THREE.BoxGeometry(0.5, 0.06, 0.5)
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x4A4A4A })
    const seat = new THREE.Mesh(seatGeometry, chairMaterial)
    seat.position.set(0, 0.45, 0.6)
    seat.castShadow = true
    this.mesh.add(seat)

    const backGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.06)
    const back = new THREE.Mesh(backGeometry, chairMaterial)
    back.position.set(0, 0.75, 0.85)
    back.castShadow = true
    this.mesh.add(back)

    const legGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })

    const legPositions = [
      new THREE.Vector3(-0.2, 0.225, 0.4),
      new THREE.Vector3(0.2, 0.225, 0.4),
      new THREE.Vector3(-0.2, 0.225, 0.8),
      new THREE.Vector3(0.2, 0.225, 0.8)
    ]

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.copy(pos)
      leg.castShadow = true
      this.mesh.add(leg)
    })

    const armrestGeometry = new THREE.BoxGeometry(0.06, 0.2, 0.35)
    const armrestMaterial = new THREE.MeshStandardMaterial({ color: 0x4A4A4A })

    const armrestLeft = new THREE.Mesh(armrestGeometry, armrestMaterial)
    armrestLeft.position.set(-0.28, 0.6, 0.6)
    armrestLeft.castShadow = true
    this.mesh.add(armrestLeft)

    const armrestRight = new THREE.Mesh(armrestGeometry, armrestMaterial)
    armrestRight.position.set(0.28, 0.6, 0.6)
    armrestRight.castShadow = true
    this.mesh.add(armrestRight)
  }

  private createDesk() {
    const deskTopGeometry = new THREE.BoxGeometry(2.5, 0.12, 1.0)
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    const deskTop = new THREE.Mesh(deskTopGeometry, deskMaterial)
    deskTop.position.set(0, 0.75, -0.5)
    deskTop.castShadow = true
    deskTop.receiveShadow = true
    this.mesh.add(deskTop)

    const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 })

    const positions = [
      new THREE.Vector3(-1.1, 0.375, -0.9),
      new THREE.Vector3(1.1, 0.375, -0.9),
      new THREE.Vector3(-1.1, 0.375, -0.1),
      new THREE.Vector3(1.1, 0.375, -0.1)
    ]

    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.copy(pos)
      leg.castShadow = true
      this.mesh.add(leg)
    })
  }

  private createComputer() {
    const monitorGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.04)
    const monitorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial)
    monitor.position.set(0, 1.2, -0.7)
    monitor.castShadow = true
    this.mesh.add(monitor)

    const screenGeometry = new THREE.PlaneGeometry(0.7, 0.5)
    const screenMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4488FF,
      emissive: 0x223366,
      emissiveIntensity: 0.5
    })
    const screen = new THREE.Mesh(screenGeometry, screenMaterial)
    screen.position.set(0, 1.2, -0.68)
    this.mesh.add(screen)

    const standGeometry = new THREE.CylinderGeometry(0.04, 0.06, 0.25, 8)
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const stand = new THREE.Mesh(standGeometry, standMaterial)
    stand.position.set(0, 0.88, -0.7)
    this.mesh.add(stand)
  }

  private createPhone() {
    const phoneGeometry = new THREE.BoxGeometry(0.2, 0.35, 0.04)
    const phoneMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 })
    this.phoneMesh = new THREE.Mesh(phoneGeometry, phoneMaterial)
    this.phoneMesh.position.set(0.6, 0.82, -0.4)
    this.phoneMesh.castShadow = true
    this.mesh.add(this.phoneMesh)

    this.phoneLight = new THREE.PointLight(0xFF0000, 0, 3)
    this.phoneLight.position.set(0.6, 0.95, -0.4)
    this.mesh.add(this.phoneLight)
  }

  private createWarningIndicator() {
    this.warningIndicator = new THREE.Group()
    this.warningIndicator.position.set(0, 3.8, 0)
    this.warningIndicator.visible = false

    const exclamationGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8)
    const exclamationMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFF0000,
      emissive: 0xFF0000,
      emissiveIntensity: 0.5
    })
    this.exclamationMark = new THREE.Mesh(exclamationGeometry, exclamationMaterial)
    this.exclamationMark.position.y = 0.15
    this.warningIndicator.add(this.exclamationMark)

    const dotGeometry = new THREE.SphereGeometry(0.08, 8, 8)
    const dotMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFF0000,
      emissive: 0xFF0000,
      emissiveIntensity: 0.5
    })
    const dot = new THREE.Mesh(dotGeometry, dotMaterial)
    dot.position.y = -0.1
    this.warningIndicator.add(dot)

    const questionGeometry = new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI * 1.5)
    const questionMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFF00,
      emissive: 0xFFFF00,
      emissiveIntensity: 0.5
    })
    this.questionMark = new THREE.Mesh(questionGeometry, questionMaterial)
    this.questionMark.rotation.z = Math.PI / 4
    this.questionMark.position.set(0.3, 0.2, 0)
    this.questionMark.visible = false
    this.warningIndicator.add(this.questionMark)

    this.mesh.add(this.warningIndicator)
  }

  private scheduleNextLookBack() {
    const difficulty = this.getDifficulty()
    const minInterval = Math.max(3, 8 - difficulty)
    const maxInterval = Math.max(5, 12 - difficulty)
    this.nextLookBackTime = minInterval + Math.random() * (maxInterval - minInterval)
  }

  private getDifficulty(): number {
    return 1
  }

  update(delta: number, playerPosition: THREE.Vector3, playerIsKicking: boolean, playerPotActive: boolean) {
    switch (this.state) {
      case 'normal':
        this.updateNormal(delta)
        this.warningIndicator.visible = false
        this.questionMark.visible = false
        break
      case 'phone_flashing':
        this.updatePhoneFlashing(delta)
        this.warningIndicator.visible = true
        this.exclamationMark.visible = false
        this.questionMark.visible = true
        this.questionMark.rotation.z += delta * 3
        break
      case 'looking_back':
        this.updateLookingBack(delta, playerPosition, playerIsKicking, playerPotActive)
        this.warningIndicator.visible = true
        this.exclamationMark.visible = true
        this.questionMark.visible = false
        this.exclamationMark.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.2)
        break
    }

    this.animateCharacter(delta)
  }

  private updateNormal(delta: number) {
    this.nextLookBackTime -= delta
    if (this.nextLookBackTime <= 0) {
      this.state = 'phone_flashing'
      const difficulty = this.getDifficulty()
      const minFlash = Math.max(2, 3 - difficulty * 0.2)
      const maxFlash = Math.max(3, 5 - difficulty * 0.3)
      this.phoneFlashTimer = minFlash + Math.random() * (maxFlash - minFlash)
    }
  }

  private updatePhoneFlashing(delta: number) {
    this.phoneFlashTimer -= delta
    
    const flashIntensity = Math.sin(Date.now() * 0.01) > 0 ? 2 : 0
    this.phoneLight.intensity = flashIntensity
    
    const screenMaterial = (this.mesh.children.find(c => c instanceof THREE.Mesh && c.geometry.type === 'PlaneGeometry') as THREE.Mesh)?.material as THREE.MeshStandardMaterial
    if (screenMaterial) {
      screenMaterial.emissive.setHex(0xFF0000)
      screenMaterial.emissiveIntensity = flashIntensity * 0.3
    }

    if (this.phoneFlashTimer <= 0) {
      this.state = 'looking_back'
      this.animationState = 'sitting'
      this.animationProgress = 0
      this.phoneLight.intensity = 0
      if (screenMaterial) {
        screenMaterial.emissive.setHex(0x223366)
        screenMaterial.emissiveIntensity = 0.5
      }
    }
  }

  private updateLookingBack(delta: number, _playerPosition: THREE.Vector3, _playerIsKicking: boolean, _playerPotActive: boolean) {
    this.animationProgress += delta
    
    switch (this.animationState) {
      case 'sitting':
        this.animationState = 'standing_up'
        this.animationProgress = 0
        break
        
      case 'standing_up':
        if (this.animationProgress >= this.STAND_UP_DURATION) {
          this.animationState = 'turning'
          this.animationProgress = 0
        }
        break
        
      case 'turning':
        if (this.animationProgress >= this.TURN_DURATION) {
          this.animationState = 'looking'
          this.animationProgress = 0
          this.lookTimer = 0
        }
        break
        
      case 'looking':
        this.lookTimer += delta
        if (this.lookTimer >= this.LOOK_DURATION) {
          this.animationState = 'turning_back'
          this.animationProgress = 0
        }
        break
        
      case 'turning_back':
        if (this.animationProgress >= this.TURN_DURATION) {
          this.animationState = 'sitting_down'
          this.animationProgress = 0
        }
        break
        
      case 'sitting_down':
        if (this.animationProgress >= this.SIT_DOWN_DURATION) {
          this.animationState = 'sitting'
          this.state = 'normal'
          this.animationProgress = 0
          this.scheduleNextLookBack()
        }
        break
    }
  }

  private animateCharacter(_delta: number) {
    const sittingY = 0.8
    const standingY = 0.8
    const headOffset = 0.8
    
    switch (this.animationState) {
      case 'sitting':
        this.body.position.y = sittingY
        this.head.position.y = sittingY + headOffset
        this.body.rotation.y = 0
        this.head.rotation.y = 0
        this.body.rotation.x = Math.sin(Date.now() * 0.002) * 0.02
        this.head.rotation.z = 0
        break
        
      case 'standing_up':
        const standProgress = Math.min(1, this.animationProgress / this.STAND_UP_DURATION)
        const easedStand = this.easeOutCubic(standProgress)
        this.body.position.y = sittingY + (standingY - sittingY) * easedStand
        this.head.position.y = this.body.position.y + headOffset
        this.body.rotation.x = 0
        break
        
      case 'turning':
        const turnProgress = Math.min(1, this.animationProgress / this.TURN_DURATION)
        const easedTurn = this.easeInOutCubic(turnProgress)
        this.body.rotation.y = Math.PI * easedTurn
        this.head.rotation.y = Math.PI * easedTurn
        this.body.position.y = standingY
        this.head.position.y = standingY + headOffset
        break
        
      case 'looking':
        this.body.position.y = standingY
        this.head.position.y = standingY + headOffset
        this.body.rotation.y = Math.PI
        this.head.rotation.y = Math.PI
        this.head.rotation.z = Math.sin(Date.now() * 0.008) * 0.15
        break
        
      case 'turning_back':
        const turnBackProgress = Math.min(1, this.animationProgress / this.TURN_DURATION)
        const easedTurnBack = this.easeInOutCubic(turnBackProgress)
        this.body.rotation.y = Math.PI * (1 - easedTurnBack)
        this.head.rotation.y = Math.PI * (1 - easedTurnBack)
        this.head.rotation.z = 0
        this.body.position.y = standingY
        this.head.position.y = standingY + headOffset
        break
        
      case 'sitting_down':
        const sitProgress = Math.min(1, this.animationProgress / this.SIT_DOWN_DURATION)
        const easedSit = this.easeOutCubic(sitProgress)
        this.body.position.y = standingY - (standingY - sittingY) * easedSit
        this.head.position.y = this.body.position.y + headOffset
        this.body.rotation.y = 0
        this.head.rotation.y = 0
        break
    }
    
    if (this.state === 'phone_flashing') {
      this.body.rotation.x = Math.sin(Date.now() * 0.005) * 0.05
      this.head.rotation.z = Math.sin(Date.now() * 0.003) * 0.1
    }
  }
  
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }
  
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  getState(): string {
    return this.state
  }

  isLookingBack(): boolean {
    return this.state === 'looking_back'
  }
  
  isActuallyLooking(): boolean {
    return this.state === 'looking_back' && this.animationState === 'looking'
  }

  isPhoneFlashing(): boolean {
    return this.state === 'phone_flashing'
  }

  getPosition(): THREE.Vector3 {
    return this.position
  }
}
