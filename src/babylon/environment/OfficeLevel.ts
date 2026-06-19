import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  ShadowGenerator,
  TransformNode
} from '@babylonjs/core'
import type { AssetManager } from '../core/AssetManager'

import deskUrl from '../../assets/kenney_furniture-kit/Models/GLTF format/desk.glb?url'
import chairUrl from '../../assets/kenney_furniture-kit/Models/GLTF format/chair.glb?url'
import plantSmall1Url from '../../assets/kenney_furniture-kit/Models/GLTF format/plantSmall1.glb?url'
import bookcaseClosedUrl from '../../assets/kenney_furniture-kit/Models/GLTF format/bookcaseClosed.glb?url'
import lampSquareCeilingUrl from '../../assets/kenney_furniture-kit/Models/GLTF format/lampSquareCeiling.glb?url'
import rugRectangleUrl from '../../assets/kenney_furniture-kit/Models/GLTF format/rugRectangle.glb?url'

// computer 和 Keyboard 使用 public 目录
const computerUrl = new URL('/models/computer.glb', import.meta.url).href
const keyboardUrl = new URL('/models/Keyboard.glb', import.meta.url).href

const ROOM_SIZE = 20
const WALL_HEIGHT = 6

export class OfficeLevel {
  private scene: Scene
  private shadowGen: ShadowGenerator
  private assetManager: AssetManager
  private furniture: TransformNode
  private groundMats: PBRMaterial[] = []

  constructor(scene: Scene, shadowGen: ShadowGenerator, assetManager: AssetManager) {
    this.scene = scene
    this.shadowGen = shadowGen
    this.assetManager = assetManager
    this.furniture = new TransformNode('furniture', this.scene)

    this.createGround()
    this.createWalls()
    this.createEnemyDesk()
    this.createBed()
    this.createSofa()
    this.createWindow()
    this.createShelf()
    this.createPlants()
  }

  private createGround(): void {
    const ground = MeshBuilder.CreateGround('ground', {
      width: ROOM_SIZE,
      height: ROOM_SIZE
    }, this.scene)
    const mat = new PBRMaterial('groundMat', this.scene)
    mat.albedoColor = Color3.FromHexString('#E8D5B0')
    mat.roughness = 0.9
    mat.metallic = 0.0
    ground.material = mat
    ground.receiveShadows = true
    this.groundMats.push(mat)
  }

  private createWalls(): void {
    const wallMat = new PBRMaterial('wallMat', this.scene)
    wallMat.albedoColor = Color3.FromHexString('#F5D76E')
    wallMat.roughness = 1.0
    wallMat.metallic = 0.0

    const half = ROOM_SIZE / 2

    // 背面墙（-Z 方向）
    const backWall = MeshBuilder.CreateBox('backWall', {
      width: ROOM_SIZE,
      height: WALL_HEIGHT,
      depth: 0.2
    }, this.scene)
    backWall.position = new Vector3(0, WALL_HEIGHT / 2, -half)
    backWall.material = wallMat
    backWall.receiveShadows = true

    // 右侧墙（+X 方向）
    const rightWall = MeshBuilder.CreateBox('rightWall', {
      width: 0.2,
      height: WALL_HEIGHT,
      depth: ROOM_SIZE
    }, this.scene)
    rightWall.position = new Vector3(half, WALL_HEIGHT / 2, 0)
    rightWall.material = wallMat
    rightWall.receiveShadows = true

    // 踢脚线
    const baseboardMat = new PBRMaterial('baseboardMat', this.scene)
    baseboardMat.albedoColor = Color3.FromHexString('#C4A06A')
    baseboardMat.roughness = 0.8

    const baseboardBack = MeshBuilder.CreateBox('baseboardBack', {
      width: ROOM_SIZE,
      height: 0.3,
      depth: 0.05
    }, this.scene)
    baseboardBack.position = new Vector3(0, 0.15, -half + 0.1)
    baseboardBack.material = baseboardMat

    const baseboardRight = MeshBuilder.CreateBox('baseboardRight', {
      width: 0.05,
      height: 0.3,
      depth: ROOM_SIZE
    }, this.scene)
    baseboardRight.position = new Vector3(half - 0.1, 0.15, 0)
    baseboardRight.material = baseboardMat
  }

