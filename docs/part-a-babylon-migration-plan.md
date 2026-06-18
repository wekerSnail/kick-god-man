# Part A: Babylon.js Engine Migration — Implementation Plan

## Overview

Migrate the game engine from Three.js to Babylon.js while preserving all gameplay values exactly. Part B (visual redesign) is complete — 5 HUD components exist in `src/components/hud/`, `theme.css` with design tokens is in place, Google Fonts added, no purple gradients or emoji in UI.

---

## Phase 0: Dependencies & Infrastructure (Foundation)

**Goal**: Install Babylon.js, set up Vite config for Havok WASM, create directory structure, decouple `types/game.ts` from Three.js.

**Estimated effort**: 1 session

### 0.1 Install dependencies

```bash
pnpm add @babylonjs/core @babylonjs/loaders
pnpm add -D vite-plugin-wasm
```

Note: Havok physics (`@babylonjs/havok`) requires WASM support. Install `havok` package separately:
```bash
pnpm add havok
```

### 0.2 Update `vite.config.ts`

Add WASM plugin for Havok:
```ts
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [vue(), wasm()],
  // ... existing config
})
```

### 0.3 Create directory structure

```
src/babylon/
├── core/
│   ├── EngineContext.ts      # Engine + Scene + Camera setup
│   └── AssetManager.ts       # GLB loading replaces ResourceCache
├── entities/
│   ├── Player.ts             # Player entity
│   ├── Enemy.ts              # Enemy entity (thin shell)
│   └── PropEntity.ts         # Prop spawning/pickup
├── state/
│   ├── StateMachine.ts       # Generic FSM
│   └── EnemyStates.ts        # 6 enemy states
├── systems/
│   ├── ProjectileSystem.ts   # Thrown weapons with Havok physics
│   └── PhysicsBootstrap.ts   # Havok initialization
├── environment/
│   ├── OfficeLevel.ts        # Ground, walls, lighting, furniture
│   └── HidingSpots.ts        # Hide spots
├── weapons/
│   └── WeaponModels.ts       # Procedural geometry (Babylon.js)
└── GameLoop.ts               # Main orchestrator
```

### 0.4 Decouple `src/types/game.ts` from Three.js

**Current problem**: `HidingSpot` interface uses `THREE.Vector3`, and `HIDING_SPOTS` creates `new THREE.Vector3(...)`.

**Fix**: Replace with plain `{x, y, z}` objects and a helper type:

```ts
// Replace: import * as THREE from 'three'
// With:
export interface Vec3 { x: number; y: number; z: number }

export interface HidingSpot {
  id: string
  position: Vec3
  size: Vec3
  name: string
}

export const HIDING_SPOTS: HidingSpot[] = [
  { id: 'plant', position: { x: -8, y: 0, z: -8 }, size: { x: 2, y: 3, z: 2 }, name: '盆栽' },
  { id: 'cabinet', position: { x: 8, y: 0, z: -8 }, size: { x: 3, y: 2, z: 1 }, name: '文件柜' },
  { id: 'sofa', position: { x: -8, y: 0, z: 8 }, size: { x: 4, y: 1, z: 2 }, name: '沙发' },
]
```

This is a **breaking change** to the old `src/game/` code. Since we're migrating away from it, this is acceptable. The old code will be deleted in Phase 6.

### 0.5 Copy reusable modules to `src/babylon/core/`

These files have zero Three.js dependency — copy them verbatim:

| Source | Destination | Lines |
|--------|-------------|-------|
| `src/game/core/EventBus.ts` | `src/babylon/core/EventBus.ts` | 25 |
| `src/game/core/InputManager.ts` | `src/babylon/core/InputManager.ts` | 100 |
| `src/game/systems/AudioManager.ts` | `src/babylon/core/AudioManager.ts` | 58 |
| `src/game/systems/LevelManager.ts` | `src/babylon/core/LevelManager.ts` | 69 |
| `src/game/systems/CollisionSystem.ts` | `src/babylon/core/CollisionSystem.ts` | 53 |

**CollisionSystem.ts change**: Update imports to reference new Babylon entity types instead of old Three.js ones. The logic is pure math — just the type signatures change.

### Verification

- [ ] `pnpm build` passes (no type errors from `types/game.ts` change)
- [ ] `src/babylon/` directory structure exists with placeholder files
- [ ] All 5 reusable modules copied and type-check
- [ ] Havok WASM loads in dev mode (`pnpm dev`)

