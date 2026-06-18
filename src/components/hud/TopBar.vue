<template>
  <header class="topbar">
    <!-- 左：体力，圆润心形徽章 -->
    <div class="topbar__health">
      <span class="topbar__label">体力</span>
      <div class="health-pips">
        <span
          v-for="i in maxHealth"
          :key="i"
          class="pip"
          :class="{ 'pip--lost': i > health }"
        />
      </div>
    </div>

    <!-- 中：关卡，气泡标签 -->
    <div class="topbar__level">
      <span class="stamp">第 {{ level }} 关</span>
    </div>

    <!-- 右：计分器，圆异数字 -->
    <div class="topbar__score">
      <span class="counter">{{ padded(kickCount) }}</span>
      <span class="counter__sep">/</span>
      <span class="counter__target">{{ padded(kickTarget) }}</span>
      <span class="counter__unit">踹</span>
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    health: number
    maxHealth: number
    level: number
    kickCount: number
    kickTarget: number
  }>(),
  { health: 3, maxHealth: 3, level: 1, kickCount: 0, kickTarget: 10 }
)

const padded = (n: number) => String(Math.max(0, Math.floor(n))).padStart(3, '0')
</script>

<style scoped>
.topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  background: var(--paper);
  border-bottom: 2px solid rgba(84, 160, 255, 0.15);
  position: relative;
  flex-shrink: 0;
  z-index: 10;
}

/* —— 左：体力 —— */
.topbar__health {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.topbar__label {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
  letter-spacing: 0.1em;
}
.health-pips {
  display: flex;
  gap: var(--sp-2);
}
.pip {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--vermilion);
  border: 2px solid rgba(255, 107, 107, 0.3);
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
  transition: all 0.3s var(--ease-stamp);
}
.pip--lost {
  background: rgba(200, 196, 216, 0.3);
  border: 2px dashed var(--paper-dark);
  box-shadow: none;
  transform: scale(0.85);
}

/* —— 中：关卡气泡标签 —— */
.topbar__level {
  text-align: center;
}
.stamp {
  display: inline-block;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--paper);
  background: linear-gradient(135deg, var(--sky), var(--lavender));
  padding: var(--sp-1) var(--sp-4);
  border-radius: var(--radius-pill);
  letter-spacing: 0.1em;
  box-shadow: 0 3px 12px rgba(84, 160, 255, 0.3);
}

/* —— 右：计分器 —— */
.topbar__score {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  justify-content: flex-end;
}
.counter {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
  color: var(--ink);
  letter-spacing: 0.05em;
}
.counter__sep,
.counter__target {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  color: var(--paper-dark);
}
.counter__unit {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
  margin-left: 4px;
  align-self: center;
}

/* 移动端 */
@media (max-width: 640px) {
  .topbar {
    grid-template-columns: 1fr;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
  }
  .topbar__health {
    justify-content: center;
  }
  .topbar__score {
    justify-content: center;
  }
  .counter {
    font-size: 32px;
  }
  .stamp {
    font-size: 15px;
  }
}
</style>
