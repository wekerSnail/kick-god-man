import { Vector3 } from '@babylonjs/core'
import type { Player } from '../entities/Player'
import type { Enemy } from '../entities/Enemy'
import type { HidingSpots } from '../environment/HidingSpots'

export class CollisionSystem {
  constructor(
    private player: Player,
    private enemy: Enemy,
    private hidingSpots: HidingSpots
  ) {}

  checkEnemyDetection(): boolean {
    if (this.enemy.isPatrolling()) {
      if (this.player.isInvisible()) return false
      const isHidden = this.hidingSpots.isInHidingSpot(this.player.getPosition())
      if (isHidden) return false
      const hasPot = this.player.getPotActive()
      if (hasPot && Math.random() < 0.5) return false
      return this.checkPatrolVision()
    }

    if (!this.enemy.isLookingBack()) return false

    const isHidden = this.hidingSpots.isInHidingSpot(this.player.getPosition())
    const hasPot = this.player.getPotActive()

    if (!isHidden && !hasPot) {
      return true
    }
    return false
  }

  private checkPatrolVision(): boolean {
    const enemyPos = this.enemy.getPosition()
    const playerPos = this.player.getPosition()
    const distance = Vector3.Distance(enemyPos, playerPos)

    // 增加检测范围从5到7，让Boss更容易发现玩家
    if (distance > 7) return false

    const angle = this.enemy.getRotationY()
    const forward = new Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize()

    const toPlayer = playerPos.subtract(enemyPos).normalize()
    const dot = Vector3.Dot(forward, toPlayer)
    // 增加检测角度从25°到40°，让Boss更容易发现侧面的玩家
    const halfAngle = 40 * Math.PI / 180

    return dot > Math.cos(halfAngle)
  }
}
