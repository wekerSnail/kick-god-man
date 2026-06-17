import type { Player } from '../Player'
import type { Enemy } from '../Enemy'
import type { HidingSpots } from '../HidingSpots'
import type { Props, PropItem } from '../Props'

export class CollisionSystem {
  constructor(
    private player: Player,
    private enemy: Enemy,
    private hidingSpots: HidingSpots,
    private props: Props
  ) {}

  checkEnemyDetection(): boolean {
    if (this.enemy.getIsPatrolling()) {
      if (this.player.isInvisible()) return false
      const isHidden = this.hidingSpots.isInHidingSpot(this.player.getPosition())
      if (isHidden) return false
      const hasPot = this.player.getPotActive()
      if (hasPot && Math.random() < 0.5) return false
      return this.enemy.detectPlayerInVision(this.player.getPosition())
    }

    if (!this.enemy.isActuallyLooking()) return false

    const isHidden = this.hidingSpots.isInHidingSpot(this.player.getPosition())
    const hasPot = this.player.getPotActive()

    if (!isHidden && !hasPot) {
      return true
    }
    return false
  }

  checkKickHit(): boolean {
    if (!this.player.getIsKicking()) return false
    if (this.enemy.isLookingBack()) return false

    const distance = this.player.getPosition().distanceTo(this.enemy.getPosition())
    if (distance < 2) {
      return true
    }
    return false
  }

  checkPropPickup(inventoryLength: number): PropItem | null {
    const pickedProp = this.props.update(0, this.player.getPosition())
    if (pickedProp && inventoryLength < 3) {
      return pickedProp
    }
    return null
  }
}
