import {
  Scene,
  TransformNode,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  FreeCamera
} from '@babylonjs/core'
import type { AssetManager } from '../core/AssetManager'
import type { EasterEggWeaponType } from '../../types/game'

// 武器 GLB 路径
const WEAPON_GUN_URL = new URL('/models/kenney_blaster-kit_2.1/blaster-a.glb', import.meta.url).href
const WEAPON_ROCKET_URL = new URL('/models/kenney_blaster-kit_2.1/scope-large-a.glb', import.meta.url).href
const WEAPON_GRENADE_URL = new URL('/models/kenney_blaster-kit_2.1/grenade-a.glb', import.meta.url).href

// 武器 URL 映射
const WEAPON_URLS: Record<EasterEggWeaponType, string> = {
  gun: WEAPON_GUN_URL,
  rocket: WEAPON_ROCKET_URL,
  grenade: WEAPON_GRENADE_URL
}

/**
 * 彩蛋模式武器显示器
 * 只渲染武器模型，跟随相机视角，CS:GO 风格
 */
export class RightHand {
  private _scene: Scene
  private _assetManager: AssetManager
  private _weaponNode: TransformNode | null = null
  private _weaponModel: TransformNode | null = null
  private _isActive = false
  private _idleTime = 0

  // CS:GO 风格武器跟随
  private _targetOffsetX = 0
  private _targetOffsetY = 0
  private _currentOffsetX = 0
  private _currentOffsetY = 0
  private _swaySpeed = 8 // 跟随速度
  private _swayAmount = 0.15 // 跟随幅度

  // 后坐力效果
  private _recoilOffset = 0
  private _recoilRecovery = 8 // 后坐力恢复速度

  // 武器基础位置（屏幕右下角）
  private _basePosition = new Vector3(0.3, -0.25, 0.5)

  constructor(scene: Scene, assetManager: AssetManager) {
    this._scene = scene
    this._assetManager = assetManager
  }

  /**
   * 加载并初始化武器系统
   */
  async load(): Promise<void> {
    // 创建武器根节点（挂载到相机）
    this._weaponNode = new TransformNode('weaponRoot', this._scene)
    this._weaponNode.position = this._basePosition.clone()
  }

  /**
   * 设置相机引用（武器跟随相机移动）
   */
  setCamera(camera: FreeCamera): void {
    if (this._weaponNode) {
      this._weaponNode.parent = camera
    }
  }

  /**
   * 切换武器模型
   */
  async switchWeapon(weaponType: EasterEggWeaponType): Promise<void> {
    // 卸下旧武器
    if (this._weaponModel) {
      this._weaponModel.dispose()
      this._weaponModel = null
    }

    if (!this._weaponNode) return

    // 加载武器 GLB 模型
    try {
      const glbPath = WEAPON_URLS[weaponType]
      console.log(`[RightHand] Loading weapon from: ${glbPath}`)

      const weaponRoot = await this._assetManager.loadProp(`weapon_${weaponType}`, glbPath)
      this._weaponModel = weaponRoot
      this._weaponModel.parent = this._weaponNode

      // 调整武器大小
      this._weaponModel.scaling = new Vector3(0.15, 0.15, 0.15)

      // 调整武器方向 - 枪口朝前
      this._weaponModel.rotation = new Vector3(0, Math.PI, 0)

      // 武器位置微调
      this._weaponModel.position = new Vector3(0, 0, 0)

      console.log(`[RightHand] Successfully loaded weapon: ${weaponType}`)
    } catch (e) {
      console.warn(`[RightHand] Failed to load weapon GLB for ${weaponType}, using placeholder`, e)
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
        mesh = MeshBuilder.CreateBox('gunPlaceholder', { width: 0.05, height: 0.05, depth: 0.2 }, this._scene)
        mat.emissiveColor = Color3.Yellow()
        break
      case 'rocket':
        mesh = MeshBuilder.CreateCylinder('rocketPlaceholder', { height: 0.25, diameterTop: 0.02, diameterBottom: 0.08 }, this._scene)
        mat.emissiveColor = Color3.Red()
        break
      case 'grenade':
        mesh = MeshBuilder.CreateSphere('grenadePlaceholder', { diameter: 0.1 }, this._scene)
        mat.emissiveColor = Color3.Green()
        break
    }

    if (mesh) {
      mesh.material = mat
      mesh.parent = this._weaponNode
    }
  }

  /**
   * 更新武器 - CS:GO 风格跟随 + 后坐力 + 呼吸晃动
   */
  update(delta: number): void {
    if (!this._isActive || !this._weaponNode) return

    this._idleTime += delta

    // 平滑插值到目标偏移
    this._currentOffsetX += (this._targetOffsetX - this._currentOffsetX) * this._swaySpeed * delta
    this._currentOffsetY += (this._targetOffsetY - this._currentOffsetY) * this._swaySpeed * delta

    // 后坐力恢复
    this._recoilOffset *= (1 - this._recoilRecovery * delta)

    // 应用偏移到武器位置（包括后坐力）
    this._weaponNode.position.x = this._basePosition.x + this._currentOffsetX
    this._weaponNode.position.y = this._basePosition.y + this._currentOffsetY + this._recoilOffset

    // 轻微倾斜效果（跟随偏移方向）
    this._weaponNode.rotation.z = -this._currentOffsetX * 1.5
    this._weaponNode.rotation.x = this._currentOffsetY * 1.5 - this._recoilOffset * 5

    // 轻微呼吸晃动
    const breathX = Math.sin(this._idleTime * 1.5) * 0.003
    const breathY = Math.cos(this._idleTime * 1.2) * 0.002
    this._weaponNode.position.x += breathX
    this._weaponNode.position.y += breathY
  }

  /**
   * 更新武器跟随 - 由鼠标移动调用
   */
  updateSway(deltaYaw: number, deltaPitch: number): void {
    // 鼠标移动时设置目标偏移（反向，产生跟随效果）
    this._targetOffsetX = -deltaYaw * this._swayAmount
    this._targetOffsetY = deltaPitch * this._swayAmount

    // 限制偏移范围
    this._targetOffsetX = Math.max(-0.15, Math.min(0.15, this._targetOffsetX))
    this._targetOffsetY = Math.max(-0.1, Math.min(0.1, this._targetOffsetY))
  }

  /**
   * 重置武器跟随偏移（鼠标停止移动时）
   */
  resetSway(): void {
    this._targetOffsetX = 0
    this._targetOffsetY = 0
  }

  /**
   * 触发后坐力效果
   */
  applyRecoil(intensity: number = 0.05): void {
    this._recoilOffset = intensity
  }

  /**
   * 激活武器显示
   */
  activate(): void {
    this._isActive = true
    this._idleTime = 0
    if (this._weaponNode) {
      this._weaponNode.setEnabled(true)
    }
  }

  /**
   * 停用武器显示
   */
  deactivate(): void {
    this._isActive = false
    if (this._weaponNode) {
      this._weaponNode.setEnabled(false)
    }
  }

  get weaponNode(): TransformNode | null {
    return this._weaponNode
  }

  dispose(): void {
    if (this._weaponModel) {
      this._weaponModel.dispose()
      this._weaponModel = null
    }
    if (this._weaponNode) {
      this._weaponNode.dispose()
      this._weaponNode = null
    }
    this._isActive = false
  }
}
