<template>
  <Transition name="fade">
    <div v-if="level !== 'safe'" class="threat" :class="`threat--${level}`">
      <div class="threat__edge threat__edge--top" />
      <div class="threat__edge threat__edge--bottom" />
      <div class="threat__edge threat__edge--left" />
      <div class="threat__edge threat__edge--right" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  enemyState: string
  isPatrolWarning: boolean
}>()

const level = computed<'safe' | 'warn' | 'danger' | 'meeting'>(() => {
  if (props.isPatrolWarning) return 'warn'
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
.threat {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 40;
  overflow: hidden;
}

/* 四边柔和光晕 */
.threat__edge {
  position: absolute;
  opacity: 0;
  transition: opacity 0.4s var(--ease-office);
}
.threat__edge--top,
.threat__edge--bottom {
  left: 0;
  right: 0;
  height: 80px;
}
.threat__edge--left,
.threat__edge--right {
  top: 0;
  bottom: 0;
  width: 80px;
}
.threat__edge--top { top: 0; background: linear-gradient(to bottom, var(--amber-glow), transparent); }
.threat__edge--bottom { bottom: 0; background: linear-gradient(to top, var(--amber-glow), transparent); }
.threat__edge--left { left: 0; background: linear-gradient(to right, var(--amber-glow), transparent); }
.threat__edge--right { right: 0; background: linear-gradient(to left, var(--amber-glow), transparent); }

/* warn 级别：柔和黄色光晕 */
.threat--warn .threat__edge {
  opacity: 0.25;
  animation: pulse-warn 1.5s ease infinite;
}

/* danger 级别：红色光晕 + 脉冲 */
.threat--danger .threat__edge {
  background: linear-gradient(to bottom, var(--vermilion), transparent);
}
.threat--danger .threat__edge--top { background: linear-gradient(to bottom, var(--vermilion), transparent); }
.threat--danger .threat__edge--bottom { background: linear-gradient(to top, var(--vermilion), transparent); }
.threat--danger .threat__edge--left { background: linear-gradient(to right, var(--vermilion), transparent); }
.threat--danger .threat__edge--right { background: linear-gradient(to left, var(--vermilion), transparent); }
.threat--danger .threat__edge {
  opacity: 0.35;
  animation: pulse-danger 0.8s ease infinite;
}

/* meeting 级别：橙色柔和 */
.threat--meeting .threat__edge {
  background: linear-gradient(to bottom, var(--amber), transparent);
}
.threat--meeting .threat__edge--top { background: linear-gradient(to bottom, var(--amber), transparent); }
.threat--meeting .threat__edge--bottom { background: linear-gradient(to top, var(--amber), transparent); }
.threat--meeting .threat__edge--left { background: linear-gradient(to right, var(--amber), transparent); }
.threat--meeting .threat__edge--right { background: linear-gradient(to left, var(--amber), transparent); }
.threat--meeting .threat__edge {
  opacity: 0.2;
}

@keyframes pulse-warn {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.35; }
}
@keyframes pulse-danger {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

/* 进入/退出淡入 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s var(--ease-office);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
