import {
  Scene,
  SceneLoader,
  TransformNode,
  Mesh,
  Skeleton,
  AnimationGroup,
  ShadowGenerator
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'

export interface CharacterLoadResult {
  root: Mesh
  skeleton: Skeleton | null
  animationGroups: AnimationGroup[]
}

export class AssetManager {
  private cache = new Map<string, TransformNode>()
  private skeletons = new Map<string, Skeleton>()
  private animationGroups = new Map<string, AnimationGroup[]>()
  private shadowGen: ShadowGenerator

  constructor(
    private scene: Scene,
    shadowGen: ShadowGenerator
  ) {
    this.shadowGen = shadowGen
  }

  async loadCharacter(key: string, glbPath: string): Promise<CharacterLoadResult> {
    if (this.cache.has(key)) {
      return this.cloneCharacter(key)
    }

    const result = await SceneLoader.ImportMeshAsync('', '', glbPath, this.scene)

    const root = new TransformNode(key, this.scene)
    result.meshes.forEach(m => {
      m.parent = root
      m.receiveShadows = true
      this.shadowGen.addShadowCaster(m)
    })
    result.transformNodes.forEach(t => {
      if (t !== root) t.parent = root
    })

    this.cache.set(key, root as unknown as Mesh)
    if (result.skeletons.length > 0) {
      this.skeletons.set(key, result.skeletons[0])
    }
    if (result.animationGroups.length > 0) {
      this.animationGroups.set(key, result.animationGroups)
    }

    return {
      root: root as unknown as Mesh,
      skeleton: result.skeletons[0] ?? null,
      animationGroups: result.animationGroups
    }
  }

  private cloneCharacter(key: string): CharacterLoadResult {
    const src = this.cache.get(key)
    if (!src) throw new Error(`Asset not loaded: ${key}`)

    const clone = src.clone(`${key}_${Date.now()}`, null)!
    clone.getChildMeshes().forEach(m => {
      m.receiveShadows = true
      this.shadowGen.addShadowCaster(m)
    })

    return {
      root: clone as unknown as Mesh,
      skeleton: this.skeletons.get(key) ?? null,
      animationGroups: this.animationGroups.get(key) ?? []
    }
  }

  async loadProp(key: string, glbPath: string): Promise<Mesh> {
    if (this.cache.has(key)) {
      return this.cloneProp(key)
    }

    try {
      const result = await SceneLoader.ImportMeshAsync('', '', glbPath, this.scene)

      const root = new TransformNode(key, this.scene)
      result.meshes.forEach(m => {
        m.parent = root
        m.receiveShadows = true
        this.shadowGen.addShadowCaster(m)
      })

      this.cache.set(key, root as unknown as Mesh)
      return root as unknown as Mesh
    } catch (err) {
      console.warn(`[AssetManager] Failed to load prop ${key} from ${glbPath}:`, err)
      // 返回一个空 TransformNode 占位，避免上层 await 时崩溃
      const fallback = new TransformNode(`${key}_fallback`, this.scene) as unknown as Mesh
      this.cache.set(key, fallback as unknown as TransformNode)
      return fallback
    }
  }

  private cloneProp(key: string): Mesh {
    const src = this.cache.get(key)
    if (!src) throw new Error(`Asset not loaded: ${key}`)

    const clone = src.clone(`${key}_${Date.now()}`, null)!
    clone.getChildMeshes().forEach(m => {
      m.receiveShadows = true
      this.shadowGen.addShadowCaster(m)
    })
    return clone as unknown as Mesh
  }

  /**
   * 检查某个 key 是否已成功加载到缓存（加载失败时返回 false）。
   * 用于上层决定是否回退到程序化几何体。
   */
  hasProp(key: string): boolean {
    return this.cache.has(key) && !this.cache.get(key)!.name.endsWith('_fallback')
  }

  dispose(): void {
    this.cache.forEach(m => m.dispose())
    this.cache.clear()
    this.skeletons.clear()
    this.animationGroups.clear()
  }
}
