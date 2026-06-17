我已经为你将整套改造方案打包成了标准的 Markdown 文本。你可以直接复制下方代码框中的所有内容，保存为 `OPTIMIZATION.md` 文件到你的项目目录中。

````markdown
# 🚀 3D 潜行游戏《是男人就踹他一百下》视觉与架构优化方案

## 1. 现状痛点分析

- **画面简陋**：纯程序化生成的立方体和胶囊体缺乏细节，光照单一。
- **UI 模糊/生硬**：使用 `CanvasTexture + Sprite` 的 3D 冷却条和文字不受光照影响，且分辨率低，无法做丝滑的动效。
- **反馈感弱**：潜行、被发现、踢击等核心动作缺乏震动、粒子及屏幕特效的视觉反馈。

---

## 2. 视觉素材升级方案（完全免费）

为了保持项目的轻量化与 **Low-Poly（低多边形风格）**，最佳的美化策略是保持“无外部繁重资产”的精神，但通过导入**现成的标准 Low-Poly 网格模型（GLTF/GLB 格式）**来替换目前纯代码画的立方体。

### 📦 推荐免费 Low-Poly 素材库

| 素材类型          | 推荐资源包名称                  | 获取平台/作者                   | 包含内容                                                                            | 授权协议                    |
| :---------------- | :------------------------------ | :------------------------------ | :---------------------------------------------------------------------------------- | :-------------------------- |
| **办公场景/道具** | `Low Poly Office Pack`          | **Poly Pizza** / Polygonal Mind | 办公桌、椅子、电脑、文件柜、咖啡机、盆栽（完美替换 `HidingSpots.ts` 和 `Props.ts`） | **免费 (CC0/Royalty Free)** |
| **人物/职业**     | `Vocations and Uniforms bundle` | **Itch.io** / Amir              | 包含穿着西装的 Businessman（老板/神人）、办公文员。自带骨骼绑定。                   | **免费**                    |
| **通用低模扩展**  | `Kenney Game Assets`            | **Kenney.nl**                   | 各种低模基础包（家具、冷兵器如球棒、平底锅模型）。游戏界大名鼎鼎的免费资产王。      | **CC0 (免版权，可商用)**    |

### 🛠️ Three.js 异步加载资产改造

在 `game/core/ResourceCache.ts` 中引入 Three.js 的 `GLTFLoader`。由于是 Vite 5.4 项目，可以将下载的 `.glb` 文件直接放在 `public/models/` 目录下：

```typescript
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

export class ResourceCache {
  private static loader = new GLTFLoader();
  private static meshCache: Map<string, THREE.Group> = new Map();

  // 预加载核心资产（在游戏初始化或 Loading 界面调用）
  public static async preloadAssets(): Promise<void> {
    const assetsToLoad = {
      office_chair: "/models/office_chair.glb",
      boss: "/models/boss_character.glb",
      pan: "/models/frying_pan.glb",
    };

    for (const [key, path] of Object.entries(assetsToLoad)) {
      const gltf = await this.loader.loadAsync(path);
      // 优化：开启阴影接收
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.meshCache.set(key, gltf.scene);
    }
  }

  public static getMeshClone(key: string): THREE.Group {
    const original = this.meshCache.get(key);
    if (!original) throw new Error(`Asset ${key} not preloaded`);
    return original.clone(); // 克隆使用，避免影响原模型
  }
}
```
````

---

## 3. UI 架构解耦：从 3D Sprite 到 Vue 3 HUD

**核心改造**：完全丢弃 `CanvasTexture`。在 Three.js 画布之上，覆盖一层纯 HTML/Vue 3 的**全屏绝对定位 HUD 视图**。

### Step 1: 修改 `App.vue` 布局

保持 WebGL 画布在底层，Vue UI 在顶层。

