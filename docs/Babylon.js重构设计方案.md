# Babylon.js 重构设计方案（Agent 执行版）

> 本文档是 agent 可直接执行的指令式设计规范。包含两部分：
> **Part A 引擎重构** — Three.js → Babylon.js 的完整技术迁移规范
> **Part B 视觉重设计** — 摒弃当前"AI slop"美学，建立鲜明的「昭和Office怪谈」视觉系统并落到 Vue HUD + Babylon 3D 场景
>
> **执行原则**：
> 1. 严格按规范实现，不要自由发挥配色/字体/间距
> 2. 所有数值（伤害、冷却、关卡阈值）1:1 迁移，不得改动玩法
> 3. 每个模块都标注「验收条件」，完成一项核对一项
> 4. 文档中的代码片段是**契约**，可直接复制并补全实现

---

# Part A · 引擎重构规范

## A1. 目标与边界

**做**：
- 用 Babylon.js Core + Havok 物理完全替换裸 Three.js
- 统一 glTF 资产管线，淘汰 FBX 工作流
- 引入显式有限状态机（FSM）拆解 885 行的 `Enemy.ts`
- 用物理引擎替代手写碰撞与抛射物弹道
- **同步重做 HUD/UI**（见 Part B），删除现有紫色渐变美学

**不做**：
- 不改 Vue 框架，不引入 React
- 不改任何玩法数值（见 A2 数值契约）
- 不引入需要外部编辑器的方案（PlayCanvas/Godot）

## A2. 数值契约（不可改动，迁移后必须 1:1 一致）

以下数值定义在 `src/types/game.ts` 与各实体类中，重构**必须保持完全一致**。验收时编写回归测试覆盖：

```typescript
// 关卡阈值（LevelManager）
KICK_TARGETS = [10, 20, 35, 50, 70, 100, 150]

// 玩家
PLAYER_SPEED = 5
ATTACK_COOLDOWN = 5            // 秒，连击手套激活时为 0
KICK_HIT_RANGE = 2             // 踢命中距离
INVISIBLE_DURATION = 5         // 秒
POT_DURATION = 5               // 键盘挡脸持续

// 武器（WEAPON_CONFIGS，严格按表）
mace:        damage=5, stun=3.0, swingRange=2.5, swingDuration=0.4
bat:         damage=3, stun=2.0, swingRange=2.8, swingDuration=0.35
frying_pan:  damage=1, stun=1.5, swingRange=2.0, swingDuration=0.3
ruler:       damage=1, stun=1.0, swingRange=2.2, swingDuration=0.2

// 抛射物（ProjectileSystem）
THROW_VELOCITY = 4 + power * 6
THROW_GRAVITY  = 1.5 + power * 2     // 注意：覆盖全局重力的局部值
THROW_LIFETIME = 2                   // 秒

// 敌人（Enemy.ts 常量）
STAND_UP_DURATION = 0.5
TURN_DURATION     = 0.4
LOOK_DURATION     = 2.0
SIT_DOWN_DURATION = 0.5
WARNING_DURATION  = 2.5              // 巡逻警告
PATROL_STAND_UP_DURATION = 0.6
PATROL_SIT_DOWN_DURATION = 0.6
PATROL_DETECTION_RANGE   = 5
PATROL_DETECTION_HALF_ANGLE = 25°
PATROL_MOVE_SPEED = 3.5
NEXT_PATROL_TIME  = 25               // 秒，首次巡查触发
NEXT_MEETING_TIME = 15                // 秒，首次开会触发
MEETING_INTERVAL  = [12, 20]          // 秒，开会周期随机区间
MEETING_BLOCK_CHANCE = 0.5            // 50% 概率消耗武器并阻挡

// 生命与得分
MAX_HEALTH = 3
PATROL_DAMAGE_COOLDOWN = 1.0          // 巡逻命中伤害冷却
SCORE_PER_KICK = 10
```

## A3. 目标目录结构

```
src/
├── babylon/                              ← 新引擎层（最终替换 src/game/）
│   ├── core/
│   │   ├── EngineContext.ts              # Engine/Scene/Camera 持有者
│   │   ├── EventBus.ts                   # ← 直接复用旧文件
│   │   ├── InputManager.ts               # ← 直接复用旧文件
│   │   ├── AssetManager.ts               # SceneLoader 封装
│   │   └── PhysicsBootstrap.ts           # HavokPlugin 初始化
│   ├── entities/
│   │   ├── Player.ts
│   │   ├── Enemy.ts                      # 瘦身后仅持有数据 + 委托 FSM
│   │   ├── PropEntity.ts
│   │   └── Projectile.ts                 # 物理刚体
│   ├── state/
│   │   ├── StateMachine.ts               # 通用 FSM
│   │   ├── EnemyStates.ts                # 6 状态实现
│   │   └── PlayerStates.ts               # 行为状态（可选，Player 简单时可省）
│   ├── systems/
│   │   ├── CollisionSystem.ts            # 物理 + 射线
│   │   ├── LevelManager.ts               # ← 直接复用旧文件
│   │   ├── AudioManager.ts               # ← 直接复用旧文件
│   │   ├── ProjectileSystem.ts
│   │   └── WorldOverlay.ts               # DynamicTexture 替代 Three Sprite
│   ├── environment/
│   │   ├── OfficeLevel.ts                # 场景构建（按 B6 视觉规范打光）
│   │   └── HidingSpots.ts
│   └── GameLoop.ts
├── components/
│   ├── Game.vue                          # ← 按 Part B 重写样式与结构
│   └── hud/                              ← 新增：HUD 子组件拆分
│       ├── TopBar.vue
│       ├── InventoryBar.vue
│       ├── StatusTicker.vue
│       ├── ThreatVignette.vue
│       └── OverlayScreens.vue            # 开始/过关/结束三屏
├── styles/
│   └── theme.css                         ← 新增：全局设计 token（见 B3）
└── types/
    └── game.ts                           # 去掉 THREE.Vector3，改纯 {x,y,z}
```

## A4. 核心模块实现规范

### A4.1 EngineContext —— 替换 SceneManager

**契约代码**（直接实现）：