---

## Phase 1: EngineContext + OfficeLevel (Scene Foundation)

**Goal**: Replace `SceneManager.ts` with Babylon.js engine, scene, camera, lights, ground, walls.

**Estimated effort**: 1 session

### 1.1 `src/babylon/core/EngineContext.ts`

Replaces `src/game/SceneManager.ts` (148 lines).

**Key mapping** (Three.js → Babylon.js):

| Three.js | Babylon.js |
|----------|-----------|
| `new THREE.WebGLRenderer()` | `new Engine(canvas, true)` |
| `new THREE.Scene()` | `new Scene(engine)` |
| `new THREE.PerspectiveCamera(60, w/h, 0.1, 1000)` | `new ArcRotateCamera(...)` or `FreeCamera` |
| `renderer.shadowMap = PCFSoftShadowMap` | `scene.shadowGenerator = new ShadowGenerator(2048, dirLight)` |
| `renderer.toneMapping = ACESFilmicToneMapping` | `scene.imageProcessingConfiguration.toneMappingType = ACES` |
| `renderer.setPixelRatio(min(dpr, 2))` | `engine.setHardwareScalingLevel(1 / Math.min(dpr, 2))` |

**Camera setup** — The current camera follows the player with lerp:
```ts
// Current Three.js (GameLoop.ts:114-118)
camera.position.lerp(cameraOffset.set(playerPos.x, 8, playerPos.z + 6), 1 - Math.pow(0.001, delta))
camera.lookAt(cameraTarget)
```

In Babylon.js, use `ArcRotateCamera` locked to a target node, or manual `camera.position` + `camera.setTarget()` each frame:
```ts
// Babylon.js equivalent
camera.position = Vector3.Lerp(
  camera.position,
  new Vector3(playerPos.x, 8, playerPos.z + 6),
  1 - Math.pow(0.001, delta)
)
camera.setTarget(new Vector3(playerPos.x, 0, playerPos.z - 3))
```

**Scene background + fog**:
```ts
scene.clearColor = new Color4(0.529, 0.808, 0.922, 1) // 0x87CEEB
scene.fogMode = Scene.FOGMODE_EXP2
scene.fogColor = new Color3(0.529, 0.808, 0.922)
scene.fogDensity = 0.02
```

**Shadow setup** — Babylon.js uses `ShadowGenerator` attached to a light:
```ts
const shadowGenerator = new ShadowGenerator(isMobile ? 1024 : 2048, dirLight)
shadowGenerator.useBlurExponentialShadowMap = true
shadowGenerator.blurKernel = 32
// Add shadow casters: shadowGenerator.addShadowCaster(mesh)
```

### 1.2 `src/babylon/environment/OfficeLevel.ts`

Replaces the ground/walls creation in `SceneManager.ts` and adds office furniture loading.

**Ground**:
```ts
const ground = MeshBuilder.CreateGround('ground', { width: 30, height: 30 }, scene)
const groundMat = new StandardMaterial('groundMat', scene)
groundMat.diffuseColor = new Color3(0.565, 0.933, 0.565) // 0x90EE90
groundMat.roughness = 0.8
ground.material = groundMat
ground.receiveShadows = true
```

**Walls** — same BoxGeometry approach with `MeshBuilder.CreateBox`.

**Office furniture** — Load GLB files via `AssetManager`:
```ts
const desk = await SceneLoader.AppendAsync('/models/', 'desk.glb', scene)
```

**Lighting** — Must match current values exactly:
- Ambient: `new HemisphericLight('', new Vector3(0, 1, 0), scene)` with intensity 0.6, diffuse `0xfffaed`
- Directional: position `(10, 20, 10)`, intensity 1.0
- Point: position `(0, 10, 0)`, intensity 0.3

### 1.3 `src/babylon/core/AssetManager.ts`

Replaces `src/game/core/ResourceCache.ts` (119 lines).

**Key changes**:
- Remove `GLTFLoader` / `FBXLoader` imports
- Use Babylon.js `SceneLoader.ImportMeshAsync()` for GLB files
- `getModel()` returns a cloned `TransformNode` (Babylon.js equivalent of `THREE.Group.clone()`)
- For now, keep procedural geometry fallbacks (same as current code)