```vue
<template>
  <div class="game-container">
    <!-- WebGL 渲染画布 -->
    <div id="three-canvas-container" ref="canvasContainer"></div>

    <!-- Vue 3 顶级 HUD 层 (通过 pointer-events: none 穿透鼠标事件) -->
    <GameHUD :state="hudState" @action="handleUiAction" />
  </div>
</template>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
#three-canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
</style>
```

### Step 2: 设计双层状态桥接 (GameLoop ➜ Vue 3)

在 `types/game.ts` 中定义精简的轻量级 UI 状态接口，每帧通过 `onStateChange` 塞给 Vue 的 `ref`。

```typescript
// types/game.ts
export interface GameHUDState {
  currentLevel: number;
  kicksCount: number;
  kicksTarget: number;
  playerState: "idle" | "cooldown" | "hiding";
  kickCooldownProgress: number; // 0 到 100
  enemyState:
    | "normal"
    | "phone_flashing"
    | "looking_back"
    | "stunned"
    | "meeting";
  currentWeapon: string | null;
}
```

### Step 3: 在 Vue 组件中实现高级美化 (CSS 动效)

利用 Vue 3 的响应式，可以轻松做出极其炫酷的**技能冷却环**、**受击屏幕红幕闪烁**和**关卡晋级特效**：

```vue
<!-- components/GameHUD.vue -->
<template>
  <div class="hud-layer">
    <!-- 顶部状态与关卡目标 -->
    <div class="level-badge">LEVEL {{ state.currentLevel }}</div>
    <div class="progress-container">
      <div class="progress-text">
        踹他！{{ state.kicksCount }} / {{ state.kicksTarget }}
      </div>
      <div class="progress-bar-wraper">
        <div
          class="progress-fill"
          :style="{ width: (state.kicksCount / state.kicksTarget) * 100 + '%' }"
        ></div>
      </div>
    </div>

    <!-- 被发现时的全屏惊悚红框提示 -->
    <Transition name="fade">
      <div
        v-if="state.enemyState === 'looking_back'"
        class="alert-overlay"
      ></div>
    </Transition>

    <!-- 武器栏与冷却：优雅的圆形进度条 -->
    <div
      class="weapon-slot"
      :class="{ 'in-cooldown': state.playerState === 'cooldown' }"
    >
      <span class="weapon-icon">{{ state.currentWeapon || "👞" }}</span>
      <!-- SVG 环形进度 -->
      <svg
        class="cooldown-ring"
        viewBox="0 0 36 36"
        v-if="state.playerState === 'cooldown'"
      >
        <path
          class="circle"
          :stroke-dasharray="`${state.kickCooldownProgress}, 100`"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.hud-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none; /* 关键：允许鼠标穿透控制3D视角 */
  font-family: "Arial Black", Impact, sans-serif;
}
.weapon-slot {
  pointer-events: auto;
} /* 按钮等允许点击 */

/* 全屏警报闪烁红晕 */
.alert-overlay {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.8);
  background-color: rgba(255, 0, 0, 0.1);
  animation: pulse 0.5s infinite alternate;
}
@keyframes pulse {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 0.9;
  }
}
</style>
```

---

## 4. 渲染引擎升级：光照、阴影与后期特效（Post-Processing）

3D 画面廉价感的核心原因：**缺少色彩对比度**和**微弱的阴影边界**。

### 🛠️ 方案 4.1：升级光照与柔和阴影 (`SceneManager.ts`)

引入主次光源和更高级的阴影映射，拒绝死板的白光：

