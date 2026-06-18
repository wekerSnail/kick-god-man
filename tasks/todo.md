# Task List: 奖励神人彩蛋模式

## Phase 1: 基础架构（入口流程）

---

### Task 1: 类型定义 ✅

**Description:** 在 game.ts 中添加彩蛋模式所需的类型定义、武器配置常量和 Boss 吐槽台词数组。

**Acceptance criteria:**
- [x] 添加 `EasterEggWeaponType = 'gun' | 'rocket' | 'grenade'` 类型
- [x] 添加 `EasterEggState` 接口（isActive, timeRemaining, currentWeaponType）
- [x] 添加 `EASTER_EGG_WEAPONS` 配置数组（GLB 路径、伤害值、射速等）
- [x] 添加 `EASTER_EGG_DIALOGUES` 吐槽台词数组（15 条办公室风格）
- [x] 所有导出使用 `export` 关键字

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** None

**Files touched:**
- `src/types/game.ts`

---

### Task 2: EasterEggMode 主控制器 ✅

**Description:** 创建彩蛋模式主控制器，管理生命周期（start/stop/update）、30 秒倒计时、定时切换武器（每 5-8 秒）、协调子系统。

**Acceptance criteria:**
- [x] `start(onComplete)` 方法：初始化所有子系统，启动 30s 倒计时
- [x] `stop()` 方法：清理所有子系统，恢复场景状态
- [x] `update(delta)` 方法：更新倒计时、检查武器切换、更新子系统
- [x] 30 秒倒计时逻辑正确（timeRemaining 从 30 递减到 0）
- [x] 定时切换武器逻辑（每 5-8 秒随机选择新武器类型）
- [x] 当 timeRemaining <= 0 时自动调用 stop()
- [x] 导出 `EasterEggMode` 类

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 1

**Files touched:**
- `src/babylon/easter-egg/EasterEggMode.ts` [NEW]

---

### Task 3: GameLoop 集成 ✅

**Description:** 在 GameLoop 中集成彩蛋模式：添加状态字段、startEasterEgg/stopEasterEgg 方法、update 循环中调用 EasterEggMode.update()、暂停/恢复主游戏逻辑。

**Acceptance criteria:**
- [x] 添加 `private easterEggMode: EasterEggMode | null` 字段
- [x] 添加 `private isEasterEgg = false` 状态标志
- [x] `startEasterEgg()` 方法：创建 EasterEggMode，调用 start()，设置 isEasterEgg=true
- [x] `stopEasterEgg()` 方法：调用 easterEggMode.stop()，设置 isEasterEgg=false，清理引用
- [x] `update()` 中：当 isEasterEgg=true 时调用 easterEggMode.update(delta)，跳过主游戏逻辑
- [x] `onStateChange` 回调中传递 `isEasterEgg` 和 `easterEggTimeRemaining` 字段

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 2

**Files touched:**
- `src/babylon/GameLoop.ts`

---

### Task 4: OverlayScreens 按钮 ✅

**Description:** 在 OverlayScreens.vue 的 transition screen 中添加"奖励神人 🎁"按钮，使用 amber 色样式区分。

**Acceptance criteria:**
- [x] transition screen 中新增第二个按钮"奖励神人 🎁"
- [x] 按钮样式：amber 渐变色，与现有 `.btn` 风格一致
- [x] 点击按钮 emit `easterEgg` 事件
- [x] 两个按钮上下排列，视觉和谐
- [x] defineEmits 中添加 `easterEgg: []`

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 1

**Files touched:**
- `src/components/hud/OverlayScreens.vue`

---

### Task 5: Game.vue 事件桥接 ✅

**Description:** 在 Game.vue 中处理彩蛋模式的完整生命周期：接收 easterEgg 事件、调用 gameLoop.startEasterEgg()、处理状态更新、30s 后自动回到过渡画面。

**Acceptance criteria:**
- [x] `DEFAULT_STATE()` 中添加 `isEasterEgg: false` 和 `easterEggTimeRemaining: 0`
- [x] `overlayScreen` 计算属性：当 `isEasterEgg=true` 时返回 `'none'`
- [x] 新增 `startEasterEgg()` 方法：调用 `gameLoop?.startEasterEgg()`
- [x] OverlayScreens 组件添加 `@easter-egg="startEasterEgg"` 事件监听
- [x] 彩蛋模式结束时自动恢复 `isLevelTransition=true` 状态

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 3, Task 4

**Files touched:**
- `src/components/Game.vue`

---

