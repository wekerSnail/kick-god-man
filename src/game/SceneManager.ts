import * as THREE from 'three'

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    )
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    
    this.init()
  }

  private init() {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    const shadowSize = isMobile ? 1024 : 2048
    
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(0x87CEEB)
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 100)

    this.setupLights(shadowSize)
    this.createGround()
    this.createWalls()
  }

  private setupLights(shadowSize: number) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = shadowSize
    directionalLight.shadow.mapSize.height = shadowSize
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    this.scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0xffffff, 0.3, 50)
    pointLight.position.set(0, 10, 0)
    this.scene.add(pointLight)
  }

  private createGround() {
    const groundGeometry = new THREE.PlaneGeometry(30, 30)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x90EE90,
      roughness: 0.8,
      metalness: 0.2
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  private createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5F5DC,
      roughness: 0.9,
      metalness: 0.1
    })

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(30, 8, 0.2),
      wallMaterial
    )
    backWall.position.set(0, 4, -15)
    backWall.receiveShadow = true
    this.scene.add(backWall)

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 8, 30),
      wallMaterial
    )
    leftWall.position.set(-15, 4, 0)
    leftWall.receiveShadow = true
    this.scene.add(leftWall)

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 8, 30),
      wallMaterial
    )
    rightWall.position.set(15, 4, 0)
    rightWall.receiveShadow = true
    this.scene.add(rightWall)
  }

  getScene(): THREE.Scene {
    return this.scene
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  update() {
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  dispose() {
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
