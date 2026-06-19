import {
  Scene,
  Vector3,
  ParticleSystem,
  Color4,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Animation
} from '@babylonjs/core'

const FIRE_PARTICLE_COUNT = 100
const SMOKE_PARTICLE_COUNT = 60
const SPARK_PARTICLE_COUNT = 40

/**
 * 彩蛋模式爆炸效果
 * 用于火箭炮和手榴弹的爆炸视觉
 */
export class EasterEggExplosion {
  private _scene: Scene
  private _onShake: (() => void) | null = null

  constructor(scene: Scene) {
    this._scene = scene
  }

  setShakeCallback(callback: () => void): void {
    this._onShake = callback
  }

  /**
   * 在指定位置创建爆炸效果
   * @param position 爆炸中心位置
   */
  createExplosion(position: Vector3): void {
    this._createFireParticles(position)
    this._createSmokeParticles(position)
    this._createSparkParticles(position)
    this._createShockwave(position)
    this._createFlashLight(position)
    this._onShake?.()
  }

  /**
   * 火焰粒子：橙红色，向外扩散，短寿命
   */
  private _createFireParticles(position: Vector3): void {
    const ps = new ParticleSystem('explosionFire', FIRE_PARTICLE_COUNT, this._scene)
    ps.emitter = position.clone()

    ps.createSphereEmitter(0.8)

    ps.color1 = new Color4(1, 0.8, 0, 1)   // 亮黄色
    ps.color2 = new Color4(1, 0.3, 0, 1)   // 橙红色
    ps.colorDead = new Color4(0.5, 0, 0, 0) // 暗红消失

    ps.minSize = 0.15
    ps.maxSize = 0.6
    ps.minLifeTime = 0.3
    ps.maxLifeTime = 0.7

    ps.emitRate = FIRE_PARTICLE_COUNT * 3 // 快速爆发
    ps.gravity = new Vector3(0, 3, 0) // 向上飘

    ps.minEmitPower = 3
    ps.maxEmitPower = 8

    ps.targetStopDuration = 0.15 // 短时间发射
    ps.disposeOnStop = true
    ps.name = 'explosionFire'
    ps.start()
  }

  /**
   * 烟雾粒子：灰色，向上飘散，较长寿命
   */
  private _createSmokeParticles(position: Vector3): void {
    const ps = new ParticleSystem('explosionSmoke', SMOKE_PARTICLE_COUNT, this._scene)
    ps.emitter = position.clone()

    ps.createSphereEmitter(1.2)

    ps.color1 = new Color4(0.6, 0.6, 0.6, 0.7) // 灰色半透明
    ps.color2 = new Color4(0.4, 0.4, 0.4, 0.5)
    ps.colorDead = new Color4(0.2, 0.2, 0.2, 0)

    ps.minSize = 0.3
    ps.maxSize = 1.0
    ps.minLifeTime = 1.0
    ps.maxLifeTime = 2.0

    ps.emitRate = SMOKE_PARTICLE_COUNT * 2
    ps.gravity = new Vector3(0, 1.5, 0) // 缓慢上升

    ps.minEmitPower = 1
    ps.maxEmitPower = 3

    ps.targetStopDuration = 0.25
    ps.disposeOnStop = true
    ps.name = 'explosionSmoke'
    ps.start()
  }

  /**
   * 火花粒子：明亮的火花四溅效果
   */
  private _createSparkParticles(position: Vector3): void {
    const ps = new ParticleSystem('explosionSparks', SPARK_PARTICLE_COUNT, this._scene)
    ps.emitter = position.clone()

    ps.createSphereEmitter(0.3)

    ps.color1 = new Color4(1, 1, 0.5, 1)   // 亮黄色
    ps.color2 = new Color4(1, 0.8, 0, 1)   // 金色
    ps.colorDead = new Color4(1, 0.4, 0, 0) // 橙色消失

    ps.minSize = 0.05
    ps.maxSize = 0.15
    ps.minLifeTime = 0.2
    ps.maxLifeTime = 0.5

    ps.emitRate = SPARK_PARTICLE_COUNT * 4 // 快速爆发
    ps.gravity = new Vector3(0, -5, 0) // 向下掉落

    ps.minEmitPower = 5
    ps.maxEmitPower = 12

    ps.targetStopDuration = 0.1 // 极短时间发射
    ps.disposeOnStop = true
    ps.name = 'explosionSparks'
    ps.start()
  }

  /**
   * 冲击波效果：缩放的透明球体
   */
  private _createShockwave(position: Vector3): void {
    const sphere = MeshBuilder.CreateSphere('shockwave', { diameter: 0.5 }, this._scene)
    sphere.position = position.clone()

    const mat = new StandardMaterial('shockwaveMat', this._scene)
    mat.emissiveColor = new Color3(1, 0.5, 0) // 橙色发光
    mat.alpha = 0.6
    mat.disableLighting = true
    sphere.material = mat

    // 缩放动画：从 0 快速放大到 8
    const scaleAnim = new Animation(
      'shockwaveScale',
      'scaling',
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    )
    scaleAnim.setKeys([
      { frame: 0, value: new Vector3(0.3, 0.3, 0.3) },
      { frame: 10, value: new Vector3(8, 8, 8) }
    ])

    // 透明度动画：从 0.6 到 0
    const alphaAnim = new Animation(
      'shockwaveAlpha',
      'material.alpha',
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    )
    alphaAnim.setKeys([
      { frame: 0, value: 0.6 },
      { frame: 10, value: 0 }
    ])

    sphere.animations = [scaleAnim, alphaAnim]

    this._scene.beginAnimation(sphere, 0, 10, false, 1, () => {
      sphere.dispose()
      mat.dispose()
    })
  }

  /**
   * 爆炸闪光：瞬间的明亮闪光效果
   */
  private _createFlashLight(position: Vector3): void {
    const flash = MeshBuilder.CreateSphere('explosionFlash', { diameter: 1.5 }, this._scene)
    flash.position = position.clone()

    const mat = new StandardMaterial('flashMat', this._scene)
    mat.emissiveColor = new Color3(1, 0.9, 0.5) // 亮黄色
    mat.alpha = 0.9
    mat.disableLighting = true
    flash.material = mat

    // 快速消失动画
    const alphaAnim = new Animation(
      'flashAlpha',
      'material.alpha',
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    )
    alphaAnim.setKeys([
      { frame: 0, value: 0.9 },
      { frame: 5, value: 0 }
    ])

    // 缩放动画
    const scaleAnim = new Animation(
      'flashScale',
      'scaling',
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    )
    scaleAnim.setKeys([
      { frame: 0, value: new Vector3(0.5, 0.5, 0.5) },
      { frame: 5, value: new Vector3(2, 2, 2) }
    ])

    flash.animations = [alphaAnim, scaleAnim]

    this._scene.beginAnimation(flash, 0, 5, false, 1, () => {
      flash.dispose()
      mat.dispose()
    })
  }

  dispose(): void {
    // 粒子系统会自动 dispose（disposeOnStop = true）
  }
}