### Checkpoint 1: 入口流程 ✅
- [x] `pnpm build` 无类型错误
- [x] 过渡画面显示"奖励神人"按钮
- [x] 点击后游戏暂停，30s 后自动恢复
- [x] 退出后可正常进入下一关

---

## Phase 2: FPS 视觉 + Boss 走动

---

### Task 6: FPS 相机 ✅

**Description:** 创建 FPS 相机控制器，进入彩蛋模式时切换为第一人称视角，退出时恢复原等距视角。

**Acceptance criteria:**
- [x] `enter(playerPosition, bossPosition)` 方法：保存当前相机状态，切换到 FPS 视角
- [x] 相机位置：玩家右手位置 + 小偏移（模拟头部，约 y+1.6）
- [x] 相机朝向：初始看向 Boss 方向
- [x] `update(bossPosition, delta)` 方法：相机跟随 Boss 方向 lerp
- [x] `exit()` 方法：恢复原相机位置和 target
- [x] 相机 FOV 调整为 70 度（FPS 标准）

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 2

**Files touched:**
- `src/babylon/easter-egg/FirstPersonCamera.ts` [NEW]

---

### Task 7: 右手模型 ✅

**Description:** 创建右手模型管理器，加载 player.glb 模型，隐藏身体只显示右手，在右手骨骼上 attach 武器模型。

**Acceptance criteria:**
- [x] 加载 player.glb 模型（通过 AssetManager）
- [x] 遍历骨骼找到右手骨骼（支持 Mixamo 命名）
- [x] 隐藏身体所有 mesh，只保留右手相关 mesh
- [x] 在右手骨骼上 attach 武器节点
- [x] `switchWeapon(type)` 方法：卸下旧武器 → attach 新武器
- [x] 手臂轻微晃动（idle 动画）

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 2

**Files touched:**
- `src/babylon/easter-egg/RightHand.ts` [NEW]

---

### Task 8: Boss 彩蛋行为 ✅

**Description:** 创建 Boss 彩蛋行为控制器，进入时传送到房间中央，左右来回走动，支持受击反应（抖动、眩晕）。

**Acceptance criteria:**
- [x] `activate()` 方法：Boss 传送到房间中央 (0, 0, -5)
- [x] `update(delta)` 方法：Boss 在 x 轴 -6 到 6 范围内左右来回走动
- [x] 走动速度：2 单位/秒
- [x] 到达边界时自动折返
- [x] `onHitByGun()` 方法：停止移动 0.5s + 抖动效果 + 随机吐槽
- [x] `onHitByExplosion()` 方法：停止移动 3s + 显示眩晕指示器
- [x] 抖动/眩晕结束后自动恢复走动

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 1

**Files touched:**
- `src/babylon/easter-egg/EasterEggBoss.ts` [NEW]

---

### Checkpoint 2: 视觉骨架 ✅
- [x] 进入彩蛋模式后相机切换为 FPS 视角
- [x] 右手模型可见，持有武器
- [x] Boss 在房间中央出现并左右走动
- [x] 退出后相机恢复正常等距视角

---

## Phase 3: 射击玩法

---

### Task 9: 枪射击系统 ✅

**Description:** 实现枪（blaster）的射击逻辑：左键单发、按住连射（5 发/秒）、弹道轨迹粒子、命中检测。

**Acceptance criteria:**
- [x] 枪射击：左键点击发射一颗子弹
- [x] 连射：按住左键每 0.2 秒发射一颗（5 发/秒）
- [x] 弹道轨迹：子弹飞行路径上有可见的粒子轨迹
- [x] 子弹速度：快速直线飞行（约 50 单位/秒）
- [x] 命中检测：distance-based，子弹到达 Boss 位置附近时判定命中
- [x] 命中后：子弹消失，触发 Boss.onHitByGun()
- [x] 子弹超出房间范围自动销毁

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 7

**Files touched:**
- `src/babylon/easter-egg/EasterEggWeapons.ts` [NEW]

---

### Task 10: 火箭炮 + 手榴弹 ✅

**Description:** 实现火箭炮和手榴弹的射击逻辑：火箭炮直线抛射物+爆炸，手榴弹抛物线投掷+延迟爆炸。

**Acceptance criteria:**
- [x] **火箭炮**：左键点击发射直线抛射物，速度约 30 单位/秒
- [x] 火箭炮命中 Boss → 爆炸 + Boss 眩晕 3s
- [x] **手榴弹**：左键点击向前方抛物线投掷（重力 -9.8）
- [x] 手榴弹落地后延迟 1 秒爆炸
- [x] 手榴弹爆炸范围内命中 Boss → Boss 眩晕 3s
- [x] 手榴弹抛物线瞄准辅助线：用多个小球显示预测轨迹

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 9

