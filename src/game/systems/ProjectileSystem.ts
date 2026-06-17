import * as THREE from 'three'
import type { WeaponConfig } from '../../types/game'
import { createWeaponMesh } from '../weapons/WeaponModels'

export interface Projectile {
  mesh: THREE.Group
  position: THREE.Vector3
  velocity: THREE.Vector3
  weapon: WeaponConfig
  lifetime: number
  age: number
  active: boolean
}

export class ProjectileSystem {
  private scene: THREE.Scene
  private projectiles: Projectile[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  spawn(startPos: THREE.Vector3, direction: THREE.Vector3, power: number, weapon: WeaponConfig): void {
    const mesh = createWeaponMesh(weapon.type)
    const spawnOffset = direction.clone().multiplyScalar(1.0)
    spawnOffset.y = 1.5
    mesh.position.copy(startPos).add(spawnOffset)
    this.scene.add(mesh)

    const speed = 8 + power * 12
    const velocity = direction.clone().multiplyScalar(speed)
    velocity.y = 2 + power * 3

    const projectile: Projectile = {
      mesh,
      position: mesh.position.clone(),
      velocity,
      weapon,
      lifetime: 3,
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
      p.position.addScaledVector(p.velocity, delta)
      p.mesh.position.copy(p.position)

      p.mesh.rotation.x += delta * 5
      p.mesh.rotation.z += delta * 3

      if (p.position.y < 0) {
        this.removeProjectile(i)
      }
    }
  }

  checkHit(targetPos: THREE.Vector3, hitRadius: number): Projectile | null {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      if (!p.active) continue

      const dist = p.position.distanceTo(targetPos)
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
    p.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        const mat = child.material
        if (Array.isArray(mat)) mat.forEach(m => m.dispose())
        else if (mat) mat.dispose()
      }
    })
    this.scene.remove(p.mesh)
    this.projectiles.splice(index, 1)
  }

  dispose(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i)
    }
  }
}
