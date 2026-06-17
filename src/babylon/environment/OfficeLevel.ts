import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  ShadowGenerator,
  TransformNode
} from '@babylonjs/core'

export class OfficeLevel {
  private scene: Scene
  private shadowGen: ShadowGenerator
  private furniture: TransformNode

  constructor(scene: Scene, shadowGen: ShadowGenerator) {
    this.scene = scene
    this.shadowGen = shadowGen
    this.furniture = new TransformNode('furniture', this.scene)

    this.createGround()
    this.createWalls()
    this.createEnemyDesk()
  }

  private createGround(): void {
    const ground = MeshBuilder.CreateGround('ground', {
      width: 30,
      height: 30
    }, this.scene)
    const mat = new PBRMaterial('groundMat', this.scene)
    mat.albedoColor = Color3.FromHexString('#3a2a1f')
    mat.roughness = 0.9
    mat.metallic = 0.1
    ground.material = mat
    ground.receiveShadows = true
  }

  private createWalls(): void {
    const wallMat = new PBRMaterial('wallMat', this.scene)
    wallMat.albedoColor = Color3.FromHexString('#a8946a')
    wallMat.roughness = 1.0
    wallMat.metallic = 0.0

    const backWall = MeshBuilder.CreateBox('backWall', {
      width: 30,
      height: 8,
      depth: 0.2
    }, this.scene)
    backWall.position = new Vector3(0, 4, -15)
    backWall.material = wallMat
    backWall.receiveShadows = true

    const leftWall = MeshBuilder.CreateBox('leftWall', {
      width: 0.2,
      height: 8,
      depth: 30
    }, this.scene)
    leftWall.position = new Vector3(-15, 4, 0)
    leftWall.material = wallMat
    leftWall.receiveShadows = true

    const rightWall = MeshBuilder.CreateBox('rightWall', {
      width: 0.2,
      height: 8,
      depth: 30
    }, this.scene)
    rightWall.position = new Vector3(15, 4, 0)
    rightWall.material = wallMat
    rightWall.receiveShadows = true

    const baseboardMat = new PBRMaterial('baseboardMat', this.scene)
    baseboardMat.albedoColor = Color3.FromHexString('#2b241a')
    baseboardMat.roughness = 0.8

    const baseboardBack = MeshBuilder.CreateBox('baseboardBack', {
      width: 30,
      height: 0.3,
      depth: 0.05
    }, this.scene)
    baseboardBack.position = new Vector3(0, 0.15, -14.9)
    baseboardBack.material = baseboardMat

    const baseboardLeft = MeshBuilder.CreateBox('baseboardLeft', {
      width: 0.05,
      height: 0.3,
      depth: 30
    }, this.scene)
    baseboardLeft.position = new Vector3(-14.9, 0.15, 0)
    baseboardLeft.material = baseboardMat

    const baseboardRight = MeshBuilder.CreateBox('baseboardRight', {
      width: 0.05,
      height: 0.3,
      depth: 30
    }, this.scene)
    baseboardRight.position = new Vector3(14.9, 0.15, 0)
    baseboardRight.material = baseboardMat
  }

  private createEnemyDesk(): void {
    const deskMat = new PBRMaterial('deskMat', this.scene)
    deskMat.albedoColor = Color3.FromHexString('#8B6914')
    deskMat.roughness = 0.7
    deskMat.metallic = 0.1

    const deskTop = MeshBuilder.CreateBox('deskTop', {
      width: 2.0,
      height: 0.1,
      depth: 1.2
    }, this.scene)
    deskTop.position = new Vector3(0, 1.0, -10)
    deskTop.parent = this.furniture
    deskTop.material = deskMat
    deskTop.receiveShadows = true
    this.shadowGen.addShadowCaster(deskTop)

    const legPositions = [
      new Vector3(-0.9, 0.5, -10.5),
      new Vector3(0.9, 0.5, -10.5),
      new Vector3(-0.9, 0.5, -9.5),
      new Vector3(0.9, 0.5, -9.5)
    ]

    legPositions.forEach((pos, i) => {
      const leg = MeshBuilder.CreateCylinder(`deskLeg_${i}`, {
        diameter: 0.08,
        height: 1.0,
        tessellation: 8
      }, this.scene)
      leg.position = pos
      leg.parent = this.furniture
      leg.material = deskMat
      this.shadowGen.addShadowCaster(leg)
    })

    const monitorMat = new PBRMaterial('monitorMat', this.scene)
    monitorMat.albedoColor = Color3.FromHexString('#2F2F2F')
    monitorMat.roughness = 0.3
    monitorMat.metallic = 0.8

    const monitorBase = MeshBuilder.CreateCylinder('monitorBase', {
      diameter: 0.4,
      height: 0.05,
      tessellation: 16
    }, this.scene)
    monitorBase.position = new Vector3(0, 1.1, -10)
    monitorBase.parent = this.furniture
    monitorBase.material = monitorMat

    const monitorPole = MeshBuilder.CreateCylinder('monitorPole', {
      diameter: 0.06,
      height: 0.4,
      tessellation: 8
    }, this.scene)
    monitorPole.position = new Vector3(0, 1.3, -10)
    monitorPole.parent = this.furniture
    monitorPole.material = monitorMat

    const screen = MeshBuilder.CreateBox('screen', {
      width: 0.8,
      height: 0.5,
      depth: 0.05
    }, this.scene)
    screen.position = new Vector3(0, 1.6, -10)
    screen.parent = this.furniture
    const screenMat = new PBRMaterial('screenMat', this.scene)
    screenMat.albedoColor = Color3.FromHexString('#1a1a2e')
    screenMat.roughness = 0.1
    screenMat.metallic = 0.9
    screenMat.emissiveColor = Color3.FromHexString('#0a0a1a')
    screen.material = screenMat

    const chairSeatMat = new PBRMaterial('chairSeatMat', this.scene)
    chairSeatMat.albedoColor = Color3.FromHexString('#2F2F2F')
    chairSeatMat.roughness = 0.6

    const chairSeat = MeshBuilder.CreateCylinder('chairSeat', {
      diameter: 0.6,
      height: 0.1,
      tessellation: 16
    }, this.scene)
    chairSeat.position = new Vector3(0, 0.6, -9.0)
    chairSeat.parent = this.furniture
    chairSeat.material = chairSeatMat

    const chairBack = MeshBuilder.CreateBox('chairBack', {
      width: 0.5,
      height: 0.6,
      depth: 0.08
    }, this.scene)
    chairBack.position = new Vector3(0, 0.95, -8.7)
    chairBack.parent = this.furniture
    chairBack.material = chairSeatMat

    const chairPole = MeshBuilder.CreateCylinder('chairPole', {
      diameter: 0.06,
      height: 0.5,
      tessellation: 8
    }, this.scene)
    chairPole.position = new Vector3(0, 0.35, -9.0)
    chairPole.parent = this.furniture
    chairPole.material = monitorMat
  }

  getFurniture(): TransformNode {
    return this.furniture
  }

  dispose(): void {
    this.furniture.dispose()
  }
}
