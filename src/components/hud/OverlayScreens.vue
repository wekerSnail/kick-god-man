<template>
  <!-- 开始屏：明亮卡通风格 -->
  <Transition name="overlay">
    <div v-if="screen === 'start'" class="screen screen--start">
      <article class="card">
        <span class="emoji-badge">🦶</span>
        <h1 class="title">
          <br />踹他一百下
        </h1>
        <p class="desc">
          办公室里的「神人」又在指点江山了，<br />
          趁他低头 —— 上前，踹！
        </p>

        <div class="rules">
          <div class="rules__head">🎮 操作指南</div>
          <div class="rule"><span>移动</span><span class="rule__key">W A S D</span></div>
          <div class="rule"><span>踹击（一米内）</span><span class="rule__key">左键</span></div>
          <div class="rule"><span>蓄力掷出武器</span><span class="rule__key">右键</span></div>
          <div class="rule"><span>键盘挡脸（五秒）</span><span class="rule__key">空格</span></div>
          <div class="rule"><span>使用道具</span><span class="rule__key">1 / 2 / 3</span></div>
          <div class="rule rule--note">
            <span>⚠️ 手机闪烁时，神人即将回头！</span>
          </div>
          <div class="rule rule--note">
            <span>⚠️ 开会期间攻击无效，武器将被没收</span>
          </div>
        </div>

        <button class="btn" @click="$emit('start')">开始游戏 🚀</button>
      </article>
    </div>
  </Transition>

  <!-- 过关屏：明亮气泡风格 -->
  <Transition name="overlay">
    <div v-if="screen === 'transition'" class="screen screen--transition">
      <article class="card">
        <span class="end-emoji">🎉</span>
        <h2 class="end-title">过关！</h2>
        <p class="end-desc">第 {{ transitionLevel }} 关完成</p>
        <div class="score-block">
          <span class="score-block__label">踹击数</span>
          <span class="score-block__value">{{ kickCount }}</span>
        </div>
        <button class="btn" @click="$emit('nextLevel')">进入第 {{ transitionLevel + 1 }} 关 🚀</button>
      </article>
    </div>
  </Transition>

  <!-- 结束屏：明亮卡片风格 -->
  <Transition name="overlay">
    <div v-if="screen === 'gameover'" class="screen screen--gameover">
      <article class="card" :class="{ 'card--win': isWin }">
        <span class="end-emoji">{{ isWin ? '🏆' : '😵' }}</span>
        <h2 class="end-title">
          {{ isWin ? '百踹达成！' : '被发现了！' }}
        </h2>
        <p class="end-desc">
          <template v-if="isWin">你成功踹了神人一百下，今日业绩达成！</template>
          <template v-else>你踹了 {{ kickCount }} 下后被发现，已被记过处分。</template>
        </p>
        <div class="score-block">
          <span class="score-block__label">得分</span>
          <span class="score-block__value">{{ score }}</span>
        </div>
        <button class="btn" @click="$emit('restart')">再来一局 💪</button>
      </article>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  screen: 'start' | 'transition' | 'gameover' | 'none'
  isWin: boolean
  kickCount: number
  score: number
  transitionLevel: number
}>()

defineEmits<{
  start: []
  restart: []
  nextLevel: []
}>()
</script>

<style scoped>
/* ========== 通用 overlay ========== */
.screen {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
}