```ts
export class AssetManager {
  private models = new Map<string, Mesh>()
  
  async loadGLB(key: string, url: string): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync('', url, '', scene)
    result.meshes.forEach(m => {
      m.receiveShadows = true
      // castShadow is set via ShadowGenerator.addShadowCaster
    })
    const root = result.meshes[0]
    this.models.set(key, root)
  }
  
  getModel(key: string): Mesh | null {
    const model = this.models.get(key)
    return model ? model.clone(key + '_clone')! : null
  }
}
```

### Verification

- [ ] `pnpm dev` shows a Babylon.js scene with ground, walls, lights
- [ ] Shadow maps render correctly
- [ ] Camera responds to window resize
- [ ] Scene fog matches original look
- [ ] `pnpm build` passes

---

## Phase 2: Player Migration (Movement + Animations)

**Goal**: Migrate `Player.ts` (655 lines) to Babylon.js with identical movement, kick, weapon, and pot mechanics.

**Estimated effort**: 2 sessions (most complex file)

### 2.1 `src/babylon/entities/Player.ts`

**Mesh construction** — The current player is built from procedural geometry (cylinders, spheres, boxes). Translate each:

| Three.js | Babylon.js |
|----------|-----------|
| `new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8)` | `MeshBuilder.CreateCylinder('', { diameterTop: 0.6, diameterBottom: 0.6, height: 1.2, tessellation: 8 })` |
| `new THREE.SphereGeometry(0.25, 16, 16)` | `MeshBuilder.CreateSphere('', { diameter: 0.5, segments: 16 })` |
| `new THREE.BoxGeometry(0.15, 0.1, 0.25)` | `MeshBuilder.CreateBox('', { width: 0.15, height: 0.1, depth: 0.25 })` |
| `new THREE.TorusGeometry(0.04, 0.015, 8, 16, Math.PI)` | `MeshBuilder.CreateTorus('', { diameter: 0.08, thickness: 0.03, tessellation: 16 })` — partial arc needs custom mesh |

**Material mapping**:
```ts
// Three.js
new THREE.MeshStandardMaterial({ color: 0x4A90D9 })
// Babylon.js
const mat = new StandardMaterial('', scene)
mat.diffuseColor = Color3.FromHexString('#4A90D9')
```

**Position & movement** — Direct mapping:
```ts
// Three.js
this.position.add(direction.multiplyScalar(moveSpeed))
this.mesh.position.copy(this.position)
// Babylon.js
this.position.addInPlace(direction.scale(moveSpeed))
this.mesh.position.copyFrom(this.position)
```

**Rotation** — Three.js Y-up, Babylon.js Y-up (same coordinate system):
```ts
// Three.js
this.mesh.rotation.y += normalizedDiff * 10 * delta
// Babylon.js
this.mesh.rotation.y += normalizedDiff * 10 * delta  // identical
```

**Walk animation** — Current code rotates limbs manually each frame. Same approach in Babylon.js:
```ts
this.legLeft.rotation.x = legSwing  // identical
```

**Kick animation** — `animateKick()` (line 547-551) uses sine curve on leg/arm rotation. Direct port.

**CanvasTexture → DynamicTexture** — For countdown sprites:
```ts
// Three.js
const canvas = document.createElement('canvas')
this.potCountdownTexture = new THREE.CanvasTexture(canvas)
const spriteMat = new THREE.SpriteMaterial({ map: this.potCountdownTexture })

// Babylon.js
const dt = new DynamicTexture('', { width: 256, height: 64 }, scene)
const ctx = dt.getContext()
ctx.fillText('text', x, y)
dt.update()  // replaces needsUpdate = true
// Use SpriteManager + Sprite for billboard display
```

**SpriteManager pattern**:
```ts
const spriteManager = new SpriteManager('', '', 1, 256, scene)
const sprite = new Sprite('', spriteManager)
sprite.width = 1.5
sprite.height = 0.4
sprite.position = new Vector3(0, 3, 0) // relative to parent
```

**Invisible effect** — Current code traverses mesh children setting `material.opacity`. In Babylon.js:
```ts
this.mesh.getChildMeshes().forEach(m => {
  const mat = m.material as StandardMaterial
  mat.alpha = opacity  // Babylon.js uses 'alpha' not 'opacity'
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND
})
```