  private placeProp(
    prop: TransformNode,
    parent: TransformNode,
    position: Vector3,
    rotationY: number,
    targetHeight: number
  ): boolean {
    const childMeshes = prop.getChildMeshes()
    if (childMeshes.length === 0) return false

    let minY = Infinity
    let maxY = -Infinity
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    childMeshes.forEach(m => {
      m.computeWorldMatrix(true)
      const bi = m.getBoundingInfo()
      minY = Math.min(minY, bi.boundingBox.minimumWorld.y)
      maxY = Math.max(maxY, bi.boundingBox.maximumWorld.y)
      minX = Math.min(minX, bi.boundingBox.minimumWorld.x)
      maxX = Math.max(maxX, bi.boundingBox.maximumWorld.x)
      minZ = Math.min(minZ, bi.boundingBox.minimumWorld.z)
      maxZ = Math.max(maxZ, bi.boundingBox.maximumWorld.z)
    })
    const height = Math.max(0.001, maxY - minY)
    const scale = targetHeight / height
    const centerX = (minX + maxX) / 2
    const centerZ = (minZ + maxZ) / 2

    prop.parent = parent
    prop.scaling = new Vector3(scale, scale, scale)
    prop.position = new Vector3(position.x - centerX * scale, -minY * scale, position.z - centerZ * scale)
    prop.rotation.y = rotationY

    childMeshes.forEach(m => {
      m.receiveShadows = true
      // 仅较大物体投射阴影，小装饰跳过（P3.2 优化）
      if (targetHeight >= 0.4) {
        this.shadowGen.addShadowCaster(m)
      }
    })
    return true
  }

  private async createEnemyDesk(): Promise<void> {
    const deskParent = new TransformNode('enemyDesk', this.scene)
    deskParent.parent = this.furniture

    const desk = await this.assetManager.loadProp('desk', deskUrl)
    const deskPlaced = this.placeProp(desk, deskParent, new Vector3(0, 0, -7), 0, 1.2)
    if (!deskPlaced) {
      this.fallbackDesk(deskParent, new Vector3(0, 0, -7))
    }

    const chair = await this.assetManager.loadProp('chair', chairUrl)
    const chairPlaced = this.placeProp(chair, deskParent, new Vector3(0, 0, -5.8), Math.PI, 1.4)
    if (!chairPlaced) {
      this.fallbackChair(deskParent, new Vector3(0, 0, -5.8))
    }

    const screen = await this.assetManager.loadProp('computerScreen', computerUrl)
    const screenPlaced = this.placeProp(screen, deskParent, new Vector3(0, 0, -7.5), Math.PI, 0.5)
    if (screenPlaced) {
      screen.position.y += 1.25
      screen.position.x = 0
    } else {
      this.fallbackScreen(deskParent, new Vector3(0, 0, -7.5))
    }

    const keyboard = await this.assetManager.loadProp('computerKeyboard', keyboardUrl)
    const keyboardPlaced = this.placeProp(keyboard, deskParent, new Vector3(0, 0, -6.8), Math.PI, 0.027)
    if (keyboardPlaced) {
      keyboard.position.y += 1.25
      keyboard.position.x = 0
    } else {
      this.fallbackKeyboard(deskParent, new Vector3(0, 0, -6.8))
    }

    const deskPlant = await this.assetManager.loadProp('plantSmall1', plantSmall1Url)
    const deskPlantPlaced = this.placeProp(deskPlant, deskParent, new Vector3(0.8, 0, -7.3), 0, 0.35)
    if (deskPlantPlaced) {
      deskPlant.position.y += 1.25
    }

    const bookcase = await this.assetManager.loadProp('bookcaseClosed', bookcaseClosedUrl)
    const bookcasePlaced = this.placeProp(bookcase, deskParent, new Vector3(5, 0, -9.2), 0, 2.2)
    if (!bookcasePlaced) {
      this.fallbackBookcase(deskParent, new Vector3(5, 0, -9.2))
    }

    const lamp = await this.assetManager.loadProp('lampSquareCeiling', lampSquareCeilingUrl)
    const lampPlaced = this.placeProp(lamp, deskParent, new Vector3(0, 0, -7), Math.PI, 0.5)
    if (lampPlaced) {
      lamp.position.y = 5.5
    }

    const rug = await this.assetManager.loadProp('rugRectangle', rugRectangleUrl)
    const rugPlaced = this.placeProp(rug, deskParent, new Vector3(0, 0, -6.5), 0, 0.02)
    if (!rugPlaced) {
      const rugMesh = MeshBuilder.CreateBox('fallbackRug', {
        width: 3.5, height: 0.02, depth: 2.2
      }, this.scene)
      rugMesh.position = new Vector3(0, 0.01, -6.5)
      rugMesh.parent = deskParent
      const rugMat = new PBRMaterial('fallbackRugMat', this.scene)
      rugMat.albedoColor = Color3.FromHexString('#A8C8E8')
      rugMat.roughness = 1.0
      rugMesh.material = rugMat
    }
  }