```typescript
// game/SceneManager.ts
import * as THREE from "three";

export class SceneManager {
  constructor() {
    // 1. 开启高级阴影映射
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和阴影
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // 电影感色调映射
    this.renderer.toneMappingExposure = 1.2;

    this.setupLighting();
  }

  private setupLighting() {
    // 环境主光：带一点温暖的米黄色，模拟室内顶灯
    const ambientLight = new THREE.AmbientLight(0xfffaed, 0.6);
    this.scene.add(ambientLight);

    // 强烈的方向平行光：用于投射硬朗的影子
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 18, 5);
    dirLight.castShadow = true;

    // 阴影分辨率配置
    dirLight.shadow.mapSize.width = window.innerWidth > 1024 ? 2048 : 1024;
    dirLight.shadow.mapSize.height = window.innerWidth > 1024 ? 2048 : 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;

    // 限制阴影相机范围，可以大幅提升贴图利用率（阴影变清晰）
    const d = 15;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005; // 减少阴影悬空伪影

    this.scene.add(dirLight);
  }
}
```

### 🛠️ 方案 4.2：引入极简后期辉光（Bloom）

当老板进入 `phone_flashing`（手机闪烁）状态，或者玩家打出暴击 Combo 时，画面应该有高级的“发光”感。

```bash
# 安装 three 后期处理扩展库
pnpm add postprocessing

```

在 `SceneManager.ts` 中集成：

```typescript
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
} from "postprocessing";

export class SceneManager {
  private composer!: EffectComposer;

  private initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    // 基础基础渲染通道
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // 添加辉光特效 (Bloom)
    const bloomEffect = new BloomEffect({
      intensity: 1.5,
      luminanceThreshold: 0.2, // 亮度超过这个阈值的物体才会发光
      luminanceSmoothing: 0.9,
    });

    const effectPass = new EffectPass(this.camera, bloomEffect);
    this.composer.addPass(effectPass);
  }

  // 替换原有的 renderer.render
  public update() {
    // this.renderer.render(this.scene, this.camera);
    this.composer.render();
  }
}
```

---

## 5. 核心动作反馈强化（打击感特效）

利用现有的 `ObjectPool.ts` 做两件低成本、高回报的事：

### 💥 反馈 1：打击碎屑粒子系统

在 `Player.ts` 成功命中 `Enemy` 的那一帧，通过 `ObjectPool` 喷射出代表力度的 Low-Poly 碎块或星星粒子。

```typescript
// game/systems/CollisionSystem.ts 判定命中后调用
public spawnHitParticles(position: THREE.Vector3) {
  for (let i = 0; i < 15; i++) {
    // 从 ObjectPool 获取通用的微型立方体 Mesh
    const particle = ObjectPool.get('hit_particle');
    particle.position.copy(position);

    // 赋予随机速度
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      Math.random() * 6 + 2, // 向上喷射
      (Math.random() - 0.5) * 5
    );
    particle.userData.life = 0.4; // 存活时间 0.4 秒

    SceneManager.add(particle);
  }
}

```

### 👁️ 反馈 2：视线圆锥可视（Stealth Cone）

当 `Enemy` 处于正常状态或即将 `looking_back` 时，从他的头部正前方拉出一个半透明的、淡淡的红/黄色视线扇形或圆锥（使用 `MeshBasicMaterial` 并设置 `opacity: 0.2`, `transparent: true`）。玩家能够肉眼可见敌人的视觉警戒范围，极大地增强潜行游戏的紧张感。

---

## 6. 改造路线与交付检查表

- [ ] **第一阶段：解耦 UI（预计1天）**
- [ ] 移除 `Player.ts` 里的所有 CanvasTexture 画图逻辑。
- [ ] 在 `GameHUD.vue` 中重构布局，绑定 `onStateChange` 传递过来的纯数据。

- [ ] **第二阶段：替换素材（预计1天）**
- [ ] 引入 `GLTFLoader`。从免费网站下载办公椅、文员低模。
- [ ] 替换原项目中 `WeaponModels.ts` 和 `HidingSpots.ts` 内部的硬编码 Geometry。

- [ ] **第三阶段：调光与滤镜（预计0.5天）**
- [ ] 开启 `PCFSoftShadowMap` 和电影级色调映射。
- [ ] 加入 `postprocessing` 的 Bloom 滤镜，为危险状态制造发光警示。

```

```