```typescript
// src/babylon/core/EngineContext.ts
import { Engine, Scene, UniversalCamera, Vector3, HemisphericLight,
         DirectionalLight, Color3, ShadowGenerator,
         DefaultRenderingPipeline, ImageProcessingConfiguration } from '@babylonjs/core'

export class EngineContext {
  readonly engine: Engine
  readonly scene: Scene
  readonly camera: UniversalCamera
  readonly sun!: DirectionalLight
  readonly ambient!: HemisphericLight
  readonly shadowGen!: ShadowGenerator
  readonly pipeline: DefaultRenderingPipeline

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      antialias: true,
      powerPreference: 'high-performance',
      adaptToDeviceRatio: true,
    }, true)  // 第四参数 preserveDrawingBuffer，方便截图调试
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 2))

    this.scene = new Scene(this.engine)
    this.scene.clearColor = Color3.FromHexString('#1a1410').toColor4(1)  // 见 B4 场景色
    this.scene.ambientColor = Color3.FromHexString('#3a2a1f')
    this.scene.fogMode = Scene.FOGMODE_EXP2
    this.scene.fogColor = Color3.FromHexString('#0d0805')
    this.scene.fogDensity = 0.012

    this.camera = new UniversalCamera('cam', new Vector3(0, 10, 15), this.scene)
    this.camera.fov = (60 * Math.PI) / 180
    this.camera.minZ = 0.1
    this.camera.maxZ = 1000

    this.pipeline = this.setupPipeline()
    // 光照与阴影在 OfficeLevel 中按 B6 规范配置
  }

  async init(): Promise<void> {
    await PhysicsBootstrap.init(this.scene)  // Havok
  }

  private setupPipeline(): DefaultRenderingPipeline {
    const p = new DefaultRenderingPipeline('pipeline', true, this.scene, [this.camera])
    p.imageProcessing.toneMappingEnabled = true
    p.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
    p.imageProcessing.exposure = 1.1
    p.imageProcessing.contrast = 1.15
    p.imageProcessing.vignetteEnabled = true
    p.imageProcessing.vignetteWeight = 2.5
    p.imageProcessing.vignetteColor = Color4.FromHexString('#000000FF')
    p.imageProcessing.vignetteStretch = 0.5
    p.fxaaEnabled = true
    p.grainEnabled = true                    // 见 B6 胶片颗粒
    p.grainLevel = 8
    return p
  }

  start(onTick: (dt: number) => void): void {
    let last = performance.now()
    this.scene.onBeforeRenderObservable.add(() => {
      const now = performance.now()
      onTick(Math.min((now - last) / 1000, 0.1))  // clamp dt
      last = now
    })
    this.engine.runRenderLoop(() => this.scene.render())
    window.addEventListener('resize', () => this.engine.resize())
  }

  dispose(): void {
    this.engine.stopRenderLoop()
    this.scene.dispose()
    this.engine.dispose()
  }
}
```

### A4.2 PhysicsBootstrap —— Havok

```typescript
// src/babylon/core/PhysicsBootstrap.ts
import HavokPhysics from '@babylonjs/havok'
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin'
import { Vector3, Scene } from '@babylonjs/core'

export class PhysicsBootstrap {
  static async init(scene: Scene): Promise<void> {
    const havok = await HavokPhysics()
    scene.enablePhysics(new Vector3(0, -9.8, 0), new HavokPlugin(true, havok))
  }
}
```

> **注意**：抛射物的 `THROW_GRAVITY = 1.5 + power*2` 远小于全局 `-9.8`。实现时**不要改全局重力**，而是在 `Projectile` 的每帧 `onBeforePhysicsObservable` 中施加额外向上的力，或临时设置该刚体的自定义重力乘子（Havok 支持 `body.setMassProperties`）。验收：抛射物弹道与旧版手感一致。

### A4.3 AssetManager —— 替换 ResourceCache

```typescript
// src/babylon/core/AssetManager.ts
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { TransformNode, Scene } from '@babylonjs/core'

const ASSET_MAP = {
  player:   'models/player.glb',
  boss:     'models/boss.glb',          // ← 需先用 Blender 把 character.fbx 转出
  desk:     'models/desk.glb',
  chair:    'models/chair.glb',
  computer: 'models/computer.glb',
  plant:    'models/plant.glb',
  cabinet:  'models/cabinet.glb',
  sofa:     'models/sofa.glb',
  keyboard: 'models/Keyboard.glb',
} as const

export class AssetManager {
  private cache = new Map<string, TransformNode>()
  constructor(private scene: Scene) {}

  async preloadAll(): Promise<void> {
    const base = import.meta.env.BASE_URL
    await Promise.all(
      Object.entries(ASSET_MAP).map(async ([name, path]) => {
        try {
          await this.load(name, `${base}${path}`)
        } catch (e) {
          console.warn(`[Asset] ${name} 加载失败:`, e)
        }
      })
    )
  }

  async load(name: string, url: string): Promise<TransformNode> {
    if (this.cache.has(name)) return this.clone(name)
    const result = await SceneLoader.ImportMeshAsync('', url, '', this.scene)
    const root = new TransformNode(name, this.scene)
    result.meshes.forEach(m => m.parent = root)
    result.transformNodes.forEach(t => { if (t !== root) t.parent = root })
    this.cache.set(name, root)
    return this.clone(name)
  }

  clone(name: string): TransformNode {
    const src = this.cache.get(name)
    if (!src) throw new Error(`Asset not loaded: ${name}`)
    return src.clone(`${name}_${Date.now()}`, null)!  // 注意 Babylon clone 的语义
  }
}
```

**FBX 转换任务**（一次性）：
- 用 Blender 打开 `public/models/character.fbx`
- 分别赋予 `boss_skin.png`、`player_skin.png` 材质
- 导出两个 GLB：`boss.glb`、`player.glb`（替换现有 player.glb 若其质量不足）
- 导出选项：`+Y Up`、`Compression None`、`Custom > Animation`（若有骨骼动画则保留）
- 验收：Babylon Inspector 中可见正确贴图

### A4.4 StateMachine —— 拆解 Enemy

```typescript
// src/babylon/state/StateMachine.ts
export interface IState<T> {
  readonly name: string
  enter(ctx: T): void
  update(ctx: T, dt: number): IState<T> | null
  exit?(ctx: T): void
}

export class StateMachine<T> {
  private current: IState<T> | null = null
  constructor(private ctx: T) {}

  get stateName(): string { return this.current?.name ?? 'none' }

  start(initial: IState<T>): void { this.change(initial) }

  change(next: IState<T>): void {
    this.current?.exit?.(this.ctx)
    this.current = next
    this.current.enter(this.ctx)
  }

  update(dt: number): void {
    const next = this.current?.update(this.ctx, dt)
    if (next) this.change(next)
  }
}
```

**Enemy 状态契约**（每态一个类，所有时序数值取自 A2）：

