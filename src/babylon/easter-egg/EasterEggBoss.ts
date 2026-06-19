import { Vector3 } from '@babylonjs/core'
import type { Enemy } from '../entities/Enemy'
import { EASTER_EGG_DIALOGUES } from '../../types/game'

const WALK_SPEED = 2 // 单位/秒
const WALK_BOUND_X = 6 // x 轴走动范围 [-6, 6]
const SHAKE_DURATION = 0.5 // 枪击抖动持续秒数
const STUN_DURATION = 3 // 爆炸眩晕持续秒数
const DIALOGUE_DURATION = 2 // 吐槽台词显示秒数
const BOUNCE_HEIGHT = 0.8 // 弹跳高度
const BOUNCE_DURATION = 0.4 // 弹跳总时长（上升+下降）

/**
 * 彩蛋模式 Boss 行为控制器
 * 管理 Boss 在彩蛋模式中的走动、受击反应、吐槽台词
 */
export class EasterEggBoss {
  private _enemy: Enemy
  private _isActive = false

  // 走动状态
  private _walkDirection = 1 // 1=右, -1=左

  // 受击状态
  private _isShaking = false
  private _shakeTimer = 0
  private _isStunned = false
  private _stunTimer = 0
  private _isBouncing = false
  private _bounceTimer = 0
  private _bounceStartY = 0
  private _isDialogueOnCooldown = false
  private _lastDialogueIndex = -1

  constructor(enemy: Enemy) {
    this._enemy = enemy
  }

  /**
   * 激活 Boss 彩蛋行为
   * 传送 Boss 到房间中央，开始走动
   */
  activate(): void {
    this._isActive = true
    this._walkDirection = 1

    // 传送 Boss 到房间中央
    this._enemy.position.set(0, 0, -5)
    this._enemy.syncPosition()

    // 重置受击状态
    this._isShaking = false
    this._shakeTimer = 0
    this._isStunned = false
    this._stunTimer = 0
    this._isBouncing = false
    this._bounceTimer = 0
  }

  /**
   * 停用 Boss 彩蛋行为
   */
  deactivate(): void {
    this._isActive = false
    this._isShaking = false
    this._isStunned = false
    this._isBouncing = false
    this._bounceTimer = 0
  }

  /**
   * 更新 Boss 行为
   */
  update(delta: number): void {
    if (!this._isActive) return

    // 更新受击状态
    this._updateHitReaction(delta)

    // 如果正在受击（含弹跳），不移动
    if (this._isShaking || this._isStunned || this._isBouncing) return

    // 左右走动
    this._walk(delta)
  }

  /**
   * 被枪击中：弹跳 + 抖动 + 停止移动 + 随机吐槽
   * 连续击中可打断弹跳重新触发
   */
  onHitByGun(): void {
    if (this._isStunned) return // 已经眩晕则忽略

    // 重置弹跳（可打断）
    this._isBouncing = true
    this._bounceTimer = 0
    this._bounceStartY = 0 // 始终从地面弹起，避免连续击中越跳越高

    this._isShaking = true
    this._shakeTimer = SHAKE_DURATION
    this._showRandomDialogue()
  }

  /**
   * 被火箭炮/手榴弹击中：弹跳 + 眩晕 3s
   */
  onHitByExplosion(): void {
    // 先触发弹跳
    this._isBouncing = true
    this._bounceTimer = 0
    this._bounceStartY = 0 // 始终从地面弹起，避免连续击中越跳越高

    this._isStunned = true
    this._stunTimer = STUN_DURATION
    this._isShaking = false
    this._showRandomDialogue()
    this._enemy.playAnimation('Idle')
  }

  /**
   * 是否正在受击（抖动或眩晕）
   */
  get isReacting(): boolean {
    return this._isShaking || this._isStunned || this._isBouncing
  }

  /**
   * 获取 Boss 位置（公共接口）
   */
  get position(): Vector3 {
    return this._enemy.position
  }

  /**
   * 更新受击反应
   */
  private _updateHitReaction(delta: number): void {
    // 弹跳效果（Y 轴抛物线，可被打断重置）
    if (this._isBouncing) {
      this._bounceTimer += delta
      const t = this._bounceTimer / BOUNCE_DURATION
      if (t >= 1) {
        // 弹跳结束，回到地面
        this._isBouncing = false
        this._enemy.position.y = this._bounceStartY
        this._enemy.syncPosition()
      } else {
        // 正弦曲线模拟弹跳：0→1→0
        const bounce = Math.sin(t * Math.PI) * BOUNCE_HEIGHT
        this._enemy.position.y = this._bounceStartY + bounce
        this._enemy.syncPosition()
      }
    }

    // 抖动效果
    if (this._isShaking) {
      this._shakeTimer -= delta
      // 抖动：x 方向高频小幅偏移
      this._enemy.position.x += Math.sin(this._shakeTimer * 50) * 0.05
      this._enemy.syncPosition()
      if (this._shakeTimer <= 0) {
        this._isShaking = false
      }
    }

    // 眩晕效果
    if (this._isStunned) {
      this._stunTimer -= delta
      this._enemy.showStunIndicator(true)
      this._enemy.updateStunEffect(this._stunTimer)
      if (this._stunTimer <= 0) {
        this._isStunned = false
        this._enemy.showStunIndicator(false)
      }
    }
  }

  /**
   * 左右走动
   */
  private _walk(delta: number): void {
    const speed = WALK_SPEED * delta
    this._enemy.position.x += speed * this._walkDirection

    // 到达边界折返
    if (this._enemy.position.x >= WALK_BOUND_X) {
      this._enemy.position.x = WALK_BOUND_X
      this._walkDirection = -1
    } else if (this._enemy.position.x <= -WALK_BOUND_X) {
      this._enemy.position.x = -WALK_BOUND_X
      this._walkDirection = 1
    }

    // 同步 position 到 mesh
    this._enemy.syncPosition()

    // 面朝走动方向
    if (this._walkDirection > 0) {
      this._enemy.setRotationY(Math.PI * 0.5) // 面向右
    } else {
      this._enemy.setRotationY(-Math.PI * 0.5) // 面向左
    }

    this._enemy.playAnimation('Walk')
  }

  /**
   * 显示随机吐槽台词
   */
  private _showRandomDialogue(): void {
    if (this._isDialogueOnCooldown) return

    // 避免连续重复同一条
    let index: number
    do {
      index = Math.floor(Math.random() * EASTER_EGG_DIALOGUES.length)
    } while (index === this._lastDialogueIndex && EASTER_EGG_DIALOGUES.length > 1)

    this._lastDialogueIndex = index
    this._enemy.showDialogue(EASTER_EGG_DIALOGUES[index], DIALOGUE_DURATION)

    // 短暂冷却防止快速触发
    this._isDialogueOnCooldown = true
    setTimeout(() => {
      this._isDialogueOnCooldown = false
    }, DIALOGUE_DURATION * 1000)
  }

  dispose(): void {
    this.deactivate()
  }
}
