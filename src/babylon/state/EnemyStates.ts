import type { IState } from "../core/StateMachine";
import type { Enemy } from "../entities/Enemy";
import { Vector3 } from "@babylonjs/core";

export class NormalState implements IState<Enemy> {
  readonly name = "normal";

  enter(ctx: Enemy): void {
    ctx.scheduleNextLookBack();
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    ctx.nextLookBackTime -= dt;
    if (ctx.nextLookBackTime <= 0) {
      return new PhoneFlashingState();
    }

    ctx.nextMeetingTime -= dt;
    if (ctx.nextMeetingTime <= 0) {
      if (Math.random() < 0.5) {
        return new MeetingState();
      }
      ctx.nextMeetingTime = 12 + Math.random() * 8;
    }

    ctx.nextPatrolTime -= dt;
    if (ctx.nextPatrolTime <= 0) {
      return new PatrolState();
    }

    return null;
  }
}

export class AttackedState implements IState<Enemy> {
  readonly name = 'attacked'
  private phase: 'dialogue1' | 'turning' | 'looking' | 'dialogue2' | 'turning_back' | 'done' = 'dialogue1'
  private timer: number = 0
  private baseRotation: number = 0
  private playerPosition: Vector3 | null = null
  private detectedPlayer: boolean = false
  private detectedWithKeyboard: boolean = false

  private readonly DIALOGUE1_DURATION = 1.5
  private readonly TURN_DURATION = 0.6
  private readonly LOOK_DURATION = 2.0
  private readonly DIALOGUE2_DURATION = 2.5
  private readonly DIALOGUE2_KEYBOARD_DURATION = 3.0
  private readonly TURN_BACK_DURATION = 0.6

  enter(ctx: Enemy, playerPosition?: Vector3): void {
    this.phase = 'dialogue1'
    this.timer = 0
    this.baseRotation = ctx.getRotationY()
    this.playerPosition = playerPosition ?? null
    this.detectedPlayer = false
    this.detectedWithKeyboard = false

    ctx.showDialogue('谁在打我！', 2)
    ctx.playAnimation('Idle')
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt

    switch (this.phase) {
      case 'dialogue1':
        if (this.timer >= this.DIALOGUE1_DURATION) {
          this.phase = 'turning'
          this.timer = 0
        }
        break
      case 'turning':
        ctx.rotateTowards(this.baseRotation + Math.PI, 3, dt)
        if (this.timer >= this.TURN_DURATION) {
          ctx.setRotationY(this.baseRotation + Math.PI)
          this.phase = 'looking'
          this.timer = 0
        }
        break
      case 'looking':
        if (this.timer >= this.LOOK_DURATION) {
          if (this.playerPosition) {
            const dist = ctx.position.subtract(this.playerPosition).length()
            if (dist < 5) {
              if (ctx.isPlayerUsingKeyboard()) {
                this.detectedWithKeyboard = true
                ctx.setPlayerDetected(true)
              } else {
                this.detectedPlayer = true
                ctx.setPlayerDetected(true)
              }
            }
          }
          this.phase = 'dialogue2'
          this.timer = 0
        }
        break
      case 'dialogue2':
        if (this.timer === dt) {
          if (this.detectedWithKeyboard) {
            ctx.showDialogue('你以为你挡着我就看不到你？这个需求就你做了', 3)
          } else if (this.detectedPlayer) {
            ctx.showDialogue('就是你小子打我，今晚留下来加班', 3)
          } else {
            ctx.showDialogue('难道是我幻觉了', 3)
          }
        }
        if (this.timer >= (this.detectedWithKeyboard ? this.DIALOGUE2_KEYBOARD_DURATION : this.DIALOGUE2_DURATION)) {
          this.phase = 'turning_back'
          this.timer = 0
        }
        break
      case 'turning_back':
        ctx.rotateTowards(this.baseRotation, 3, dt)
        if (this.timer >= this.TURN_BACK_DURATION) {
          ctx.setRotationY(this.baseRotation)
          this.phase = 'done'
          this.timer = 0
        }
        break
      case 'done':
        return new NormalState()
    }
    return null
  }
}

export class PhoneFlashingState implements IState<Enemy> {
  readonly name = "phone_flashing";
  private timer: number = 0;
  private duration: number = 0;

  enter(ctx: Enemy): void {
    this.timer = 0;
    this.duration = 2 + Math.random() * 3;
    ctx.showPhone(true);
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt;
    ctx.updatePhoneFlash(this.timer);
    if (this.timer >= this.duration) {
      return new LookingBackState();
    }
    return null;
  }

  exit(ctx: Enemy): void {
    ctx.showPhone(false);
  }
}

export class LookingBackState implements IState<Enemy> {
  readonly name = "looking_back";
  private phase:
    | "standing_up"
    | "turning"
    | "looking"
    | "dialogue"
    | "turning_back"
    | "sitting_down" = "standing_up";
  private timer: number = 0;
  private baseRotation: number = 0;
  private detectedPlayer: boolean = false;

  private readonly STAND_UP_DURATION = 0.5;
  private readonly TURN_DURATION = 0.6;
  private readonly LOOK_DURATION = 2.0;
  private readonly DIALOGUE_DURATION = 2.0;
  private readonly SIT_DOWN_DURATION = 0.5;

