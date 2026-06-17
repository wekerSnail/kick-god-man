import * as THREE from 'three'

export class Enemy {
  private mesh: THREE.Group
  private position: THREE.Vector3
  private state: 'normal' | 'phone_flashing' | 'looking_back' | 'stunned' | 'meeting' | 'patrolling' = 'normal'
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

  private isStunned: boolean = false
  private stunTimer: number = 0
  private stunIndicator: THREE.Group
  private isMeeting: boolean = false
  private meetingTimer: number = 0
  private meetingShield: THREE.Mesh
  private meetingTextSprite: THREE.Sprite
  private meetingArmWave: number = 0
  private armLeft: THREE.Mesh
  private armRight: THREE.Mesh
  private nextMeetingTime: number = 15

  private isPatrolling: boolean = false
  private patrolTimer: number = 0
  private nextPatrolTime: number = 25
  private patrolPhase: 'idle' | 'patrol_warning' | 'patrol_standup' | 'patrol_walk' | 'patrol_return' | 'patrol_sitdown' = 'idle'
  private patrolPhaseTimer: number = 0
  private patrolWaypoints: THREE.Vector3[] = []
  private currentWaypointIndex: number = 0
  private patrolMoveSpeed: number = 3.5
  private readonly PATROL_DETECTION_RANGE: number = 5
  private readonly PATROL_DETECTION_HALF_ANGLE: number = THREE.MathUtils.degToRad(25)
  private readonly WARNING_DURATION: number = 2.5
  private readonly PATROL_STAND_UP_DURATION: number = 0.6
  private readonly PATROL_SIT_DOWN_DURATION: number = 0.6

  private patrolWarningSprite!: THREE.Sprite
  private patrolTextSprite!: THREE.Sprite
  private patrolVisionCone!: THREE.Mesh
  private originalPosition!: THREE.Vector3
  private characterGroup!: THREE.Group

  constructor(scene: THREE.Scene) {
    this.position = new THREE.Vector3(0, 0, -10)
    this.originalPosition = this.position.clone()
    this.mesh = new THREE.Group()
    this.mesh.position.copy(this.position)
    this.characterGroup = new THREE.Group()
    this.mesh.add(this.characterGroup)
    
    this.createDesk()
    this.createComputer()
    this.createChair()
    this.createCharacterModel()
    this.createPhone()
    this.createWarningIndicator()
    this.createStunIndicator()
    this.createMeetingIndicator()
    this.createPatrolIndicator()
    
    scene.add(this.mesh)

    this.scheduleNextLookBack()
  }