**Weapon equip** — `createWeaponMesh()` returns a Babylon.js `TransformNode` parented to `armRight`:
```ts
const weaponMesh = createWeaponMesh(weapon.type, scene)
weaponMesh.parent = this.armRight
weaponMesh.position = new Vector3(0, -0.35, 0)
```

### 2.2 Key value preservation checklist

All values from the current `Player.ts` must be identical:

| Value | Current | Must be |
|-------|---------|---------|
| Speed | 5 | 5 |
| Kick cooldown | 5.0s | 5.0s |
| Kick animation time | 0.3s | 0.3s |
| Pot duration | 5.0s | 5.0s |
| Pot cooldown | 5.0s | 5.0s |
| Walk cycle speed | 8 | 8 |
| Leg swing amplitude | 0.4 | 0.4 |
| Position clamp | ±14 | ±14 |
| Rotation lerp factor | 10 | 10 |
| Throw charge speed | 2.0 | 2.0 |
| Throw power formula | `(sin(t*2π)+1)/2` | same |

### Verification

- [ ] Player moves with WASD, identical speed
- [ ] Kick animation plays on click
- [ ] 5-second attack cooldown works
- [ ] Pot (keyboard) works with countdown sprite
- [ ] Weapon equip/unequip works
- [ ] Weapon swing animation plays
- [ ] Throw charge (right-click) shows power bar
- [ ] Invisible effect flickers correctly
- [ ] Walk animation cycles legs/arms

---

## Phase 3: Enemy + FSM (State Machine)

**Goal**: Migrate `Enemy.ts` (979 lines) and introduce a proper `StateMachine.ts` + 6 state classes.

**Estimated effort**: 2 sessions

### 3.1 `src/babylon/state/StateMachine.ts`

Generic FSM that the refactor doc requires:

```ts
export interface State {
  enter(): void
  update(delta: number): void
  exit(): void
}

export class StateMachine {
  private states = new Map<string, State>()
  private currentState: State | null = null
  private currentStateName: string = ''
  
  addState(name: string, state: State): void { ... }
  setState(name: string): void { ... }
  update(delta: number): void { ... }
  getState(): string { ... }
}
```

### 3.2 `src/babylon/state/EnemyStates.ts`

Extract the 6 states from `Enemy.ts` into individual state classes:

| State | Current code location | Description |
|-------|----------------------|-------------|
| `NormalState` | `updateNormal()` L518-543 | Idle, countdown to phone flash, schedule meetings/patrols |
| `PhoneFlashingState` | `updatePhoneFlashing()` L699-721 | Phone light flashes, then transitions to looking_back |
| `LookingBackState` | `updateLookingBack()` L723-771 | 6-stage animation: sitting→standing→turning→looking→turning_back→sitting_down |
| `StunnedState` | `updateStun()` L909-919 | Stun timer, rotating stars indicator |
| `MeetingState` | `updateMeeting()` L921-944 | Shield, arm waving, meeting text |
| `PatrolState` | `updatePatrol()` L561-643 | 6 phases: warning→standup→walk→return→sitdown |

**Critical value preservation** — All timing constants must match exactly:

```ts
// From Enemy.ts — these MUST be identical in the new code
STAND_UP_DURATION = 0.5
TURN_DURATION = 0.4
LOOK_DURATION = 2
SIT_DOWN_DURATION = 0.5
WARNING_DURATION = 2.5
PATROL_STAND_UP_DURATION = 0.6
PATROL_SIT_DOWN_DURATION = 0.6
PATROL_DETECTION_RANGE = 5
PATROL_DETECTION_HALF_ANGLE = degToRad(25)
patrolMoveSpeed = 3.5
nextLookBackTime: 8 (initial), range [min(3, 8-difficulty), max(5, 12-difficulty)]
nextMeetingTime: 15 (initial), range [12, 20]
nextPatrolTime: 25 (initial), range [20, 35]
meeting chance: 0.5
patrol chance: 0.6
meeting duration: 6s
patrol timer: 8-12s
```

### 3.3 `src/babylon/entities/Enemy.ts`

Thin shell that:
1. Creates the enemy mesh (desk, computer, chair, character — procedural geometry ported to Babylon.js)
2. Owns a `StateMachine` instance
3. Delegates `update()` to the state machine
4. Exposes the same public API: `getPosition()`, `isLookingBack()`, `isInMeeting()`, `getIsPatrolling()`, `applyStun()`, `detectPlayerInVision()`, `isPlayerBehind()`

