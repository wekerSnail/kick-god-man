type EventCallback = (data: any) => void

export class EventBus {
  private listeners = new Map<string, Set<EventCallback>>()

  on(event: string, fn: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(fn)
    return () => this.off(event, fn)
  }

  off(event: string, fn: EventCallback): void {
    this.listeners.get(event)?.delete(fn)
  }

  emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(fn => fn(data))
  }

  clear(): void {
    this.listeners.clear()
  }
}
