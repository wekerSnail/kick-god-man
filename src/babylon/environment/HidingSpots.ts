import {
  Scene,
  TransformNode,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  ShadowGenerator
} from '@babylonjs/core'
import type { HidingSpot } from '../../types/game'
import { HIDING_SPOTS } from '../../types/game'

export class HidingSpots {
  private spots: { config: HidingSpot; mesh: TransformNode }[] = []

  constructor(
    private scene: Scene,
    private shadowGen: ShadowGenerator
  ) {
    this.createHidingSpots()
  }

  private createHidingSpots(): void {
    HIDING_SPOTS.forEach(config => {
      const mesh = this.createHidingSpotMesh(config)
      mesh.position = new Vector3(config.position.x, config.position.y, config.position.z)
      this.spots.push({ config, mesh })
    })
  }

  private createHidingSpotMesh(config: HidingSpot): TransformNode {
    switch (config.id) {
      case 'plant':
        return this.createPlant()
      case 'cabinet':
        return this.createCabinet()
      case 'sofa':
        return this.createSofa()
      default:
        return new TransformNode(config.id, this.scene)
    }
  }

  private createPlant(): TransformNode {
    const group = new TransformNode('plant', this.scene)

    const pot = MeshBuilder.CreateCylinder('pot', {
      diameterTop: 0.8,
      diameterBottom: 0.6,
      height: 0.6,
      tessellation: 8
    }, this.scene)
    pot.position.y = 0.3
    pot.parent = group
    const potMat = new PBRMaterial('potMat', this.scene)
    potMat.albedoColor = Color3.FromHexString('#8B4513')
    pot.material = potMat
    pot.receiveShadows = true
    this.shadowGen.addShadowCaster(pot)

    const trunk = MeshBuilder.CreateCylinder('trunk', {
      diameter: 0.16,
      height: 1.0,
      tessellation: 8
    }, this.scene)
    trunk.position.y = 1.1
    trunk.parent = group
    const trunkMat = new PBRMaterial('trunkMat', this.scene)
    trunkMat.albedoColor = Color3.FromHexString('#654321')
    trunk.material = trunkMat
    trunk.receiveShadows = true
    this.shadowGen.addShadowCaster(trunk)

    const leafPositions = [
      new Vector3(0, 1.8, 0),
      new Vector3(0.3, 1.6, 0.2),
      new Vector3(-0.3, 1.6, -0.2),
      new Vector3(0.2, 1.7, -0.3),
      new Vector3(-0.2, 1.7, 0.3)
    ]

    const leafMat = new PBRMaterial('leafMat', this.scene)
    leafMat.albedoColor = Color3.FromHexString('#228B22')

    leafPositions.forEach((pos, i) => {
      const leaf = MeshBuilder.CreateSphere(`leaf_${i}`, {
        diameter: 0.6,
        segments: 8
      }, this.scene)
      leaf.position = pos
      leaf.parent = group
      leaf.material = leafMat
      leaf.receiveShadows = true
      this.shadowGen.addShadowCaster(leaf)
    })

    return group
  }

  private createCabinet(): TransformNode {
    const group = new TransformNode('cabinet', this.scene)

    const body = MeshBuilder.CreateBox('cabinetBody', {
      width: 2,
      height: 2.5,
      depth: 0.8
    }, this.scene)
    body.position.y = 1.25
    body.parent = group
    const bodyMat = new PBRMaterial('cabinetBodyMat', this.scene)
    bodyMat.albedoColor = Color3.FromHexString('#8B8B83')
    body.material = bodyMat
    body.receiveShadows = true
    this.shadowGen.addShadowCaster(body)

    const drawerPositions = [0.4, 0, -0.4]
    const drawerMat = new PBRMaterial('drawerMat', this.scene)
    drawerMat.albedoColor = Color3.FromHexString('#696969')
    const handleMat = new PBRMaterial('handleMat', this.scene)
    handleMat.albedoColor = Color3.FromHexString('#C0C0C0')

    drawerPositions.forEach((y, i) => {
      const drawer = MeshBuilder.CreateBox(`drawer_${i}`, {
        width: 1.8,
        height: 0.6,
        depth: 0.05
      }, this.scene)
      drawer.position = new Vector3(0, 1.2 + y, 0.43)
      drawer.parent = group
      drawer.material = drawerMat

      const handle = MeshBuilder.CreateBox(`handle_${i}`, {
        width: 0.3,
        height: 0.05,
        depth: 0.05
      }, this.scene)
      handle.position = new Vector3(0, 1.2 + y, 0.46)
      handle.parent = group
      handle.material = handleMat
    })

    return group
  }

  private createSofa(): TransformNode {
    const group = new TransformNode('sofa', this.scene)
    const sofaMat = new PBRMaterial('sofaMat', this.scene)
    sofaMat.albedoColor = Color3.FromHexString('#8B0000')

    const seat = MeshBuilder.CreateBox('seat', {
      width: 3,
      height: 0.5,
      depth: 1.2
    }, this.scene)
    seat.position.y = 0.4
    seat.parent = group
    seat.material = sofaMat
    seat.receiveShadows = true
    this.shadowGen.addShadowCaster(seat)

    const back = MeshBuilder.CreateBox('back', {
      width: 3,
      height: 0.8,
      depth: 0.3
    }, this.scene)
    back.position = new Vector3(0, 1.0, -0.45)
    back.parent = group
    back.material = sofaMat
    this.shadowGen.addShadowCaster(back)

    const armLeft = MeshBuilder.CreateBox('armLeft', {
      width: 0.3,
      height: 0.6,
      depth: 1.2
    }, this.scene)
    armLeft.position = new Vector3(-1.35, 0.7, 0)
    armLeft.parent = group
    armLeft.material = sofaMat
    this.shadowGen.addShadowCaster(armLeft)

    const armRight = MeshBuilder.CreateBox('armRight', {
      width: 0.3,
      height: 0.6,
      depth: 1.2
    }, this.scene)
    armRight.position = new Vector3(1.35, 0.7, 0)
    armRight.parent = group
    armRight.material = sofaMat
    this.shadowGen.addShadowCaster(armRight)

    const legMat = new PBRMaterial('legMat', this.scene)
    legMat.albedoColor = Color3.FromHexString('#654321')

    const legPositions = [
      new Vector3(-1.2, 0.15, -0.4),
      new Vector3(1.2, 0.15, -0.4),
      new Vector3(-1.2, 0.15, 0.4),
      new Vector3(1.2, 0.15, 0.4)
    ]

    legPositions.forEach((pos, i) => {
      const leg = MeshBuilder.CreateCylinder(`leg_${i}`, {
        diameter: 0.16,
        height: 0.3,
        tessellation: 8
      }, this.scene)
      leg.position = pos
      leg.parent = group
      leg.material = legMat
      this.shadowGen.addShadowCaster(leg)
    })

    return group
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
