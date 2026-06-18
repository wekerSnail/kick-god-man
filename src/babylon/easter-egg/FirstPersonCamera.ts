import { Vector3, FreeCamera } from '@babylonjs/core'

/**
 * 彩蛋模式 FPS 相机控制器
 * 进入时切换为第一人称视角，鼠标控制朝向，退出时恢复原等距视角
 */
export class FirstPersonCamera {
  private _camera: FreeCamera
  private _savedPosition: Vector3 | null = null
  private _savedTarget: Vector3 | null = null
  private _savedFov: number | null = null
  private _isActive = false
  private _canvas: HTMLCanvasElement | null = null
  private _mouseMoveHandler: ((e: MouseEvent) => void) | null = null
  private _yaw = 0 // 水平旋转角
  private _pitch = 0 // 垂直旋转角
  private _sensitivity = 0.003 // 鼠标灵敏度

  constructor(camera: FreeCamera, canvas?: HTMLCanvasElement) {
    this._camera = camera
    this._canvas = canvas ?? null
  }

  /**
   * 进入 FPS 视角
   * @param playerPosition 玩家位置
   * @param bossPosition Boss 位置（初始朝向）
   */
  enter(playerPosition: Vector3, bossPosition: Vector3): void {
    // 保存当前相机状态
    this._savedPosition = this._camera.position.clone()
    this._savedTarget = this._camera.getTarget().clone()
    this._savedFov = this._camera.fov

    // 设置 FPS 视角
    // 相机位置：玩家位置 + 头部偏移
    this._camera.position = new Vector3(
      playerPosition.x,
      playerPosition.y + 1.6,
      playerPosition.z
    )

    // 计算初始朝向（看向 Boss）
    const lookDir = new Vector3(
      bossPosition.x - this._camera.position.x,
      0,
      bossPosition.z - this._camera.position.z
    ).normalize()

    // 初始化 yaw/pitch
    this._yaw = Math.atan2(lookDir.x, lookDir.z)
    this._pitch = 0

    // 应用初始朝向
    this._applyCameraRotation()

    // 调整 FOV 为 FPS 标准
    this._camera.fov = 70 * (Math.PI / 180)

    // 锁定鼠标指针
    if (this._canvas) {
      this._canvas.requestPointerLock()
      this._mouseMoveHandler = (e: MouseEvent) => this._onMouseMove(e)
      document.addEventListener('mousemove', this._mouseMoveHandler)
    }

    this._isActive = true
  }

  /**
   * 鼠标移动处理
   */
  private _onMouseMove(e: MouseEvent): void {
    if (!this._isActive) return

    this._yaw += e.movementX * this._sensitivity
    this._pitch -= e.movementY * this._sensitivity

    // 限制垂直视角
    this._pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this._pitch))

    this._applyCameraRotation()
  }

  /**
   * 应用旋转到相机
   */
  private _applyCameraRotation(): void {
    const dir = new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      Math.sin(this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch)
    )

    this._camera.setTarget(new Vector3(
      this._camera.position.x + dir.x * 10,
      this._camera.position.y + dir.y * 10,
      this._camera.position.z + dir.z * 10
    ))
  }

  /**
   * 获取当前朝向（用于射击方向）
   */
  getForwardDirection(): Vector3 {
    return new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      Math.sin(this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch)
    ).normalize()
  }

  /**
   * 更新（保持相机位置固定，不需要每帧更新）
   */
  update(_bossPosition: Vector3, _delta: number): void {
    // 鼠标控制模式下不需要自动更新
  }

  /**
   * 退出 FPS 视角，恢复原相机状态
   */
  exit(): void {
    if (!this._isActive) return

    // 退出鼠标锁定
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }

    // 移除鼠标事件
    if (this._mouseMoveHandler) {
      document.removeEventListener('mousemove', this._mouseMoveHandler)
      this._mouseMoveHandler = null
    }

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
