# Implementation Plan: 奖励神人彩蛋模式

## Overview

实现一个 30 秒限时 FPS 射击彩蛋模式。每关完成后过渡画面新增"奖励神人"按钮，点击进入彩蛋模式：第一人称视角看到右手+武器，用枪/火箭炮/手榴弹攻击左右走动的 Boss，30 秒后回到过渡画面。

## Architecture Decisions

1. **独立模块化**：所有彩蛋模式代码放在 `src/babylon/easter-egg/` 目录下，7 个新文件，每个类职责单一
2. **复用现有系统**：通过 AssetManager 加载 GLB，通过 Enemy.showDialogue() 显示吐槽，通过 ParticleSystem 实现爆炸
3. **状态桥接**：EasterEggMode 通过 GameLoop 的 onStateChange 回调将状态推送到 Vue，Vue 不直接读取引擎状态
4. **相机切换**：进入时保存原相机状态，退出时恢复，不创建新相机实例
5. **Boss 行为独立**：EasterEggBoss 管理 Boss 在彩蛋模式中的行为，不修改 Enemy 的状态机

## Dependency Graph

```
Task 1: 类型定义 (game.ts)                    ← 无依赖
    │
    ├── Task 2: EasterEggMode 主控制器         ← 依赖 T1
    │       │
    │       ├── Task 3: GameLoop 集成          ← 依赖 T2
    │       │       │
    │       │       └── Task 5: Game.vue 桥接  ← 依赖 T3
    │       │
    │       ├── Task 6: FPS 相机               ← 依赖 T2
    │       │
    │       └── Task 7: 右手模型               ← 依赖 T2
    │               │
    │               └── Task 9: 枪射击系统     ← 依赖 T7
    │                       │
    │                       └── Task 10: 火箭炮+手榴弹 ← 依赖 T9
    │                               │
    │                               └── Task 11: 爆炸效果 ← 依赖 T10
    │
    ├── Task 8: Boss 彩蛋行为                  ← 依赖 T1
    │
    ├── Task 4: OverlayScreens 按钮            ← 依赖 T1
    │
    ├── Task 12: 倒计时 HUD                    ← 依赖 T2
    │
    └── Task 13: 吐槽台词                      ← 依赖 T1
```

## Vertical Slicing

每个切片交付一个可测试的完整路径：

```
Slice 1: 入口/出口流程（骨架）
  └─ 按钮 → 进入模式 → 30s计时 → 退出回过渡画面
  └─ Tasks: T1, T2, T3, T4, T5

Slice 2: FPS 视觉 + Boss 走动
  └─ FPS相机 + 右手模型 + Boss左右移动
  └─ Tasks: T6, T7, T8

Slice 3: 射击玩法
  └─ 枪射击 + 弹道 + 命中检测 + Boss受击反应
  └─ Tasks: T9, T13

Slice 4: 完整武器系统
  └─ 火箭炮 + 手榴弹 + 爆炸效果 + 眩晕
  └─ Tasks: T10, T11

Slice 5: 打磨
  └─ 倒计时HUD + 吐槽台词 + 完整流程验证
  └─ Tasks: T12, T14
```

## Task Summary

| # | Task | Size | Phase | Dependencies |
|---|------|------|-------|--------------|
| 1 | 类型定义 | XS | 1 | — |
| 2 | EasterEggMode 主控制器 | M | 1 | T1 |
| 3 | GameLoop 集成 | M | 1 | T2 |
| 4 | OverlayScreens 按钮 | S | 1 | T1 |
| 5 | Game.vue 事件桥接 | M | 1 | T3, T4 |
| 6 | FPS 相机 | M | 2 | T2 |
| 7 | 右手模型 | M | 2 | T2 |
| 8 | Boss 彩蛋行为 | M | 3 | T1 |
| 9 | 枪射击系统 | M | 3 | T7 |
| 10 | 火箭炮+手榴弹 | M | 4 | T9 |
| 11 | 爆炸效果 | M | 4 | T10 |
| 12 | 倒计时 HUD | S | 5 | T2 |
| 13 | 吐槽台词 | S | 5 | T1 |
| 14 | 完整流程验证 | S | 5 | All |

## Checkpoints

### Checkpoint 1: 入口流程（T1-T5 完成后）
- [ ] `pnpm build` 无类型错误
- [ ] 过渡画面显示"奖励神人"按钮
- [ ] 点击后 `gameLoop.startEasterEgg()` 被调用
- [ ] 30 秒后 `stopEasterEgg()` 被调用，回到过渡画面
- [ ] 退出后可正常进入下一关

### Checkpoint 2: 视觉骨架（T6-T8 完成后）
- [ ] 进入彩蛋模式后相机切换为 FPS 视角
- [ ] 右手模型可见，持有武器
- [ ] Boss 在房间中央出现并左右走动
- [ ] 退出后相机恢复正常等距视角

### Checkpoint 3: 基础射击（T9, T13 完成后）
- [ ] 枪可以射击，有弹道轨迹粒子
- [ ] 子弹命中 Boss 有反应（抖动 + 吐槽）
- [ ] 按住左键连射正常（5 发/秒）

### Checkpoint 4: 完整武器（T10-T11 完成后）
- [ ] 三种武器（枪/火箭炮/手榴弹）射击正常
- [ ] 定时切换武器（每 5-8 秒）
- [ ] 火箭炮/手榴弹爆炸效果可见
- [ ] Boss 被爆炸击中眩晕 3s
- [ ] 手榴弹抛物线瞄准辅助线可见

### Checkpoint 5: 完成（T12-T14 完成后）
- [ ] 倒计时 HUD 显示，最后 5 秒变红
- [ ] Boss 吐槽台词丰富（10+ 条）
- [ ] `pnpm build` 无类型错误
- [ ] 完整流程可测试：过关 → 奖励神人 → 30s射击 → 回到过渡画面 → 下一关

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| player.glb 骨骼名称不确定 | High | T7 中先探索骨骼结构，找到 RightHand bone 名称 |
| GLB 模型路径需要复制到 public/ | Medium | 通过 Vite 的 `?url` 导入或直接引用 node_modules 路径 |
| 粒子系统性能 | Low | 控制粒子数量，爆炸粒子短寿命 |
| 相机切换导致画面跳变 | Medium | 使用 Lerp 平滑过渡，不直接设置位置 |
| Boss 状态机冲突 | High | EasterEggBoss 完全独立于 Enemy 状态机，只操作 mesh position |
| 无音效文件 | Low | 暂时跳过音效，后续可添加 |