  private createBed(): void {
    const bedParent = new TransformNode('bed', this.scene)
    bedParent.parent = this.furniture

    // 床架
    const frameMat = new PBRMaterial('bedFrameMat', this.scene)
    frameMat.albedoColor = Color3.FromHexString('#8B6F47')
    frameMat.roughness = 0.7

    const frame = MeshBuilder.CreateBox('bedFrame', {
      width: 2.0, height: 0.4, depth: 2.8
    }, this.scene)
    frame.position = new Vector3(-6, 0.2, -7)
    frame.parent = bedParent
    frame.material = frameMat
    frame.receiveShadows = true
    this.shadowGen.addShadowCaster(frame)

    // 床垫
    const mattressMat = new PBRMaterial('mattressMat', this.scene)
    mattressMat.albedoColor = Color3.FromHexString('#FFFFFF')
    mattressMat.roughness = 0.9

    const mattress = MeshBuilder.CreateBox('mattress', {
      width: 1.8, height: 0.25, depth: 2.6
    }, this.scene)
    mattress.position = new Vector3(-6, 0.52, -7)
    mattress.parent = bedParent
    mattress.material = mattressMat

    // 红格子床单
    const blanketMat = new PBRMaterial('blanketMat', this.scene)
    blanketMat.albedoColor = Color3.FromHexString('#E74C3C')
    blanketMat.roughness = 0.8

    const blanket = MeshBuilder.CreateBox('blanket', {
      width: 1.8, height: 0.08, depth: 1.8
    }, this.scene)
    blanket.position = new Vector3(-6, 0.68, -7.3)
    blanket.parent = bedParent
    blanket.material = blanketMat

    // 枕头
    const pillowMat = new PBRMaterial('pillowMat', this.scene)
    pillowMat.albedoColor = Color3.FromHexString('#F0E68C')
    pillowMat.roughness = 0.9

    const pillow = MeshBuilder.CreateBox('pillow', {
      width: 0.6, height: 0.15, depth: 0.4
    }, this.scene)
    pillow.position = new Vector3(-6, 0.72, -5.9)
    pillow.parent = bedParent
    pillow.material = pillowMat

    // 床头板
    const headboard = MeshBuilder.CreateBox('headboard', {
      width: 2.0, height: 1.0, depth: 0.1
    }, this.scene)
    headboard.position = new Vector3(-6, 0.9, -5.6)
    headboard.parent = bedParent
    headboard.material = frameMat
  }

