import { Vector3 } from '@babylonjs/core'
import type { Player } from '../entities/Player'
import type { Enemy } from '../entities/Enemy'
import type { HidingSpots } from '../environment/HidingSpots'
import type { OfficeLevel } from '../environment/OfficeLevel'
import type { AABB } from '../../types/game'

export class CollisionSystem {
  private static readonly _tmpForward = new Vector3()
  private static readonly _tmpToPlayer = new Vector3()
  private officeLevel: OfficeLevel | null = null

  constructor(
    private player: Player,
    private enemy: Enemy,
    private hidingSpots: HidingSpots,
    officeLevel?: OfficeLevel
  ) {
    this.officeLevel = officeLevel ?? null
  }

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

    if (this.player.isInvisible()) return false

    const isHidden = this.hidingSpots.isInHidingSpot(this.player.getPosition())
    const hasPot = this.player.getPotActive()

    if (!isHidden && !hasPot) {
      return true
    }
    return false
  }

  isPlayerInSemicircle(): boolean {
    const enemyPos = this.enemy.getPosition()
    const playerPos = this.player.getPosition()
    const distance = Vector3.Distance(enemyPos, playerPos)
    if (distance > 5) return false

    const angle = this.enemy.getRotationY()
    const forward = CollisionSystem._tmpForward
    forward.set(Math.sin(angle), 0, Math.cos(angle)).normalize()

    const toPlayer = CollisionSystem._tmpToPlayer
    playerPos.subtractToRef(enemyPos, toPlayer)
    toPlayer.y = 0
    toPlayer.normalize()

    return Vector3.Dot(forward, toPlayer) > 0
  }

  private checkPatrolVision(): boolean {
    const enemyPos = this.enemy.getPosition()
    const playerPos = this.player.getPosition()
    const distance = Vector3.Distance(enemyPos, playerPos)

    // 增加检测范围从5到7，让Boss更容易发现玩家
    if (distance > 7) return false

    const angle = this.enemy.getRotationY()
    const forward = CollisionSystem._tmpForward
    forward.set(Math.sin(angle), 0, Math.cos(angle)).normalize()

    const toPlayer = CollisionSystem._tmpToPlayer
    playerPos.subtractToRef(enemyPos, toPlayer)
    toPlayer.normalize()
    const dot = Vector3.Dot(forward, toPlayer)
    // 增加检测角度从25°到40°，让Boss更容易发现侧面的玩家
    const halfAngle = 40 * Math.PI / 180

    return dot > Math.cos(halfAngle)
  }

  checkFurnitureCollision(px: number, pz: number, radius: number): boolean {
    const colliders: AABB[] = []
    if (this.officeLevel) colliders.push(...this.officeLevel.getColliders())
    colliders.push(...this.hidingSpots.getColliders())
    for (const c of colliders) {
      const closestX = Math.max(c.minX, Math.min(px, c.maxX))
      const closestZ = Math.max(c.minZ, Math.min(pz, c.maxZ))
      const dx = px - closestX
      const dz = pz - closestZ
      if (dx * dx + dz * dz < radius * radius) {
        return true
      }
    }
    return false
  }

  slideMove(oldX: number, oldZ: number, newX: number, newZ: number, radius: number): { x: number; z: number } {
    if (!this.checkFurnitureCollision(newX, newZ, radius)) {
      return { x: newX, z: newZ }
    }
    if (!this.checkFurnitureCollision(newX, oldZ, radius)) {
      return { x: newX, z: oldZ }
    }
    if (!this.checkFurnitureCollision(oldX, newZ, radius)) {
      return { x: oldX, z: newZ }
    }
    return { x: oldX, z: oldZ }
  }
}
