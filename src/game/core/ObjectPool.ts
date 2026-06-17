export class ObjectPool<T> {
  private pool: T[] = []

  constructor(
    private factory: () => T,
    private reset: (obj: T) => void,
    initialSize: number = 10
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory())
    }
  }

  acquire(): T {
    return this.pool.length > 0 ? this.pool.pop()! : this.factory()
  }

  release(obj: T): void {
    this.reset(obj)
    this.pool.push(obj)
  }

  clear(): void {
    this.pool.length = 0
  }
}