  private createSofa(): void {
    const sofaParent = new TransformNode('sofa', this.scene)
    sofaParent.parent = this.furniture

    const sofaMat = new PBRMaterial('sofaMat', this.scene)
    sofaMat.albedoColor = Color3.FromHexString('#5B8C5A')
    sofaMat.roughness = 0.8

    // 座垫
    const seat = MeshBuilder.CreateBox('sofaSeat', {
      width: 2.4, height: 0.4, depth: 0.9
    }, this.scene)
    seat.position = new Vector3(-4, 0.3, -2)
    seat.parent = sofaParent
    seat.material = sofaMat
    seat.receiveShadows = true

    // 靠背
    const back = MeshBuilder.CreateBox('sofaBack', {
      width: 2.4, height: 0.6, depth: 0.15
    }, this.scene)
    back.position = new Vector3(-4, 0.7, -2.4)
    back.parent = sofaParent
    back.material = sofaMat

    // 扶手
    const armMat = new PBRMaterial('sofaArmMat', this.scene)
    armMat.albedoColor = Color3.FromHexString('#4A7A49')
    armMat.roughness = 0.8

    const armL = MeshBuilder.CreateBox('sofaArmL', {
      width: 0.15, height: 0.5, depth: 0.9
    }, this.scene)
    armL.position = new Vector3(-5.1, 0.45, -2)
    armL.parent = sofaParent
    armL.material = armMat

    const armR = MeshBuilder.CreateBox('sofaArmR', {
      width: 0.15, height: 0.5, depth: 0.9
    }, this.scene)
    armR.position = new Vector3(-2.9, 0.45, -2)
    armR.parent = sofaParent
    armR.material = armMat

    // 靠枕
    const cushionMat = new PBRMaterial('cushionMat', this.scene)
    cushionMat.albedoColor = Color3.FromHexString('#F39C12')
    cushionMat.roughness = 0.9

    for (let i = 0; i < 2; i++) {
      const cushion = MeshBuilder.CreateBox(`sofaCushion_${i}`, {
        width: 0.4, height: 0.4, depth: 0.15
      }, this.scene)
      cushion.position = new Vector3(-4.5 + i * 1.0, 0.7, -2.35)
      cushion.parent = sofaParent
      cushion.material = cushionMat
    }
  }

  private createWindow(): void {
    const winParent = new TransformNode('window', this.scene)
    winParent.parent = this.furniture

    // 窗框
    const frameMat = new PBRMaterial('windowFrameMat', this.scene)
    frameMat.albedoColor = Color3.FromHexString('#FFFFFF')
    frameMat.roughness = 0.5

    const frame = MeshBuilder.CreateBox('windowFrame', {
      width: 2.5, height: 2.0, depth: 0.1
    }, this.scene)
    frame.position = new Vector3(5, 3.0, -9.85)
    frame.parent = winParent
    frame.material = frameMat

    // 玻璃（半透明蓝）
    const glassMat = new PBRMaterial('glassMat', this.scene)
    glassMat.albedoColor = Color3.FromHexString('#87CEEB')
    glassMat.alpha = 0.4
    glassMat.roughness = 0.1

    const glass = MeshBuilder.CreatePlane('windowGlass', {
      width: 2.3, height: 1.8
    }, this.scene)
    glass.position = new Vector3(5, 3.0, -9.8)
    glass.parent = winParent
    glass.material = glassMat

    // 百叶窗条纹
    const blindMat = new PBRMaterial('blindMat', this.scene)
    blindMat.albedoColor = Color3.FromHexString('#D4C5A0')
    blindMat.roughness = 0.8

    for (let i = 0; i < 6; i++) {
      const slat = MeshBuilder.CreateBox(`blind_${i}`, {
        width: 2.3, height: 0.05, depth: 0.08
      }, this.scene)
      slat.position = new Vector3(5, 2.2 + i * 0.28, -9.75)
      slat.parent = winParent
      slat.material = blindMat
      slat.rotation.x = 0.3
    }
  }

