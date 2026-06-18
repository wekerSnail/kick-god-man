export type Action =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'kick'
  | 'usePot'
  | 'useProp1'
  | 'useProp2'
  | 'useProp3'
  | 'throwWeapon'

export class InputManager {
  private bindings = new Map<string, Action>()
  private actionStates = new Map<Action, boolean>()
  private actionJustPressed = new Map<Action, boolean>()
  private eventHandlers: Array<[string, EventListener, EventTarget]> = []

  constructor(canvas?: HTMLCanvasElement) {
    this.bind('KeyW', 'moveForward')
    this.bind('KeyS', 'moveBackward')
    this.bind('KeyA', 'moveLeft')
    this.bind('KeyD', 'moveRight')
    this.bind('Space', 'usePot')
    this.bind('Digit1', 'useProp1')
    this.bind('Digit2', 'useProp2')
    this.bind('Digit3', 'useProp3')

    this.setupListeners(canvas)
  }

  bind(keyCode: string, action: Action): void {
    this.bindings.set(keyCode, action)
  }

  private addHandler(target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions): void {
    target.addEventListener(type, handler, options)
    this.eventHandlers.push([type, handler, target])
  }

  private setupListeners(canvas?: HTMLCanvasElement): void {
    // --- 键盘 ---
    const onDown = (e: KeyboardEvent) => {
      const action = this.bindings.get(e.code)
      if (action) {
        e.preventDefault()
        this.actionStates.set(action, true)
        this.actionJustPressed.set(action, true)
      }
    }
    const onUp = (e: KeyboardEvent) => {
      const action = this.bindings.get(e.code)
      if (action) {
        this.actionStates.set(action, false)
      }
    }
    this.addHandler(document, 'keydown', onDown as EventListener)
    this.addHandler(document, 'keyup', onUp as EventListener)

    // --- 鼠标右键（投掷）使用 pointerdown / pointerup ---
    // pointerdown/pointerup 是现代浏览器推荐的事件，比 mousedown/mouseup 更可靠
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        e.stopPropagation()
        this.actionStates.set('throwWeapon', true)
        this.actionJustPressed.set('throwWeapon', true)
      }
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        e.stopPropagation()
        this.actionStates.set('throwWeapon', false)
      }
    }
    const onContextMenu = (e: Event) => {
      e.preventDefault()
    }

    // 在 canvas 上用捕获阶段监听，防止被 Babylon.js 拦截
    const mouseTarget = canvas || document
    this.addHandler(mouseTarget, 'pointerdown', onPointerDown as EventListener, { capture: true })
    this.addHandler(mouseTarget, 'pointerup', onPointerUp as EventListener, { capture: true })
    this.addHandler(mouseTarget, 'contextmenu', onContextMenu as EventListener, { capture: true })

    // document 上也监听一份，确保不遗漏
    if (canvas) {
      this.addHandler(document, 'pointerdown', onPointerDown as EventListener, { capture: true })
      this.addHandler(document, 'pointerup', onPointerUp as EventListener, { capture: true })
      this.addHandler(document, 'contextmenu', onContextMenu as EventListener, { capture: true })
    }
  }

  isActionActive(action: Action): boolean {
    return this.actionStates.get(action) ?? false
  }

  isActionJustPressed(action: Action): boolean {
    const val = this.actionJustPressed.get(action) ?? false
    this.actionJustPressed.set(action, false)
    return val
  }

  dispose(): void {
    this.eventHandlers.forEach(([type, handler, target]) => {
      target.removeEventListener(type, handler)
    })
    this.eventHandlers.length = 0
    this.actionStates.clear()
    this.actionJustPressed.clear()
  }
}
