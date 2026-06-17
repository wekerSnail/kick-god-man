import type { IState } from '../core/StateMachine'
import type { Enemy } from '../entities/Enemy'

export class NormalState implements IState<Enemy> {
  readonly name = 'normal'

  enter(ctx: Enemy): void {
    ctx.scheduleNextLookBack()
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    ctx.nextLookBackTime -= dt
    if (ctx.nextLookBackTime <= 0) {
      return new PhoneFlashingState()
    }

    ctx.nextMeetingTime -= dt
    if (ctx.nextMeetingTime <= 0) {
      if (Math.random() < 0.5) {
        return new MeetingState()
      }
      ctx.nextMeetingTime = 12 + Math.random() * 8
    }

    ctx.nextPatrolTime -= dt
    if (ctx.nextPatrolTime <= 0) {
      return new PatrolState()
    }

    return null
  }
}

export class PhoneFlashingState implements IState<Enemy> {
  readonly name = 'phone_flashing'
  private timer: number = 0
  private duration: number = 0

  enter(ctx: Enemy): void {
    this.timer = 0
    this.duration = 2 + Math.random() * 3
    ctx.showPhone(true)
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt
    ctx.updatePhoneFlash(this.timer)
    if (this.timer >= this.duration) {
      return new LookingBackState()
    }
    return null
  }

  exit(ctx: Enemy): void {
    ctx.showPhone(false)
  }
}

export class LookingBackState implements IState<Enemy> {
  readonly name = 'looking_back'
  private phase: 'standing_up' | 'turning' | 'looking' | 'turning_back' | 'sitting_down' = 'standing_up'
  private timer: number = 0

  private readonly STAND_UP_DURATION = 0.5
  private readonly TURN_DURATION = 0.4
  private readonly LOOK_DURATION = 2.0
  private readonly SIT_DOWN_DURATION = 0.5

  enter(): void {
    this.phase = 'standing_up'
    this.timer = 0
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt

    switch (this.phase) {
      case 'standing_up':
        if (this.timer >= this.STAND_UP_DURATION) {
          this.phase = 'turning'
          this.timer = 0
        }
        break
      case 'turning':
        if (this.timer >= this.TURN_DURATION) {
          this.phase = 'looking'
          this.timer = 0
        }
        break
      case 'looking':
        if (this.timer >= this.LOOK_DURATION) {
          const detected = ctx.checkPlayerDetection()
          if (detected) {
            ctx.reportPlayerDetected()
          }
          this.phase = 'turning_back'
          this.timer = 0
        }
        break
      case 'turning_back':
        if (this.timer >= this.TURN_DURATION) {
          this.phase = 'sitting_down'
          this.timer = 0
        }
        break
      case 'sitting_down':
        if (this.timer >= this.SIT_DOWN_DURATION) {
          return new NormalState()
        }
        break
    }
    return null
  }
}

export class StunnedState implements IState<Enemy> {
  readonly name = 'stunned'
  private timer: number = 0

  constructor(private duration: number = 3) {}

  enter(ctx: Enemy): void {
    this.timer = 0
    ctx.showStunIndicator(true)
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt
    ctx.updateStunEffect(this.timer)
    if (this.timer >= this.duration) {
      return new NormalState()
    }
    return null
  }

  exit(ctx: Enemy): void {
    ctx.showStunIndicator(false)
  }
}

export class MeetingState implements IState<Enemy> {
  readonly name = 'meeting'
  private timer: number = 0
  private duration: number = 0

  enter(ctx: Enemy): void {
    this.timer = 0
    this.duration = 12 + Math.random() * 8
    ctx.showMeetingIndicator(true)
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt
    ctx.updateMeetingAnimation(dt)
    if (this.timer >= this.duration) {
      return new NormalState()
    }
    return null
  }

  exit(ctx: Enemy): void {
    ctx.showMeetingIndicator(false)
  }
}

export class PatrolState implements IState<Enemy> {
  readonly name = 'patrolling'
  private phase: 'warning' | 'standup' | 'walk' | 'return' | 'sitdown' = 'warning'
  private timer: number = 0

  private readonly WARNING_DURATION = 2.5
  private readonly STAND_UP_DURATION = 0.6
  private readonly SIT_DOWN_DURATION = 0.6
  private readonly MOVE_SPEED = 3.5
  private readonly DETECTION_RANGE = 5
  private readonly DETECTION_HALF_ANGLE = 25 * Math.PI / 180

  enter(ctx: Enemy): void {
    this.phase = 'warning'
    this.timer = 0
    ctx.showPatrolWarning(true)
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt

    switch (this.phase) {
      case 'warning':
        if (this.timer >= this.WARNING_DURATION) {
          this.phase = 'standup'
          this.timer = 0
          ctx.showPatrolWarning(false)
        }
        break
      case 'standup':
        if (this.timer >= this.STAND_UP_DURATION) {
          this.phase = 'walk'
          this.timer = 0
          ctx.startPatrolWalk()
        }
        break
      case 'walk':
        const reached = ctx.moveAlongPatrol(dt, this.MOVE_SPEED)
        if (ctx.checkPatrolDetection(this.DETECTION_RANGE, this.DETECTION_HALF_ANGLE)) {
          ctx.reportPatrolDamage()
        }
        if (reached) {
          this.phase = 'return'
          this.timer = 0
        }
        break
      case 'return':
        const returnedToStart = ctx.returnToStart(dt, this.MOVE_SPEED)
        if (returnedToStart) {
          this.phase = 'sitdown'
          this.timer = 0
        }
        break
      case 'sitdown':
        if (this.timer >= this.SIT_DOWN_DURATION) {
          return new NormalState()
        }
        break
    }
    return null
  }

  exit(ctx: Enemy): void {
    ctx.showPatrolWarning(false)
    ctx.showPatrolText(false)
  }
}
