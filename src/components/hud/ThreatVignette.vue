<template>
  <Transition name="fade">
    <div v-if="level !== 'safe'" class="threat" :class="`threat--${level}`">
      <div class="threat__corner threat__corner--tl" />
      <div class="threat__corner threat__corner--tr" />
      <div class="threat__corner threat__corner--bl" />
      <div class="threat__corner threat__corner--br" />
      <div class="threat__scanline" />
      <div v-if="level === 'danger'" class="threat__strobe" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  enemyState: string
  isPatrolWarning: boolean
}>()

// 安全=不渲染；warn=琥珀；danger=朱砂烧灼；meeting=朱砂缓燃
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
  mix-blend-mode: multiply;
  overflow: hidden;
}

/* 四角烧灼光晕 —— 非均匀径向渐变 */
.threat__corner {
  position: absolute;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, var(--vermilion) 0%, transparent 70%);
  filter: blur(8px);
  opacity: 0;
  transition: opacity 0.3s var(--ease-office);
}
.threat__corner--tl { top: -50px; left: -50px; }
.threat__corner--tr { top: -50px; right: -50px; }
.threat__corner--bl { bottom: -50px; left: -50px; }
.threat__corner--br { bottom: -50px; right: -50px; }

.threat--warn .threat__corner {
  background: radial-gradient(circle, var(--amber-glow) 0%, transparent 70%);
  opacity: 0.55;
  animation: burn 1s steps(4) infinite;
}
.threat--danger .threat__corner {
  opacity: 0.9;
  animation: burn 0.5s steps(4) infinite;
}
.threat--meeting .threat__corner {
  opacity: 0.7;
}
@keyframes burn {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.18); }
}

/* CRT 扫描线 */
.threat__scanline {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0 2px,
    rgba(0, 0, 0, 0.12) 2px 3px
  );
  opacity: 0;
}
.threat--danger .threat__scanline,
.threat--meeting .threat__scanline {
  opacity: 1;
  animation: scan 0.12s linear infinite;
}
@keyframes scan {
  0% { transform: translateY(0); }
  100% { transform: translateY(3px); }
}

/* 危险时的边缘频闪条 */
.threat__strobe {
  position: absolute;
  inset: 0;
  border: 3px solid var(--vermilion-bright);
  opacity: 0;
  animation: strobe 0.4s steps(2) infinite;
}
@keyframes strobe {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.6; }
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
