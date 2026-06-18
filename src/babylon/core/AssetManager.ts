import {
  Scene,
  SceneLoader,
  TransformNode,
  Skeleton,
  AnimationGroup,
  ShadowGenerator
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'

export interface CharacterLoadResult {
  root: TransformNode
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

    // 拆分路径为根目录和文件名，以便正确解析纹理路径
    const lastSlash = glbPath.lastIndexOf('/')
    const rootUrl = lastSlash >= 0 ? glbPath.substring(0, lastSlash + 1) : ''
    const fileName = lastSlash >= 0 ? glbPath.substring(lastSlash + 1) : glbPath

    const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, this.scene)

    const root = new TransformNode(key, this.scene)
    result.meshes.forEach(m => {
      m.parent = root
      m.receiveShadows = true
      this.shadowGen.addShadowCaster(m)
    })
    result.transformNodes.forEach(t => {
      if (t !== root) t.parent = root
    })

    this.cache.set(key, root)
    if (result.skeletons.length > 0) {
      this.skeletons.set(key, result.skeletons[0])
    }
    if (result.animationGroups.length > 0) {
      this.animationGroups.set(key, result.animationGroups)
    }

    return {
      root,
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
      root: clone,
      skeleton: this.skeletons.get(key) ?? null,
      animationGroups: this.animationGroups.get(key) ?? []
    }
  }

  async loadProp(key: string, glbPath: string): Promise<TransformNode> {
    if (this.cache.has(key)) {
      return this.cloneProp(key)
    }

    try {
      // 拆分路径为根目录和文件名，以便正确解析纹理路径
      const lastSlash = glbPath.lastIndexOf('/')
      const rootUrl = lastSlash >= 0 ? glbPath.substring(0, lastSlash + 1) : ''
      const fileName = lastSlash >= 0 ? glbPath.substring(lastSlash + 1) : glbPath

      const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, this.scene)

      const root = new TransformNode(key, this.scene)
      result.meshes.forEach(m => {
        m.parent = root
        m.receiveShadows = true
        this.shadowGen.addShadowCaster(m)
      })

      this.cache.set(key, root)
      return root
    } catch (err) {
      console.warn(`[AssetManager] Failed to load prop ${key} from ${glbPath}:`, err)
      const fallback = new TransformNode(`${key}_fallback`, this.scene)
      this.cache.set(key, fallback)
      return fallback
    }
  }

  private cloneProp(key: string): TransformNode {
    const src = this.cache.get(key)
    if (!src) throw new Error(`Asset not loaded: ${key}`)

    const clone = src.clone(`${key}_${Date.now()}`, null)!
    clone.getChildMeshes().forEach(m => {
      m.receiveShadows = true
      this.shadowGen.addShadowCaster(m)
    })
    return clone
  }

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
