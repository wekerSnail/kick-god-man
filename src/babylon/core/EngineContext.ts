import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  Color3,
  ShadowGenerator,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  Color4
} from '@babylonjs/core'

export class EngineContext {
  readonly engine: Engine
  readonly scene: Scene
  readonly camera: FreeCamera
  readonly shadowGen: ShadowGenerator
  readonly pipeline: DefaultRenderingPipeline

  private ambient!: HemisphericLight
  private sun!: DirectionalLight
  private point!: PointLight

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: true
    }, true)
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 2))

    this.scene = new Scene(this.engine)
    this.scene.clearColor = Color4.FromHexString('#1a1410FF')
    this.scene.ambientColor = Color3.FromHexString('#3a2a1f')
    this.scene.fogMode = Scene.FOGMODE_EXP2
    this.scene.fogColor = Color3.FromHexString('#0d0805')
    this.scene.fogDensity = 0.012

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
    // 环境光：半球光，地面反射棕色
    this.ambient = new HemisphericLight('hemi', Vector3.Up(), this.scene)
    this.ambient.diffuse = Color3.FromHexString('#5a4a3a')
    this.ambient.groundColor = Color3.FromHexString('#2a1f15')
    this.ambient.intensity = 0.35

    // 主光：头顶白炽灯，暖橙、点光源
    this.point = new PointLight('lamp', new Vector3(0, 7, 0), this.scene)
    this.point.diffuse = Color3.FromHexString('#f4c46a')
    this.point.intensity = 0.9
    this.point.range = 25

    // 补光：窗外微弱蓝月光（冷色对比）
    this.sun = new DirectionalLight('moon', new Vector3(0.3, -1, 0.4), this.scene)
    this.sun.diffuse = Color3.FromHexString('#3a4a6a')
    this.sun.intensity = 0.15
  }

  private setupShadow(): ShadowGenerator {
    const shadowGen = new ShadowGenerator(1024, this.point)
    shadowGen.useBlurExponentialShadowMap = true
    shadowGen.blurKernel = 16
    shadowGen.darkness = 0.6
    return shadowGen
  }

  private setupPipeline(): DefaultRenderingPipeline {
    const p = new DefaultRenderingPipeline('pipeline', true, this.scene, [this.camera])
    p.imageProcessing.toneMappingEnabled = true
    p.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
    p.imageProcessing.exposure = 1.1
    p.imageProcessing.contrast = 1.15
    p.imageProcessing.vignetteEnabled = true
    p.imageProcessing.vignetteWeight = 2.5
    p.imageProcessing.vignetteColor = Color4.FromHexString('#000000FF')
    p.imageProcessing.vignetteStretch = 0.5
    p.fxaaEnabled = true
    p.grainEnabled = true
    p.grain.intensity = 8
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
