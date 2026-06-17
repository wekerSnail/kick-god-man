<template>
  <!-- 开始屏：员工守则 / 机密档案 -->
  <Transition name="overlay">
    <div v-if="screen === 'start'" class="screen screen--start">
      <article class="card">
        <span class="secret-stamp">秘</span>
        <span class="vertical-title">是男人就踹他百遍</span>
        <h1 class="title">
          是 男 人 就<br />踹 他 一 百 下
        </h1>
        <p class="desc">
          某栋昏黄办公楼的深夜。<br />
          那位「神人」又在那里指点江山，<br />
          趁他低头 —— 上前，踹。
        </p>

        <div class="rules">
          <div class="rules__head">員 工 守 則</div>
          <div class="rule"><span>移 动</span><span class="rule__key">W A S D</span></div>
          <div class="rule"><span>踹击（一米内）</span><span class="rule__key">左 键</span></div>
          <div class="rule"><span>蓄力掷出武器</span><span class="rule__key">右 键</span></div>
          <div class="rule"><span>键盘挡脸（五秒）</span><span class="rule__key">空 格</span></div>
          <div class="rule"><span>使用道具</span><span class="rule__key">1 / 2 / 3</span></div>
          <div class="rule rule--note">
            <span>手机闪烁时，神人即将回头</span>
            <span class="rule__key">！</span>
          </div>
          <div class="rule rule--note">
            <span>开会期间攻击无效，武器将被没收</span>
            <span class="rule__key">！</span>
          </div>
        </div>

        <button class="btn" @click="$emit('start')">上 工</button>
      </article>
    </div>
  </Transition>

  <!-- 过关屏：考核通过印章 -->
  <Transition name="overlay">
    <div v-if="screen === 'transition'" class="screen screen--transition">
      <div class="pass-stamp">
        <div class="pass-stamp__inner">
          <span class="pass-stamp__label">考 核 通 過</span>
          <span class="pass-stamp__level">第 {{ transitionLevel }} 話 完 成</span>
        </div>
      </div>
      <p class="pass-next">準 備 進 入 第 {{ transitionLevel + 1 }} 話 …</p>
    </div>
  </Transition>

  <!-- 结束屏：胜利徽章 / 除名通知 -->
  <Transition name="overlay">
    <div v-if="screen === 'gameover'" class="screen screen--gameover">
      <article class="card" :class="{ 'card--win': isWin }">
        <span v-if="isWin" class="badge-stamp">勳</span>
        <span v-else class="dismiss-stamp">除 名</span>
        <h2 class="end-title">
          {{ isWin ? '百 踹 達 成' : '遭 舉 報' }}
        </h2>
        <p class="end-desc">
          <template v-if="isWin">你成功踹了神人一百下，本日業績達成。</template>
          <template v-else>你踹了 {{ kickCount }} 下後被發現，人事檔案已註記。</template>
        </p>
        <div class="score-block">
          <span class="score-block__label">得 分</span>
          <span class="score-block__value">{{ score }}</span>
        </div>
        <button class="btn" @click="$emit('restart')">再 上 一 班</button>
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
  background: var(--ink);
  background-image:
    radial-gradient(ellipse at 50% 30%, rgba(244, 196, 106, 0.1), transparent 60%),
    var(--bg-paper-texture);
}

.card {
  position: relative;
  background: var(--paper);
  background-image: var(--bg-paper-texture);
  border: var(--border-double);
  box-shadow: 12px 12px 0 var(--vermilion);
  padding: var(--sp-7);
  max-width: 540px;
  width: 100%;
  max-height: 92vh;
  overflow-y: auto;
}
.card--win {
  box-shadow: 12px 12px 0 var(--amber);
}

/* 右上「秘」印章 */
.secret-stamp {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--vermilion);
  color: var(--bone);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-stamp);
  font-size: 28px;
  transform: rotate(15deg);
  border: 3px double var(--bone);
  box-shadow: var(--shadow-hard-sm);
  z-index: 2;
}

/* 左侧竖排副标题 */
.vertical-title {
  position: absolute;
  left: -36px;
  top: var(--sp-7);
  writing-mode: vertical-rl;
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--vermilion);
  letter-spacing: 0.4em;
  background: var(--paper);
  padding: var(--sp-2) var(--sp-1);
  border: 1px solid var(--vermilion);
}

.title {
  font-family: var(--font-stamp);
  font-size: clamp(28px, 6vw, 46px);
  color: var(--ink);
  line-height: 1.15;
  margin-bottom: var(--sp-3);
  letter-spacing: 0.05em;
}

.desc {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  line-height: 1.9;
  margin: var(--sp-4) 0;
}

