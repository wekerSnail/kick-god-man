<template>
  <div class="ticker" :class="`ticker--${threatLevel}`">
    <!-- 键盘挡脸 -->
    <div class="ticker__block">
      <span class="ticker__key">键盘</span>
      <span class="ticker__val" :class="potClass">{{ potText }}</span>
    </div>

    <!-- 攻击 -->
    <div class="ticker__block">
      <span class="ticker__key">攻击</span>
      <span class="ticker__val" :class="attackClass">{{ attackText }}</span>
    </div>

    <!-- 神人状态 -->
    <div class="ticker__block" :class="`enemy--${enemyState}`">
      <span class="ticker__key">神人</span>
      <span class="ticker__val">{{ enemyText }}</span>
    </div>

    <!-- 躲藏 / 隐身 -->
    <div v-if="isHidden" class="ticker__block">
      <span class="ticker__val val--moss">■ 躲藏中</span>
    </div>
    <div v-if="invisibleActive" class="ticker__block">
      <span class="ticker__val val--steel">■ 隐身中</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  potActive: boolean
  potCooldown: number
  potRemainingTime: number
  attackCooldown: number
  comboActive: boolean
  enemyState: string
  isHidden: boolean
  invisibleActive: boolean
}>()

const potText = computed(() => {
  if (props.potActive) return `挡脸中 ${Math.ceil(props.potRemainingTime)}s`
  if (props.potCooldown > 0) return `冷却 ${Math.ceil(props.potCooldown)}s`
  return '就绪 ［空格］'
})
const potClass = computed(() =>
  props.potActive ? 'val--ready' : props.potCooldown > 0 ? 'val--warn' : 'val--ready'
)

const attackText = computed(() => {
  if (props.comboActive) return '連 擊 中'
  if (props.attackCooldown > 0) return `冷却 ${Math.ceil(props.attackCooldown)}s`
  return '就 绪'
})
const attackClass = computed(() =>
  props.comboActive ? 'val--combo' : props.attackCooldown > 0 ? 'val--danger' : 'val--ready'
)

// 神人状态文案 —— 不再用 emoji
const ENEMY_TEXT: Record<string, string> = {
  normal: '面 对 屏 幕',
  phone_flashing: '手 机 闪 烁 ！',
  looking_back: '回 头 检 查 ！！',
  stunned: '眩 晕 中',
  meeting: '开 会 中 · 攻 击 无 效',
  patrolling: '巡 查 中 · 快 躲 好',
}
const enemyText = computed(() => ENEMY_TEXT[props.enemyState] ?? '─')

// 整体危险等级 —— 影响整条 ticker 的底色
const threatLevel = computed(() => {
  switch (props.enemyState) {
    case 'looking_back':
    case 'patrolling':
      return 'danger'
    case 'phone_flashing':
      return 'warn'
    case 'meeting':
      return 'meeting'
    default:
      return 'safe'
  }
})
</script>

<style scoped>
.ticker {
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.05em;
  padding: var(--sp-2) var(--sp-5);
  border-top: var(--border-double);
  display: flex;
  gap: var(--sp-5);
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  transition: background 0.25s var(--ease-office);
}
/* 危险等级让整条 ticker 染色，但保持克制 */
.ticker--warn {
  background: linear-gradient(90deg, var(--ink) 0%, var(--ink) 70%, rgba(200, 144, 44, 0.25) 100%);
}
.ticker--danger {
  background: linear-gradient(90deg, var(--ink) 0%, var(--ink) 60%, rgba(193, 53, 28, 0.35) 100%);
}
.ticker--meeting {
  background: linear-gradient(90deg, var(--ink) 0%, var(--ink) 50%, rgba(232, 74, 28, 0.3) 100%);
}

.ticker__block {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.ticker__block::before {
  content: '>';
  color: var(--moss);
  margin-right: 4px;
}
.ticker__key {
  color: var(--paper-dark);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 12px;
}
.ticker__val {
  font-weight: bold;
  color: var(--paper);
}

.val--ready { color: var(--moss); }
.val--warn { color: var(--amber-glow); animation: warn-blink 0.8s steps(2) infinite; }
.val--danger { color: var(--vermilion-bright); animation: danger-blink 0.4s steps(2) infinite; }
.val--combo { color: var(--amber-glow); animation: combo-shake 0.3s var(--ease-office) infinite; }
.val--moss { color: var(--moss); }
.val--steel { color: var(--steel); }

@keyframes warn-blink { 50% { opacity: 0.4; } }
@keyframes danger-blink { 50% { opacity: 0.2; } }
@keyframes combo-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-1px); }
  75% { transform: translateX(1px); }
}

/* 神人状态单独着色 */
.enemy--normal .ticker__val { color: var(--paper-dark); }
.enemy--phone_flashing .ticker__val {
  color: var(--amber-glow);
  animation: warn-blink 0.6s steps(2) infinite;
}
.enemy--looking_back .ticker__val {
  color: var(--vermilion-bright);
  animation: danger-blink 0.3s steps(2) infinite;
}
.enemy--stunned .ticker__val { color: var(--amber); }
.enemy--meeting .ticker__val { color: var(--vermilion-bright); }
.enemy--patrolling .ticker__val {
  color: var(--amber-glow);
  animation: warn-blink 0.5s steps(2) infinite;
}

@media (max-width: 640px) {
  .ticker {
    font-size: 12px;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    overflow-x: auto;
    flex-wrap: nowrap;
  }
}
</style>
