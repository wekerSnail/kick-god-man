import {
  Scene,
  TransformNode,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3
} from '@babylonjs/core'
import type { AssetManager } from '../core/AssetManager'
import type { EasterEggWeaponType } from '../../types/game'

const PLAYER_MODEL_URL = `${import.meta.env.BASE_URL}models/characters/player.glb`

// Mixamo 右手骨骼候选名称
const RIGHT_HAND_BONE_CANDIDATES = [
  'mixamorig:RightHand',
  'RightHand',
  'mixamorig:RightHandIndex1',
  'RightHandIndex1'
]

// 武器 GLB 路径映射
const WEAPON_GLB_PATHS: Record<EasterEggWeaponType, string> = {
  gun: 'kenney_blaster-kit_2.1/blaster-a.glb',
  rocket: 'kenney_blaster-kit_2.1/scope-large-a.glb',
  grenade: 'kenney_blaster-kit_2.1/grenade-a.glb'
}

/**
 * 彩蛋模式右手模型管理器
 * 加载 player.glb，隐藏身体，只显示右手区域的 mesh
 */
export class RightHand {
  private _scene: Scene
  private _assetManager: AssetManager
  private _root: TransformNode | null = null
  private _rightHandBone: TransformNode | null = null
  private _weaponNode: TransformNode | null = null
  private _weaponModel: TransformNode | null = null
  private _isActive = false
  private _idleTime = 0

  constructor(scene: Scene, assetManager: AssetManager) {
    this._scene = scene
    this._assetManager = assetManager
  }

  /**
   * 加载玩家模型，隐藏身体，只保留右手
   */
  async load(): Promise<void> {
    const result = await this._assetManager.loadCharacter('player_easter', PLAYER_MODEL_URL)
    this._root = result.root

    // 调整模型到合理大小
    this._root.scaling = new Vector3(1.8, 1.8, 1.8)

    // 找到右手骨骼
    this._rightHandBone = this._findRightHandBone()

    // 隐藏身体 mesh，只保留右手附近区域
    this._hideBodyKeepRightHand()
  }

  /**
   * 在右手骨骼上 attach 武器模型
   */
  async switchWeapon(weaponType: EasterEggWeaponType): Promise<void> {
    // 卸下旧武器
    if (this._weaponNode) {
      this._weaponNode.dispose()
      this._weaponNode = null
    }
    if (this._weaponModel) {
      this._weaponModel.dispose()
      this._weaponModel = null
    }

    if (!this._rightHandBone) return

    // 创建武器挂载节点
    this._weaponNode = new TransformNode(`weapon_${weaponType}`, this._scene)
    this._weaponNode.parent = this._rightHandBone

    // 武器位置偏移（相对于右手骨骼）
    this._weaponNode.position = new Vector3(0, 0.05, 0.1)
    this._weaponNode.rotation = new Vector3(0, 0, 0)

    // 加载武器 GLB 模型
    try {
      const glbPath = `${import.meta.env.BASE_URL}models/${WEAPON_GLB_PATHS[weaponType]}`
      console.log(`[RightHand] Loading weapon from: ${glbPath}`)

      // 使用 loadProp 加载简单模型（不需要骨骼动画）
      const weaponRoot = await this._assetManager.loadProp(`weapon_${weaponType}`, glbPath)
      this._weaponModel = weaponRoot
      this._weaponModel.parent = this._weaponNode

      // 调整武器大小和方向
      this._weaponModel.scaling = new Vector3(0.5, 0.5, 0.5)
      this._weaponModel.rotation = new Vector3(0, Math.PI, 0)

      console.log(`[RightHand] Successfully loaded weapon: ${weaponType}`)
    } catch (e) {
      console.warn(`[RightHand] Failed to load weapon GLB for ${weaponType}, using placeholder`, e)
      // 如果加载失败，创建占位几何体
      this._createWeaponPlaceholder(weaponType)
    }
  }