/* 员工守则表格 */
.rules {
  border: var(--border-solid);
  margin: var(--sp-4) 0;
  font-family: var(--font-mono);
  font-size: 13px;
}
.rules__head {
  background: var(--ink);
  color: var(--paper);
  padding: var(--sp-2) var(--sp-3);
  font-family: var(--font-display);
  letter-spacing: 0.3em;
  font-size: 12px;
  text-align: center;
}
.rule {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px dotted var(--paper-dark);
  color: var(--ink-soft);
}
.rule:last-child {
  border-bottom: none;
}
.rule__key {
  color: var(--vermilion);
  font-weight: bold;
  letter-spacing: 0.1em;
}
.rule--note {
  background: rgba(193, 53, 28, 0.05);
  font-size: 12px;
}
.rule--note .rule__key {
  color: var(--vermilion-bright);
}

/* 主按钮 */
.btn {
  display: block;
  width: 100%;
  margin-top: var(--sp-5);
  background: var(--ink);
  color: var(--paper);
  border: none;
  padding: var(--sp-4);
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.3em;
  cursor: pointer;
  transition: all 0.12s var(--ease-office);
  box-shadow: var(--shadow-hard);
}
.btn:hover {
  background: var(--vermilion);
  color: var(--bone);
}
.btn:active {
  transform: translate(4px, 4px);
  box-shadow: var(--shadow-press);
}

/* ========== 过关屏 ========== */
.screen--transition {
  background: rgba(20, 17, 13, 0.85);
  backdrop-filter: blur(3px);
  flex-direction: column;
  gap: var(--sp-5);
}
.pass-stamp {
  width: 240px;
  height: 240px;
  border: 6px double var(--vermilion);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-8deg);
  position: relative;
  animation: stamp-down 0.6s var(--ease-stamp);
}
.pass-stamp::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px solid var(--vermilion);
  border-radius: 50%;
  opacity: 0.6;
}
.pass-stamp__inner {
  text-align: center;
  color: var(--vermilion);
}
.pass-stamp__label {
  display: block;
  font-family: var(--font-stamp);
  font-size: 32px;
  letter-spacing: 0.2em;
  line-height: 1.2;
}
.pass-stamp__level {
  display: block;
  font-family: var(--font-display);
  font-size: 14px;
  margin-top: var(--sp-2);
  letter-spacing: 0.1em;
}
@keyframes stamp-down {
  0% {
    transform: rotate(-30deg) scale(2);
    opacity: 0;
  }
  60% {
    transform: rotate(-2deg) scale(0.95);
    opacity: 1;
  }
  100% {
    transform: rotate(-8deg) scale(1);
    opacity: 1;
  }
}
.pass-next {
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--paper);
  letter-spacing: 0.15em;
  animation: hint-blink 1.4s var(--ease-office) infinite;
}
@keyframes hint-blink {
  0%, 70% { opacity: 1; }
  85% { opacity: 0.35; }
}

/* ========== 结束屏 ========== */
.screen--gameover {
  background: var(--ink);
  background-image:
    radial-gradient(ellipse at 50% 40%, rgba(193, 53, 28, 0.15), transparent 60%),
    var(--bg-paper-texture);
}

.badge-stamp,
.dismiss-stamp {
  position: absolute;
  top: -18px;
  right: -18px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-stamp);
  font-size: 24px;
  transform: rotate(12deg);
  border: 3px double var(--bone);
  box-shadow: var(--shadow-hard-sm);
  z-index: 2;
}
.badge-stamp {
  background: var(--amber);
  color: var(--ink);
}
.dismiss-stamp {
  background: var(--vermilion);
  color: var(--bone);
}

.end-title {
  font-family: var(--font-stamp);
  font-size: clamp(32px, 7vw, 52px);
  color: var(--ink);
  line-height: 1.1;
  margin-bottom: var(--sp-4);
  letter-spacing: 0.05em;
}

.end-desc {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-soft);
  line-height: 1.9;
  margin-bottom: var(--sp-4);
}

.score-block {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--sp-3);
  margin: var(--sp-5) 0;
  padding: var(--sp-4);
  border-top: var(--border-solid);
  border-bottom: var(--border-solid);
}
.score-block__label {
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--ink-soft);
  letter-spacing: 0.3em;
}
.score-block__value {
  font-family: var(--font-mono);
  font-size: 48px;
  color: var(--vermilion);
  text-shadow: 3px 3px 0 var(--paper-dark);
}

/* ========== overlay 进出过渡 ========== */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.4s var(--ease-stamp);
}
.overlay-enter-active .card {
  transition: transform 0.5s var(--ease-stamp);
}
.overlay-enter-from .card {
  transform: translateY(20px) scale(0.98);
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .card {
    padding: var(--sp-5);
  }
  .vertical-title {
    display: none;
  }
  .pass-stamp {
    width: 180px;
    height: 180px;
  }
  .pass-stamp__label {
    font-size: 24px;
  }
}
</style>