  private createShelf(): void {
    const shelfParent = new TransformNode('shelf', this.scene)
    shelfParent.parent = this.furniture

    const shelfMat = new PBRMaterial('shelfMat', this.scene)
    shelfMat.albedoColor = Color3.FromHexString('#C4A06A')
    shelfMat.roughness = 0.7

    // 书色材质提到循环外复用，每种颜色只创建一次（P3.3）
    const bookColors = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12']
    const bookMats = bookColors.map((c, i) => {
      const m = new PBRMaterial(`bookMat_${i}`, this.scene)
      m.albedoColor = Color3.FromHexString(c)
      return m
    })

    // 搁板支架材质只创建一次（P3.3）
    const bracketMat = new PBRMaterial('bracketMat', this.scene)
    bracketMat.albedoColor = Color3.FromHexString('#333333')

    // 两层搁板
    for (let row = 0; row < 2; row++) {
      const shelf = MeshBuilder.CreateBox(`shelf_${row}`, {
        width: 1.8, height: 0.06, depth: 0.35
      }, this.scene)
      shelf.position = new Vector3(-7, 2.5 + row * 1.2, -9.75)
      shelf.parent = shelfParent
      shelf.material = shelfMat

      for (let b = 0; b < 4; b++) {
        const book = MeshBuilder.CreateBox(`book_${row}_${b}`, {
          width: 0.15, height: 0.3 + Math.random() * 0.15, depth: 0.2
        }, this.scene)
        book.position = new Vector3(-7.5 + b * 0.35, 2.68 + row * 1.2 + 0.15, -9.75)
        book.parent = shelfParent
        book.material = bookMats[b % bookMats.length]
      }

      for (let side = 0; side < 2; side++) {
        const bracket = MeshBuilder.CreateBox(`bracket_${row}_${side}`, {
          width: 0.04, height: 0.3, depth: 0.04
        }, this.scene)
        bracket.position = new Vector3(-7.7 + side * 1.6, 2.35 + row * 1.2, -9.75)
        bracket.parent = shelfParent
        bracket.material = bracketMat
      }
    }
  }

  private createPlants(): void {
    // 地面盆栽（沙发旁）
    this.createFloorPlant(new Vector3(-2, 0, -2))
    // 地面盆栽（床尾）
    this.createFloorPlant(new Vector3(-5, 0, -4))
  }

  private async createFloorPlant(pos: Vector3): Promise<void> {
    const plantParent = new TransformNode('floorPlant', this.scene)
    plantParent.parent = this.furniture

    const plant = await this.assetManager.loadProp('floorPlant_' + pos.x, plantSmall1Url)
    const placed = this.placeProp(plant, plantParent, pos, 0, 0.8)
    if (!placed) {
      // 回退：简单绿色球体
      const potMat = new PBRMaterial('potMat_' + pos.x, this.scene)
      potMat.albedoColor = Color3.FromHexString('#8B6F47')
      const pot = MeshBuilder.CreateCylinder('pot_' + pos.x, {
        diameterTop: 0.3, diameterBottom: 0.25, height: 0.4, tessellation: 8
      }, this.scene)
      pot.position = new Vector3(pos.x, 0.2, pos.z)
      pot.parent = plantParent
      pot.material = potMat

      const leafMat = new PBRMaterial('leafMat_' + pos.x, this.scene)
      leafMat.albedoColor = Color3.FromHexString('#27AE60')
      leafMat.emissiveColor = Color3.FromHexString('#1E8449')
      leafMat.emissiveIntensity = 0.15
      const leaves = MeshBuilder.CreateSphere('leaves_' + pos.x, {
        diameter: 0.6, segments: 8
      }, this.scene)
      leaves.position = new Vector3(pos.x, 0.7, pos.z)
      leaves.parent = plantParent
      leaves.material = leafMat
    }
  }

  // ===== 回退几何体 =====

