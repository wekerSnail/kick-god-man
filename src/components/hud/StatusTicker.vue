<template>
  <div class="ticker" :class="`ticker--${threatLevel}`">
    <!-- 键盘挡脸 -->
    <div v-if="potActive" class="ticker__block">
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
      <span class="ticker__val val--moss">🟢 躲藏中</span>
    </div>
    <div v-if="invisibleActive" class="ticker__block">
      <span class="ticker__val val--steel">👻 隐身中</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  potActive: boolean
  potRemainingTime: number
  attackCooldown: number
  comboActive: boolean
  enemyState: string
  isHidden: boolean
  invisibleActive: boolean
}>()

const potText = computed(() => {
  if (props.potActive) return `挡脸中 ${Math.ceil(props.potRemainingTime)}s`
  return ''
})
const potClass = computed(() =>
  props.potActive ? 'val--ready' : ''
)

const attackText = computed(() => {
  if (props.comboActive) return '连击中！'
  if (props.attackCooldown > 0) return `冷却 ${Math.ceil(props.attackCooldown)}s`
  return '就绪'
})
const attackClass = computed(() =>
  props.comboActive ? 'val--combo' : props.attackCooldown > 0 ? 'val--danger' : 'val--ready'
)

const ENEMY_TEXT: Record<string, string> = {
  normal: '面对屏幕',
  phone_flashing: '手机闪烁！',
  looking_back: '回头检查！！',
  stunned: '眩晕中',
  meeting: '开会中 · 攻击无效',
  patrolling: '巡查中 · 快躲好',
}
const enemyText = computed(() => ENEMY_TEXT[props.enemyState] ?? '─')

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
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: var(--sp-2) var(--sp-5);
  border-top: 2px solid rgba(84, 160, 255, 0.1);
  display: flex;
  gap: var(--sp-5);
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  transition: background 0.3s var(--ease-office);
}

/* 危险等级柔和渐变底色 */
.ticker--warn {
  background: linear-gradient(90deg, var(--paper) 0%, var(--paper) 70%, rgba(255, 209, 102, 0.2) 100%);
}
.ticker--danger {
  background: linear-gradient(90deg, var(--paper) 0%, var(--paper) 50%, rgba(255, 107, 107, 0.15) 100%);
}
.ticker--meeting {
  background: linear-gradient(90deg, var(--paper) 0%, var(--paper) 50%, rgba(255, 159, 67, 0.15) 100%);
}

.ticker__block {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.ticker__block::before {
  content: '●';
  color: var(--moss);
  margin-right: 4px;
  font-size: 8px;
}
.ticker__key {
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 12px;
  font-weight: 600;
}
.ticker__val {
  font-weight: 700;
  color: var(--ink);
}

.val--ready { color: var(--moss); }
.val--warn { color: var(--amber); animation: warn-blink 0.8s ease infinite; }
.val--danger { color: var(--vermilion-bright); animation: danger-blink 0.4s ease infinite; }
.val--combo { color: var(--amber); animation: combo-shake 0.3s var(--ease-office) infinite; }
.val--moss { color: var(--moss); }
.val--steel { color: var(--steel); }

@keyframes warn-blink { 50% { opacity: 0.4; } }
@keyframes danger-blink { 50% { opacity: 0.3; } }
@keyframes combo-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* 神人状态着色 */
.enemy--normal .ticker__val { color: var(--ink-soft); }
.enemy--phone_flashing .ticker__val {
  color: var(--amber);
  animation: warn-blink 0.6s ease infinite;
}
.enemy--looking_back .ticker__val {
  color: var(--vermilion-bright);
  animation: danger-blink 0.3s ease infinite;
}
.enemy--stunned .ticker__val { color: var(--lavender); }
.enemy--meeting .ticker__val { color: var(--amber); }
.enemy--patrolling .ticker__val {
  color: var(--vermilion);
  animation: warn-blink 0.5s ease infinite;
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
