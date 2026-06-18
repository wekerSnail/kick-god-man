import { Vector3 } from '@babylonjs/core'
import type { Scene } from '@babylonjs/core'
import type { FreeCamera } from '@babylonjs/core'
import type { AssetManager } from '../core/AssetManager'
import type { Enemy } from '../entities/Enemy'
import type { EasterEggWeaponType } from '../../types/game'
import { EASTER_EGG_WEAPONS } from '../../types/game'
import { FirstPersonCamera } from './FirstPersonCamera'
import { RightHand } from './RightHand'
import { EasterEggWeapons } from './EasterEggWeapons'
import { EasterEggBoss } from './EasterEggBoss'
import { EasterEggExplosion } from './EasterEggExplosion'
import { EasterEggHUD } from './EasterEggHUD'

export class EasterEggMode {
  private _isActive = false
  private _timeRemaining = 30
  private _weaponSwitchTimer = 0
  private _weaponSwitchInterval = 6
  private _currentWeaponType: EasterEggWeaponType = 'gun'
  private _onComplete: (() => void) | null = null

  // 子系统
  private _camera!: FirstPersonCamera
  private _rightHand!: RightHand
  private _weapons!: EasterEggWeapons
  private _boss!: EasterEggBoss
  private _explosion!: EasterEggExplosion
  private _hud!: EasterEggHUD

  // 依赖
  private _scene: Scene | null = null
  private _assetManager: AssetManager | null = null
  private _enemy: Enemy | null = null
  private _mainCamera: FreeCamera | null = null

  init(scene: Scene, assetManager: AssetManager, enemy: Enemy, mainCamera: FreeCamera): void {
    this._scene = scene
    this._assetManager = assetManager
    this._enemy = enemy
    this._mainCamera = mainCamera
  }

  get isActive(): boolean {
    return this._isActive
  }

  get timeRemaining(): number {
    return this._timeRemaining
  }

  get currentWeaponType(): EasterEggWeaponType {
    return this._currentWeaponType
  }

  async start(onComplete?: () => void): Promise<void> {
    if (!this._scene || !this._assetManager || !this._enemy || !this._mainCamera) {
      throw new Error('EasterEggMode: init() must be called before start()')
    }

    this._isActive = true
    this._timeRemaining = 30
    this._weaponSwitchTimer = 0
    this._weaponSwitchInterval = 5 + Math.random() * 3
    this._currentWeaponType = this._pickRandomWeapon()
    this._onComplete = onComplete ?? null

    // 初始化子系统
    this._explosion = new EasterEggExplosion(this._scene)
    this._boss = new EasterEggBoss(this._enemy)
    this._weapons = new EasterEggWeapons(this._scene, this._boss)
    this._weapons.setExplosion(this._explosion)
    this._camera = new FirstPersonCamera(this._mainCamera)
    this._rightHand = new RightHand(this._scene, this._assetManager)
    this._hud = new EasterEggHUD(this._scene)

    // 加载右手模型
    await this._rightHand.load()

    // 激活子系统
    this._boss.activate()
    this._rightHand.activate()
    await this._rightHand.switchWeapon(this._currentWeaponType)
    this._weapons.switchWeapon(this._currentWeaponType)

    // FPS 相机
    const playerPos = new Vector3(0, 0, 0) // 玩家固定在原点
    this._camera.enter(playerPos, this._enemy.position)

    // 倒计时 HUD
    this._hud.create(new Vector3(0, 4, -5))
  }

  stop(): void {
    this._isActive = false

    // 恢复相机
    this._camera?.exit()

    // 清理子系统
    this._rightHand?.deactivate()
    this._boss?.deactivate()
    this._hud?.deactivate()

    this._onComplete = null
  }

  update(delta: number): void {
    if (!this._isActive) return

    // 倒计时
    this._timeRemaining -= delta
    if (this._timeRemaining <= 0) {
      this._timeRemaining = 0
      this._handleComplete()
      return
    }

    // 定时切换武器
    this._weaponSwitchTimer += delta
    if (this._weaponSwitchTimer >= this._weaponSwitchInterval) {
      this._weaponSwitchTimer = 0
      this._weaponSwitchInterval = 5 + Math.random() * 3
      this._currentWeaponType = this._pickRandomWeapon()
      this._weapons.switchWeapon(this._currentWeaponType)
      this._rightHand.switchWeapon(this._currentWeaponType)
    }

    // 更新子系统
    this._boss.update(delta)
    this._rightHand.update(delta)
    this._hud.update(this._timeRemaining)

    // 相机跟随 Boss
    this._camera.update(this._enemy!.position, delta)

    // 更新武器系统（射击逻辑）
    const fireOrigin = new Vector3(0.3, 1.6, 0) // 右手位置
    const cameraTarget = this._mainCamera!.getTarget()
    const fireDirection = cameraTarget.subtract(this._mainCamera!.position).normalize()
    this._weapons.update(delta, fireOrigin, fireDirection)
  }

  /**
   * 处理射击输入
   */
  onFireStart(): void {
    this._weapons?.startFiring()
  }

  onFireStop(): void {
    this._weapons?.stopFiring()
  }

  private _pickRandomWeapon(): EasterEggWeaponType {
    const types: EasterEggWeaponType[] = EASTER_EGG_WEAPONS.map(w => w.type)
    const current = this._currentWeaponType
    const filtered = types.filter(t => t !== current)
    return filtered[Math.floor(Math.random() * filtered.length)]
  }

  private _handleComplete(): void {
    this._isActive = false
    this.stop()
    this._onComplete?.()
  }

  dispose(): void {
    this.stop()
    this._rightHand?.dispose()
    this._weapons?.dispose()
    this._boss?.dispose()
    this._explosion?.dispose()
    this._hud?.dispose()
  }
}
