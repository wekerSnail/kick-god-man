import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  Color4,
  Color3
} from '@babylonjs/core'

/**
 * 引擎上下文：负责 Engine / Scene / Camera / 灯光 / 阴影 / 后处理管线。
 *
 * 设计目标：明亮、通透的「白天办公室」氛围。
 * - 天空色 / 雾色采用浅天蓝，让远景不发黑；
 * - 半球光 + 主方向光（窗外日光）+ 顶部点光（吊灯）三档组合，亮度充足；
 * - ACES 色调映射 + 高曝光，避免 PBR 材质偏暗；
 * - 关闭暗角 vignette / 胶片颗粒 grain 等夜间怪谈特效。
 */
export class EngineContext {
  readonly engine: Engine
  readonly scene: Scene
  readonly camera: FreeCamera
  readonly shadowGen: ShadowGenerator
  readonly pipeline: DefaultRenderingPipeline

  private ambient!: HemisphericLight
  private sun!: DirectionalLight

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: true
    }, true)
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 2))

    this.scene = new Scene(this.engine)
    // 浅天蓝背景：模拟白天办公室窗外自然光
    this.scene.clearColor = Color4.FromHexString('#AECDE8FF')
    // 整体环境光偏白，让暗面也不会发黑
    this.scene.ambientColor = Color3.FromHexString('#9FA8B4')
    // 很淡的远景雾，仅做空气透视，不压暗画面
    this.scene.fogMode = Scene.FOGMODE_LINEAR
    this.scene.fogColor = Color3.FromHexString('#C8D8E8')
    this.scene.fogStart = 40
    this.scene.fogEnd = 90

    this.camera = new FreeCamera('cam', new Vector3(0, 10, 15), this.scene)
    this.camera.setTarget(Vector3.Zero())
    this.camera.fov = (60 * Math.PI) / 180
    this.camera.minZ = 0.1
    this.camera.maxZ = 1000

    this.setupLighting()
    this.shadowGen = this.setupShadow()
    this.pipeline = this.setupPipeline()
  }

  private setupLighting(): void {
    // 环境光：上半球偏亮白（天空），下半球偏暖（地面反射）
    this.ambient = new HemisphericLight('hemi', Vector3.Up(), this.scene)
    this.ambient.diffuse = Color3.FromHexString('#FFFFFF')
    this.ambient.groundColor = Color3.FromHexString('#B8A990')
    this.ambient.intensity = 0.9

    // 主光：窗外方向光，模拟白天阳光，暖白
    this.sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.6), this.scene)
    this.sun.diffuse = Color3.FromHexString('#FFF4E0')
    this.sun.specular = Color3.FromHexString('#FFF4E0')
    this.sun.intensity = 1.0
    this.sun.position = new Vector3(20, 30, -20)

    // 室内吊灯位置参考（中央偏上），暖白补光，照亮房间中段。
    // 用一个方向光做整体补光，避免点光衰减导致角落过暗。
    const fill = new DirectionalLight('fill', new Vector3(0.2, -1, -0.3), this.scene)
    fill.diffuse = Color3.FromHexString('#E8F0FF')
    fill.specular = Color3.FromHexString('#E8F0FF')
    fill.intensity = 0.4
    fill.position = new Vector3(-10, 20, 15)
  }

  private setupShadow(): ShadowGenerator {
    // 用主方向光投影，PCF 软阴影，darkness 适中不要过黑
    const shadowGen = new ShadowGenerator(2048, this.sun)
    shadowGen.usePercentageCloserFiltering = true
    shadowGen.bias = 0.01
    shadowGen.normalBias = 0.02
    shadowGen.darkness = 0.35
    return shadowGen
  }

  private setupPipeline(): DefaultRenderingPipeline {
    const p = new DefaultRenderingPipeline('pipeline', true, this.scene, [this.camera])
    p.imageProcessing.toneMappingEnabled = true
    p.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
    // 提高曝光让 PBR 材质更明亮
    p.imageProcessing.exposure = 1.5
    // 对比度回到接近中性，避免画面发灰或发暗
    p.imageProcessing.contrast = 1.02
    p.imageProcessing.vignetteEnabled = false
    p.fxaaEnabled = true
    // 关闭胶片颗粒（夜间怪谈特效，白天办公室不需要）
    p.grainEnabled = false
    return p
  }

  start(onTick: (dt: number) => void): void {
    let last = performance.now()
    this.scene.onBeforeRenderObservable.add(() => {
      const now = performance.now()
      onTick(Math.min((now - last) / 1000, 0.1))
      last = now
    })
    this.engine.runRenderLoop(() => this.scene.render())
    window.addEventListener('resize', () => this.engine.resize())
  }

  dispose(): void {
    this.engine.stopRenderLoop()
    this.scene.dispose()
    this.engine.dispose()
  }
}