  /**
   * 创建武器占位几何体（当 GLB 加载失败时）
   */
  private _createWeaponPlaceholder(type: EasterEggWeaponType): void {
    if (!this._weaponNode) return

    let mesh
    const mat = new StandardMaterial(`weaponMat_${type}`, this._scene)

    switch (type) {
      case 'gun':
        mesh = MeshBuilder.CreateBox('gunPlaceholder', { width: 0.1, height: 0.1, depth: 0.4 }, this._scene)
        mat.emissiveColor = Color3.Yellow()
        break
      case 'rocket':
        mesh = MeshBuilder.CreateCylinder('rocketPlaceholder', { height: 0.5, diameterTop: 0.05, diameterBottom: 0.15 }, this._scene)
        mat.emissiveColor = Color3.Red()
        break
      case 'grenade':
        mesh = MeshBuilder.CreateSphere('grenadePlaceholder', { diameter: 0.2 }, this._scene)
        mat.emissiveColor = Color3.Green()
        break
    }

    if (mesh) {
      mesh.material = mat
      mesh.parent = this._weaponNode
    }
  }

  /**
   * 更新手臂 idle 动画
   */
  update(delta: number): void {
    if (!this._isActive || !this._root) return

    this._idleTime += delta

    // 手臂轻微晃动
    if (this._rightHandBone) {
      this._rightHandBone.position.y += Math.sin(this._idleTime * 2) * 0.001
    }
  }

  /**
   * 激活右手显示
   */
  activate(): void {
    this._isActive = true
    this._idleTime = 0
    if (this._root) {
      this._root.setEnabled(true)
    }
  }

  /**
   * 停用右手显示
   */
  deactivate(): void {
    this._isActive = false
    if (this._root) {
      this._root.setEnabled(false)
    }
  }

  get weaponNode(): TransformNode | null {
    return this._weaponNode
  }

  get rightHandBone(): TransformNode | null {
    return this._rightHandBone
  }

  /**
   * 查找右手骨骼
   */
  private _findRightHandBone(): TransformNode | null {
    if (!this._root) return null

    // 方法1：通过骨骼名称查找
    for (const candidate of RIGHT_HAND_BONE_CANDIDATES) {
      const bone = this._findNodeByName(this._root, candidate)
      if (bone) return bone
    }

    // 方法2：遍历所有 TransformNode，找包含 "RightHand" 的
    const nodes = this._root.getChildTransformNodes()
    for (const node of nodes) {
      const name = node.name.toLowerCase()
      if (name.includes('righthand') && !name.includes('index') && !name.includes('middle') && !name.includes('pinky') && !name.includes('ring') && !name.includes('thumb')) {
        return node
      }
    }

    // 方法3：返回第一个包含 "hand" 的节点
    for (const node of nodes) {
      if (node.name.toLowerCase().includes('hand')) {
        return node
      }
    }

    console.warn('[RightHand] Could not find right hand bone, using fallback')
    return null
  }

  /**
   * 递归查找指定名称的节点
   */
  private _findNodeByName(root: TransformNode, name: string): TransformNode | null {
    if (root.name === name) return root
    for (const child of root.getChildTransformNodes()) {
      const found = this._findNodeByName(child, name)
      if (found) return found
    }
    return null
  }

  /**
   * 隐藏身体，只保留右手区域
   * 策略：隐藏所有 mesh，然后只显示右手附近的 mesh
   */
  private _hideBodyKeepRightHand(): void {
    if (!this._root) return

    const allMeshes = this._root.getChildMeshes()

    // 先隐藏所有 mesh
    for (const mesh of allMeshes) {
      mesh.isVisible = false
    }

    // 找到右手骨骼的世界位置
    const rightHandPos = this._rightHandBone
      ? this._rightHandBone.getAbsolutePosition()
      : new Vector3(0.5, 1, 0)

    // 只显示右手附近的 mesh（距离 < 0.5 单位）
    for (const mesh of allMeshes) {
      const meshPos = mesh.getAbsolutePosition()
      const dist = Vector3.Distance(meshPos, rightHandPos)
      if (dist < 0.5) {
        mesh.isVisible = true
      }
    }

    // 如果没有找到附近的 mesh，显示所有 mesh（fallback）
    const visibleCount = allMeshes.filter(m => m.isVisible).length
    if (visibleCount === 0) {
      console.warn('[RightHand] No meshes near right hand, showing all')
      for (const mesh of allMeshes) {
        mesh.isVisible = true
      }
    }
  }

  dispose(): void {
    if (this._weaponNode) {
      this._weaponNode.dispose()
      this._weaponNode = null
    }
    if (this._weaponModel) {
      this._weaponModel.dispose()
      this._weaponModel = null
    }
    if (this._root) {
      this._root.dispose()
      this._root = null
    }
    this._rightHandBone = null
    this._isActive = false
  }
}
