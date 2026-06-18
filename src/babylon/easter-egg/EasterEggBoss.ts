import { Vector3 } from '@babylonjs/core'
import type { Enemy } from '../entities/Enemy'
import { EASTER_EGG_DIALOGUES } from '../../types/game'

const WALK_SPEED = 2 // 单位/秒
const WALK_BOUND_X = 6 // x 轴走动范围 [-6, 6]
const SHAKE_DURATION = 0.5 // 枪击抖动持续秒数
const STUN_DURATION = 3 // 爆炸眩晕持续秒数
const DIALOGUE_DURATION = 2 // 吐槽台词显示秒数

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
    this._enemy.position = new Vector3(0, 0, -5)

    // 重置受击状态
    this._isShaking = false
    this._shakeTimer = 0
    this._isStunned = false
    this._stunTimer = 0
  }

  /**
   * 停用 Boss 彩蛋行为
   */
  deactivate(): void {
    this._isActive = false
    this._isShaking = false
    this._isStunned = false
  }

  /**
   * 更新 Boss 行为
   */
  update(delta: number): void {
    if (!this._isActive) return

    // 更新受击状态
    this._updateHitReaction(delta)

    // 如果正在受击，不移动
    if (this._isShaking || this._isStunned) return

    // 左右走动
    this._walk(delta)
  }

  /**
   * 被枪击中：抖动 + 停止移动 + 随机吐槽
   */
  onHitByGun(): void {
    if (this._isStunned) return // 已经眩晕则忽略

    this._isShaking = true
    this._shakeTimer = SHAKE_DURATION
    this._showRandomDialogue()
  }

  /**
   * 被火箭炮/手榴弹击中：眩晕 3s
   */
  onHitByExplosion(): void {
    this._isStunned = true
    this._stunTimer = STUN_DURATION
    this._isShaking = false
    this._showRandomDialogue()
  }

  /**
   * 是否正在受击（抖动或眩晕）
   */
  get isReacting(): boolean {
    return this._isShaking || this._isStunned
  }

  /**
   * 更新受击反应
   */
  private _updateHitReaction(delta: number): void {
    // 抖动效果
    if (this._isShaking) {
      this._shakeTimer -= delta
      // 抖动：x 方向高频小幅偏移
      this._enemy.position.x += Math.sin(this._shakeTimer * 50) * 0.05
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

    // 面朝走动方向
    if (this._walkDirection > 0) {
      this._enemy.setRotationY(Math.PI * 0.5) // 面向右
    } else {
      this._enemy.setRotationY(-Math.PI * 0.5) // 面向左
    }
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
