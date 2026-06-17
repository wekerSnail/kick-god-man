import * as THREE from 'three'
import type { HidingSpot } from '../types/game'
import { HIDING_SPOTS } from '../types/game'

export class HidingSpots {
  private scene: THREE.Scene
  private spots: { config: HidingSpot; mesh: THREE.Group }[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.createHidingSpots()
  }

  private createHidingSpots() {
    HIDING_SPOTS.forEach(config => {
      const mesh = this.createHidingSpotMesh(config)
      mesh.position.copy(config.position)
      this.scene.add(mesh)
      this.spots.push({ config, mesh })
    })
  }

  private createHidingSpotMesh(config: HidingSpot): THREE.Group {
    const group = new THREE.Group()

    switch (config.id) {
      case 'plant':
        return this.createPlant()
      case 'cabinet':
        return this.createCabinet()
      case 'sofa':
        return this.createSofa()
      default:
        return group
    }
  }

  private createPlant(): THREE.Group {
    const group = new THREE.Group()

    const potGeometry = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 8)
    const potMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    const pot = new THREE.Mesh(potGeometry, potMaterial)
    pot.position.y = 0.3
    pot.castShadow = true
    group.add(pot)

    const trunkGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = 1.1
    trunk.castShadow = true
    group.add(trunk)

    const leafPositions = [
      new THREE.Vector3(0, 1.8, 0),
      new THREE.Vector3(0.3, 1.6, 0.2),
      new THREE.Vector3(-0.3, 1.6, -0.2),
      new THREE.Vector3(0.2, 1.7, -0.3),
      new THREE.Vector3(-0.2, 1.7, 0.3)
    ]

    leafPositions.forEach(pos => {
      const leafGeometry = new THREE.SphereGeometry(0.3, 8, 8)
      const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 })
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial)
      leaf.position.copy(pos)
      leaf.castShadow = true
      group.add(leaf)
    })

    return group
  }

  private createCabinet(): THREE.Group {
    const group = new THREE.Group()

    const bodyGeometry = new THREE.BoxGeometry(2, 2.5, 0.8)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B8B83 })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 1.25
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const drawerPositions = [0.4, 0, -0.4]
    drawerPositions.forEach(y => {
      const drawerGeometry = new THREE.BoxGeometry(1.8, 0.6, 0.05)
      const drawerMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 })
      const drawer = new THREE.Mesh(drawerGeometry, drawerMaterial)
      drawer.position.set(0, 1.2 + y, 0.43)
      group.add(drawer)

      const handleGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.05)
      const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 })
      const handle = new THREE.Mesh(handleGeometry, handleMaterial)
      handle.position.set(0, 1.2 + y, 0.46)
      group.add(handle)
    })

    return group
  }

  private createSofa(): THREE.Group {
    const group = new THREE.Group()

    const seatGeometry = new THREE.BoxGeometry(3, 0.5, 1.2)
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 })
    const seat = new THREE.Mesh(seatGeometry, seatMaterial)
    seat.position.y = 0.4
    seat.castShadow = true
    seat.receiveShadow = true
    group.add(seat)

    const backGeometry = new THREE.BoxGeometry(3, 0.8, 0.3)
    const backMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 })
    const back = new THREE.Mesh(backGeometry, backMaterial)
    back.position.set(0, 1.0, -0.45)
    back.castShadow = true
    group.add(back)

    const armGeometry = new THREE.BoxGeometry(0.3, 0.6, 1.2)
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 })

    const armLeft = new THREE.Mesh(armGeometry, armMaterial)
    armLeft.position.set(-1.35, 0.7, 0)
    armLeft.castShadow = true
    group.add(armLeft)

    const armRight = new THREE.Mesh(armGeometry, armMaterial)
    armRight.position.set(1.35, 0.7, 0)
    armRight.castShadow = true
    group.add(armRight)

    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 })

    const legPositions = [
      new THREE.Vector3(-1.2, 0.15, -0.4),
      new THREE.Vector3(1.2, 0.15, -0.4),
      new THREE.Vector3(-1.2, 0.15, 0.4),
      new THREE.Vector3(1.2, 0.15, 0.4)
    ]

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.copy(pos)
      leg.castShadow = true
      group.add(leg)
    })

    return group
  }

  isInHidingSpot(playerPosition: THREE.Vector3): boolean {
    for (const spot of this.spots) {
      const distance = playerPosition.distanceTo(spot.config.position)
      const spotSize = spot.config.size
      const maxDist = Math.max(spotSize.x, spotSize.z) / 2 + 0.5
      
      if (distance < maxDist) {
        return true
      }
    }
    return false
  }

  getSpots(): { config: HidingSpot; mesh: THREE.Group }[] {
    return this.spots
  }

  dispose() {
    this.spots.forEach(spot => {
      this.scene.remove(spot.mesh)
    })
    this.spots = []
  }
}
