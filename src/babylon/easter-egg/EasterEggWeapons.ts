import {
  Scene,
  Vector3,
  ParticleSystem,
  Color4,
  MeshBuilder,
  TransformNode,
  StandardMaterial,
  Color3,
  Mesh
} from '@babylonjs/core'
import type { EasterEggWeaponType } from '../../types/game'
import { EASTER_EGG_WEAPONS } from '../../types/game'
import type { EasterEggBoss } from './EasterEggBoss'
import type { AssetManager } from '../core/AssetManager'

// EasterEggExplosion 将在 Task 11 中创建
interface EasterEggExplosion {
  createExplosion(position: Vector3): void
}

// 子弹配置
const BULLET_SPEED = 50
const BULLET_LIFETIME = 2 // 秒
const HIT_RADIUS = 1.5 // 命中检测半径

// 火箭炮配置
const ROCKET_SPEED = 30
const ROCKET_LIFETIME = 3

// 手榴弹配置
const GRENADE_SPEED = 10
const GRENADE_GRAVITY = -9.8
const GRENADE_DETONATE_DELAY = 0.5 // 落地后延迟爆炸
const GRENADE_LIFETIME = 3
const GRENADE_EXPLOSION_RADIUS = 2.0 // 手榴弹爆炸半径（与红圈标识一致）

// 手榴弹 GLB 模型路径
const GRENADE_MODEL_URL = new URL('/models/kenney_blaster-kit_2.1/grenade-a.glb', import.meta.url).href

interface Projectile {
  node: TransformNode
  velocity: Vector3
  lifetime: number
  type: EasterEggWeaponType
  hasGravity: boolean
  isDetonating: boolean
  detonateTimer: number
}

// 后坐力回调类型
type RecoilCallback = (intensity: number) => void

/**
 * 彩蛋模式武器系统
 * 管理三种武器的射击逻辑、弹道粒子、命中检测
 */
export class EasterEggWeapons {
  private _scene: Scene
  private _boss: EasterEggBoss
  private _assetManager: AssetManager | null = null
  private _explosion: EasterEggExplosion | null = null
  private _projectiles: Projectile[] = []
  private _fireCooldown = 0
  private _isFiring = false
  private _currentWeaponType: EasterEggWeaponType = 'gun'
  private _aimLinePool: Mesh[] = [] // 预分配的瞄准点对象池
  private _recoilCallback: RecoilCallback | null = null
  private _aimDotMat: StandardMaterial | null = null
  private _landingIndicator: Mesh | null = null
  private _landingIndicatorMat: StandardMaterial | null = null
  private _grenadeInFlight = false
  private _grenadeModelLoaded = false

  constructor(scene: Scene, boss: EasterEggBoss, assetManager?: AssetManager) {
    this._scene = scene
    this._boss = boss
    this._assetManager = assetManager ?? null
  }

  /**
   * 预加载手雷模型（只加载到缓存，不显示在场景中）
   */
  async preloadGrenadeModel(): Promise<void> {
    if (!this._assetManager || this._grenadeModelLoaded) return

    try {
      const clone = await this._assetManager.loadProp('grenade_projectile', GRENADE_MODEL_URL)
      clone.setEnabled(false) // 隐藏预加载的克隆体，避免显示在地上
      this._grenadeModelLoaded = true
      console.log('[EasterEggWeapons] Grenade model preloaded successfully')
    } catch (e) {
      console.warn('[EasterEggWeapons] Failed to preload grenade model, will use placeholder', e)
    }
  }

  setExplosion(explosion: EasterEggExplosion): void {
    this._explosion = explosion
  }

  /**
   * 设置后坐力回调
   */
  setRecoilCallback(callback: RecoilCallback): void {
    this._recoilCallback = callback
  }

  /**
   * 切换当前武器
   */
  switchWeapon(type: EasterEggWeaponType): void {
    this._currentWeaponType = type
    this._fireCooldown = 0
    this._clearAimLine()
  }

  /**
   * 开始射击（左键按下）
   */
  startFiring(): void {
    this._isFiring = true
  }

  /**
   * 停止射击（左键释放）
   */
  stopFiring(): void {
    this._isFiring = false
  }

