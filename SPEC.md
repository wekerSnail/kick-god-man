# Spec: 奖励神人彩蛋模式 (Easter Egg Shooting Mode)

## Objective

每关完成进入结算过渡画面时，新增"奖励神人"按钮。点击后进入 30 秒限时 FPS 射击彩蛋模式：玩家以第一人称视角（只看到右手+武器），用随机刷新的枪/火箭炮/手榴弹攻击来回走动的 Boss，30 秒后回到过渡画面。

### 用户故事

1. 作为玩家，打完一关后在结算画面看到"奖励神人"按钮，点击进入彩蛋模式
2. 作为玩家，在彩蛋模式中以 FPS 视角看到自己的右手和武器
3. 作为玩家，左键点击攻击，枪可以按住连射，火箭炮/手榴弹有爆炸效果
4. 作为玩家，看到 Boss 在房间左右走动，被击中有不同反应
5. 作为玩家，在 30 秒倒计时内尽可能多地攻击 Boss
6. 作为玩家，倒计时结束后回到过渡画面，可以再次选择"奖励神人"或"下一局"

### 验收标准

- [ ] 过渡画面（OverlayScreens transition screen）出现"奖励神人"按钮
- [ ] 点击后进入彩蛋模式，相机切换为 FPS 视角，只看到右手+武器
- [ ] 武器从 kenney_blaster-kit GLB 模型中随机选择，定时切换
- [ ] 三种武器类型：枪（blaster）、火箭炮（scope 系列）、手榴弹（grenade）
- [ ] 枪：左键点击单发，按住连射（射速约 5 发/秒）
- [ ] 火箭炮：发射抛射物，命中后产生粒子爆炸效果，Boss 眩晕 3s
- [ ] 手榴弹：抛物线投掷，落地后延迟爆炸（约 1s），产生粒子爆炸效果，Boss 眩晕 3s
- [ ] Boss 在房间内左右来回走动
- [ ] Boss 被枪击中原地抖动+停止移动+随机吐槽
- [ ] Boss 被火箭炮/手榴弹击中进入眩晕状态 3s
- [ ] 30 秒倒计时 HUD 显示
- [ ] 30 秒结束后退出彩蛋模式，回到过渡画面
- [ ] 不影响主游戏流程（退出彩蛋后可以正常进入下一关）

## Tech Stack

- **Engine**: Babylon.js 9 (`@babylonjs/core`)
- **UI Framework**: Vue 3 + TypeScript
- **Language**: TypeScript (strict, `noUnusedLocals`, `verbatimModuleSyntax`)
- **Assets**: Kenney Blaster Kit 2.1 GLB models (`src/assets/kenney_blaster-kit_2.1/`)
- **Particles**: Babylon.js `ParticleSystem` for explosions
- **Build**: Vite + `vue-tsc`

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server on port 3000
pnpm build            # Type check + Vite build (type errors block build)
pnpm preview          # Preview production build
```

## Project Structure

新文件和修改文件清单：

```
src/babylon/
├── easter-egg/
│   ├── EasterEggMode.ts          # [NEW] 彩蛋模式主控制器（生命周期、状态管理、30s倒计时）
│   ├── FirstPersonCamera.ts      # [NEW] FPS 相机控制（保存/恢复相机、跟随Boss方向）
│   ├── RightHand.ts              # [NEW] 右手模型（player.glb骨骼、隐藏身体、attach武器）
│   ├── EasterEggWeapons.ts       # [NEW] 武器系统（GLB加载、枪/火箭炮/手榴弹射击逻辑）
│   ├── EasterEggBoss.ts          # [NEW] Boss行为（传送中央、左右走动、受击抖动/眩晕、吐槽）
│   ├── EasterEggExplosion.ts     # [NEW] 爆炸粒子效果（火焰+烟雾+冲击波）
│   └── EasterEggHUD.ts           # [NEW] 倒计时HUD（DynamicTexture + billboardMode）
├── core/
│   └── AssetManager.ts           # [MODIFY] 添加 blaster-kit GLB prop 加载方法
├── entities/
│   └── Enemy.ts                  # [MODIFY] 添加 onEasterEggHit()、吐槽台词、抖动方法
├── GameLoop.ts                   # [MODIFY] 集成彩蛋模式（startEasterEgg/stopEasterEgg/update）
└── systems/
    └── LevelManager.ts           # [无修改] 仅触发 transition，不涉及彩蛋逻辑

src/components/
├── Game.vue                      # [MODIFY] 添加 easterEgg 状态、事件处理、overlay 判断
└── hud/
    └── OverlayScreens.vue        # [MODIFY] transition screen 添加"奖励神人"按钮+emit

src/types/
└── game.ts                       # [MODIFY] 添加 EasterEggWeaponType、EasterEggState、台词数组
```

## Code Style

遵循项目现有风格：

```typescript
// 文件头部 import — import type 用于类型
import type { Scene, TransformNode } from '@babylonjs/core'
import { Vector3 } from '@babylonjs/core'