**Files touched:**
- `src/babylon/easter-egg/EasterEggWeapons.ts` [MODIFY]

---

### Task 11: 爆炸效果 ✅

**Description:** 创建爆炸粒子效果系统，用于火箭炮和手榴弹的爆炸视觉。

**Acceptance criteria:**
- [x] `createExplosion(position)` 方法：在指定位置创建爆炸效果
- [x] 火焰粒子：橙红色，向外扩散，短寿命（0.3-0.5s）
- [x] 烟雾粒子：灰色，向上飘散，较长寿命（0.8-1.5s）
- [x] 冲击波效果：缩放的透明球体，快速放大同时透明度降低
- [x] 使用 Babylon.js ParticleSystem，不依赖外部纹理

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 10

**Files touched:**
- `src/babylon/easter-egg/EasterEggExplosion.ts` [NEW]

---

### Checkpoint 3: 基础射击 ✅
- [x] 枪可以射击，有弹道轨迹
- [x] 子弹命中 Boss 有反应（抖动 + 吐槽）
- [x] 按住左键连射正常（5 发/秒）

### Checkpoint 4: 完整武器 ✅
- [x] 三种武器（枪/火箭炮/手榴弹）射击正常
- [x] 定时切换武器（每 5-8 秒）
- [x] 火箭炮/手榴弹爆炸效果可见
- [x] Boss 被爆炸击中眩晕 3s
- [x] 手榴弹抛物线瞄准辅助线可见

---

## Phase 4: UI 打磨 + 集成

---

### Task 12: 倒计时 HUD ✅

**Description:** 创建倒计时 HUD，使用 DynamicTexture 渲染倒计时文字，挂载在 Plane mesh 上。

**Acceptance criteria:**
- [x] DynamicTexture 渲染倒计时文字 "⏱ XX.Xs"（秒数保留一位小数）
- [x] 挂载在 Plane mesh 上，billboardMode = BILLBOARDMODE_ALL
- [x] 位置：屏幕上方中央（约 y=4，z=-5）
- [x] 最后 5 秒文字变红警告
- [x] `update(timeRemaining)` 方法：更新显示内容
- [x] `dispose()` 方法：清理资源

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 2

**Files touched:**
- `src/babylon/easter-egg/EasterEggHUD.ts` [NEW]

---

### Task 13: Boss 吐槽台词 ✅

**Description:** Boss 吐槽台词系统，Boss 被击中时显示随机吐槽台词。

**Acceptance criteria:**
- [x] 15 条办公室风格吐槽台词
- [x] 台词存储在 `EASTER_EGG_DIALOGUES` 数组中
- [x] Boss 被击中时随机选择一条台词显示
- [x] 通过 Enemy.showDialogue() 方法显示
- [x] 每条台词显示 2 秒后自动消失
- [x] 同一台词短时间内不重复

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** Task 1

**Files touched:**
- `src/types/game.ts` (台词数组在 Task 1 中已添加)
- `src/babylon/easter-egg/EasterEggBoss.ts` (台词逻辑在 Task 8 中已实现)

---

### Task 14: 完整流程验证 ✅

**Description:** 端到端集成所有子系统，确保完整流程可用。

**Acceptance criteria:**
- [x] EasterEggMode 集成所有子系统（FirstPersonCamera, RightHand, EasterEggWeapons, EasterEggBoss, EasterEggExplosion, EasterEggHUD）
- [x] GameLoop 正确传递 camera 给 EasterEggMode
- [x] 射击输入通过 mousedown/mouseup 事件注册
- [x] `pnpm build` 无类型错误
- [x] 无 console.error 或未捕获异常

**Verification:**
- [x] Build succeeds: `pnpm build`

**Dependencies:** All previous tasks

**Files touched:**
- `src/babylon/easter-egg/EasterEggMode.ts` [MODIFY]
- `src/babylon/GameLoop.ts` [MODIFY]

---

### Checkpoint 5: 完成 ✅
- [x] 倒计时 HUD 显示，最后 5 秒变红
- [x] Boss 吐槽台词丰富（15 条）
- [x] `pnpm build` 无类型错误
- [x] 完整流程集成：过关 → 奖励神人 → 30s射击 → 回到过渡画面 → 下一关
- [x] 不修改 src/game/ 目录（死代码）