**Mesh construction** — Port all procedural geometry:

Current Enemy creates: desk, computer, chair, character body, phone, warning indicator, stun indicator, meeting indicator, patrol indicator (vision cone, text sprites). Each needs a Babylon.js equivalent.

**CanvasTexture → DynamicTexture** for all text overlays:
- Meeting text: "📢 开会中..."
- Patrol warning: "🔍 即将巡查..."
- Patrol text: "🔍 巡查中..."
- Warning exclamation/question marks

**Vision cone** — Current uses `THREE.ConeGeometry(5, 5, 16, 1, true, 0, Math.PI/4)`:
```ts
// Babylon.js
const cone = MeshBuilder.CreateCone('', {
  height: 5,
  diameterTop: 0,
  diameterBottom: 5,
  tessellation: 16,
  arc: 0.25, // PI/4 / (2*PI) = 1/8... actually arc is 0 to 1
}, scene)
```

Note: Babylon.js `CreateCone` `arc` parameter is 0-1 (fraction of circle). `Math.PI/4` is 1/8 of full circle, so `arc: 0.125`.

### Verification

- [ ] Enemy sits at desk, idle animation plays
- [ ] Phone flashes → enemy stands → turns → looks → turns back → sits (identical timing)
- [ ] Meeting triggers with shield + arm waving + "开会中..." text
- [ ] Stun shows rotating stars for exact duration
- [ ] Patrol: warning phase → standup → walk waypoints → return → sitdown
- [ ] Vision cone appears during patrol
- [ ] `isPlayerBehind()` and `detectPlayerInVision()` return correct results
- [ ] All timing values match original exactly

---

## Phase 4: Props + Weapons + Physics

**Goal**: Migrate prop spawning, weapon models, projectile system, and optionally add Havok physics.

**Estimated effort**: 1-2 sessions

### 4.1 `src/babylon/weapons/WeaponModels.ts`

Port all 4 weapon meshes from Three.js to Babylon.js:

| Weapon | Three.js geometry | Babylon.js equivalent |
|--------|------------------|----------------------|
| Mace | CylinderGeometry + SphereGeometry + ConeGeometry×8 | CreateCylinder + CreateSphere + CreateCone×8 |
| Bat | CylinderGeometry (tapered) | CreateCylinder with diameterTop≠diameterBottom |
| Frying Pan | CylinderGeometry + CylinderGeometry (handle) | CreateCylinder + CreateCylinder |
| Ruler | BoxGeometry + BoxGeometry×6 (marks) | CreateBox + CreateBox×6 |

`createWeaponPickupMesh()` — same glow sphere pattern in Babylon.js.

### 4.2 `src/babylon/entities/PropEntity.ts`

Replaces `src/game/Props.ts` (164 lines).

**Key changes**:
- `THREE.Group` → Babylon.js `TransformNode` or `Mesh`
- `scene.add(mesh)` → `mesh.parent = scene.rootNodes[0]` or just set `mesh.parent` to scene
- `scene.remove(mesh)` → `mesh.dispose()`
- Rotation animation: `mesh.rotation.y += delta * 2` (identical)
- Float animation: `mesh.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.2` (identical)
- Distance check for pickup: `Vector3.Distance(playerPos, prop.position)` (identical logic)

### 4.3 `src/babylon/systems/ProjectileSystem.ts`

Replaces `src/game/systems/ProjectileSystem.ts` (106 lines).

**Option A (Simple — match current behavior)**: Keep hand-written physics (velocity + gravity), just port to Babylon.js vectors:
```ts
p.velocity.y -= 9.8 * delta  // identical
p.position.addInPlace(p.velocity.scale(delta))  // was addScaledVector
```

**Option B (Havok — as refactor doc suggests)**: Use Havok physics for projectile motion:
```ts
const hk = await HavokPhysics()
const world = new PhysicsEngine(hk)
const body = new PhysicsBody(mesh, PhysicsMotionType.DYNAMIC, false, scene)
body.setLinearVelocity(velocity)
// Gravity is automatic with Havok
```

**Recommendation**: Start with Option A (simpler, matches current behavior exactly), add Havok as a follow-up. Havok changes projectile feel and needs careful tuning.

### 4.4 `src/babylon/environment/HidingSpots.ts`

Replaces `src/game/HidingSpots.ts` (223 lines).

