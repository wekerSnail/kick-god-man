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

    if (distance > 5) return false

    const forward = new Vector3(
      Math.sin(this.enemy.getPosition().y),
      0,
      Math.cos(this.enemy.getPosition().y)
    ).normalize()

    const toPlayer = playerPos.subtract(enemyPos).normalize()
    const dot = Vector3.Dot(forward, toPlayer)
    const halfAngle = 25 * Math.PI / 180

    return dot > Math.cos(halfAngle)
  }

  checkKickHit(): boolean {
    if (!this.player.getIsKicking()) return false
    if (this.enemy.isLookingBack()) return false

    const distance = Vector3.Distance(this.player.getPosition(), this.enemy.getPosition())
    if (distance < 2) {
      return true
    }
    return false
  }
}
