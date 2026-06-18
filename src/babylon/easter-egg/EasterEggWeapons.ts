import {
  Scene,
  Vector3,
  ParticleSystem,
  Color4,
  MeshBuilder,
  TransformNode,
  StandardMaterial,
  Color3
} from '@babylonjs/core'
import type { EasterEggWeaponType } from '../../types/game'
import { EASTER_EGG_WEAPONS } from '../../types/game'
import type { EasterEggBoss } from './EasterEggBoss'

// EasterEggExplosion 将在 Task 11 中创建
interface EasterEggExplosion {
  createExplosion(position: Vector3): void
}

// 子弹配置
const BULLET_SPEED = 50
const BULLET_LIFETIME = 2 // 秒
const BULLET_TRAIL_LENGTH = 0.3 // 弹道轨迹长度
const HIT_RADIUS = 1.5 // 命中检测半径

// 火箭炮配置
const ROCKET_SPEED = 30
const ROCKET_LIFETIME = 3

// 手榴弹配置
const GRENADE_SPEED = 15
const GRENADE_GRAVITY = -9.8
const GRENADE_DETONATE_DELAY = 1 // 落地后延迟爆炸
const GRENADE_LIFETIME = 5

interface Projectile {
  node: TransformNode
  velocity: Vector3
  lifetime: number
  type: EasterEggWeaponType
  hasGravity: boolean
  isDetonating: boolean
  detonateTimer: number
}

/**
 * 彩蛋模式武器系统
 * 管理三种武器的射击逻辑、弹道粒子、命中检测
 */
export class EasterEggWeapons {
  private _scene: Scene
  private _boss: EasterEggBoss
  private _explosion: EasterEggExplosion | null = null
  private _projectiles: Projectile[] = []
  private _fireCooldown = 0
  private _isFiring = false
  private _currentWeaponType: EasterEggWeaponType = 'gun'
  private _aimLineNodes: TransformNode[] = [] // 手榴弹瞄准辅助线

  constructor(scene: Scene, boss: EasterEggBoss) {
    this._scene = scene
    this._boss = boss
  }