  /**
   * 更新武器系统
   * @param delta 帧间隔
   * @param fireOrigin 射击起点（右手位置）
   * @param fireDirection 射击方向（相机朝向）
   */
  async update(delta: number, fireOrigin: Vector3, fireDirection: Vector3): Promise<void> {
    // 更新冷却
    this._fireCooldown = Math.max(0, this._fireCooldown - delta)

    // 处理射击输入
    if (this._isFiring && this._fireCooldown <= 0) {
      await this._fire(fireOrigin, fireDirection)
      const config = EASTER_EGG_WEAPONS.find(w => w.type === this._currentWeaponType)!
      this._fireCooldown = 1 / config.fireRate
    }

    // 更新抛射物
    this._updateProjectiles(delta)

    // 更新手榴弹瞄准线
    if (this._currentWeaponType === 'grenade' && !this._grenadeInFlight) {
      this._updateAimLine(fireOrigin, fireDirection)
    } else {
      this._clearAimLine()
    }
  }

  /**
   * 射击
   */
  private async _fire(origin: Vector3, direction: Vector3): Promise<void> {
    switch (this._currentWeaponType) {
      case 'gun':
        this._fireGun(origin, direction)
        this._recoilCallback?.(0.03) // 手枪后坐力
        break
      case 'rocket':
        this._fireRocket(origin, direction)
        this._recoilCallback?.(0.08) // 火箭炮后坐力更大
        break
      case 'grenade':
        await this._fireGrenade(origin, direction)
        this._recoilCallback?.(0.05) // 手榴弹后坐力
        break
    }
  }

  /**
   * 枪射击：快速直线子弹 + 弹道轨迹粒子
   */
  private _fireGun(origin: Vector3, direction: Vector3): void {
    // 创建子弹（小而亮）
    const bullet = MeshBuilder.CreateSphere('bullet', { diameter: 0.08 }, this._scene)
    bullet.position = origin.clone()

    const mat = new StandardMaterial('bulletMat', this._scene)
    mat.emissiveColor = new Color3(1, 1, 0.5) // 亮黄色
    mat.disableLighting = true
    bullet.material = mat

    // 创建弹道轨迹粒子
    this._createBulletTrail(bullet)

    // 创建枪口闪光
    this._createMuzzleFlash(origin)

    this._projectiles.push({
      node: bullet,
      velocity: direction.normalize().scale(BULLET_SPEED),
      lifetime: BULLET_LIFETIME,
      type: 'gun',
      hasGravity: false,
      isDetonating: false,
      detonateTimer: 0
    })
  }

  /**
   * 火箭炮射击：导弹 + 烟雾尾迹
   */
  private _fireRocket(origin: Vector3, direction: Vector3): void {
    // 创建导弹（更大更精致的形状）
    const rocket = MeshBuilder.CreateCylinder('rocket', {
      height: 1.2,
      diameterTop: 0.05,
      diameterBottom: 0.3,
      tessellation: 8
    }, this._scene)
    // 射击起点略微上移，避免贴地
    rocket.position = origin.clone()
    rocket.position.y += 0.2

    const mat = new StandardMaterial('rocketMat', this._scene)
    mat.emissiveColor = new Color3(1, 0.3, 0) // 橙红色
    mat.disableLighting = true
    rocket.material = mat

    // 旋转导弹朝向飞行方向
    const dir = direction.normalize()
    const angle = Math.atan2(dir.x, dir.z)
    rocket.rotation.y = angle
    rocket.rotation.x = -Math.asin(dir.y)

    // 创建导弹尾焰
    this._createRocketTrail(rocket)

    // 创建发射闪光
    this._createMuzzleFlash(origin, new Color3(1, 0.5, 0))

    this._projectiles.push({
      node: rocket,
      velocity: dir.scale(ROCKET_SPEED),
      lifetime: ROCKET_LIFETIME,
      type: 'rocket',
      hasGravity: false,
      isDetonating: false,
      detonateTimer: 0
    })
  }

  /**
   * 手榴弹射击：抛物线投掷
   */
  private async _fireGrenade(origin: Vector3, direction: Vector3): Promise<void> {
    let grenade: TransformNode

    // 尝试使用真实手雷模型
    if (this._assetManager && this._grenadeModelLoaded) {
      try {
        grenade = await this._assetManager.loadProp('grenade_projectile', GRENADE_MODEL_URL)
        grenade.scaling = new Vector3(0.3, 0.3, 0.3) // 增大到0.3，更明显
      } catch (e) {
        console.warn('[EasterEggWeapons] Failed to clone grenade model, using placeholder', e)
        grenade = this._createGrenadePlaceholder()
      }
    } else {
      grenade = this._createGrenadePlaceholder()
    }

    grenade.position = origin.clone()

    // 初始速度：向前 + 向上抛物线（鼠标上下控制弧度）
    const dir = direction.normalize()
    const velocity = new Vector3(
      dir.x * GRENADE_SPEED,
      dir.y * GRENADE_SPEED * 2 + GRENADE_SPEED * 0.3, // dir.y 占主导，鼠标上下控制明显
      dir.z * GRENADE_SPEED
    )

    this._createGrenadeTrail(grenade)
    this._grenadeInFlight = true

    this._projectiles.push({
      node: grenade,
      velocity,
      lifetime: GRENADE_LIFETIME,
      type: 'grenade',
      hasGravity: true,
      isDetonating: false,
      detonateTimer: 0
    })
  }

