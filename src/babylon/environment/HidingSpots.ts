import {
  Scene,
  TransformNode,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  ShadowGenerator,
  Mesh
} from '@babylonjs/core'
import type { AssetManager } from '../core/AssetManager'
import type { HidingSpot } from '../../types/game'
import { HIDING_SPOTS } from '../../types/game'

const FURNITURE_BASE = '/src/assets/kenney_furniture-kit/Models/GLB format'

/**
 * 躲藏点：盆栽 / 文件柜 / 沙发。
 * 优先加载 Kenney 真实 GLB 模型；加载失败则回退到明亮程序化几何体。
 */
export class HidingSpots {
  private scene: Scene
  private shadowGen: ShadowGenerator
  private assetManager: AssetManager
  private spots: { config: HidingSpot; mesh: TransformNode }[] = []

  constructor(
    scene: Scene,
    shadowGen: ShadowGenerator,
    assetManager: AssetManager
  ) {
    this.scene = scene
    this.shadowGen = shadowGen
    this.assetManager = assetManager
    this.createHidingSpots()
  }

  private async createHidingSpots(): Promise<void> {
    for (const config of HIDING_SPOTS) {
      const parent = new TransformNode(`hide_${config.id}`, this.scene)
      switch (config.id) {
        case 'plant':
          await this.createPlant(parent)
          break
        case 'cabinet':
          await this.createCabinet(parent)
          break
        case 'sofa':
          await this.createSofa(parent)
          break
      }
      parent.position = new Vector3(config.position.x, config.position.y, config.position.z)
      this.spots.push({ config, mesh: parent })
    }
  }

  private placeProp(prop: Mesh, parent: TransformNode, targetHeight: number): boolean {
    const childMeshes = prop.getChildMeshes()
    if (childMeshes.length === 0) return false
    prop.refreshBoundingInfo(true)
    const info = prop.getBoundingInfo()
    const minY = info.boundingBox.minimumWorld.y
    const height = Math.max(0.001, info.boundingBox.maximumWorld.y - minY)
    const scale = targetHeight / height
    prop.parent = parent
    prop.scaling = new Vector3(scale, scale, scale)
    prop.position.y = -minY * scale
    childMeshes.forEach(m => {
      m.receiveShadows = true
      this.shadowGen.addShadowCaster(m)
    })
    return true
  }

  private async createPlant(parent: TransformNode): Promise<void> {
    const model = await this.assetManager.loadProp('pottedPlant', `${FURNITURE_BASE}/pottedPlant.glb`)
    const placed = this.placeProp(model, parent, 1.8)
    if (!placed) {
      this.fallbackPlant(parent)
    }
  }

  private async createCabinet(parent: TransformNode): Promise<void> {
    const model = await this.assetManager.loadProp('bookcaseClosedDoors', `${FURNITURE_BASE}/bookcaseClosedDoors.glb`)
    const placed = this.placeProp(model, parent, 2.4)
    if (!placed) {
      this.fallbackCabinet(parent)
    }
  }

  private async createSofa(parent: TransformNode): Promise<void> {
    const model = await this.assetManager.loadProp('loungeSofa', `${FURNITURE_BASE}/loungeSofa.glb`)
    const placed = this.placeProp(model, parent, 1.1)
    if (!placed) {
      this.fallbackSofa(parent)
    }
  }

  // ===== 明亮回退几何体 =====

  private fallbackPlant(parent: TransformNode): void {
    const pot = MeshBuilder.CreateCylinder('pot', {
      diameterTop: 0.8,
      diameterBottom: 0.6,
      height: 0.6,
      tessellation: 8
    }, this.scene)
    pot.position.y = 0.3
    pot.parent = parent
    const potMat = new PBRMaterial('potMat', this.scene)
    potMat.albedoColor = Color3.FromHexString('#CD853F')
    pot.material = potMat

    const trunk = MeshBuilder.CreateCylinder('trunk', {
      diameter: 0.16,
      height: 1.0,
      tessellation: 8
    }, this.scene)
    trunk.position.y = 1.1
    trunk.parent = parent
    const trunkMat = new PBRMaterial('trunkMat', this.scene)
    trunkMat.albedoColor = Color3.FromHexString('#A0724A')
    trunk.material = trunkMat

    const leafMat = new PBRMaterial('leafMat', this.scene)
    leafMat.albedoColor = Color3.FromHexString('#66BB6A')
    const leafPositions = [
      new Vector3(0, 1.8, 0),
      new Vector3(0.3, 1.6, 0.2),
      new Vector3(-0.3, 1.6, -0.2),
      new Vector3(0.2, 1.7, -0.3),
      new Vector3(-0.2, 1.7, 0.3)
    ]
    leafPositions.forEach((pos, i) => {
      const leaf = MeshBuilder.CreateSphere(`leaf_${i}`, {
        diameter: 0.6,
        segments: 8
      }, this.scene)
      leaf.position = pos
      leaf.parent = parent
      leaf.material = leafMat
    })
  }

  private fallbackCabinet(parent: TransformNode): void {
    const mat = new PBRMaterial('fallbackCabinetMat', this.scene)
    mat.albedoColor = Color3.FromHexString('#C8C0B0')
    mat.roughness = 0.8
    const body = MeshBuilder.CreateBox('fallbackCabinet', {
      width: 2,
      height: 2.4,
      depth: 0.8
    }, this.scene)
    body.position.y = 1.2
    body.parent = parent
    body.material = mat
    body.receiveShadows = true
  }

  private fallbackSofa(parent: TransformNode): void {
    const mat = new PBRMaterial('fallbackSofaMat', this.scene)
    mat.albedoColor = Color3.FromHexString('#6B9AC4')
    mat.roughness = 0.9
    const seat = MeshBuilder.CreateBox('seat', {
      width: 3,
      height: 0.5,
      depth: 1.2
    }, this.scene)
    seat.position.y = 0.4
    seat.parent = parent
    seat.material = mat
    const back = MeshBuilder.CreateBox('sofaBack', {
      width: 3,
      height: 0.8,
      depth: 0.3
    }, this.scene)
    back.position = new Vector3(0, 1.0, -0.45)
    back.parent = parent
    back.material = mat
  }

  isInHidingSpot(playerPosition: Vector3): boolean {
    for (const spot of this.spots) {
      const spotPos = spot.config.position
      const dx = playerPosition.x - spotPos.x
      const dz = playerPosition.z - spotPos.z
      const distance = Math.sqrt(dx * dx + dz * dz)
      const spotSize = spot.config.size
      const maxDist = Math.max(spotSize.x, spotSize.z) / 2 + 0.5

      if (distance < maxDist) {
        return true
      }
    }
    return false
  }

  getSpots(): { config: HidingSpot; mesh: TransformNode }[] {
    return this.spots
  }

  dispose(): void {
    this.spots.forEach(spot => {
      spot.mesh.dispose()
    })
    this.spots = []
  }
}
