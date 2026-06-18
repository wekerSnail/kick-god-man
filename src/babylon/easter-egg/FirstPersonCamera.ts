import { Vector3, FreeCamera } from '@babylonjs/core'

/**
 * 彩蛋模式 FPS 相机控制器
 * 进入时切换为第一人称视角，退出时恢复原等距视角
 */
export class FirstPersonCamera {
  private _camera: FreeCamera
  private _savedPosition: Vector3 | null = null
  private _savedTarget: Vector3 | null = null
  private _savedFov: number | null = null
  private _isActive = false

  constructor(camera: FreeCamera) {
    this._camera = camera
  }

  /**
   * 进入 FPS 视角
   * @param playerPosition 玩家位置
   * @param bossPosition Boss 位置（初始朝向）
   */
  enter(playerPosition: Vector3, _bossPosition: Vector3): void {
    // 保存当前相机状态
    this._savedPosition = this._camera.position.clone()
    this._savedTarget = this._camera.getTarget().clone()
    this._savedFov = this._camera.fov

    // 设置 FPS 视角
    // 相机位置：玩家右手位置 + 头部偏移
    this._camera.position = new Vector3(
      playerPosition.x + 0.3,
      playerPosition.y + 1.6,
      playerPosition.z
    )

    // 初始看向 Boss 方向
    const lookDir = new Vector3(
      _bossPosition.x - this._camera.position.x,
      0,
      _bossPosition.z - this._camera.position.z
    ).normalize()
    this._camera.setTarget(new Vector3(
      this._camera.position.x + lookDir.x * 10,
      this._camera.position.y,
      this._camera.position.z + lookDir.z * 10
    ))

    // 调整 FOV 为 FPS 标准
    this._camera.fov = 70 * (Math.PI / 180)

    this._isActive = true
  }

  /**
   * 更新相机朝向（跟随 Boss 方向 lerp）
   * @param bossPosition Boss 当前位置
   * @param delta 帧间隔
   */
  update(bossPosition: Vector3, delta: number): void {
    if (!this._isActive) return

    // 计算看向 Boss 的目标方向
    const targetLook = new Vector3(
      bossPosition.x - this._camera.position.x,
      0,
      bossPosition.z - this._camera.position.z
    ).normalize()

    // 当前朝向
    const currentTarget = this._camera.getTarget()
    const currentDir = new Vector3(
      currentTarget.x - this._camera.position.x,
      0,
      currentTarget.z - this._camera.position.z
    ).normalize()

    // Lerp 平滑过渡
    const lerpFactor = 1 - Math.pow(0.01, delta)
    const newDir = Vector3.Lerp(currentDir, targetLook, lerpFactor).normalize()

    this._camera.setTarget(new Vector3(
      this._camera.position.x + newDir.x * 10,
      this._camera.position.y,
      this._camera.position.z + newDir.z * 10
    ))
  }

  /**
   * 退出 FPS 视角，恢复原相机状态
   */
  exit(): void {
    if (!this._isActive) return

    if (this._savedPosition) {
      this._camera.position = this._savedPosition
    }
    if (this._savedTarget) {
      this._camera.setTarget(this._savedTarget)
    }
    if (this._savedFov !== null) {
      this._camera.fov = this._savedFov
    }

    this._savedPosition = null
    this._savedTarget = null
    this._savedFov = null
    this._isActive = false
  }

  get isActive(): boolean {
    return this._isActive
  }

  dispose(): void {
    this.exit()
  }
}