  /**
   * 创建手雷占位几何体（当模型加载失败时）
   */
  private _createGrenadePlaceholder(): TransformNode {
    const grenade = MeshBuilder.CreateSphere('grenade', { diameter: 0.12 }, this._scene)
    const mat = new StandardMaterial('grenadeMat', this._scene)
    mat.emissiveColor = new Color3(0.15, 0.15, 0.15)
    grenade.material = mat
    return grenade
  }

  /**
   * 更新所有抛射物
   */
  private _updateProjectiles(delta: number): void {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const proj = this._projectiles[i]

      // 更新位置
      proj.node.position.addInPlace(proj.velocity.scale(delta))

      // 重力影响
      if (proj.hasGravity) {
        proj.velocity.y += GRENADE_GRAVITY * delta
      }

      // 更新生命周期
      proj.lifetime -= delta

      // 命中检测（手雷除外，手雷通过落地爆炸机制处理）
      if (proj.type !== 'grenade') {
        const bossPos = this._boss.position
        const dist = Vector3.Distance(proj.node.position, bossPos)

        if (dist < HIT_RADIUS) {
          this._onHit(proj)
          this._removeProjectile(i)
          continue
        }
      }

      // 手榴弹落地检测
      if (proj.type === 'grenade' && proj.node.position.y <= 0) {
        proj.node.position.y = 0
        proj.velocity = Vector3.Zero()

        if (!proj.isDetonating) {
          proj.isDetonating = true
          proj.detonateTimer = GRENADE_DETONATE_DELAY
        }
      }

      // 手榴弹延迟爆炸
      if (proj.isDetonating) {
        proj.detonateTimer -= delta
        if (proj.detonateTimer <= 0) {
          // 检查爆炸范围（与红圈标识一致）
          const bossDist = Vector3.Distance(proj.node.position, this._boss.position)
          if (bossDist < GRENADE_EXPLOSION_RADIUS) {
            this._boss.onHitByExplosion()
          }
          this._explosion?.createExplosion(proj.node.position.clone())
          this._removeProjectile(i)
          continue
        }
      }

      // 超出范围或超时销毁
      if (proj.lifetime <= 0 || this._isOutOfBounds(proj.node.position)) {
        this._removeProjectile(i)
      }
    }
  }

  /**
   * 命中处理
   */
  private _onHit(proj: Projectile): void {
    switch (proj.type) {
      case 'gun':
        this._boss.onHitByGun()
        break
      case 'rocket':
        this._boss.onHitByExplosion()
        this._explosion?.createExplosion(proj.node.position.clone())
        break
      case 'grenade':
        // 手雷直接命中Boss时也会爆炸
        this._boss.onHitByExplosion()
        this._explosion?.createExplosion(proj.node.position.clone())
        break
    }
  }

  /**
   * 创建弹道轨迹粒子（跟随子弹移动）
   */
  private _createBulletTrail(bullet: TransformNode): void {
    const ps = new ParticleSystem('bulletTrail', 30, this._scene)
    // 使用子弹本身作为发射器，粒子会跟随子弹移动
    ps.emitter = bullet.position
    ps.createSphereEmitter(0.05)

    ps.color1 = new Color4(1, 1, 0.5, 1)
    ps.color2 = new Color4(1, 0.8, 0, 0.6)
    ps.colorDead = new Color4(1, 0.5, 0, 0)

    ps.minSize = 0.03
    ps.maxSize = 0.08
    ps.minLifeTime = 0.05
    ps.maxLifeTime = 0.15

    ps.emitRate = 100
    ps.gravity = Vector3.Zero()

    ps.targetStopDuration = BULLET_LIFETIME
    ps.disposeOnStop = true
    ps.start()
  }

  /**
   * 创建导弹尾焰粒子（跟随导弹移动）
   */
  private _createRocketTrail(rocket: TransformNode): void {
    // 烟雾尾迹
    const smoke = new ParticleSystem('rocketSmoke', 80, this._scene)
    smoke.emitter = rocket.position
    smoke.createSphereEmitter(0.15)

    smoke.color1 = new Color4(0.8, 0.8, 0.8, 0.7)
    smoke.color2 = new Color4(0.5, 0.5, 0.5, 0.4)
    smoke.colorDead = new Color4(0.3, 0.3, 0.3, 0)

    smoke.minSize = 0.2
    smoke.maxSize = 0.6
    smoke.minLifeTime = 0.3
    smoke.maxLifeTime = 0.8

    smoke.emitRate = 150
    smoke.gravity = new Vector3(0, -0.3, 0)
    smoke.direction1 = new Vector3(-0.15, -0.15, -0.15)
    smoke.direction2 = new Vector3(0.15, 0.15, 0.15)

    smoke.targetStopDuration = ROCKET_LIFETIME
    smoke.disposeOnStop = true
    smoke.start()

    // 火焰尾焰
    const fire = new ParticleSystem('rocketFire', 50, this._scene)
    fire.emitter = rocket.position
    fire.createSphereEmitter(0.1)

    fire.color1 = new Color4(1, 0.8, 0, 1)
    fire.color2 = new Color4(1, 0.3, 0, 0.8)
    fire.colorDead = new Color4(1, 0, 0, 0)

    fire.minSize = 0.1
    fire.maxSize = 0.3
    fire.minLifeTime = 0.05
    fire.maxLifeTime = 0.25

    fire.emitRate = 120
    fire.gravity = Vector3.Zero()

    fire.targetStopDuration = ROCKET_LIFETIME
    fire.disposeOnStop = true
    fire.start()
  }

  /**
   * 创建手榴弹黑色粒子尾迹
   */
  private _createGrenadeTrail(grenade: TransformNode): void {
    const ps = new ParticleSystem('grenadeTrail', 40, this._scene)
    ps.emitter = grenade.position
    ps.createSphereEmitter(0.06)

    ps.color1 = new Color4(0.15, 0.15, 0.15, 0.8)
    ps.color2 = new Color4(0.1, 0.1, 0.1, 0.5)
    ps.colorDead = new Color4(0, 0, 0, 0)

    ps.minSize = 0.05
    ps.maxSize = 0.15
    ps.minLifeTime = 0.15
    ps.maxLifeTime = 0.4

    ps.emitRate = 80
    ps.gravity = new Vector3(0, -0.3, 0)
    ps.direction1 = new Vector3(-0.05, -0.05, -0.05)
    ps.direction2 = new Vector3(0.05, 0.05, 0.05)

    ps.targetStopDuration = GRENADE_LIFETIME
    ps.disposeOnStop = true
    ps.start()
  }

  /**
   * 创建枪口/发射闪光
   */
  private _createMuzzleFlash(position: Vector3, color?: Color3): void {
    const flash = MeshBuilder.CreateSphere('muzzleFlash', { diameter: 0.3 }, this._scene)
    flash.position = position.clone()

    const mat = new StandardMaterial('flashMat', this._scene)
    mat.emissiveColor = color || new Color3(1, 1, 0.5)
    mat.disableLighting = true
    mat.alpha = 0.8
    flash.material = mat

    // 闪光粒子
    const ps = new ParticleSystem('muzzleParticles', 20, this._scene)
    ps.emitter = flash
    ps.createSphereEmitter(0.15)

    ps.color1 = new Color4(1, 1, 0.5, 1)
    ps.color2 = new Color4(1, 0.8, 0, 0.5)
    ps.colorDead = new Color4(0, 0, 0, 0)

    ps.minSize = 0.03
    ps.maxSize = 0.1
    ps.minLifeTime = 0.02
    ps.maxLifeTime = 0.1

    ps.emitRate = 100
    ps.gravity = Vector3.Zero()

    ps.targetStopDuration = 0.05
    ps.disposeOnStop = true
    ps.start()

    // 快速消失
    setTimeout(() => {
      flash.dispose()
    }, 50)
  }

  /**
   * 更新手榴弹瞄准辅助线（复用对象池，不闪烁）
   */
  private _updateAimLine(origin: Vector3, direction: Vector3): void {
    const dir = direction.normalize()
    const vx = dir.x * GRENADE_SPEED
    const vy = dir.y * GRENADE_SPEED * 2 + GRENADE_SPEED * 0.3
    const vz = dir.z * GRENADE_SPEED

    const gravity = GRENADE_GRAVITY
    let px = origin.x
    let py = origin.y
    let pz = origin.z
    let velY = vy

    let lastPos = new Vector3(px, py, pz)
    let landedPos: Vector3 | null = null
    let idx = 0

    for (let t = 0; t < 2.0; t += 0.05) {
      px += vx * 0.05
      velY += gravity * 0.05
      py += velY * 0.05
      pz += vz * 0.05

      if (py < 0) {
        const prevY = lastPos.y
        const frac = prevY / (prevY - py)
        landedPos = new Vector3(
          lastPos.x + (px - lastPos.x) * frac,
          0.01,
          lastPos.z + (pz - lastPos.z) * frac
        )
        break
      }

      lastPos = new Vector3(px, py, pz)

      // 复用或创建点
      let dot: Mesh
      if (idx < this._aimLinePool.length) {
        dot = this._aimLinePool[idx] as Mesh
        dot.setEnabled(true)
      } else {
        dot = MeshBuilder.CreateSphere(`aimDot_${idx}`, { diameter: 0.06 }, this._scene)
        dot.material = this._getAimDotMat()
        this._aimLinePool.push(dot)
      }
      dot.position.copyFrom(lastPos)
      idx++
    }

    // 隐藏多余的点
    for (let i = idx; i < this._aimLinePool.length; i++) {
      this._aimLinePool[i].setEnabled(false)
    }

    // 落点指示圈
    if (landedPos) {
      this._updateLandingIndicator(landedPos)
    } else {
      this._removeLandingIndicator()
    }
  }

  private _getAimDotMat(): StandardMaterial {
    if (!this._aimDotMat) {
      this._aimDotMat = new StandardMaterial('aimDotMat', this._scene)
      this._aimDotMat.emissiveColor = new Color3(0.3, 0.3, 0.3)
      this._aimDotMat.disableLighting = true
      this._aimDotMat.alpha = 0.8
    }
    return this._aimDotMat
  }

  private _updateLandingIndicator(pos: Vector3): void {
    if (!this._landingIndicator) {
      this._landingIndicator = MeshBuilder.CreateDisc('landingCircle',
        { radius: GRENADE_EXPLOSION_RADIUS, tessellation: 32 }, this._scene)
      this._landingIndicator.rotation.x = Math.PI / 2

      this._landingIndicatorMat = new StandardMaterial('landingMat', this._scene)
      this._landingIndicatorMat.emissiveColor = new Color3(1, 0, 0)
      this._landingIndicatorMat.alpha = 0.4
      this._landingIndicatorMat.disableLighting = true
      this._landingIndicatorMat.backFaceCulling = false
      this._landingIndicator.material = this._landingIndicatorMat
    }

    this._landingIndicator.position = pos
    if (this._landingIndicatorMat) {
      const pulse = Math.sin(Date.now() * 0.004) * 0.15
      this._landingIndicatorMat.alpha = 0.35 + pulse
    }
  }

  private _removeLandingIndicator(): void {
    this._landingIndicator?.dispose()
    this._landingIndicator = null
    this._landingIndicatorMat?.dispose()
    this._landingIndicatorMat = null
  }

  /**
   * 隐藏瞄准辅助线（不销毁对象池）
   */
  private _clearAimLine(): void {
    for (const node of this._aimLinePool) {
      node.setEnabled(false)
    }
    this._removeLandingIndicator()
  }

  /**
   * 移除抛射物
   */
  private _removeProjectile(index: number): void {
    const proj = this._projectiles[index]
    if (proj.type === 'grenade') {
      this._grenadeInFlight = false
    }
    proj.node.dispose()
    this._projectiles.splice(index, 1)
  }

  /**
   * 检查是否超出房间范围
   */
  private _isOutOfBounds(pos: Vector3): boolean {
    return Math.abs(pos.x) > 15 || Math.abs(pos.z) > 15 || pos.y < -5
  }

  dispose(): void {
    for (const proj of this._projectiles) {
      proj.node.dispose()
    }
    this._projectiles = []
    for (const node of this._aimLinePool) {
      node.dispose()
    }
    this._aimLinePool = []
    this._removeLandingIndicator()
    this._aimDotMat?.dispose()
    this._aimDotMat = null
  }
}
