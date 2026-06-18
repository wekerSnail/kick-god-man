import {
  Scene,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3
} from '@babylonjs/core'

const HUD_WIDTH = 3
const HUD_HEIGHT = 0.8
const WARNING_TIME = 5 // 最后5秒变红

/**
 * 彩蛋模式倒计时 HUD
 * 使用 DynamicTexture 渲染倒计时文字，挂在 Plane mesh 上
 */
export class EasterEggHUD {
  private _scene: Scene
  private _plane: ReturnType<typeof MeshBuilder.CreatePlane> | null = null
  private _texture: DynamicTexture | null = null
  private _material: StandardMaterial | null = null
  private _isActive = false

  constructor(scene: Scene) {
    this._scene = scene
  }

  /**
   * 创建 HUD
   * @param position HUD 位置（世界坐标）
   */
  create(position: Vector3): void {
    // 创建 Plane mesh
    this._plane = MeshBuilder.CreatePlane('easterHud', {
      width: HUD_WIDTH,
      height: HUD_HEIGHT
    }, this._scene)
    this._plane.position = position
    this._plane.billboardMode = 7 // BILLBOARDMODE_ALL

    // 创建 DynamicTexture
    this._texture = new DynamicTexture('easterHudTex', {
      width: 512,
      height: 128
    }, this._scene, false)

    // 创建材质
    this._material = new StandardMaterial('easterHudMat', this._scene)
    this._material.diffuseTexture = this._texture
    this._material.emissiveColor = Color3.White()
    this._material.disableLighting = true
    this._material.backFaceCulling = false
    this._plane.material = this._material

    this._isActive = true
    this._updateDisplay(30)
  }

  /**
   * 更新倒计时显示
   * @param timeRemaining 剩余秒数
   */
  update(timeRemaining: number): void {
    if (!this._isActive || !this._texture) return
    this._updateDisplay(timeRemaining)
  }

  /**
   * 更新显示内容
   */
  private _updateDisplay(timeRemaining: number): void {
    if (!this._texture) return

    const ctx = this._texture.getContext() as any

    // 清空背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, 512, 128)

    // 绘制倒计时文字
    const seconds = Math.max(0, timeRemaining).toFixed(1)
    const text = `⏱ ${seconds}s`

    // 最后5秒变红
    const isWarning = timeRemaining <= WARNING_TIME
    ctx.fillStyle = isWarning ? '#FF4444' : '#FFFFFF'
    ctx.font = 'bold 72px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 256, 64)

    // 警告闪烁效果
    if (isWarning && Math.floor(timeRemaining * 4) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
      ctx.fillRect(0, 0, 512, 128)
    }

    this._texture.update()
  }

  /**
   * 停用 HUD
   */
  deactivate(): void {
    this._isActive = false
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this._isActive = false
    if (this._plane) {
      this._plane.dispose()
      this._plane = null
    }
    if (this._texture) {
      this._texture.dispose()
      this._texture = null
    }
    if (this._material) {
      this._material.dispose()
      this._material = null
    }
  }
}