**Changes**:
- `THREE.Vector3` → Babylon.js `Vector3`
- Procedural geometry ported to Babylon.js `MeshBuilder`
- `isInHidingSpot()` uses `Vector3.Distance()` (same math)
- `HIDING_SPOTS` data now uses `Vec3` from `types/game.ts`

### 4.5 Havok Physics Bootstrap (Optional in this phase)

`src/babylon/systems/PhysicsBootstrap.ts`:

```ts
import HavokPhysics from 'havok'

export async function initPhysics(scene: Scene): Promise<PhysicsEngine> {
  const hk = await HavokPhysics()
  scene.enablePhysics(new Vector3(0, -9.81, 0), new PhysicsEngine(hk))
  return scene.getPhysicsEngine()!
}
```

If using Havok, ground needs `PhysicsAggregate`:
```ts
new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene)
```

### Verification

- [ ] Props spawn and float/rotate
- [ ] Props picked up on proximity (distance < 1.5)
- [ ] All 4 weapon meshes render correctly
- [ ] Weapon pickup glow effect visible
- [ ] Projectiles fly in parabolic arc
- [ ] Projectiles hit enemy (distance check)
- [ ] Projectiles removed on hit or timeout
- [ ] Hiding spots render (plant, cabinet, sofa)
- [ ] `isInHidingSpot()` returns correct values
- [ ] If Havok: projectile physics feel identical to hand-written version

---

## Phase 5: GameLoop Integration (Wiring Everything Together)

**Goal**: Create the new `GameLoop.ts` that wires all Babylon.js systems together, replacing the old one.

**Estimated effort**: 1 session

### 5.1 `src/babylon/GameLoop.ts`

This is the orchestrator. Compare with current `GameLoop.ts` (567 lines) and port all logic:

**Constructor changes**:
```ts
// Old
this.sceneManager = new SceneManager(container)
this.clock = new THREE.Clock()

// New
this.engineContext = new EngineContext(container)
this.clock = new BabylonClock() // or use engine.getDeltaTime()
```

**`init()` method**:
```ts
async init(): Promise<void> {
  this.assetManager = new AssetManager(this.engineContext.scene)
  await this.assetManager.preloadModels()
  this.officeLevel = new OfficeLevel(this.engineContext.scene, this.assetManager)
  this.player = new Player(this.engineContext.scene, this.input, this.assetManager)
  this.enemy = new Enemy(this.engineContext.scene, this.assetManager)
  // ... etc
}
```

**`animate()` loop** — Babylon.js uses `engine.runRenderLoop()`:
```ts
// Old
requestAnimationFrame(() => this.animate())
const delta = this.clock.getDelta()

// New
this.engineContext.engine.runRenderLoop(() => {
  const delta = this.engineContext.engine.getDeltaTime() / 1000
  this.update(delta)
})
```

**`update()` method** — Port all 300+ lines of game logic from current `GameLoop.ts`. This is the most critical file for value preservation. Every check, every distance comparison, every timing constant must be identical.

**Key state bridge** — `onStateChange` callback still pushes state to Vue:
```ts
this.onStateChange({
  kickCount: this.kickCount,
  health: this.health,
  // ... all fields identical
})
```

**Victory particles** — Current code uses `THREE.Points` with `BufferGeometry`. In Babylon.js:
```ts
const particleSystem = new ParticleSystem('', 100, scene)
particleSystem.createSphereEmitter(2)
particleSystem.color1 = new Color4(1, 0.843, 0) // gold
particleSystem.start()
```

Or use `SolidParticleSystem` for more control matching the current effect.

### 5.2 Update `src/components/Game.vue`

Change the import:
```ts
// Old
import { GameLoop } from '../game/GameLoop'

// New
import { GameLoop } from '../babylon/GameLoop'
```

That's the only change needed — the `GameLoop` constructor signature stays the same: `(container: HTMLElement, onStateChange: (state: any) => void)`.

### Verification

- [ ] Game starts, renders 3D scene in canvas
- [ ] Player moves, kicks, uses items
- [ ] Enemy behaves identically (all 6 states)
- [ ] Props spawn and can be picked up
- [ ] Kick count increments correctly
- [ ] Level transitions work (10→20→35→50→70→100→150)
- [ ] Health system works (3 HP, damage on detection)
- [ ] Game over / win conditions trigger correctly
- [ ] HUD updates in real-time
- [ ] Restart works (dispose + recreate)
- [ ] Screen resize handled
- [ ] All weapon types work (equip, swing, throw, projectile hit)
- [ ] Meeting mechanic works (50% chance, 12-20s interval)
- [ ] Patrol mechanic works (60% chance, 20-35s interval)