| 状态 | enter 行为 | update 转移条件 |
|---|---|---|
| `NormalState` | 播 idle 动画；重置手机计时 | 计时到 `nextPhoneFlash` → `PhoneFlashingState`；到 `nextMeetingTime` → `MeetingState`；到 `nextPatrolTime` → `PatrolWarningState` |
| `PhoneFlashingState` | 手机闪烁警示 | 固定提示后 → `LookingBackState` |
| `LookingBackState` | 转身检查（`TURN_DURATION`+`LOOK_DURATION`+`TURN_DURATION`） | 检测到玩家正对 → 通报 GameLoop 判定被发现；否则 → `NormalState` |
| `StunnedState` | 眩晕指示器 | 计时结束 → 之前的状态 |
| `MeetingState` | 举盾 + 挥手动画 | 计时结束（12–20s 随机） → `NormalState`；期间攻击 50% 概率被挡+消耗武器 |
| `PatrolState`（内含 5 子相位） | 站起 → 警告 → 巡逻 → 返回 → 坐下 | 子相位完成 → `NormalState`；巡逻中视锥检测到玩家 → 通报伤害判定 |

**实现要求**：每个状态类独立文件或同 `EnemyStates.ts` 内并列，单类不超过 80 行。`Enemy.ts` 主类只保留：mesh 引用、配置常量、`StateMachine` 实例、对外 getter（`getState()`、`isLookingBack()` 等）。

### A4.5 CollisionSystem —— 物理 + 射线

```typescript
// src/babylon/systems/CollisionSystem.ts（关键方法契约）
export class CollisionSystem {
  // 踢命中：玩家脚部 mesh 与敌人 body 的包围盒相交 + 距离 < KICK_HIT_RANGE
  checkKickHit(player: Player, enemy: Enemy): boolean

  // 武器挥砍：武器 mesh 的 onCollideEvent，命中敌人 body
  checkWeaponHit(player: Player, enemy: Enemy): boolean

  // 敌人侦测：从敌人头部向玩家发射射线，途中无遮挡体（家具/植物）= 暴露
  checkEnemyDetection(player: Player, enemy: Enemy, hidingSpots: HidingSpots): boolean

  // 巡逻侦测：视锥（HALF_ANGLE=25°，RANGE=5）+ 射线遮挡判定
  checkPatrolDetection(player: Player, enemy: Enemy): boolean
}
```

**射线遮挡实现要点**：
```typescript
const ray = new Ray(enemyHeadPos, playerChestPos.subtract(enemyHeadPos), DISTANCE)
const pickInfo = scene.pickWithRay(ray, predicate)  // predicate 排除玩家自身
// 若 hit 且 hit.pickedMesh 是玩家 → 暴露
// 若 hit 且 hit.pickedMesh 是家具/植物 → 遮挡，安全
```

**验收**：躲藏在植物/柜子/沙发后，敌人 `checkEnemyDetection` 必须返回 false（与旧版 `HidingSpots.isInHidingSpot` 行为一致）。

### A4.6 Projectile —— 物理刚体

```typescript
// src/babylon/entities/Projectile.ts
import { MeshBuilder, PhysicsAggregate, PhysicsShapeType,
         Vector3, Observer, Scene } from '@babylonjs/core'
import type { WeaponConfig } from '../../types/game'

export class Projectile {
  readonly aggregate: PhysicsAggregate
  private age = 0
  private observer: Observer<Scene>
  private onHit: (weapon: WeaponConfig) => void
  private consumed = false

  constructor(
    scene: Scene,
    pos: Vector3, dir: Vector3, power: number,
    weapon: WeaponConfig, onHit: (w: WeaponConfig) => void
  ) {
    const mesh = MeshBuilder.CreateIcoSphere('proj', { radius: 0.12 }, scene)
    mesh.position = pos
    // 材质按武器类型：见 B5 武器视觉表
    this.aggregate = new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE,
      { mass: 0.3, friction: 0.5, restitution: 0.2 }, scene)

    const speed = 4 + power * 6
    this.aggregate.body.setLinearVelocity(dir.scale(speed))
    this.onHit = onHit

    this.aggregate.body.setCollisionCallbackEnabled(true)
    this.aggregate.body.getCollisionObservable().add(ev => {
      if (this.consumed) return
      const otherName = ev.collidedAgainst.transformNode.name
      if (otherName === 'enemyBody') {
        this.consumed = true
        this.onHit(weapon)
      }
    })

    // 局部重力补偿 + 寿命管理
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000
      this.age += dt
      // 向上施加额外力，使有效重力 ≈ 1.5 + power*2（而非 -9.8）
      const targetGravity = 1.5 + power * 2
      const compensator = (9.8 - targetGravity) * this.aggregate.body.getMassProperties().mass!
      this.aggregate.body.applyForce(new Vector3(0, compensator, 0), mesh.getAbsolutePosition())
      if (this.age >= 2) this.dispose()
    })
  }

  dispose(): void {
    this.observer.remove()
    this.aggregate.dispose()
  }
}
```

### A4.7 GameLoop 主循环

**保留旧 GameLoop 的所有状态字段与 update 逻辑骨架**，仅替换：
- `THREE.Clock` → `EngineContext` 的 dt 回调
- 渲染调用 → 由 `engine.runRenderLoop` 接管
- `THREE.Points` 粒子 → `ParticleSystem`（见 B6 命中特效）
- `onStateChange` 推送的 `UIState` 字段**完全不变**（保证 Game.vue 零接口改动）

## A5. Three.js → Babylon.js 迁移速查

| Three.js | Babylon.js |
|---|---|
| `WebGLRenderer` | `Engine` |
| `Scene` | `Scene` |
| `PerspectiveCamera` | `UniversalCamera` |
| `Mesh(geo, mat)` | `Mesh` + `.geometry`/`.material` |
| `BoxGeometry` | `MeshBuilder.CreateBox` |
| `MeshStandardMaterial` | `PBRMaterial` |
| `DirectionalLight` | `DirectionalLight` |
| `AmbientLight` | `HemisphericLight` |
| `castShadow` + `receiveShadow` | `ShadowGenerator` + `addShadowCaster`/`receiveShadows` |
| `GLTFLoader.loadAsync` | `SceneLoader.ImportMeshAsync` |
| `AnimationMixer`/`AnimationClip` | `AnimationGroup`（GLB 自带） |
| `THREE.Points` 粒子 | `ParticleSystem` |
| `THREE.Vector3` | `Vector3` |
| `texture.colorSpace = SRGB` | `texture.gammaSpace = true` |
| `.dispose()` 手动级联 | `node.dispose()` 自动级联 |
| 无 Inspector | `scene.debugLayer.show({ overlay: true })` |

