import * as THREE from 'three'

export class ResourceCache {
  private geometries = new Map<string, THREE.BufferGeometry>()
  private materials = new Map<string, THREE.Material>()

  getGeometry(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (!this.geometries.has(key)) {
      this.geometries.set(key, factory())
    }
    return this.geometries.get(key)!
  }

  getMaterial(key: string, factory: () => THREE.Material): THREE.Material {
    if (!this.materials.has(key)) {
      this.materials.set(key, factory())
    }
    return this.materials.get(key)!
  }

  dispose(): void {
    this.geometries.forEach(g => g.dispose())
    this.materials.forEach(m => m.dispose())
    this.geometries.clear()
    this.materials.clear()
  }
}
