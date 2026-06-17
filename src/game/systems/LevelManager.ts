import type { EventBus } from '../core/EventBus'

export class LevelManager {
  private level: number = 1
  private kickTarget: number = 5
  private kickTargets: number[] = [5, 10, 20, 35, 50, 70, 100]
  private isTransitioning: boolean = false
  private transitionTimer: number = 0
  private readonly TRANSITION_DURATION: number = 2

  constructor(private events: EventBus) {}

  onKick(totalKicks: number): boolean {
    if (this.isTransitioning) return false

    if (totalKicks >= this.kickTarget) {
      if (this.level >= this.kickTargets.length) {
        this.events.emit('game:over', { isWin: true })
        return true
      } else {
        this.isTransitioning = true
        this.transitionTimer = this.TRANSITION_DURATION
        this.events.emit('level:transition', {
          fromLevel: this.level,
          toLevel: this.level + 1
        })
        return true
      }
    }
    return false
  }

  update(delta: number): boolean {
    if (!this.isTransitioning) return false

    this.transitionTimer -= delta
    if (this.transitionTimer <= 0) {
      this.level++
      this.kickTarget = this.kickTargets[this.level - 1]
      this.isTransitioning = false
      this.events.emit('level:complete', { level: this.level })
      return true
    }
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

  getTransitionTimer(): number {
    return this.transitionTimer
  }

  reset(): void {
    this.level = 1
    this.kickTarget = this.kickTargets[0]
    this.isTransitioning = false
    this.transitionTimer = 0
  }
}
