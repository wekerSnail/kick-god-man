import {
  Scene,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  FreeCamera
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

  // 十字准星
  private _crosshair: ReturnType<typeof MeshBuilder.CreatePlane> | null = null
  private _crosshairTexture: DynamicTexture | null = null
  private _crosshairMaterial: StandardMaterial | null = null

  constructor(scene: Scene) {
    this._scene = scene
  }

  /**
   * 创建 HUD
   * @param position HUD 位置（世界坐标）
   * @param camera 相机引用（用于挂载准星）
   */
  create(position: Vector3, camera?: FreeCamera): void {
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

    // 创建十字准星
    this._createCrosshair(camera)

    this._isActive = true
    this._updateDisplay(30)
  }

  /**
   * 创建十字准星
   */
  private _createCrosshair(camera?: FreeCamera): void {
    // 创建准星平面
    this._crosshair = MeshBuilder.CreatePlane('crosshair', {
      width: 0.08,
      height: 0.08
    }, this._scene)

    // 挂载到相机，保持在屏幕中心
    if (camera) {
      this._crosshair.parent = camera
      this._crosshair.position = new Vector3(0, 0, 1) // 相机前方 1 单位
    }

    // 创建准星纹理
    this._crosshairTexture = new DynamicTexture('crosshairTex', {
      width: 64,
      height: 64
    }, this._scene, false)

    // 绘制十字准星
    this._drawCrosshair()

    // 创建材质
    this._crosshairMaterial = new StandardMaterial('crosshairMat', this._scene)
    this._crosshairMaterial.diffuseTexture = this._crosshairTexture
    this._crosshairMaterial.emissiveColor = new Color3(0, 1, 0) // 绿色
    this._crosshairMaterial.disableLighting = true
    this._crosshairMaterial.backFaceCulling = false
    this._crosshairMaterial.useAlphaFromDiffuseTexture = true
    this._crosshair.material = this._crosshairMaterial
  }

  /**
   * 绘制十字准星图案
   */
  private _drawCrosshair(): void {
    if (!this._crosshairTexture) return

    const ctx = this._crosshairTexture.getContext()
    const size = 64
    const center = size / 2
    const lineWidth = 2
    const lineLength = 12
    const gap = 4

    // 清空（完全透明背景）
    ctx.clearRect(0, 0, size, size)

    // 绘制十字准星（亮绿色）
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = lineWidth

    // 上
    ctx.beginPath()
    ctx.moveTo(center, center - gap - lineLength)
    ctx.lineTo(center, center - gap)
    ctx.stroke()

    // 下
    ctx.beginPath()
    ctx.moveTo(center, center + gap)
    ctx.lineTo(center, center + gap + lineLength)
    ctx.stroke()

    // 左
    ctx.beginPath()
    ctx.moveTo(center - gap - lineLength, center)
    ctx.lineTo(center - gap, center)
    ctx.stroke()

    // 右
    ctx.beginPath()
    ctx.moveTo(center + gap, center)
    ctx.lineTo(center + gap + lineLength, center)
    ctx.stroke()

    // 中心点（小圆点）
    ctx.fillStyle = '#00FF00'
    ctx.beginPath()
    ctx.arc(center, center, 1.5, 0, Math.PI * 2)
    ctx.fill()

    this._crosshairTexture.update()
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
    if (this._crosshair) {
      this._crosshair.dispose()
      this._crosshair = null
    }
    if (this._crosshairTexture) {
      this._crosshairTexture.dispose()
      this._crosshairTexture = null
    }
    if (this._crosshairMaterial) {
      this._crosshairMaterial.dispose()
      this._crosshairMaterial = null
    }
  }
}
