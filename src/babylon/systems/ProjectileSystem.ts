import {
  Scene,
  TransformNode,
  Vector3,
  Color3,
  PBRMaterial
} from '@babylonjs/core'
import type { WeaponConfig } from '../../types/game'
import { createWeaponMesh } from '../weapons/WeaponModels'

export interface Projectile {
  mesh: TransformNode
  position: Vector3
  velocity: Vector3
  weapon: WeaponConfig
  lifetime: number
  age: number
  active: boolean
}

export class ProjectileSystem {
  private static _tmpVec = new Vector3()
  private scene: Scene
  private projectiles: Projectile[] = []

  constructor(scene: Scene) {
    this.scene = scene
  }

  spawn(startPos: Vector3, direction: Vector3, power: number, weapon: WeaponConfig): void {
    const mesh = createWeaponMesh(weapon.type, this.scene)
    mesh.scaling = new Vector3(2, 2, 2)

    mesh.getChildMeshes().forEach(child => {
      const mat = child.material as PBRMaterial
      if (mat) {
        mat.emissiveColor = new Color3(1, 0.8, 0.3)
        mat.emissiveIntensity = 0.5
      }
    })

    const spawnOffset = direction.scale(1.0)
    spawnOffset.y = 1.5
    mesh.position = startPos.add(spawnOffset)

    const speed = 4 + power * 6
    const velocity = direction.scale(speed)
    velocity.y = 1.5 + power * 2

    const projectile: Projectile = {
      mesh,
      position: mesh.position.clone(),
      velocity,
      weapon,
      lifetime: 2,
      age: 0,
      active: true
    }

    this.projectiles.push(projectile)
  }

  update(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      if (!p.active) continue

      p.age += delta
      if (p.age >= p.lifetime) {
        this.removeProjectile(i)
        continue
      }

      p.velocity.y -= 9.8 * delta
      // 复用 _tmpVec 避免每帧 new Vector3
      ProjectileSystem._tmpVec.copyFrom(p.velocity).scaleInPlace(delta)
      p.position.addInPlace(ProjectileSystem._tmpVec)
      p.mesh.position.copyFrom(p.position)

      p.mesh.rotation.x += delta * 5
      p.mesh.rotation.z += delta * 3

      if (p.position.y < 0) {
        this.removeProjectile(i)
      }
    }
  }

  checkHit(targetPos: Vector3, hitRadius: number): Projectile | null {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      if (!p.active) continue

      const dist = Vector3.Distance(p.position, targetPos)
      if (dist < hitRadius) {
        const result = { ...p }
        this.removeProjectile(i)
        return result
      }
    }
    return null
  }

  private removeProjectile(index: number): void {
    const p = this.projectiles[index]
    p.active = false
    p.mesh.dispose()
    this.projectiles.splice(index, 1)
  }

  clear(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i)
    }
  }

  dispose(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i)
    }
  }
}
