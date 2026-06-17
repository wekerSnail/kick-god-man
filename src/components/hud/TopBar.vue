<template>
  <header class="topbar">
    <!-- 左：体力，搪瓷圆形徽章 -->
    <div class="topbar__health">
      <span class="topbar__label">体 力</span>
      <div class="health-pips">
        <span
          v-for="i in maxHealth"
          :key="i"
          class="pip"
          :class="{ 'pip--lost': i > health }"
        />
      </div>
    </div>

    <!-- 中：关卡，印章风格 -->
    <div class="topbar__level">
      <span class="stamp">第 {{ level }} 話</span>
    </div>

    <!-- 右：计分器，像素数字 -->
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
  background-image: var(--bg-paper-texture);
  border-bottom: var(--border-double);
  position: relative;
  flex-shrink: 0;
  z-index: 10;
}
/* 底部细虚线，仿打孔纸 */
.topbar::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 4px;
  background: repeating-linear-gradient(90deg, transparent 0 6px, var(--ink) 6px 8px);
  opacity: 0.35;
  pointer-events: none;
}

/* —— 左：体力 —— */
.topbar__health {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.topbar__label {
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--ink-soft);
  letter-spacing: 0.3em;
}
.health-pips {
  display: flex;
  gap: var(--sp-2);
}
.pip {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--vermilion);
  border: 2px solid var(--ink);
  box-shadow: var(--shadow-hard-sm);
  transition: all 0.25s var(--ease-office);
}
.pip--lost {
  background: transparent;
  border-style: dashed;
  box-shadow: none;
  transform: scale(0.85);
}

/* —— 中：关卡印章 —— */
.topbar__level {
  text-align: center;
}
.stamp {
  display: inline-block;
  font-family: var(--font-stamp);
  font-size: 22px;
  color: var(--vermilion);
  border: 3px double var(--vermilion);
  padding: var(--sp-1) var(--sp-4);
  transform: rotate(-3deg);
  letter-spacing: 0.15em;
  background: radial-gradient(
    ellipse at 30% 40%,
    rgba(193, 53, 28, 0.08),
    transparent 70%
  );
}

/* —— 右：像素计分器 —— */
.topbar__score {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  justify-content: flex-end;
}
.counter {
  font-family: var(--font-mono);
  font-size: 40px;
  line-height: 1;
  color: var(--ink);
  letter-spacing: 0.05em;
  text-shadow: 2px 2px 0 var(--amber);
}
.counter__sep,
.counter__target {
  font-family: var(--font-mono);
  font-size: 24px;
  color: var(--paper-dark);
}
.counter__unit {
  font-family: var(--font-display);
  font-size: 12px;
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
    font-size: 18px;
  }
}
</style>
