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
  private eventHandlers: Array<[string, EventListener]> = []

  constructor() {
    this.bind('KeyW', 'moveForward')
    this.bind('KeyS', 'moveBackward')
    this.bind('KeyA', 'moveLeft')
    this.bind('KeyD', 'moveRight')
    this.bind('Space', 'usePot')
    this.bind('Digit1', 'useProp1')
    this.bind('Digit2', 'useProp2')
    this.bind('Digit3', 'useProp3')

    this.setupListeners()
  }

  bind(keyCode: string, action: Action): void {
    this.bindings.set(keyCode, action)
  }

  private setupListeners(): void {
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

    document.addEventListener('keydown', onDown)
    document.addEventListener('keyup', onUp)
    this.eventHandlers.push(['keydown', onDown as EventListener])
    this.eventHandlers.push(['keyup', onUp as EventListener])

    const onContextMenu = (e: Event) => {
      e.preventDefault()
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        this.actionStates.set('throwWeapon', true)
        this.actionJustPressed.set('throwWeapon', true)
      }
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        this.actionStates.set('throwWeapon', false)
      }
    }

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    this.eventHandlers.push(['contextmenu', onContextMenu as EventListener])
    this.eventHandlers.push(['mousedown', onMouseDown as EventListener])
    this.eventHandlers.push(['mouseup', onMouseUp as EventListener])
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
    this.eventHandlers.forEach(([type, handler]) => {
      document.removeEventListener(type, handler)
    })
    this.eventHandlers.length = 0
    this.actionStates.clear()
    this.actionJustPressed.clear()
  }
}