## A6. 可直接复用的模块（无需改动）

| 文件 | 原因 |
|---|---|
| `src/game/core/EventBus.ts` | 纯 pub-sub，零引擎依赖 |
| `src/game/core/InputManager.ts` | 仅依赖 DOM 事件 |
| `src/game/systems/AudioManager.ts` | Web Audio API |
| `src/game/systems/LevelManager.ts` | 纯数值/事件 |
| `src/types/game.ts` 的 `PROP_CONFIGS`/`WEAPON_CONFIGS`/`HIDING_SPOTS` 数值 | 删除 `THREE.Vector3` 类型，改为 `{x,y,z}` 或 Babylon `Vector3` |

## A7. 验收清单

完成全部后，逐项核对：

- [ ] `pnpm build` 通过（`vue-tsc` 无错）
- [ ] 启动后可见办公室场景，光照按 B6 规范（暖光 + 颗粒 + 暗角）
- [ ] 角色 WASD 移动正常，鼠标转视角正常
- [ ] 7 关进度 `[10,20,35,50,70,100,150]` 正确推进
- [ ] 4 种武器伤害/眩晕/挥砍范围 1:1 一致（A2 表）
- [ ] 抛射物弹道与旧版一致（向上力补偿验证）
- [ ] 敌人 6 状态全部出现且时序正确
- [ ] 躲藏在植物后不被发现（射线遮挡验收）
- [ ] 开会状态攻击 50% 被挡 + 武器消耗
- [ ] HUD 视觉符合 Part B（无紫色渐变、无 emoji 堆砌）
- [ ] 包体积（gzip）相较旧版增量 ≤ 1.5MB
- [ ] `scene.debugLayer` 可正常打开 Inspector

---

# Part B · 视觉重设计规范

## B1. 设计诊断：为什么当前 UI 必须重做

当前 `Game.vue` 的视觉特征：
- `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` 紫色渐变铺天盖地（header、按钮、标题）
- `Segoe UI / Microsoft YaHei` 通用字体
- Material Design 配色（`#4caf50`/`#ff9800`/`#f44336`/`#2196f3`）混搭
- emoji 满天飞（❤️🖤👀📢🔍💫🥊👟🧪）作为唯一图标语言
- `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性曲线滥用，每个元素都在"弹"

这是典型的 **AI slop 美学**——技术正确但毫无作者性。一个"潜行踹办公族"的游戏，视觉却像企业 SaaS 仪表盘。

## B2. 美学方向：昭和 Office 怪谈（Showa Office Kwaidan）

**一句话定调**：1980 年代东京某栋昏黄办公楼里，空调嗡嗡作响的深夜办公室。主角是阴影里伺机踹人的幽灵职员。压抑、荒诞、黑色幽默。

**关键张力**：
- **材质**：泛黄的白炽灯、塑料百叶窗、棕褐色文件柜、油毡地板
- **情绪**：办公室的倦怠 × 潜行的紧张 × 踹人的喜剧
- **参考**：Jim Jarmusch《鬼狗杀手》的冷峻、Wes Anderson 的对称荒诞、《上班八小时》Office Space 的米黄压抑、昭和时代办公文具的印刷美学

**绝对禁忌**：
- ❌ 紫色渐变（任何形式）
- ❌ emoji 作为功能图标（保留少量装饰性 emoji 在文案中即可）
- ❌ Material Design 默认色
- ❌ Segoe UI / Inter / Roboto / Arial / system-ui
- ❌ 均匀分布的柔和阴影
- ❌ `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性动画（仅在极少数"踹中"时刻保留）

## B3. 设计 Token（全局 CSS 变量）

新建 `src/styles/theme.css`，在 `main.ts` 中 import。**所有组件必须引用变量，不得硬编码颜色**。

