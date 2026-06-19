import {
  Scene,
  TransformNode,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial
} from '@babylonjs/core'
import type { PropType } from '../types/game'
import { PROP_CONFIGS, WEAPON_CONFIGS } from '../types/game'
import { createWeaponPickupMesh } from './weapons/WeaponModels'

const ALL_CONFIGS = [...PROP_CONFIGS, ...WEAPON_CONFIGS]

export interface PropItem {
  id: string
  type: PropType
  mesh: TransformNode
  position: Vector3
  spawnTime: number
  duration: number
  category?: 'consumable' | 'weapon'
}

export class Props {
  private scene: Scene
  private props: PropItem[] = []
  private spawnInterval: number = 10
  private spawnTimer: number = 0
  private maxProps: number = 3
  private _animTime: number = 0

  constructor(scene: Scene) {
    this.scene = scene
  }

  update(delta: number, playerPosition: Vector3): PropItem | null {
    this.spawnTimer += delta
    this._animTime += delta
    if (this.spawnTimer >= this.spawnInterval && this.props.length < this.maxProps) {
      this.spawnProp()
      this.spawnTimer = 0
    }

    this.props.forEach(prop => {
      this.animateProp(prop, delta)
    })

    return this.checkPickup(playerPosition)
  }

  private spawnProp(): void {
    const random = Math.random()
    let cumulative = 0
    let selectedConfig = ALL_CONFIGS[0]

    for (const config of ALL_CONFIGS) {
      cumulative += config.spawnChance
      if (random <= cumulative) {
        selectedConfig = config
        break
      }
    }

    const position = new Vector3(
      (Math.random() - 0.5) * 16,
      0.5,
      (Math.random() - 0.5) * 16
    )

    const isWeapon = selectedConfig.category === 'weapon'
    const mesh = isWeapon
      ? createWeaponPickupMesh(selectedConfig.type, this.scene)
      : this.createPropMesh(selectedConfig.type)
    mesh.position = position.clone()

    const prop: PropItem = {
      id: Date.now().toString() + Math.random(),
      type: selectedConfig.type,
      mesh,
      position,
      spawnTime: Date.now(),
      duration: selectedConfig.duration,
      category: selectedConfig.category
    }

    this.props.push(prop)
  }

  private createPropMesh(type: PropType): TransformNode {
    const group = new TransformNode('prop', this.scene)

    let color: Color3
    switch (type) {
      case 'speed':
        color = Color3.FromHexString('#00FF00')
        break
      case 'invisible':
        color = Color3.FromHexString('#9932CC')
        break
      case 'noise':
        color = Color3.FromHexString('#FFFF00')
        break
      case 'combo':
        color = Color3.FromHexString('#FF6B00')
        break
      default:
        color = Color3.White()
    }

    const sphere = MeshBuilder.CreateSphere('propSphere', {
      diameter: 0.6,
      segments: 16
    }, this.scene)
    sphere.parent = group
    const mat = new PBRMaterial('propMat', this.scene)
    mat.albedoColor = color
    mat.emissiveColor = color
    mat.emissiveIntensity = 0.5
    sphere.material = mat

    const glow = MeshBuilder.CreateSphere('propGlow', {
      diameter: 0.8,
      segments: 16
    }, this.scene)
    glow.parent = group
    const glowMat = new StandardMaterial('propGlowMat', this.scene)
    glowMat.diffuseColor = color
    glowMat.emissiveColor = color
    glowMat.alpha = 0.3
    glow.material = glowMat

    return group
  }

  private animateProp(prop: PropItem, delta: number): void {
    prop.mesh.rotation.y += delta * 2
    prop.mesh.position.y = 0.5 + Math.sin(this._animTime * 3) * 0.2
  }

  private checkPickup(playerPosition: Vector3): PropItem | null {
    for (let i = 0; i < this.props.length; i++) {
      const prop = this.props[i]
      const distance = Vector3.Distance(playerPosition, prop.position)

      if (distance < 1.5) {
        prop.mesh.dispose()
        this.props.splice(i, 1)
        return prop
      }
    }
    return null
  }

  getProps(): PropItem[] {
    return this.props
  }

  dispose(): void {
    this.props.forEach(prop => {
      prop.mesh.dispose()
    })
    this.props = []
  }
}
