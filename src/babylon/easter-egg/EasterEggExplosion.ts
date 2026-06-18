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

const FIRE_PARTICLE_COUNT = 50
const SMOKE_PARTICLE_COUNT = 30

/**
 * 彩蛋模式爆炸效果
 * 用于火箭炮和手榴弹的爆炸视觉
 */
export class EasterEggExplosion {
  private _scene: Scene

  constructor(scene: Scene) {
    this._scene = scene
  }

  /**
   * 在指定位置创建爆炸效果
   * @param position 爆炸中心位置
   */
  createExplosion(position: Vector3): void {
    this._createFireParticles(position)
    this._createSmokeParticles(position)
    this._createShockwave(position)
  }

  /**
   * 火焰粒子：橙红色，向外扩散，短寿命
   */
  private _createFireParticles(position: Vector3): void {
    const ps = new ParticleSystem('explosionFire', FIRE_PARTICLE_COUNT, this._scene)
    ps.emitter = position.clone()

    ps.createSphereEmitter(0.5)

    ps.color1 = new Color4(1, 0.6, 0, 1)   // 橙色
    ps.color2 = new Color4(1, 0.2, 0, 1)   // 红色
    ps.colorDead = new Color4(0.3, 0, 0, 0) // 暗红消失

    ps.minSize = 0.1
    ps.maxSize = 0.4
    ps.minLifeTime = 0.2
    ps.maxLifeTime = 0.5

    ps.emitRate = FIRE_PARTICLE_COUNT * 2 // 快速爆发
    ps.gravity = new Vector3(0, 2, 0) // 向上飘

    ps.minEmitPower = 2
    ps.maxEmitPower = 5

    ps.targetStopDuration = 0.2 // 短时间发射
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

    ps.createSphereEmitter(0.8)

    ps.color1 = new Color4(0.5, 0.5, 0.5, 0.6) // 灰色半透明
    ps.color2 = new Color4(0.3, 0.3, 0.3, 0.4)
    ps.colorDead = new Color4(0.2, 0.2, 0.2, 0)

    ps.minSize = 0.2
    ps.maxSize = 0.6
    ps.minLifeTime = 0.8
    ps.maxLifeTime = 1.5

    ps.emitRate = SMOKE_PARTICLE_COUNT
    ps.gravity = new Vector3(0, 1, 0) // 缓慢上升

    ps.minEmitPower = 0.5
    ps.maxEmitPower = 2

    ps.targetStopDuration = 0.3
    ps.disposeOnStop = true
    ps.name = 'explosionSmoke'
    ps.start()
  }

  /**
   * 冲击波效果：缩放的透明球体
   */
  private _createShockwave(position: Vector3): void {
    const sphere = MeshBuilder.CreateSphere('shockwave', { diameter: 0.5 }, this._scene)
    sphere.position = position.clone()

    const mat = new StandardMaterial('shockwaveMat', this._scene)
    mat.emissiveColor = new Color3(1, 0.5, 0)
    mat.alpha = 0.6
    mat.disableLighting = true
    sphere.material = mat

    // 缩放动画：从 0 快速放大到 6
    const scaleAnim = new Animation(
      'shockwaveScale',
      'scaling',
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    )
    scaleAnim.setKeys([
      { frame: 0, value: new Vector3(0.5, 0.5, 0.5) },
      { frame: 15, value: new Vector3(6, 6, 6) }
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
      { frame: 15, value: 0 }
    ])

    sphere.animations = [scaleAnim, alphaAnim]

    this._scene.beginAnimation(sphere, 0, 15, false, 1, () => {
      sphere.dispose()
      mat.dispose()
    })
  }

  dispose(): void {
    // 粒子系统会自动 dispose（disposeOnStop = true）
  }
}