  private createCharacterModel() {
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF6B6B })
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    this.body.position.y = 1.2
    this.body.castShadow = true
    this.characterGroup.add(this.body)

    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16)
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD5B8 })
    this.head = new THREE.Mesh(headGeometry, headMaterial)
    this.head.position.y = 2.0
    this.head.castShadow = true
    this.characterGroup.add(this.head)

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

    this.armLeft = new THREE.Mesh(armGeometry, armMaterial)
    this.armLeft.position.set(-0.4, 1.3, -0.15)
    this.armLeft.rotation.x = Math.PI / 3
    this.armLeft.castShadow = true
    this.characterGroup.add(this.armLeft)

    this.armRight = new THREE.Mesh(armGeometry, armMaterial)
    this.armRight.position.set(0.4, 1.3, -0.15)
    this.armRight.rotation.x = Math.PI / 3
    this.armRight.castShadow = true
    this.characterGroup.add(this.armRight)
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

    this.characterGroup.add(this.warningIndicator)
  }

  private createStunIndicator() {
    this.stunIndicator = new THREE.Group()
    this.stunIndicator.position.set(0, 3.5, 0)
    this.stunIndicator.visible = false

    const starGeom = new THREE.SphereGeometry(0.08, 4, 4)
    const starMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 })
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(starGeom, starMat)
      star.position.set(
        Math.cos((i / 3) * Math.PI * 2) * 0.3,
        0,
        Math.sin((i / 3) * Math.PI * 2) * 0.3
      )
      this.stunIndicator.add(star)
    }
    this.characterGroup.add(this.stunIndicator)
  }

  private createMeetingIndicator() {
    const shieldGeom = new THREE.TorusGeometry(1.5, 0.08, 8, 32)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xFF4444,
      transparent: true,
      opacity: 0.6
    })
    this.meetingShield = new THREE.Mesh(shieldGeom, shieldMat)
    this.meetingShield.rotation.x = Math.PI / 2
    this.meetingShield.position.y = 1.2
    this.meetingShield.visible = false
    this.mesh.add(this.meetingShield)

    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#FF4444'
    ctx.font = 'bold 36px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('📢 开会中...', 128, 44)
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    this.meetingTextSprite = new THREE.Sprite(spriteMat)
    this.meetingTextSprite.position.set(0, 3.5, 0)
    this.meetingTextSprite.scale.set(2, 0.5, 1)
    this.meetingTextSprite.visible = false
    this.mesh.add(this.meetingTextSprite)
  }

  private createPatrolIndicator() {
    const warningCanvas = document.createElement('canvas')
    warningCanvas.width = 256
    warningCanvas.height = 64
    const warningCtx = warningCanvas.getContext('2d')!
    warningCtx.fillStyle = '#FFD700'
    warningCtx.font = 'bold 32px sans-serif'
    warningCtx.textAlign = 'center'
    warningCtx.fillText('🔍 即将巡查...', 128, 44)
    const warningTexture = new THREE.CanvasTexture(warningCanvas)
    const warningMat = new THREE.SpriteMaterial({ map: warningTexture, transparent: true })
    this.patrolWarningSprite = new THREE.Sprite(warningMat)
    this.patrolWarningSprite.position.set(0, 3.5, 0)
    this.patrolWarningSprite.scale.set(2, 0.5, 1)
    this.patrolWarningSprite.visible = false
    this.characterGroup.add(this.patrolWarningSprite)

    const textCanvas = document.createElement('canvas')
    textCanvas.width = 256
    textCanvas.height = 64
    const textCtx = textCanvas.getContext('2d')!
    textCtx.fillStyle = '#FFD700'
    textCtx.font = 'bold 32px sans-serif'
    textCtx.textAlign = 'center'
    textCtx.fillText('🔍 巡查中...', 128, 44)
    const textTexture = new THREE.CanvasTexture(textCanvas)
    const textMat = new THREE.SpriteMaterial({ map: textTexture, transparent: true })
    this.patrolTextSprite = new THREE.Sprite(textMat)
    this.patrolTextSprite.position.set(0, 3.5, 0)
    this.patrolTextSprite.scale.set(2, 0.5, 1)
    this.patrolTextSprite.visible = false
    this.characterGroup.add(this.patrolTextSprite)

    const coneGeom = new THREE.ConeGeometry(5, 5, 16, 1, true, 0, Math.PI / 4)
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    this.patrolVisionCone = new THREE.Mesh(coneGeom, coneMat)
    this.patrolVisionCone.rotation.x = Math.PI / 2
    this.patrolVisionCone.position.y = 0.5
    this.patrolVisionCone.visible = false
    this.characterGroup.add(this.patrolVisionCone)
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
    if (this.isStunned) {
      this.updateStun(delta)
      return
    }

    if (this.isMeeting) {
      this.updateMeeting(delta)
      return
    }

    if (this.isPatrolling) {
      this.updatePatrol(delta, playerPosition)
      this.animateCharacter(delta)
      return
    }

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

    this.nextMeetingTime -= delta
    if (this.nextMeetingTime <= 0) {
      const chance = 0.5 + (this.getDifficulty() - 1) * 0.1
      if (Math.random() < chance) {
        this.startMeeting(6)
      }
      this.nextMeetingTime = 12 + Math.random() * 8
    }

    this.nextPatrolTime -= delta
    if (this.nextPatrolTime <= 0) {
      if (Math.random() < 0.6) {
        this.startPatrol()
      }
      this.nextPatrolTime = 20 + Math.random() * 15
    }
  }

  startPatrol(): void {
    if (this.isMeeting || this.isStunned) return
    this.isPatrolling = true
    this.state = 'patrolling'
    this.patrolPhase = 'patrol_warning'
    this.patrolPhaseTimer = 0
    this.patrolTimer = 8 + Math.random() * 4
    this.generatePatrolWaypoints()
    this.currentWaypointIndex = 0
    this.patrolWarningSprite.visible = true
    this.patrolTextSprite.visible = false
    this.patrolVisionCone.visible = true
    this.warningIndicator.visible = false
  }

  private updatePatrol(delta: number, playerPosition: THREE.Vector3): void {
    this.patrolPhaseTimer += delta

    switch (this.patrolPhase) {
      case 'patrol_warning':
        this.patrolWarningSprite.visible = true
        this.patrolTextSprite.visible = false
        const toPlayer = playerPosition.clone().sub(this.position).setY(0)
        const targetAngle = Math.atan2(toPlayer.x, toPlayer.z)
        this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, targetAngle, 0.02)
        this.body.rotation.y = THREE.MathUtils.lerp(this.body.rotation.y, targetAngle, 0.01)
        this.phoneLight.intensity = Math.sin(Date.now() * 0.01) > 0 ? 2 : 0
        if (this.patrolPhaseTimer >= this.WARNING_DURATION) {
          this.patrolPhase = 'patrol_standup'
          this.patrolPhaseTimer = 0
          this.patrolWarningSprite.visible = false
          this.patrolTextSprite.visible = true
          this.phoneLight.intensity = 0
        }
        break

      case 'patrol_standup':
        this.patrolTextSprite.visible = true
        if (this.patrolPhaseTimer >= this.PATROL_STAND_UP_DURATION) {
          this.patrolPhase = 'patrol_walk'
          this.patrolPhaseTimer = 0
        }
        break

      case 'patrol_walk':
        this.patrolTextSprite.visible = true
        this.patrolTimer -= delta
        if (this.currentWaypointIndex < this.patrolWaypoints.length) {
          const target = this.patrolWaypoints[this.currentWaypointIndex]
          const dir = target.clone().sub(this.position).setY(0)
          const distance = dir.length()
          if (distance < 0.5) {
            this.currentWaypointIndex++
          } else {
            const step = dir.normalize().multiplyScalar(this.patrolMoveSpeed * delta)
            this.position.add(step)
            this.characterGroup.position.copy(this.position).sub(this.originalPosition)
            this.body.rotation.y = Math.atan2(dir.x, dir.z)
          }
        }
        if (this.currentWaypointIndex >= this.patrolWaypoints.length || this.patrolTimer <= 0) {
          this.patrolPhase = 'patrol_return'
          this.patrolPhaseTimer = 0
        }
        break

      case 'patrol_return':
        this.patrolTextSprite.visible = true
        const returnDir = this.originalPosition.clone().sub(this.position).setY(0)
        const returnDist = returnDir.length()
        if (returnDist < 0.5) {
          this.position.copy(this.originalPosition)
          this.characterGroup.position.set(0, 0, 0)
          this.patrolPhase = 'patrol_sitdown'
          this.patrolPhaseTimer = 0
        } else {
          const returnStep = returnDir.normalize().multiplyScalar(this.patrolMoveSpeed * delta)
          this.position.add(returnStep)
          this.characterGroup.position.copy(this.position).sub(this.originalPosition)
          this.body.rotation.y = Math.atan2(returnDir.x, returnDir.z)
        }
        break

      case 'patrol_sitdown':
        this.patrolTextSprite.visible = false
        if (this.patrolPhaseTimer >= this.PATROL_SIT_DOWN_DURATION) {
          this.isPatrolling = false
          this.state = 'normal'
          this.patrolPhase = 'idle'
          this.patrolVisionCone.visible = false
          this.characterGroup.position.set(0, 0, 0)
          this.body.rotation.y = 0
          this.head.rotation.y = 0
          this.scheduleNextLookBack()
        }
        break
    }
  }

  private generatePatrolWaypoints(): void {
    const candidatePoints = [
      new THREE.Vector3(-8, 0, -8),
      new THREE.Vector3(8, 0, -8),
      new THREE.Vector3(-8, 0, 8),
      new THREE.Vector3(8, 0, 8),
      new THREE.Vector3(0, 0, 5),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-5, 0, -5),
      new THREE.Vector3(5, 0, -5),
      new THREE.Vector3(-5, 0, 3),
      new THREE.Vector3(5, 0, 3),
      new THREE.Vector3(0, 0, -5),
      new THREE.Vector3(-3, 0, 8),
    ]

    const count = 2 + Math.floor(Math.random() * 3)
    const shuffled = candidatePoints.sort(() => Math.random() - 0.5)
    this.patrolWaypoints = []
    for (const point of shuffled) {
      if (this.patrolWaypoints.length >= count) break
      const tooClose = this.patrolWaypoints.some(wp => wp.distanceTo(point) < 3)
      if (!tooClose) {
        this.patrolWaypoints.push(point.clone())
      }
    }
    while (this.patrolWaypoints.length < count && shuffled.length > 0) {
      this.patrolWaypoints.push(shuffled.pop()!.clone())
    }
  }

  detectPlayerInVision(playerPos: THREE.Vector3): boolean {
    const toPlayer = playerPos.clone().sub(this.position).setY(0)
    const distance = toPlayer.length()
    if (distance > this.PATROL_DETECTION_RANGE) return false
    const facingDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.body.rotation.y)
    const angle = toPlayer.normalize().angleTo(facingDir)
    return angle < this.PATROL_DETECTION_HALF_ANGLE
  }

  isPlayerBehind(playerPos: THREE.Vector3): boolean {
    const toPlayer = playerPos.clone().sub(this.position).setY(0)
    const facingDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.body.rotation.y)
    return toPlayer.normalize().dot(facingDir) < 0
  }

  getIsPatrolling(): boolean {
    return this.isPatrolling
  }

  isPatrolWarning(): boolean {
    return this.isPatrolling && this.patrolPhase === 'patrol_warning'
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
    const patrolStandingY = 1.8
    const headOffset = 0.8

    if (this.isPatrolling) {
      switch (this.patrolPhase) {
        case 'patrol_warning':
          this.body.position.y = sittingY
          this.head.position.y = sittingY + headOffset
          this.body.rotation.x = Math.sin(Date.now() * 0.002) * 0.02
          break
        case 'patrol_standup': {
          const progress = Math.min(1, this.patrolPhaseTimer / this.PATROL_STAND_UP_DURATION)
          const eased = this.easeOutCubic(progress)
          this.body.position.y = sittingY + (patrolStandingY - sittingY) * eased
          this.head.position.y = this.body.position.y + headOffset
          this.body.rotation.x = 0
          break
        }
        case 'patrol_walk':
        case 'patrol_return':
          this.body.position.y = patrolStandingY
          this.head.position.y = patrolStandingY + headOffset
          this.body.rotation.x = 0
          break
        case 'patrol_sitdown': {
          const progress = Math.min(1, this.patrolPhaseTimer / this.PATROL_SIT_DOWN_DURATION)
          const eased = this.easeOutCubic(progress)
          this.body.position.y = patrolStandingY - (patrolStandingY - sittingY) * eased
          this.head.position.y = this.body.position.y + headOffset
          this.body.rotation.x = 0
          break
        }
      }
      return
    }

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

  applyStun(duration: number): void {
    this.isStunned = true
    this.stunTimer = duration
    this.state = 'normal'
    this.animationState = 'sitting'
    this.stunIndicator.visible = true
  }

  private updateStun(delta: number): void {
    this.stunTimer -= delta
    this.stunIndicator.rotation.y += delta * 5
    this.body.rotation.z = Math.sin(this.stunTimer * 3) * 0.05
    if (this.stunTimer <= 0) {
      this.isStunned = false
      this.stunIndicator.visible = false
      this.body.rotation.z = 0
      this.scheduleNextLookBack()
    }
  }

  private updateMeeting(delta: number): void {
    this.meetingTimer -= delta
    this.meetingShield.rotation.z += delta * 2
    const breathe = 0.5 + Math.sin(this.meetingTimer * 3) * 0.2
    ;(this.meetingShield.material as THREE.MeshBasicMaterial).opacity = breathe
    this.body.rotation.x = Math.sin(this.meetingTimer * 4) * 0.05
    this.body.rotation.z = Math.sin(this.meetingTimer * 3) * 0.03
    this.meetingArmWave += delta * 5
    this.armRight.rotation.x = -Math.PI / 3 + Math.sin(this.meetingArmWave) * 0.3
    this.armRight.rotation.z = Math.sin(this.meetingArmWave * 0.7) * 0.15
    this.armLeft.rotation.x = Math.PI / 3 + Math.sin(this.meetingArmWave * 0.8) * 0.15
    if (this.meetingTimer <= 0) {
      this.isMeeting = false
      this.meetingShield.visible = false
      this.meetingTextSprite.visible = false
      this.body.rotation.x = 0
      this.body.rotation.z = 0
      this.armRight.rotation.x = Math.PI / 3
      this.armRight.rotation.z = 0
      this.armLeft.rotation.x = Math.PI / 3
      this.state = 'normal'
      this.scheduleNextLookBack()
    }
  }

  startMeeting(duration: number): void {
    if (this.isPatrolling) return
    this.isMeeting = true
    this.meetingTimer = duration
    this.state = 'meeting'
    this.meetingShield.visible = true
    this.meetingTextSprite.visible = true
  }

  isInMeeting(): boolean {
    return this.isMeeting
  }

  isInStun(): boolean {
    return this.isStunned
  }

  dispose(): void {
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        const mat = child.material
        if (Array.isArray(mat)) mat.forEach(m => m.dispose())
        else if (mat) mat.dispose()
      }
      if (child instanceof THREE.Sprite) {
        const mat = child.material as THREE.SpriteMaterial
        mat.map?.dispose()
        mat.dispose()
      }
    })
    this.mesh.parent?.remove(this.mesh)
  }
}
