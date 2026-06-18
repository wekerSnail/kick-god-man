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
  }

  private createGround(): void {
    const ground = MeshBuilder.CreateGround('ground', {
      width: 30,
      height: 30
    }, this.scene)
    // 明亮浅木地板，卡通风格
    const mat = new PBRMaterial('groundMat', this.scene)
    mat.albedoColor = Color3.FromHexString('#E8D8B8')
    mat.roughness = 0.9
    mat.metallic = 0.0
    ground.material = mat
    ground.receiveShadows = true
    this.groundMats.push(mat)
  }

  private createWalls(): void {
    // 明亮卡通墙壁：纯白微蓝
    const wallMat = new PBRMaterial('wallMat', this.scene)
    wallMat.albedoColor = Color3.FromHexString('#F8FAFF')
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

    // 踢脚线：明亮浅木色
    const baseboardMat = new PBRMaterial('baseboardMat', this.scene)
    baseboardMat.albedoColor = Color3.FromHexString('#E0D4BE')
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

  /**
   * 把加载好的 GLB 模型根节点挂到父节点上，并按目标高度统一缩放、贴地。
   * 返回 false 表示没有有效子网格（加载失败），调用方可据此走回退分支。
   */
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
      this.shadowGen.addShadowCaster(m)
    })
    return true
  }

  private async createEnemyDesk(): Promise<void> {
    const deskParent = new TransformNode('enemyDesk', this.scene)
    deskParent.parent = this.furniture

    // —— 办公桌 ——
    const desk = await this.assetManager.loadProp('desk', deskUrl)
    const deskPlaced = this.placeProp(desk, deskParent, new Vector3(0, 0, -10), 0, 1.2)
    if (!deskPlaced) {
      this.fallbackDesk(deskParent, new Vector3(0, 0, -10))
    }

    // —— 办公椅（神人座椅，放在桌后 +z 侧，老板坐的位置）——
    const chair = await this.assetManager.loadProp('chair', chairUrl)
    const chairPlaced = this.placeProp(chair, deskParent, new Vector3(0, 0, -8.8), 0, 1.4)
    if (!chairPlaced) {
      this.fallbackChair(deskParent, new Vector3(0, 0, -8.8))
    }

    // —— 显示器（放在桌上，靠墙 -z 侧）——
    const screenUrl = `${import.meta.env.BASE_URL}models/computer.glb`
    const screen = await this.assetManager.loadProp('computerScreen', screenUrl)
    const screenPlaced = this.placeProp(screen, deskParent, new Vector3(0, 0, -10.5), Math.PI, 0.5)
    if (screenPlaced) {
      screen.position.y += 1.25
      screen.position.x = 0
    } else {
      this.fallbackScreen(deskParent, new Vector3(0, 0, -10.5))
    }

    // —— 键盘（放在桌上，显示器前方）——
    const keyboardUrl = `${import.meta.env.BASE_URL}models/Keyboard.glb`
    const keyboard = await this.assetManager.loadProp('computerKeyboard', keyboardUrl)
    const keyboardPlaced = this.placeProp(keyboard, deskParent, new Vector3(0, 0, -9.8), Math.PI, 0.027)
    if (keyboardPlaced) {
      keyboard.position.y += 1.25
      keyboard.position.x = 0
    } else {
      this.fallbackKeyboard(deskParent, new Vector3(0, 0, -9.8))
    }

    // —— 桌上小盆栽（点缀）——
    const deskPlant = await this.assetManager.loadProp('plantSmall1', plantSmall1Url)
    const deskPlantPlaced = this.placeProp(deskPlant, deskParent, new Vector3(0.8, 0, -10.3), 0, 0.35)
    if (deskPlantPlaced) {
      deskPlant.position.y += 1.25
    }

    // —— 书架（靠墙，作为办公区背景）——
    const bookcase = await this.assetManager.loadProp('bookcaseClosed', bookcaseClosedUrl)
    const bookcasePlaced = this.placeProp(bookcase, deskParent, new Vector3(-3, 0, -14.2), 0, 2.2)
    if (!bookcasePlaced) {
      this.fallbackBookcase(deskParent, new Vector3(-3, 0, -14.2))
    }

    // —— 吊灯（视觉点缀，挂在上方）——
    const lamp = await this.assetManager.loadProp('lampSquareCeiling', lampSquareCeilingUrl)
    const lampPlaced = this.placeProp(lamp, deskParent, new Vector3(0, 0, -10), Math.PI, 0.5)
    if (lampPlaced) {
      lamp.position.y = 7.5
    }

    // —— 地毯（办公区下方）——
    const rug = await this.assetManager.loadProp('rugRectangle', rugRectangleUrl)
    const rugPlaced = this.placeProp(rug, deskParent, new Vector3(0, 0, -9.5), 0, 0.02)
    if (!rugPlaced) {
      const rugMesh = MeshBuilder.CreateBox('fallbackRug', {
        width: 3.5,
        height: 0.02,
        depth: 2.2
      }, this.scene)
      rugMesh.position = new Vector3(0, 0.01, -9.5)
      rugMesh.parent = deskParent
      const rugMat = new PBRMaterial('fallbackRugMat', this.scene)
      rugMat.albedoColor = Color3.FromHexString('#A8C8E8')
      rugMat.roughness = 1.0
      rugMesh.material = rugMat
    }
  }

  // ===== 回退（程序化）几何体：仅在 GLB 加载失败时使用，颜色统一明亮 =====

  private fallbackDesk(parent: TransformNode, pos: Vector3): void {
    const deskMat = new PBRMaterial('fallbackDeskMat', this.scene)
    deskMat.albedoColor = Color3.FromHexString('#DEB887')
    deskMat.roughness = 0.7
    deskMat.metallic = 0.0

    const top = MeshBuilder.CreateBox('fallbackDeskTop', {
      width: 2.4,
      height: 0.1,
      depth: 1.4
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
        width: 0.1,
        height: 1.2,
        depth: 0.1
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
      width: 0.55,
      height: 0.08,
      depth: 0.55
    }, this.scene)
    seat.position = new Vector3(pos.x, 0.55, pos.z)
    seat.parent = parent
    seat.material = mat
    const back = MeshBuilder.CreateBox('fallbackChairBack', {
      width: 0.55,
      height: 0.6,
      depth: 0.06
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
      width: 0.85,
      height: 0.5,
      depth: 0.04
    }, this.scene)
    screen.position = new Vector3(pos.x, 1.75, pos.z)
    screen.parent = parent
    screen.material = frame
    const panel = MeshBuilder.CreatePlane('fallbackScreenPanel', {
      width: 0.8,
      height: 0.45
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
      width: 0.5,
      height: 0.02,
      depth: 0.18
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
      width: 1.4,
      height: 2.2,
      depth: 0.4
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