  enter(ctx: Enemy): void {
    this.phase = "standing_up";
    this.timer = 0;
    this.baseRotation = ctx.getRotationY();
    this.detectedPlayer = false;
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt;

    switch (this.phase) {
      case "standing_up":
        if (this.timer >= this.STAND_UP_DURATION) {
          this.phase = "turning";
          this.timer = 0;
        }
        break;
      case "turning":
        ctx.rotateTowards(this.baseRotation + Math.PI, 3, dt);
        if (this.timer >= this.TURN_DURATION) {
          ctx.setRotationY(this.baseRotation + Math.PI);
          this.phase = "looking";
          this.timer = 0;
        }
        break;
      case "looking":
        if (this.timer >= this.LOOK_DURATION) {
          const detected = ctx.checkPlayerDetection();
          if (detected) {
            this.detectedPlayer = true;
          }
          this.phase = "dialogue";
          this.timer = 0;
        }
        break;
      case "dialogue":
        if (this.timer === dt) {
          if (this.detectedPlayer) {
            ctx.showDialogue('你在瞎晃悠什么！', 2);
          }
        }
        if (this.timer >= this.DIALOGUE_DURATION) {
          if (this.detectedPlayer) {
            ctx.reportPlayerDetected();
          }
          this.phase = "turning_back";
          this.timer = 0;
        }
        break;
      case "turning_back":
        ctx.rotateTowards(this.baseRotation, 3, dt);
        if (this.timer >= this.TURN_DURATION) {
          ctx.setRotationY(this.baseRotation);
          this.phase = "sitting_down";
          this.timer = 0;
        }
        break;
      case "sitting_down":
        if (this.timer >= this.SIT_DOWN_DURATION) {
          return new NormalState();
        }
        break;
    }
    return null;
  }
}

export class StunnedState implements IState<Enemy> {
  readonly name = "stunned";
  private timer: number = 0;

  constructor(private duration: number = 3) {}

  enter(ctx: Enemy): void {
    this.timer = 0;
    ctx.showStunIndicator(true);
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt;
    ctx.updateStunEffect(this.timer);
    if (this.timer >= this.duration) {
      return new NormalState();
    }
    return null;
  }

  exit(ctx: Enemy): void {
    ctx.showStunIndicator(false);
  }
}

export class MeetingState implements IState<Enemy> {
  readonly name = "meeting";
  private timer: number = 0;
  private duration: number = 0;
  private dialogueShown: boolean = false;

  enter(ctx: Enemy): void {
    this.timer = 0;
    this.duration = 12 + Math.random() * 8;
    this.dialogueShown = false;
    ctx.showMeetingIndicator(true);
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt;
    ctx.updateMeetingAnimation(dt);

    if (!this.dialogueShown && this.timer >= 0.5) {
      ctx.showDialogue('开会中，别打扰！', 3);
      this.dialogueShown = true;
    }

    if (this.timer >= this.duration) {
      return new NormalState();
    }
    return null;
  }

  exit(ctx: Enemy): void {
    ctx.showMeetingIndicator(false);
  }
}

export class PatrolState implements IState<Enemy> {
  readonly name = "patrolling";
  private phase: "warning" | "standup" | "walk" | "return" | "sitdown" =
    "warning";
  private timer: number = 0;

  private readonly WARNING_DURATION = 2.5;
  private readonly STAND_UP_DURATION = 0.6;
  private readonly SIT_DOWN_DURATION = 0.6;
  private readonly MOVE_SPEED = 3.5;
  private readonly DETECTION_RANGE = 5;
  private readonly DETECTION_HALF_ANGLE = (25 * Math.PI) / 180;

  enter(ctx: Enemy): void {
    this.phase = "warning";
    this.timer = 0;
    ctx.showPatrolWarning(true);
  }

  update(ctx: Enemy, dt: number): IState<Enemy> | null {
    this.timer += dt;

    switch (this.phase) {
      case "warning":
        if (this.timer >= this.WARNING_DURATION) {
          this.phase = "standup";
          this.timer = 0;
          ctx.showPatrolWarning(false);
        }
        break;
      case "standup":
        if (this.timer >= this.STAND_UP_DURATION) {
          this.phase = "walk";
          this.timer = 0;
          ctx.startPatrolWalk();
        }
        break;
      case "walk":
        const reached = ctx.moveAlongPatrol(dt, this.MOVE_SPEED);
        if (
          ctx.checkPatrolDetection(
            this.DETECTION_RANGE,
            this.DETECTION_HALF_ANGLE,
          )
        ) {
          ctx.reportPatrolDamage();
        }
        if (reached) {
          this.phase = "return";
          this.timer = 0;
        }
        break;
      case "return":
        const returnedToStart = ctx.returnToStart(dt, this.MOVE_SPEED);
        if (returnedToStart) {
          this.phase = "sitdown";
          this.timer = 0;
        }
        break;
      case "sitdown":
        if (this.timer >= this.SIT_DOWN_DURATION) {
          return new NormalState();
        }
        break;
    }
    return null;
  }

  exit(ctx: Enemy): void {
    ctx.showPatrolWarning(false);
    ctx.showPatrolText(false);
  }
}