  private fallbackDesk(parent: TransformNode, pos: Vector3): void {
    const deskMat = new PBRMaterial('fallbackDeskMat', this.scene)
    deskMat.albedoColor = Color3.FromHexString('#DEB887')
    deskMat.roughness = 0.7
    deskMat.metallic = 0.0

    const top = MeshBuilder.CreateBox('fallbackDeskTop', {
      width: 2.4, height: 0.1, depth: 1.4
    }, this.scene)
    top.position = new Vector3(pos.x, 1.2, pos.z)
    top.parent = parent
    top.material = deskMat
    top.receiveShadows = true
    this.shadowGen.addShadowCaster(top)

    const legPos = [
      new Vector3(pos.x - 1.1, 0.6, pos.z - 0.6),
      new Vector3(pos.x + 1.1, 0.6, pos.z - 0.6),
      new Vector3(pos.x - 1.1, 0.6, pos.z + 0.6),
      new Vector3(pos.x + 1.1, 0.6, pos.z + 0.6)
    ]
    legPos.forEach((p, i) => {
      const leg = MeshBuilder.CreateBox(`fallbackDeskLeg_${i}`, {
        width: 0.1, height: 1.2, depth: 0.1
      }, this.scene)
      leg.position = p
      leg.parent = parent
      leg.material = deskMat
      this.shadowGen.addShadowCaster(leg)
    })
  }

  private fallbackChair(parent: TransformNode, pos: Vector3): void {
    const mat = new PBRMaterial('fallbackChairMat', this.scene)
    mat.albedoColor = Color3.FromHexString('#5A7A9A')
    mat.roughness = 0.6
    const seat = MeshBuilder.CreateBox('fallbackChairSeat', {
      width: 0.55, height: 0.08, depth: 0.55
    }, this.scene)
    seat.position = new Vector3(pos.x, 0.55, pos.z)
    seat.parent = parent
    seat.material = mat
    const back = MeshBuilder.CreateBox('fallbackChairBack', {
      width: 0.55, height: 0.6, depth: 0.06
    }, this.scene)
    back.position = new Vector3(pos.x, 0.88, pos.z - 0.25)
    back.parent = parent
    back.material = mat
  }

  private fallbackScreen(parent: TransformNode, pos: Vector3): void {
    const frame = new PBRMaterial('fallbackFrameMat', this.scene)
    frame.albedoColor = Color3.FromHexString('#4A5568')
    frame.roughness = 0.4
    frame.metallic = 0.3
    const screen = MeshBuilder.CreateBox('fallbackScreen', {
      width: 0.85, height: 0.5, depth: 0.04
    }, this.scene)
    screen.position = new Vector3(pos.x, 1.75, pos.z)
    screen.parent = parent
    screen.material = frame
    const panel = MeshBuilder.CreatePlane('fallbackScreenPanel', {
      width: 0.8, height: 0.45
    }, this.scene)
    panel.position = new Vector3(pos.x, 1.75, pos.z - 0.025)
    panel.parent = parent
    const panelMat = new PBRMaterial('fallbackScreenPanelMat', this.scene)
    panelMat.albedoColor = Color3.FromHexString('#1A3A5A')
    panelMat.emissiveColor = Color3.FromHexString('#2E86DE')
    panelMat.roughness = 0.2
    panel.material = panelMat
  }

  private fallbackKeyboard(parent: TransformNode, pos: Vector3): void {
    const mat = new PBRMaterial('fallbackKeyboardMat', this.scene)
    mat.albedoColor = Color3.FromHexString('#6B7280')
    mat.roughness = 0.6
    const kb = MeshBuilder.CreateBox('fallbackKeyboard', {
      width: 0.5, height: 0.02, depth: 0.18
    }, this.scene)
    kb.position = new Vector3(pos.x, 1.25, pos.z)
    kb.parent = parent
    kb.material = mat
  }

  private fallbackBookcase(parent: TransformNode, pos: Vector3): void {
    const mat = new PBRMaterial('fallbackBookcaseMat', this.scene)
    mat.albedoColor = Color3.FromHexString('#C4A06A')
    mat.roughness = 0.7
    const body = MeshBuilder.CreateBox('fallbackBookcase', {
      width: 1.4, height: 2.2, depth: 0.4
    }, this.scene)
    body.position = new Vector3(pos.x, 1.1, pos.z)
    body.parent = parent
    body.material = mat
    body.receiveShadows = true
    this.shadowGen.addShadowCaster(body)
  }

  getFurniture(): TransformNode {
    return this.furniture
  }

  dispose(): void {
    this.groundMats.forEach(m => m.dispose())
    this.groundMats = []
    this.furniture.dispose()
  }
}