/* ========== 开始屏 ========== */
.screen--start {
  background: linear-gradient(135deg, #E8F0FE 0%, #F8F6FF 50%, #FFE8F0 100%);
}

.card {
  position: relative;
  background: var(--paper);
  border: 2px solid rgba(84, 160, 255, 0.15);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(45, 48, 71, 0.1);
  padding: var(--sp-7) var(--sp-6);
  max-width: 520px;
  width: 100%;
  max-height: 92vh;
  overflow-y: auto;
  text-align: center;
}
.card--win {
  border-color: rgba(255, 209, 102, 0.3);
  box-shadow: 0 8px 40px rgba(255, 209, 102, 0.15);
}

/* 大 emoji 徽章 */
.emoji-badge {
  display: block;
  font-size: 56px;
  margin-bottom: var(--sp-3);
  animation: bounce-emoji 2s ease infinite;
}
.end-emoji {
  display: block;
  font-size: 64px;
  margin-bottom: var(--sp-3);
}
@keyframes bounce-emoji {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.title {
  font-family: var(--font-display);
  font-size: clamp(28px, 6vw, 42px);
  font-weight: 700;
  color: var(--ink);
  line-height: 1.2;
  margin-bottom: var(--sp-2);
  letter-spacing: 0.02em;
}

.desc {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-soft);
  line-height: 1.8;
  margin: var(--sp-4) 0;
}

/* 操作指南卡片 */
.rules {
  border: 2px solid rgba(84, 160, 255, 0.12);
  border-radius: var(--radius-soft);
  margin: var(--sp-4) 0;
  font-family: var(--font-body);
  font-size: 13px;
  overflow: hidden;
}
.rules__head {
  background: linear-gradient(135deg, var(--sky), var(--lavender));
  color: var(--paper);
  padding: var(--sp-2) var(--sp-3);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.1em;
  text-align: center;
}
.rule {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid rgba(200, 196, 216, 0.3);
  color: var(--ink-soft);
}
.rule:last-child {
  border-bottom: none;
}
.rule__key {
  color: var(--sky);
  font-weight: 700;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}
.rule--note {
  background: rgba(255, 209, 102, 0.08);
  font-size: 12px;
  color: var(--amber);
  font-weight: 600;
}
.rule--note .rule__key {
  color: var(--amber);
}

/* 主按钮 */
.btn {
  display: block;
  width: 100%;
  margin-top: var(--sp-5);
  background: linear-gradient(135deg, var(--sky), var(--lavender));
  color: var(--paper);
  border: none;
  border-radius: var(--radius-pill);
  padding: var(--sp-4);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s var(--ease-stamp);
  box-shadow: 0 4px 20px rgba(84, 160, 255, 0.3);
}
.btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 28px rgba(84, 160, 255, 0.4);
}
.btn:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 2px 10px rgba(84, 160, 255, 0.2);
}

/* ========== 过关屏 ========== */
.screen--transition {
  background: rgba(232, 240, 254, 0.9);
  backdrop-filter: blur(8px);
  flex-direction: column;
  gap: var(--sp-5);
}
.pass-badge {
  width: 240px;
  height: 240px;
  border: 4px solid var(--amber);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.15), rgba(255, 159, 67, 0.1));
  position: relative;
  animation: pop-in 0.5s var(--ease-stamp);
}
.pass-badge::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px solid rgba(255, 209, 102, 0.4);
  border-radius: 50%;
}
.pass-badge__inner {
  text-align: center;
}
.pass-badge__emoji {
  display: block;
  font-size: 48px;
  margin-bottom: var(--sp-2);
}
.pass-badge__label {
  display: block;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--amber);
  letter-spacing: 0.1em;
}
.pass-badge__level {
  display: block;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-soft);
  margin-top: var(--sp-2);
}
@keyframes pop-in {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  60% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.pass-next {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink-soft);
  letter-spacing: 0.1em;
  animation: hint-blink 1.4s ease infinite;
}
@keyframes hint-blink {
  0%, 70% { opacity: 1; }
  85% { opacity: 0.4; }
}

/* ========== 结束屏 ========== */
.screen--gameover {
  background: linear-gradient(135deg, #E8F0FE 0%, #F8F6FF 50%, #FFE8F0 100%);
}

.end-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 7vw, 48px);
  font-weight: 700;
  color: var(--ink);
  line-height: 1.1;
  margin-bottom: var(--sp-3);
}

.end-desc {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-soft);
  line-height: 1.8;
  margin-bottom: var(--sp-4);
}

.score-block {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--sp-3);
  margin: var(--sp-5) 0;
  padding: var(--sp-4);
  background: rgba(84, 160, 255, 0.06);
  border-radius: var(--radius-soft);
}
.score-block__label {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-soft);
}
.score-block__value {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 800;
  color: var(--sky);
}

/* ========== overlay 进出过渡 ========== */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.4s var(--ease-office);
}
.overlay-enter-active .card {
  transition: transform 0.5s var(--ease-stamp);
}
.overlay-enter-from .card {
  transform: translateY(20px) scale(0.95);
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .card {
    padding: var(--sp-5) var(--sp-4);
  }
  .pass-badge {
    width: 180px;
    height: 180px;
  }
  .pass-badge__label {
    font-size: 24px;
  }
}
</style>