---

## Phase 6: Cleanup & Asset Migration

**Goal**: Remove old Three.js code, update dependencies, handle FBX→GLB conversion.

**Estimated effort**: 1 session + external Blender work

### 6.1 Delete old code

```
rm -rf src/game/
```

This removes:
- `SceneManager.ts` (replaced by `EngineContext.ts`)
- `Player.ts` (replaced by `src/babylon/entities/Player.ts`)
- `Enemy.ts` (replaced by `src/babylon/entities/Enemy.ts`)
- `GameLoop.ts` (replaced by `src/babylon/GameLoop.ts`)
- `Props.ts` (replaced by `src/babylon/entities/PropEntity.ts`)
- `HidingSpots.ts` (replaced by `src/babylon/environment/HidingSpots.ts`)
- `core/EventBus.ts` (moved to `src/babylon/core/`)
- `core/InputManager.ts` (moved to `src/babylon/core/`)
- `core/ResourceCache.ts` (replaced by `AssetManager.ts`)
- `systems/AudioManager.ts` (moved to `src/babylon/core/`)
- `systems/CollisionSystem.ts` (moved to `src/babylon/core/`)
- `systems/LevelManager.ts` (moved to `src/babylon/core/`)
- `systems/ProjectileSystem.ts` (replaced by `src/babylon/systems/`)
- `weapons/WeaponModels.ts` (replaced by `src/babylon/weapons/`)

### 6.2 Remove Three.js dependencies

```bash
pnpm remove three @types/three
```

If FBXLoader was the only reason for some Three.js addons, those go too.

### 6.3 FBX → GLB Conversion (External Task)

**Current situation**: `ResourceCache.ts` loads `character.fbx` for both player and boss. Babylon.js doesn't have a built-in FBX loader.

**Solution**: Convert FBX to GLB using Blender (one-time manual task):

1. Open Blender
2. File → Import → FBX → select `public/models/character.fbx`
3. If texture exists (`boss_skin.png`, `player_skin.png`), apply it
4. File → Export → glTF 2.0 (.glb/.gltf)
5. Save as `public/models/player.glb` and `public/models/boss.glb`

**If no one can do the Blender conversion**: Keep the procedural geometry fallback (which already exists in the current code). The game works fine without external models — all characters are built from cylinders, spheres, and boxes.

### 6.4 Update `AGENTS.md`

Update the architecture section to reflect the new structure:
- Remove `src/game/` references
- Add `src/babylon/` structure
- Update build commands if needed
- Note Havok physics dependency

### Verification

- [ ] `pnpm remove three` succeeds
- [ ] `pnpm build` passes with zero Three.js imports
- [ ] `pnpm dev` runs the game correctly
- [ ] No `src/game/` directory exists
- [ ] All gameplay values verified against original
- [ ] GitHub Actions deploy still works

---

## Risk Mitigation

### Risk 1: Coordinate system mismatch
**Mitigation**: Three.js and Babylon.js both use Y-up. X/Z mapping is identical. Test with a simple cube at (1,0,0) in both engines to confirm.

### Risk 2: Havok physics changes feel
**Mitigation**: Phase 4 starts with hand-written physics (Option A). Havok is opt-in. If Havok changes projectile behavior, tune gravity/velocity constants to match.

### Risk 3: DynamicTexture text rendering differs from CanvasTexture
**Mitigation**: DynamicTexture has a `getContext()` that returns a standard CanvasRenderingContext2D. All `ctx.fillText()` calls work identically. Test with the pot countdown sprite first.

### Risk 4: Shadow quality differences
**Mitigation**: Babylon.js ShadowGenerator with `useBlurExponentialShadowMap` closely matches Three.js `PCFSoftShadowMap`. Tune `blurKernel` if needed.

### Risk 5: Performance regression on mobile
**Mitigation**: Babylon.js defaults are heavier. Use `engine.setHardwareScalingLevel()` for mobile, reduce shadow map size, use `scene.freezeActiveMeshes()` for static geometry.