```css
/* src/styles/theme.css —— 昭和 Office 怪谈 设计系统 */

:root {
  /* ===== 色彩：暖褐 + 苔绿 + 朱砂，没有一丁点紫色 ===== */
  --ink:        #14110d;   /* 油墨黑，正文/强对比 */
  --ink-soft:   #2b241a;   /* 次级文字 */
  --paper:      #e8dcc0;   /* 泛黄打印纸，主背景 */
  --paper-warm: #d4c4a0;   /* 阴影面的纸 */
  --paper-dark: #a8946a;   /* 折痕/分割线 */
  --amber:      #c8902c;   /* 白炽灯暖橙，强调 */
  --amber-glow: #f4c46a;   /* 点亮的灯泡 */
  --moss:       #4a6b3a;   /* 苔绿，安全/就绪 */
  --moss-dark:  #2d4222;   /* 深苔，躲藏中 */
  --vermilion:  #c1351c;   /* 朱砂红，危险/警告 */
  --vermilion-bright: #e84a1c;  /* 闪烁的警告 */
  --steel:      #6b6660;   /* 文件柜灰 */
  --bone:       #cfc4a8;   /* 骨白，反色文字 */

  /* ===== 字体 ===== */
  --font-display: 'DotGothic16', 'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif;
  --font-body:    'Zen Kaku Gothic New', 'Noto Sans SC', sans-serif;
  --font-mono:    'VT323', 'Courier New', monospace;       /* 计分器用像素感 */
  --font-stamp:   'Reggae One', 'DotGothic16', cursive;     /* 印章感标题 */

  /* ===== 间距（4px 栅格）===== */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

  /* ===== 圆角：刻意不统一，制造手工感 ===== */
  --radius-sharp: 0px;       /* 卡片、文件柜质感 */
  --radius-soft:  2px;       /* 标签、按钮 */
  --radius-pill:  999px;     /* 仅状态点 */

  /* ===== 边框：双线/虚线营造印刷质感 ===== */
  --border-solid:  1px solid var(--ink);
  --border-double: 3px double var(--ink);
  --border-dashed: 1px dashed var(--paper-dark);

  /* ===== 阴影：硬阴影（无模糊），仿丝网印刷 ===== */
  --shadow-hard:   4px 4px 0 var(--ink);
  --shadow-hard-sm: 2px 2px 0 var(--ink);
  --shadow-press:  inset 2px 2px 0 var(--ink);

  /* ===== 动效曲线 ===== */
  --ease-office:   cubic-bezier(0.4, 0, 0.2, 1);      /* 办公室般的克制 */
  --ease-stamp:    cubic-bezier(0.16, 1, 0.3, 1);     /* 盖章般果断 */
  --ease-kick:     cubic-bezier(0.34, 1.56, 0.64, 1); /* 仅踹中瞬间 */

  /* ===== 背景纹理（data-uri 内联，无网络依赖）===== */
  --bg-paper-texture: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.08 0 0 0 0 0.07 0 0 0 0 0.05 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

**字体加载**（`index.html` 加 Google Fonts，避免 FOUT 用 `display=swap`）：
```html
<link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=VT323&family=Reggae+One&display=swap" rel="stylesheet">
```

## B4. 各 UI 区域重设计

### B4.1 TopBar —— 顶栏（替换现有 `.game-header`）

**设计**：仿昭和时代办公桌上的搪瓷铭牌。三块分割：左侧"健康"用三枚红色圆形徽章（不是 emoji 心），中间关卡用印章风格，右侧计分器用 VT323 像素数字（像老式打卡机）。

```vue
<!-- src/components/hud/TopBar.vue -->
<template>
  <header class="topbar">
    <!-- 左：健康，三枚搪瓷徽章 -->
    <div class="topbar__health">
      <span class="topbar__label">体 力</span>
      <div class="health-pips">
        <span
          v-for="i in gameState.maxHealth"
          :key="i"
          class="pip"
          :class="{ 'pip--lost': i > gameState.health }"
        />
      </div>
    </div>

    <!-- 中：关卡，印章风格 -->
    <div class="topbar__level">
      <span class="stamp">第 {{ gameState.level }} 話</span>
    </div>

    <!-- 右：计分器，像素数字 -->
    <div class="topbar__score">
      <span class="counter">{{ String(gameState.kickCount).padStart(3, '0') }}</span>
      <span class="counter__target">/ {{ String(gameState.kickTarget).padStart(3, '0') }}</span>
      <span class="counter__unit">踹</span>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: var(--sp-3) var(--sp-5);
  background: var(--paper);
  border-bottom: var(--border-double);
  background-image: var(--bg-paper-texture);
  position: relative;
}
.topbar::after {  /* 底部细虚线，仿打孔纸 */
  content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 4px;
  background: repeating-linear-gradient(90deg, transparent 0 6px, var(--ink) 6px 8px);
  opacity: 0.3;
}
.topbar__health { display: flex; align-items: center; gap: var(--sp-3); }
.topbar__label {
  font-family: var(--font-display); font-size: 12px; color: var(--ink-soft);
  letter-spacing: 0.3em; writing-mode: vertical-rl;  /* 竖排，日式感 */
}
.health-pips { display: flex; gap: var(--sp-2); }
.pip {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--vermilion);
  border: 2px solid var(--ink);
  box-shadow: var(--shadow-hard-sm);
  transition: all 0.2s var(--ease-office);
}
.pip--lost {
  background: transparent;
  border-style: dashed;
  box-shadow: none;
  transform: scale(0.85);
}
.topbar__level { text-align: center; }
.stamp {
  font-family: var(--font-stamp); font-size: 22px; color: var(--vermilion);
  border: 3px double var(--vermilion); padding: var(--sp-1) var(--sp-4);
  transform: rotate(-3deg);
  letter-spacing: 0.15em;
  /* 仿印章不均匀感 */
  background: radial-gradient(ellipse at 30% 40%, rgba(193,53,28,0.08), transparent 70%);
}
.topbar__score {
  display: flex; align-items: baseline; gap: var(--sp-2);
  justify-content: flex-end;
}
.counter {
  font-family: var(--font-mono); font-size: 40px; line-height: 1;
  color: var(--ink); letter-spacing: 0.05em;
  text-shadow: 2px 2px 0 var(--amber);
}
.counter__target { font-family: var(--font-mono); font-size: 24px; color: var(--paper-dark); }
.counter__unit { font-family: var(--font-display); font-size: 12px; color: var(--ink-soft); margin-left: 4px; }
</style>
```

### B4.2 InventoryBar —— 道具栏

**设计**：仿办公桌抽屉里的物品贴纸。槽位是带虚线边框的"档案标签"，非空时是实线 + 硬阴影。数字键标记像圆珠笔手写的编号。武器槽用朱砂色边框区分。

```vue
<!-- src/components/hud/InventoryBar.vue -->
<template>
  <div class="inventory">
    <div class="inventory__hint">
      <span class="hint-line">{{ hint }}</span>
    </div>
    <div class="inventory__slots">
      <button
        v-for="(item, index) in slots"
        :key="item.id ?? `empty-${index}`"
        class="slot"
        :class="{
          'slot--empty': !item,
          'slot--weapon': item?.category === 'weapon',
          'slot--active': item?.active,
        }"
        @click="item && useProp(index)"
        :disabled="!item"
      >
        <span v-if="item" class="slot__icon" :style="{ '--icon-color': iconColor(item.type) }">
          {{ iconChar(item.type) }}
        </span>
        <span v-if="item" class="slot__name">{{ item.name }}</span>
        <span v-if="item && item.count > 1" class="slot__count">×{{ item.count }}</span>
        <span class="slot__key">{{ index + 1 }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ gameState: any; useProp: (i: number) => void }>()
const slots = computed(() => {
  const items = props.gameState.inventory
  return [0, 1, 2].map(i => items[i] ?? null)
})
// ... hint 计算同旧逻辑
// 用单字汉字/符号替代 emoji：
const ICON_MAP = {
  speed:      { char: '走', color: 'moss' },
  invisible:  { char: '霧', color: 'steel' },
  noise:      { char: '騒', color: 'amber' },
  combo:      { char: '連', color: 'vermilion' },
  mace:       { char: '鎚', color: 'ink' },
  bat:        { char: '棒', color: 'ink' },
  frying_pan: { char: '鍋', color: 'ink' },
  ruler:      { char: '尺', color: 'ink' },
}
const iconChar = (t: string) => ICON_MAP[t]?.char ?? '?'
const iconColor = (t: string) => ICON_MAP[t]?.color ?? 'ink'
</script>

