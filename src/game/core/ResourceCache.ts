import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export class ResourceCache {
  private geometries = new Map<string, THREE.BufferGeometry>()
  private materials = new Map<string, THREE.Material>()
  private models = new Map<string, THREE.Group>()
  private static gltfLoader = new GLTFLoader()
  private static fbxLoader = new FBXLoader()
  private static textureLoader = new THREE.TextureLoader()
  private static instance: ResourceCache

  static getInstance(): ResourceCache {
    if (!this.instance) {
      this.instance = new ResourceCache()
    }
    return this.instance
  }

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

  async loadGLTFModel(key: string, url: string): Promise<THREE.Group> {
    if (this.models.has(key)) {
      return this.models.get(key)!
    }
    const gltf = await ResourceCache.gltfLoader.loadAsync(url)
    gltf.scene.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    this.models.set(key, gltf.scene)
    return gltf.scene
  }

  async loadFBXModel(key: string, url: string, textureUrl?: string): Promise<THREE.Group> {
    if (this.models.has(key)) {
      return this.models.get(key)!
    }
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const fbx = ResourceCache.fbxLoader.parse(buffer, '')
    
    let texture: THREE.Texture | null = null
    if (textureUrl) {
      texture = await ResourceCache.textureLoader.loadAsync(textureUrl)
      texture.colorSpace = THREE.SRGBColorSpace
    }

    fbx.traverse(child => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (texture && mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial
          mat.map = texture
          mat.needsUpdate = true
        }
      }
    })
    this.models.set(key, fbx)
    return fbx
  }

  getModel(key: string): THREE.Group | null {
    const model = this.models.get(key)
    return model ? model.clone() : null
  }

  async preloadModels(): Promise<void> {
    const base = import.meta.env.BASE_URL
    const gltfModels: Record<string, string> = {
      desk: `${base}models/desk.glb`,
      chair: `${base}models/chair.glb`,
      computer: `${base}models/computer.glb`,
      plant: `${base}models/plant.glb`,
      cabinet: `${base}models/cabinet.glb`,
      sofa: `${base}models/sofa.glb`,
      keyboard: `${base}models/Keyboard.glb`,
    }
    const gltfPromises = Object.entries(gltfModels).map(([key, url]) =>
      this.loadGLTFModel(key, url).catch(err => {
        console.warn(`Failed to load GLTF model ${key}: ${err}`)
      })
    )
    const fbxPromises = [
      this.loadFBXModel('boss', `${base}models/character.fbx`, `${base}models/boss_skin.png`).catch(err => {
        console.warn(`Failed to load FBX boss: ${err}`)
      }),
      this.loadFBXModel('player', `${base}models/character.fbx`, `${base}models/player_skin.png`).catch(err => {
        console.warn(`Failed to load FBX player: ${err}`)
      }),
    ]
    await Promise.all([...gltfPromises, ...fbxPromises])
  }

  dispose(): void {
    this.geometries.forEach(g => g.dispose())
    this.materials.forEach(m => m.dispose())
    this.geometries.clear()
    this.materials.clear()
    this.models.clear()
  }
}
