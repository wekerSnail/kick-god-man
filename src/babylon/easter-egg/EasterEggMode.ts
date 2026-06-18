import { Vector3 } from '@babylonjs/core'
import type { Scene } from '@babylonjs/core'
import type { FreeCamera } from '@babylonjs/core'
import type { AssetManager } from '../core/AssetManager'
import type { Enemy } from '../entities/Enemy'
import type { Player } from '../entities/Player'
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
  private _player: Player | null = null
  private _mainCamera: FreeCamera | null = null
  private _canvas: HTMLCanvasElement | null = null

  init(scene: Scene, assetManager: AssetManager, enemy: Enemy, player: Player, mainCamera: FreeCamera, canvas: HTMLCanvasElement): void {
    this._scene = scene
    this._assetManager = assetManager
    this._enemy = enemy
    this._player = player
    this._mainCamera = mainCamera
    this._canvas = canvas
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
    if (!this._scene || !this._assetManager || !this._enemy || !this._player || !this._mainCamera || !this._canvas) {
      throw new Error('EasterEggMode: init() must be called before start()')
    }

    this._isActive = true
    this._timeRemaining = 30
    this._weaponSwitchTimer = 0
    this._weaponSwitchInterval = 5 + Math.random() * 3
    this._currentWeaponType = this._pickRandomWeapon()
    this._onComplete = onComplete ?? null

    // 隐藏玩家实体
    this._player.setVisible(false)

    // 初始化子系统
    this._explosion = new EasterEggExplosion(this._scene)
    this._boss = new EasterEggBoss(this._enemy)
    this._weapons = new EasterEggWeapons(this._scene, this._boss)
    this._weapons.setExplosion(this._explosion)
    this._camera = new FirstPersonCamera(this._mainCamera, this._canvas)
    this._rightHand = new RightHand(this._scene, this._assetManager)
    this._hud = new EasterEggHUD(this._scene)

    // 连接相机和武器跟随系统（CS:GO 风格）
    this._camera.setWeaponSwayCallbacks(
      (deltaYaw, deltaPitch) => this._rightHand.updateSway(deltaYaw, deltaPitch),
      () => this._rightHand.resetSway()
    )

    // 连接武器后坐力
    this._weapons.setRecoilCallback((intensity) => this._rightHand.applyRecoil(intensity))

    // 加载武器系统
    await this._rightHand.load()

    // 设置相机引用（武器跟随相机）
    this._rightHand.setCamera(this._mainCamera!)

    // 激活子系统
    this._boss.activate()
    this._rightHand.activate()
    await this._rightHand.switchWeapon(this._currentWeaponType)
    this._weapons.switchWeapon(this._currentWeaponType)

    // FPS 相机 - 玩家固定在房间中心靠后位置
    const playerPos = new Vector3(0, 0, 3) // 房间中心靠后
    this._camera.enter(playerPos, this._enemy.position)

    // 倒计时 HUD + 十字准星（更高位置）
    this._hud.create(new Vector3(0, 6, -5), this._mainCamera!)
  }

  stop(): void {
    this._isActive = false

    // 恢复相机
    this._camera?.exit()

    // 恢复玩家显示
    this._player?.setVisible(true)

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
    this._camera.update(this._enemy.position, delta) // 更新相机（用于重置武器跟随）
    this._hud.update(this._timeRemaining)

    // 更新武器系统（射击逻辑）
    // 使用武器位置作为射击起点（相机位置 + 武器偏移）
    const weaponOffset = new Vector3(0.3, -0.25, 0.5)
    const fireOrigin = this._mainCamera!.position.add(weaponOffset)
    const fireDirection = this._camera.getForwardDirection()
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
