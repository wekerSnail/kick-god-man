import * as THREE from 'three'
import type { PropType } from '../types/game'
import { PROP_CONFIGS } from '../types/game'

export interface PropItem {
  id: string
  type: PropType
  mesh: THREE.Group
  position: THREE.Vector3
  spawnTime: number
  duration: number
}

export class Props {
  private scene: THREE.Scene
  private props: PropItem[] = []
  private spawnInterval: number = 10
  private spawnTimer: number = 0
  private maxProps: number = 3

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  update(delta: number, playerPosition: THREE.Vector3): PropItem | null {
    this.spawnTimer += delta
    if (this.spawnTimer >= this.spawnInterval && this.props.length < this.maxProps) {
      this.spawnProp()
      this.spawnTimer = 0
    }

    this.props.forEach(prop => {
      this.animateProp(prop, delta)
    })

    const pickupProp = this.checkPickup(playerPosition)
    return pickupProp
  }

  private spawnProp() {
    const random = Math.random()
    let cumulative = 0
    let selectedConfig = PROP_CONFIGS[0]

    for (const config of PROP_CONFIGS) {
      cumulative += config.spawnChance
      if (random <= cumulative) {
        selectedConfig = config
        break
      }
    }

    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      0.5,
      (Math.random() - 0.5) * 20
    )

    const mesh = this.createPropMesh(selectedConfig.type)
    mesh.position.copy(position)
    this.scene.add(mesh)

    const prop: PropItem = {
      id: Date.now().toString() + Math.random(),
      type: selectedConfig.type,
      mesh,
      position,
      spawnTime: Date.now(),
      duration: selectedConfig.duration
    }

    this.props.push(prop)
  }

  private createPropMesh(type: PropType): THREE.Group {
    const group = new THREE.Group()

    const geometry = new THREE.SphereGeometry(0.3, 16, 16)
    let color: number

    switch (type) {
      case 'speed':
        color = 0x00FF00
        break
      case 'invisible':
        color = 0x9932CC
        break
      case 'noise':
        color = 0xFFFF00
        break
      case 'power':
        color = 0xFF4500
        break
      default:
        color = 0xFFFFFF
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5
    })

    const sphere = new THREE.Mesh(geometry, material)
    sphere.castShadow = true
    group.add(sphere)

    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    group.add(glow)

    return group
  }

  private animateProp(prop: PropItem, delta: number) {
    prop.mesh.rotation.y += delta * 2
    prop.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.2
  }

  private checkPickup(playerPosition: THREE.Vector3): PropItem | null {
    for (let i = 0; i < this.props.length; i++) {
      const prop = this.props[i]
      const distance = playerPosition.distanceTo(prop.position)
      
      if (distance < 1.5) {
        this.scene.remove(prop.mesh)
        this.props.splice(i, 1)
        return prop
      }
    }
    return null
  }

  getProps(): PropItem[] {
    return this.props
  }

  dispose() {
    this.props.forEach(prop => {
      this.scene.remove(prop.mesh)
    })
    this.props = []
  }
}