<style scoped>
.inventory {
  background: var(--paper-warm);
  background-image: var(--bg-paper-texture);
  padding: var(--sp-3) var(--sp-5);
  border-top: var(--border-double);
}
.inventory__hint {
  font-family: var(--font-mono); font-size: 13px; color: var(--ink-soft);
  margin-bottom: var(--sp-2); letter-spacing: 0.05em;
  min-height: 18px;
}
.hint-line { animation: hint-blink 1.6s var(--ease-office) infinite; }
@keyframes hint-blink { 0%, 70% { opacity: 1; } 85% { opacity: 0.3; } }
.inventory__slots { display: flex; gap: var(--sp-3); }
.slot {
  position: relative; width: 72px; height: 72px;
  background: var(--paper);
  border: var(--border-dashed);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; padding: 0;
  transition: transform 0.12s var(--ease-office);
  font-family: var(--font-body);
}
.slot:not(.slot--empty):not(:disabled) {
  border: var(--border-solid);
  box-shadow: var(--shadow-hard-sm);
}
.slot:not(.slot--empty):hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-hard);
}
.slot:active { transform: translate(1px, 1px); box-shadow: var(--shadow-press); }
.slot--empty { opacity: 0.35; cursor: default; }
.slot--weapon { border-color: var(--vermilion); border-width: 2px; }
.slot--active { animation: slot-active 1s var(--ease-office) infinite; }
@keyframes slot-active {
  0%, 100% { background: var(--paper); }
  50% { background: var(--moss); color: var(--bone); }
}
.slot__icon {
  font-family: var(--font-display); font-size: 28px; font-weight: 700;
  color: var(--ink);
}
.slot__name {
  font-family: var(--font-body); font-size: 10px; color: var(--ink-soft);
  margin-top: 2px;
}
.slot__count {
  position: absolute; top: -6px; left: -6px;
  background: var(--vermilion); color: var(--bone);
  font-family: var(--font-mono); font-size: 12px; line-height: 1;
  padding: 2px 5px; border: 1px solid var(--ink);
}
.slot__key {
  position: absolute; top: 4px; right: 6px;
  font-family: var(--font-mono); font-size: 12px; color: var(--paper-dark);
}
</style>
```

> **设计要点**：图标用单字汉字（走/霧/騒/連/鎚/棒/鍋/尺），而非 emoji。这是"昭和文具印刷感"的核心——字本身就是图形。

### B4.3 StatusTicker —— 底部状态条

**设计**：仿电传打字机/老式终端的状态行。用等宽字体，状态文字像在"打印"出来。敌人状态用色彩区分（normal=灰、warning=琥珀闪烁、danger=朱砂闪烁），不再依赖 emoji。

```vue
<!-- src/components/hud/StatusTicker.vue 关键样式 -->
<style scoped>
.ticker {
  background: var(--ink); color: var(--paper);
  font-family: var(--font-mono); font-size: 14px; letter-spacing: 0.05em;
  padding: var(--sp-2) var(--sp-5);
  border-top: var(--border-double);
  display: flex; gap: var(--sp-5); align-items: center;
  overflow: hidden;
}
.ticker__block { display: flex; align-items: center; gap: var(--sp-2); }
.ticker__key { color: var(--paper-dark); }
.ticker__val { font-weight: bold; }
.val--ready   { color: var(--moss); }
.val--warn    { color: var(--amber-glow); animation: warn-blink 0.8s steps(2) infinite; }
.val--danger  { color: var(--vermilion-bright); animation: danger-blink 0.4s steps(2) infinite; }
.val--combo   { color: var(--amber-glow); animation: combo-shake 0.3s var(--ease-office) infinite; }
@keyframes warn-blink   { 50% { opacity: 0.4; } }
@keyframes danger-blink { 50% { opacity: 0.2; } }
@keyframes combo-shake  { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-1px); } 75% { transform: translateX(1px); } }

/* 敌人状态映射 */
.enemy--normal   .ticker__val { color: var(--paper-dark); }
.enemy--phone    .ticker__val { color: var(--amber-glow); animation: warn-blink 0.6s steps(2) infinite; }
.enemy--looking  .ticker__val { color: var(--vermilion-bright); animation: danger-blink 0.3s steps(2) infinite; }
.enemy--stunned  .ticker__val { color: var(--amber); }
.enemy--meeting  .ticker__val { color: var(--vermilion-bright); }
.enemy--patrol   .ticker__val { color: var(--amber-glow); animation: warn-blink 0.5s steps(2) infinite; }

/* 前置光标，仿终端 */
.ticker__block::before {
  content: '>'; color: var(--moss); margin-right: 4px;
}
</style>
```

### B4.4 ThreatVignette —— 危险/警告边框

**设计**：废弃均匀的 `radial-gradient` 红光。改为屏幕四角的"胶片烧灼"感——四角先变红，再蔓延。配合 CSS `mix-blend-mode: multiply` 让红色咬合进画面而非浮在上面。

```vue
<!-- src/components/hud/ThreatVignette.vue -->
<template>
  <div class="threat" :class="`threat--${level}`" v-if="level !== 'safe'">
    <div class="threat__corner threat__corner--tl" />
    <div class="threat__corner threat__corner--tr" />
    <div class="threat__corner threat__corner--bl" />
    <div class="threat__corner threat__corner--br" />
    <div class="threat__scanline" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ gameState: any }>()
const level = computed(() => {
  const s = props.gameState.enemyState
  if (s === 'looking_back' || s === 'patrolling') return 'danger'
  if (s === 'phone_flashing') return 'warn'
  if (s === 'meeting') return 'meeting'
  return 'safe'
})
</script>

<style scoped>
.threat { position: absolute; inset: 0; pointer-events: none; z-index: 40; mix-blend-mode: multiply; }
.threat__corner {
  position: absolute; width: 120px; height: 120px;
  background: var(--vermilion);
  filter: blur(40px); opacity: 0;
  transition: opacity 0.3s var(--ease-office);
}
.threat__corner--tl { top: -40px; left: -40px; }
.threat__corner--tr { top: -40px; right: -40px; }
.threat__corner--bl { bottom: -40px; left: -40px; }
.threat__corner--br { bottom: -40px; right: -40px; }
.threat--danger .threat__corner { opacity: 0.85; animation: burn 0.6s steps(4) infinite; }
.threat--warn .threat__corner { opacity: 0.5; background: var(--amber); animation: burn 1s steps(4) infinite; }
.threat--meeting .threat__corner { opacity: 0.7; }
@keyframes burn { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }

/* 扫描线，老 CRT 感 */
.threat__scanline {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.15) 2px 3px);
  opacity: 0; animation: scan 0.1s linear infinite;
}
.threat--danger .threat__scanline, .threat--meeting .threat__scanline { opacity: 1; }
@keyframes scan { 0% { transform: translateY(0); } 100% { transform: translateY(3px); } }
</style>
```

### B4.5 OverlayScreens —— 开始/过关/结束三屏

**设计**：仿公司公告板/档案夹。

- **开始屏**：标题用 Reggae One 印章字，竖排日文副标题"是男人就踹他百遍"。操作说明仿"员工守则"表格。
- **过关屏**：仿"考核通过"印章 + 章节卡。
- **结束屏**：胜利=金色徽章；失败=红色"除名通知"印章。

```vue
<!-- 开始屏关键样式 -->
<style scoped>
.start {
  position: absolute; inset: 0;
  background: var(--ink);
  background-image:
    radial-gradient(ellipse at 50% 30%, rgba(244,196,106,0.12), transparent 60%),
    var(--bg-paper-texture);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.start__card {
  background: var(--paper);
  background-image: var(--bg-paper-texture);
  border: var(--border-double);
  box-shadow: 12px 12px 0 var(--vermilion);
  padding: var(--sp-7) var(--sp-7);
  max-width: 540px; width: 90%;
  position: relative;
}
/* 右上角"机密"印章 */
.start__card::before {
  content: '秘'; position: absolute; top: -16px; right: -16px;
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--vermilion); color: var(--bone);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-stamp); font-size: 28px;
  transform: rotate(15deg);
  border: 3px double var(--bone);
  box-shadow: var(--shadow-hard-sm);
}
.start__title {
  font-family: var(--font-stamp); font-size: clamp(28px, 6vw, 48px);
  color: var(--ink); line-height: 1.1; margin-bottom: var(--sp-2);
  letter-spacing: 0.05em;
}
.start__subtitle {
  font-family: var(--font-display); font-size: 14px; color: var(--vermilion);
  writing-mode: vertical-rl; position: absolute; left: -40px; top: var(--sp-7);
  letter-spacing: 0.4em;
}
.start__desc { font-family: var(--font-body); color: var(--ink-soft); margin: var(--sp-4) 0; line-height: 1.8; }
.start__rules {
  border: var(--border-solid); margin: var(--sp-4) 0;
  font-family: var(--font-mono); font-size: 13px;
}
.start__rules-title {
  background: var(--ink); color: var(--paper); padding: var(--sp-2) var(--sp-3);
  font-family: var(--font-display); letter-spacing: 0.2em; font-size: 12px;
}
.start__rule {
  display: flex; justify-content: space-between;
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px dotted var(--paper-dark);
}
.start__rule:last-child { border-bottom: none; }
.start__rule-key { color: var(--vermilion); font-weight: bold; }

.start__btn {
  display: block; width: 100%; margin-top: var(--sp-5);
  background: var(--ink); color: var(--paper);
  border: none; padding: var(--sp-4);
  font-family: var(--font-display); font-size: 18px; letter-spacing: 0.3em;
  cursor: pointer;
  transition: all 0.12s var(--ease-office);
  box-shadow: var(--shadow-hard);
}
.start__btn:hover { background: var(--vermilion); }
.start__btn:active { transform: translate(4px, 4px); box-shadow: var(--shadow-press); }
</style>
```

```html
<!-- 开始屏模板（结构示意） -->
<div class="start">
  <article class="start__card">
    <span class="start__subtitle">是男人就踹他百遍</span>
    <h1 class="start__title">是男人就<br>踹他一百下</h1>
    <p class="start__desc">某栋昏黄办公楼的深夜，那位"神人"又在那里指点江山。<br>趁他低头，悄悄靠近——踹。</p>
    <div class="start__rules">
      <div class="start__rules-title">员 工 守 则</div>
      <div class="start__rule"><span>移动</span><span class="start__rule-key">W A S D</span></div>
      <div class="start__rule"><span>踹击（一米内）</span><span class="start__rule-key">左 键</span></div>
      <div class="start__rule"><span>蓄力投掷武器</span><span class="start__rule-key">右 键</span></div>
      <div class="start__rule"><span>键盘挡脸（5秒）</span><span class="start__rule-key">空 格</span></div>
      <div class="start__rule"><span>使用道具</span><span class="start__rule-key">1 / 2 / 3</span></div>
      <div class="start__rule"><span>注：开会时攻击无效，武器将被没收</span><span class="start__rule-key">！</span></div>
    </div>
    <button class="start__btn">上 工</button>
  </article>
</div>
```

## B5. 武器与道具的 3D 视觉规范

不仅是 HUD，3D 场景内的武器/道具也要符合昭和 Office 怪谈：

| 道具 | 旧视觉 | 新视觉规范 |
|---|---|---|
| 狼牙棒 mace | 程序化几何 | 钉满图钉的橡胶锤（办公化改造），PBR：黑色橡胶 + 银色钉 |
| 棒球棒 bat | 程序化几何 | 缠满透明胶带的拖把杆，材质偏黄旧木 |
| 平底锅 frying_pan | 程序化几何 | 办公室不锈钢烟灰缸（倒扣当武器） |
| 戒尺 ruler | 程序化几何 | 老式木尺，刻度清晰，泛黄 |
| 加速鞋 speed | 👟 emoji | 3D 内一双老式黑皮鞋，HUD 用"走"字 |
| 隐身药水 invisible | 🧪 emoji | 3D 内一只咖啡杯冒热气，HUD 用"霧"字 |
| 噪音器 noise | 📢 emoji | 3D 内一只老式手摇铃，HUD 用"騒"字 |
| 连击手套 combo | 🥊 emoji | 3D 内一副劳保手套，HUD 用"連"字 |

**抛射物颜色**（Projectile 材质）：
- mace → `#1a1a1a` 黑 + 银钉高光
- bat → `#8b6f3a` 旧木黄
- frying_pan → `#9a9a9a` 不锈钢
- ruler → `#c8902c` 蜜蜡黄

## B6. 3D 场景视觉规范（OfficeLevel 实现指引）

### 光照（推翻现有"蓝天白云"）

**当前 `SceneManager` 的问题**：`scene.background = 0x87CEEB`（天蓝）、`Fog(0x87CEEB)`——这是户外晴天，完全不符合"深夜办公室"。

**新规范**：
```typescript
// OfficeLevel.ts
scene.clearColor = Color3.FromHexString('#0d0805')     // 近黑暖褐
scene.ambientColor = Color3.FromHexString('#3a2a1f')
scene.fogMode = Scene.FOGMODE_EXP2
scene.fogColor = Color3.FromHexString('#1a1410')
scene.fogDensity = 0.012

// 主光：头顶白炽灯，暖橙、点光源
const lamp = new PointLight('lamp', new Vector3(0, 7, 0), scene)
lamp.diffuse = Color3.FromHexString('#f4c46a')         // 暖灯泡
lamp.intensity = 0.9
lamp.range = 25

// 环境光：半球光，地面反射棕色
const hemi = new HemisphericLight('hemi', Vector3.Up(), scene)
hemi.diffuse = Color3.FromHexString('#5a4a3a')
hemi.groundColor = Color3.FromHexString('#2a1f15')
hemi.intensity = 0.35

// 补光：窗外微弱蓝月光（冷色对比）
const moon = new DirectionalLight('moon', new Vector3(0.3, -1, 0.4), scene)
moon.diffuse = Color3.FromHexString('#3a4a6a')
moon.intensity = 0.15

// 阴影
const shadowGen = new ShadowGenerator(1024, lamp)
shadowGen.useBlurExponentialShadowMap = true
shadowGen.blurKernel = 16
shadowGen.darkness = 0.6
```