// 类 — PascalCase，每个类负责一个职责
export class EasterEggMode {
  private _isActive = false
  private _timeRemaining = 30
  private _weaponSwitchTimer = 0

  // 方法 — camelCase，私有方法用 _ 前缀
  start(scene: Scene): void {
    this._isActive = true
    this._timeRemaining = 30
  }

  update(delta: number): void {
    if (!this._isActive) return
    this._timeRemaining -= delta
    // ...
  }
}

// 事件 — 通过 EventBus 解耦
// 状态枚举 — 放在 game.ts 中
export type EasterEggWeaponType = 'gun' | 'rocket' | 'grenade'
```

**关键约定**：
- `import type` 用于纯类型导入（`verbatimModuleSyntax`）
- 私有成员用 `_` 前缀
- 每个新类一个文件，职责单一
- 常量用 `readonly` 或 `as const`

## Testing Strategy

- **手动测试为主**：本项目无自动化测试框架，通过 `pnpm dev` 手动验证
- **验证清单**：
  1. 每关完成后过渡画面显示"奖励神人"按钮
  2. 点击按钮进入 FPS 模式，只看到右手+武器
  3. 三种武器切换正常，射击效果符合预期
  4. Boss 走动、受击反应、吐槽台词正常
  5. 倒计时结束后正常退出
  6. 退出后可以正常进入下一关
  7. `pnpm build` 无类型错误

## Boundaries

### Always do
- 每次修改后运行 `pnpm build` 确认无类型错误
- 使用 `import type` 导入纯类型（`verbatimModuleSyntax`）
- 遵循现有代码风格（PascalCase 类名、`_` 前缀私有成员）
- 爆炸效果用 Babylon.js ParticleSystem（不依赖外部纹理）
- GLB 模型通过 AssetManager 加载和缓存

### Ask first
- 修改 Enemy.ts 的现有状态机逻辑（影响主游戏）
- 修改 GameLoop.ts 的 update 循环签名
- 添加新的 npm 依赖
- 修改 vite.config.ts 或 tsconfig.json

### Never do
- 不编辑 `src/game/` 目录（死代码）
- 不修改公共 API 签名（`onStateChange` 回调）
- 不硬编码 GLB 路径（用 AssetManager）
- 不在彩蛋模式中修改主游戏的关卡进度或分数

## Implementation Plan

### Phase 1: 类型定义 + 主控制器

**Task 1: 类型定义** — [game.ts](src/types/game.ts)
- 添加 `EasterEggWeaponType = 'gun' | 'rocket' | 'grenade'`
- 添加 `EasterEggState` 接口（isActive, timeRemaining, currentWeaponType, bossShaking, bossStunned）
- 添加彩蛋武器配置常量（GLB 路径、伤害、射速等）
- 添加 Boss 吐槽台词数组

**Task 2: EasterEggMode 主控制器** — [EasterEggMode.ts](src/babylon/easter-egg/EasterEggMode.ts) [NEW]
- 管理生命周期：`start()`, `stop()`, `update(delta)`
- 30 秒倒计时逻辑
- 定时切换武器（每 5-8 秒随机）
- 协调子系统：RightHand, EasterEggWeapons, EasterEggBoss, EasterEggExplosion
- 返回过渡画面的回调

**Task 3: GameLoop 集成** — [GameLoop.ts](src/babylon/GameLoop.ts)
- 添加 `isEasterEgg` / `easterEggTimeRemaining` 状态
- 添加 `startEasterEgg()` / `stopEasterEgg()` 方法
- update 循环中条件调用 EasterEggMode.update()
- 状态桥接到 Vue（onStateChange 中添加 easterEgg 字段）
- 暂停/恢复主游戏逻辑（player 输入、enemy AI、props 生成）

### Phase 2: FPS 相机 + 右手模型

**Task 4: FPS 相机** — [FirstPersonCamera.ts](src/babylon/easter-egg/FirstPersonCamera.ts) [NEW]
- 进入彩蛋模式时：保存当前相机状态 → 切换到 FPS 视角
- 相机位置：右手位置 + 小偏移（模拟头部位置）
- 相机朝向：跟随 Boss 方向（左右 lerp）
- 退出时恢复原相机

**Task 5: 右手模型** — [RightHand.ts](src/babylon/easter-egg/RightHand.ts) [NEW]
- 加载 player.glb（通过 AssetManager）
- 遍历骨骼，找到 RightHand bone（或右手附近的骨骼）
- 隐藏身体所有 mesh，只保留右手骨骼
- 在右手骨骼上 attach 武器模型
- `switchWeapon(type)` 方法：卸下旧武器 → 加载新 GLB → attach 到右手
- 手臂轻微晃动（idle animation）

### Phase 3: 武器系统 + 爆炸效果

**Task 6: 武器系统** — [EasterEggWeapons.ts](src/babylon/easter-egg/EasterEggWeapons.ts) [NEW]
- 三种武器的 GLB 模型加载（gun: blaster-a, rocket: scope-large-a, grenade: grenade-a）
- 射击逻辑：
  - **枪**：左键点击 = 单发；按住 = 连射（5 发/秒间隔）
  - **火箭炮**：左键点击 = 发射直线抛射物
  - **手榴弹**：左键点击 = 向前方抛物线投掷（重力 -9.8）
- 枪弹道轨迹：粒子系统模拟子弹飞行轨迹（短线段粒子）
- 手榴弹瞄准辅助：抛物线预览（用多个小球显示预测轨迹）
- 命中检测：distance-based，与 Boss 位置比较

**Task 7: 爆炸效果** — [EasterEggExplosion.ts](src/babylon/easter-egg/EasterEggExplosion.ts) [NEW]
- `createExplosion(position)` 方法
- 火焰粒子：橙红色，向外扩散，短寿命（0.5s）
- 烟雾粒子：灰色，向上飘散，较长寿命（1.5s）
- 冲击波效果：缩放的透明球体
- 音效：射击/爆炸音效（方便就做，暂时不强制 — AudioManager 当前无加载的音效文件）

### Phase 4: Boss 彩蛋行为

**Task 8: Boss 行为** — [EasterEggBoss.ts](src/babylon/easter-egg/EasterEggBoss.ts) [NEW]
- 进入时：Boss 传送到房间中央 (0, 0, -5)
- 左右来回走动：简单线性移动，到边界折返（x: -6 到 6）
- 受击反应：
  - 枪击中 → 停止移动 0.5s + 抖动效果（position offset 随机）+ 随机吐槽台词
  - 火箭炮/手榴弹击中 → 眩晕 3s（StunnedState，显示 stun indicator）
- 走动速度：2 单位/秒
- 抖动实现：`mesh.position.x += Math.sin(time * 50) * 0.05` 持续 0.5s

**Task 9: Boss 吐槽台词**
- 参考 MeetingState 风格的办公室吐槽语句（10-15 条）
- 通过 Enemy.showDialogue() 显示
- 示例：
  - "这需求不合理！"
  - "我要找 PM 理论！"
  - "这 bug 不是我写的！"
  - "让我先喝杯咖啡..."
  - "能不能先对齐一下？"
  - "这个排期太紧了！"
  - "我要请假！"
  - "别打了，我认输还不行吗！"

### Phase 5: UI + 集成

**Task 10: OverlayScreens.vue 修改** — [OverlayScreens.vue](src/components/hud/OverlayScreens.vue)
- Transition screen 添加"奖励神人 🎁"按钮
- 按钮样式：与现有 .btn 一致，可加不同颜色区分（如 amber 色）
- 新增 emit: `easterEgg`

**Task 11: 倒计时 HUD** — [EasterEggHUD.ts](src/babylon/easter-egg/EasterEggHUD.ts) [NEW]
- DynamicTexture 渲染倒计时文字
- 挂载在 Plane mesh 上，billboardMode = ALL
- 显示格式："⏱ XX.Xs"（秒数保留一位小数）
- 位置：屏幕上方中央
- 最后 5 秒变红警告

**Task 12: Game.vue 集成** — [Game.vue](src/components/Game.vue)
- 添加 `isEasterEgg` / `easterEggTime` 到 gameState
- overlayScreen 计算属性：增加 `'easterEgg'` 状态（彩蛋模式期间隐藏所有 overlay）
- 传递 `@easterEgg` 事件到 OverlayScreens
- 处理 easterEgg 开始/结束逻辑

### 依赖关系图

```
Task 1 (types) → Task 2 (主控制器) → Task 12 (Game.vue)
                    ↓
              Task 4 (FPS相机) ← Task 5 (右手模型)
                    ↓
              Task 6 (武器系统) ← Task 7 (爆炸效果)
                    ↓
              Task 8 (Boss行为) ← Task 9 (台词)
                    ↓
              Task 10 (按钮UI) → Task 11 (倒计时HUD)
```

## 验证检查点

1. **Phase 1 完成后**：`pnpm build` 无类型错误，过渡画面出现"奖励神人"按钮
2. **Phase 2 完成后**：点击按钮进入 FPS 模式，能看到右手+武器，Boss 在房间走动
3. **Phase 3 完成后**：三种武器射击正常，弹道/爆炸效果可见
4. **Phase 4 完成后**：Boss 受击反应正常（抖动、吐槽、眩晕）
5. **Phase 5 完成后**：倒计时 HUD 显示，30 秒后正常退出回到过渡画面

## Resolved Questions

1. **Boss 初始位置**：进入彩蛋模式时 Boss 传送到房间中央开始走动。
2. **子弹可视化**：枪发射的子弹需要可见弹道效果（粒子轨迹）。
3. **手榴弹投掷**：向前方投掷，需要抛物线瞄准辅助线。
4. **音效**：射击/爆炸音效方便就做，暂时不强制。
5. **Boss 吐槽台词**：参考 MeetingState 风格，自行设计。
