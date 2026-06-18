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
 * 引擎上下文：明亮卡通风格的白天办公室。
 *
 * - 天空蓝背景 + 极淡空气透视雾
 * - 强环境光 + 暖白主光 + 冷色补光，确保无暗角
 * - 高曝光 + 低对比度，让 PBR 材质呈现明亮糖果感
 * - 无暗角、无胶片颗粒
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
    // 明亮天空蓝背景
    this.scene.clearColor = Color4.FromHexString('#B8D8F8FF')
    // 偏白环境，暗面也亮
    this.scene.ambientColor = Color3.FromHexString('#C0C8D4')
    // 极淡线性雾，仅做远景柔化
    this.scene.fogMode = Scene.FOGMODE_LINEAR
    this.scene.fogColor = Color3.FromHexString('#D8E8F8')
    this.scene.fogStart = 50
    this.scene.fogEnd = 100

    this.camera = new FreeCamera('cam', new Vector3(0, 10, 15), this.scene)
    this.camera.setTarget(Vector3.Zero())
    this.camera.fov = (70 * Math.PI) / 180
    this.camera.minZ = 0.1
    this.camera.maxZ = 1000

    this.setupLighting()
    this.shadowGen = this.setupShadow()
    this.pipeline = this.setupPipeline()
  }

  private setupLighting(): void {
    // 环境光：上半球纯白，下半球暖米色（地面反射）
    this.ambient = new HemisphericLight('hemi', Vector3.Up(), this.scene)
    this.ambient.diffuse = Color3.FromHexString('#FFFFFF')
    this.ambient.groundColor = Color3.FromHexString('#D8D0C0')
    this.ambient.intensity = 1.0

    // 主光：窗外日光，暖白偏黄
    this.sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.6), this.scene)
    this.sun.diffuse = Color3.FromHexString('#FFF8E8')
    this.sun.specular = Color3.FromHexString('#FFF8E8')
    this.sun.intensity = 0.8
    this.sun.position = new Vector3(20, 30, -20)

    // 补光：冷色方向光，模拟天空散射，消除暗面
    const fill = new DirectionalLight('fill', new Vector3(0.2, -1, -0.3), this.scene)
    fill.diffuse = Color3.FromHexString('#E8F4FF')
    fill.specular = Color3.FromHexString('#E8F4FF')
    fill.intensity = 0.5
    fill.position = new Vector3(-10, 20, 15)
  }

  private setupShadow(): ShadowGenerator {
    const shadowGen = new ShadowGenerator(2048, this.sun)
    shadowGen.usePercentageCloserFiltering = true
    shadowGen.bias = 0.01
    shadowGen.normalBias = 0.02
    // 卡通风：阴影很浅，不要压暗画面
    shadowGen.darkness = 0.2
    return shadowGen
  }

  private setupPipeline(): DefaultRenderingPipeline {
    const p = new DefaultRenderingPipeline('pipeline', true, this.scene, [this.camera])
    p.imageProcessing.toneMappingEnabled = true
    p.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
    // 高曝光保持明亮
    p.imageProcessing.exposure = 1.6
    // 接近中性对比度
    p.imageProcessing.contrast = 1.0
    // 关闭暗角和颗粒（夜间效果）
    p.imageProcessing.vignetteEnabled = false
    p.fxaaEnabled = true
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