  setExplosion(explosion: EasterEggExplosion): void {
    this._explosion = explosion
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
  update(delta: number, fireOrigin: Vector3, fireDirection: Vector3): void {
    // 更新冷却
    this._fireCooldown = Math.max(0, this._fireCooldown - delta)

    // 处理射击输入
    if (this._isFiring && this._fireCooldown <= 0) {
      this._fire(fireOrigin, fireDirection)
      const config = EASTER_EGG_WEAPONS.find(w => w.type === this._currentWeaponType)!
      this._fireCooldown = 1 / config.fireRate
    }

    // 更新抛射物
    this._updateProjectiles(delta)

    // 更新手榴弹瞄准线
    if (this._currentWeaponType === 'grenade') {
      this._updateAimLine(fireOrigin, fireDirection)
    }
  }

  /**
   * 射击
   */
  private _fire(origin: Vector3, direction: Vector3): void {
    switch (this._currentWeaponType) {
      case 'gun':
        this._fireGun(origin, direction)
        break
      case 'rocket':
        this._fireRocket(origin, direction)
        break
      case 'grenade':
        this._fireGrenade(origin, direction)
        break
    }
  }

  /**
   * 枪射击：快速直线子弹 + 弹道轨迹粒子
   */
  private _fireGun(origin: Vector3, direction: Vector3): void {
    const bullet = MeshBuilder.CreateSphere('bullet', { diameter: 0.1 }, this._scene)
    bullet.position = origin.clone()

    const mat = new StandardMaterial('bulletMat', this._scene)
    mat.emissiveColor = Color3.Yellow()
    bullet.material = mat

    // 创建弹道轨迹粒子
    this._createBulletTrail(bullet)

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
   * 火箭炮射击：直线抛射物
   */
  private _fireRocket(origin: Vector3, direction: Vector3): void {
    const rocket = MeshBuilder.CreateCylinder('rocket', {
      height: 0.4,
      diameterTop: 0.05,
      diameterBottom: 0.15
    }, this._scene)
    rocket.position = origin.clone()

    const mat = new StandardMaterial('rocketMat', this._scene)
    mat.emissiveColor = Color3.Red()
    rocket.material = mat

    // 旋转火箭朝向飞行方向
    const dir = direction.normalize()
    rocket.rotation.x = Math.atan2(dir.z, dir.y)

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
  private _fireGrenade(origin: Vector3, direction: Vector3): void {
    const grenade = MeshBuilder.CreateSphere('grenade', { diameter: 0.2 }, this._scene)
    grenade.position = origin.clone()

    const mat = new StandardMaterial('grenadeMat', this._scene)
    mat.emissiveColor = Color3.Green()
    grenade.material = mat

    // 初始速度：向前 + 向上抛物线
    const dir = direction.normalize()
    const velocity = new Vector3(
      dir.x * GRENADE_SPEED,
      GRENADE_SPEED * 0.7, // 向上分量
      dir.z * GRENADE_SPEED
    )

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

      // 命中检测
      const bossPos = this._boss.position
      const dist = Vector3.Distance(proj.node.position, bossPos)

      if (dist < HIT_RADIUS) {
        this._onHit(proj)
        this._removeProjectile(i)
        continue
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
          // 检查爆炸范围
          const bossDist = Vector3.Distance(proj.node.position, this._boss.position)
          if (bossDist < HIT_RADIUS * 2) {
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
    }
  }

  /**
   * 创建弹道轨迹粒子
   */
  private _createBulletTrail(bullet: TransformNode): void {
    const ps = new ParticleSystem('bulletTrail', 20, this._scene)
    ps.emitter = bullet.position.clone()
    ps.createSphereEmitter(0.05)

    ps.color1 = new Color4(1, 1, 0, 1)
    ps.color2 = new Color4(1, 0.5, 0, 0.5)
    ps.colorDead = new Color4(0, 0, 0, 0)

    ps.minSize = 0.02
    ps.maxSize = 0.05
    ps.minLifeTime = 0.05
    ps.maxLifeTime = BULLET_TRAIL_LENGTH

    ps.emitRate = 100
    ps.gravity = Vector3.Zero()

    ps.targetStopDuration = 0.01
    ps.disposeOnStop = true
    ps.start()
  }

  /**
   * 更新手榴弹瞄准辅助线
   */
  private _updateAimLine(origin: Vector3, direction: Vector3): void {
    this._clearAimLine()

    const dir = direction.normalize()
    const velocity = new Vector3(
      dir.x * GRENADE_SPEED,
      GRENADE_SPEED * 0.7,
      dir.z * GRENADE_SPEED
    )

    // 模拟抛物线轨迹，每隔 0.05s 一个点（更密集）
    const gravity = new Vector3(0, GRENADE_GRAVITY, 0)
    let pos = origin.clone()
    let vel = velocity.clone()

    for (let t = 0; t < 2.0; t += 0.05) {
      pos = pos.add(vel.scale(0.05))
      vel = vel.add(gravity.scale(0.05))

      if (pos.y < 0) break

      const dot = MeshBuilder.CreateSphere(`aimDot_${t}`, { diameter: 0.12 }, this._scene)
      dot.position = pos.clone()

      const mat = new StandardMaterial(`aimDotMat_${t}`, this._scene)
      mat.emissiveColor = Color3.Yellow()
      mat.disableLighting = true
      dot.material = mat

      this._aimLineNodes.push(dot)
    }
  }

  /**
   * 清除瞄准辅助线
   */
  private _clearAimLine(): void {
    for (const node of this._aimLineNodes) {
      node.dispose()
    }
    this._aimLineNodes = []
  }

  /**
   * 移除抛射物
   */
  private _removeProjectile(index: number): void {
    const proj = this._projectiles[index]
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
    this._clearAimLine()
  }
}