### Risk 6: FBX models unavailable in Babylon.js
**Mitigation**: Current code already has procedural geometry fallbacks for all models. The game is fully playable without external models. GLB conversion is a quality improvement, not a blocker.

---

## Dependency Graph

```
Phase 0 (Infrastructure)
    ↓
Phase 1 (EngineContext + OfficeLevel)
    ↓
Phase 2 (Player) ──── can start in parallel with Phase 3
    ↓                     ↓
Phase 3 (Enemy + FSM)
    ↓
Phase 4 (Props + Weapons + Physics)
    ↓
Phase 5 (GameLoop integration)
    ↓
Phase 6 (Cleanup)
```

Phases 2 and 3 can be developed in parallel since they're independent entities.

---

## File Summary

### New files to create (22 files)

| File | Lines (est.) | Replaces |
|------|-------------|----------|
| `src/babylon/core/EngineContext.ts` | 120 | `SceneManager.ts` |
| `src/babylon/core/AssetManager.ts` | 80 | `ResourceCache.ts` |
| `src/babylon/core/EventBus.ts` | 25 | verbatim copy |
| `src/babylon/core/InputManager.ts` | 100 | verbatim copy |
| `src/babylon/core/AudioManager.ts` | 58 | verbatim copy |
| `src/babylon/core/LevelManager.ts` | 69 | verbatim copy |
| `src/babylon/core/CollisionSystem.ts` | 53 | copy + import changes |
| `src/babylon/core/PhysicsBootstrap.ts` | 30 | new |
| `src/babylon/entities/Player.ts` | 500 | `Player.ts` |
| `src/babylon/entities/Enemy.ts` | 300 | `Enemy.ts` (thin shell) |
| `src/babylon/entities/PropEntity.ts` | 120 | `Props.ts` |
| `src/babylon/state/StateMachine.ts` | 50 | new |
| `src/babylon/state/EnemyStates.ts` | 400 | extracted from `Enemy.ts` |
| `src/babylon/systems/ProjectileSystem.ts` | 90 | `ProjectileSystem.ts` |
| `src/babylon/environment/OfficeLevel.ts` | 150 | parts of `SceneManager.ts` |
| `src/babylon/environment/HidingSpots.ts` | 180 | `HidingSpots.ts` |
| `src/babylon/weapons/WeaponModels.ts` | 120 | `WeaponModels.ts` |
| `src/babylon/GameLoop.ts` | 450 | `GameLoop.ts` |
| `src/types/game.ts` | 192 | modified (remove THREE dep) |
| `vite.config.ts` | 20 | modified (add wasm plugin) |
| `package.json` | 25 | modified (add deps) |

### Files to delete (14 files)

| File | After phase |
|------|------------|
| `src/game/SceneManager.ts` | 6 |
| `src/game/Player.ts` | 6 |
| `src/game/Enemy.ts` | 6 |
| `src/game/GameLoop.ts` | 6 |
| `src/game/Props.ts` | 6 |
| `src/game/HidingSpots.ts` | 6 |
| `src/game/core/EventBus.ts` | 6 |
| `src/game/core/InputManager.ts` | 6 |
| `src/game/core/ResourceCache.ts` | 6 |
| `src/game/systems/AudioManager.ts` | 6 |
| `src/game/systems/CollisionSystem.ts` | 6 |
| `src/game/systems/LevelManager.ts` | 6 |
| `src/game/systems/ProjectileSystem.ts` | 6 |
| `src/game/weapons/WeaponModels.ts` | 6 |

### Files to modify (3 files)

| File | Change |
|------|--------|
| `src/components/Game.vue` | Import path: `../game/GameLoop` → `../babylon/GameLoop` |
| `vite.config.ts` | Add `vite-plugin-wasm` |
| `package.json` | Add Babylon.js deps, remove Three.js |

---

## Estimated Total Effort

| Phase | Sessions | Complexity |
|-------|----------|------------|
| 0 - Infrastructure | 1 | Low |
| 1 - EngineContext + OfficeLevel | 1 | Medium |
| 2 - Player | 2 | High |
| 3 - Enemy + FSM | 2 | High |
| 4 - Props + Weapons + Physics | 1-2 | Medium |
| 5 - GameLoop Integration | 1 | High (wiring) |
| 6 - Cleanup | 1 | Low |
| **Total** | **9-10 sessions** | |

Parallel work (Phases 2+3): **7-8 sessions**.
