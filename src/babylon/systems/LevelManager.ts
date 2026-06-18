import type { EventBus } from '../core/EventBus'

export class LevelManager {
  private level: number = 1
  private kickTarget: number = 5
  private kickTargets: number[] = [10, 20, 35, 50, 70, 100, 150]
  private isTransitioning: boolean = false

  constructor(private events: EventBus) {}

  onKick(totalKicks: number): boolean {
    if (this.isTransitioning) return false

    if (totalKicks >= this.kickTarget) {
      if (this.level >= this.kickTargets.length) {
        this.events.emit('game:over', { isWin: true })
        return true
      } else {
        this.isTransitioning = true
        this.events.emit('level:transition', {
          fromLevel: this.level,
          toLevel: this.level + 1
        })
        return true
      }
    }
    return false
  }

  update(_delta: number): boolean {
    if (!this.isTransitioning) return false
    return false
  }

  getLevel(): number {
    return this.level
  }

  getKickTarget(): number {
    return this.kickTarget
  }

  getIsTransitioning(): boolean {
    return this.isTransitioning
  }

  reset(): void {
    this.level = 1
    this.kickTarget = this.kickTargets[0]
    this.isTransitioning = false
  }

  completeTransition(): void {
    if (!this.isTransitioning) return
    this.level++
    this.kickTarget = this.kickTargets[this.level - 1]
    this.isTransitioning = false
    this.events.emit('level:complete', { level: this.level })
  }
}