### 地面与墙面

- **地面**：油毡地板质感，深棕 `#3a2a1f`，`roughness=0.9`，加程序化方格纹理（仿油毡拼花）
- **墙面**：泛黄壁纸 `#a8946a`，`roughness=1.0`，可加竖条纹 NormalMap
- **踢脚线**：深褐木质 `#2b241a`，10cm 高

### 后处理（已在 EngineContext 配置）

- ACES Tone Mapping + 曝光 1.1
- 对比度 1.15（强化明暗）
- Vignette（暗角，weight=2.5）
- Film Grain（颗粒，level=8）—— 强化胶片质感
- FXAA

### 命中粒子（替换 `createVictoryParticles`）

废弃 `THREE.Points` 手写。用 Babylon `ParticleSystem`，但配色与美学一致：

```typescript
const ps = new ParticleSystem('hit', 80, scene)
ps.particleTexture = dotTexture            // 一个白色小圆点 texture（程序化生成）
ps.emitter = hitPosition.clone()
ps.minEmitBox = new Vector3(-0.2, -0.2, -0.2)
ps.maxEmitBox = new Vector3(0.2, 0.2, 0.2)
// 颜色：朱砂 + 琥珀 + 骨白 三色随机
ps.color1 = Color4.FromHexString('#C1351CFF')
ps.color2 = Color4.FromHexString('#F4C46AFF')
ps.color3 = Color4.FromHexString('#CFC4A8FF')
ps.colorDead = Color4.FromHexString('#14110D00')
ps.minSize = 0.05; ps.maxSize = 0.15
ps.minLifeTime = 0.3; ps.maxLifeTime = 0.8
ps.minEmitPower = 2; ps.maxEmitPower = 5
ps.direction1 = new Vector3(-1, 2, -1)
ps.direction2 = new Vector3(1, 4, 1)
ps.gravity = new Vector3(0, -9.8, 0)
ps.blendMode = ParticleSystem.BLENDMODE_STANDARD
ps.start()
ps.targetStopDuration = 0.3
```

### 屏幕震动（保留但收敛）

旧版每次踹都全屏抖。新规范：**仅命中瞬间**抖动，幅度按伤害分级：
- 普通踢（damage 1）：抖动 80ms，位移 2px
- 武器挥砍（damage 3+）：抖动 120ms，位移 4px
- 巡逻发现：不抖，改用 ThreatVignette 烧灼

```typescript
// Game.vue 的 triggerShake 改为分级
const triggerShake = (intensity: 'light' | 'heavy') => {
  shakeIntensity.value = intensity
  isShaking.value = true
  setTimeout(() => { isShaking.value = false }, intensity === 'heavy' ? 120 : 80)
}
```

## B7. 动效总规范

| 时机 | 动效 | 曲线/时长 |
|---|---|---|
| HUD 元素入场 | 从下方滑入 + 淡入 | `ease-stamp` 0.4s，stagger 0.05s |
| 道具槽 hover | 左上位移 2px，阴影变深 | `ease-office` 0.12s |
| 道具槽按下 | 右下位移 1px，inset 阴影 | 即时 |
| 道具激活 | 背景苔绿闪烁 | `ease-office` 1s loop |
| 警告状态（phone） | 琥珀色 step blink | 0.6s steps(2) |
| 危险状态（looking） | 朱砂色快速 step blink | 0.3s steps(2) |
| 踹中瞬间 | 屏幕抖动 + 命中粒子 | 80–120ms |
| 过关 | 印章盖下动画（缩放+旋转+模糊） | `ease-stamp` 0.6s |
| 游戏结束 | 红色"除名"印章 + 全屏暗角加深 | `ease-stamp` 0.8s |

**禁止的动效**：
- ❌ 所有元素统一的 `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性
- ❌ 持续脉冲呼吸（除非是激活/警告状态）
- ❌ hover scale 1.05 这种 SaaS 式放大

## B8. 移动端适配要点

- TopBar 在 `<768px` 改为两行（健康+关卡一行，计分一行）
- 道具槽尺寸 72px → 56px
- StatusTicker 字号 14px → 12px，可横向滚动
- 触屏：增加虚拟摇杆（左下）+ 踹击/投掷按钮（右下），样式用同样的硬边框美学

## B9. 视觉验收清单

- [ ] 全站无任何紫色（`grep -ri "#667eea\|#764ba2\|purple\|紫" src/` 为空）
- [ ] 无任何 emoji 出现在 `<button>`/icon 位置（文案内可有少量）
- [ ] 所有颜色来自 `theme.css` 变量（`grep` 检查 `#[0-9a-f]{3,6}` 硬编码）
- [ ] 字体加载成功，标题为 Reggae One，数字为 VT323
- [ ] 场景背景为暖褐暗调，非蓝天
- [ ] 命中时有朱砂/琥珀粒子，非彩虹色
- [ ] 开始屏像"员工守则/机密档案"，非 SaaS 落地页
- [ ] 桌面端 60fps，移动端 30fps+

---

# 附录：执行顺序建议

为 agent 分阶段执行（每阶段可独立提交、独立验收）：

1. **基础设施**：建 `theme.css` + `src/babylon/core/`（EngineContext、PhysicsBootstrap）→ 验收：黑屏能跑、Inspector 可开
2. **场景重建**：`OfficeLevel.ts` 按 B6 打光 + 加载 7 个家具 GLB → 验收：昏黄办公室可见
3. **Player 迁移**：GLB 角色 + 移动 + 骨骼动画 → 验收：可操控走动
4. **HUD 重做**：拆 `Game.vue` 为 TopBar/InventoryBar/StatusTicker/ThreatVignette/OverlayScreens，全部按 Part B 实现 → 验收：无紫色、视觉符合 B2 定调
5. **Enemy + FSM**：6 状态逐个迁移 + 数值回归 → 验收：A7 数值全绿
6. **物理系统**：Projectile + CollisionSystem → 验收：抛射与命中手感一致
7. **收尾**：删除 `src/game/`、删除 three/fbx 依赖、FBX→GLB 转换 → 验收：`pnpm build` 通过、包体积达标

**每完成一阶段，运行 `pnpm build` 确认类型通过，再进入下一阶段。**
