export interface IState<T> {
  readonly name: string
  enter(ctx: T, ...args: any[]): void
  update(ctx: T, dt: number): IState<T> | null
  exit?(ctx: T): void
}

export class StateMachine<T> {
  private current: IState<T> | null = null

  constructor(private ctx: T) {}

  get stateName(): string {
    return this.current?.name ?? 'none'
  }

  start(initial: IState<T>): void {
    this.change(initial)
  }

  change(next: IState<T>): void {
    this.current?.exit?.(this.ctx)
    this.current = next
    this.current.enter(this.ctx)
  }

  forceState(next: IState<T>, ...args: any[]): void {
    this.current?.exit?.(this.ctx)
    this.current = next
    this.current.enter(this.ctx, ...args)
  }

  update(dt: number): void {
    const next = this.current?.update(this.ctx, dt)
    if (next) this.change(next)
  }
}
