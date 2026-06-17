<template>
  <div class="stick-figure" :class="{ 'looking-back': isLookingBack, 'kicking': isKicking, 'hit': isHit }">
    <div class="head">
      <div class="face">
        <div class="eyes">
          <span class="eye left">●</span>
          <span class="eye right">●</span>
        </div>
        <div class="mouth">{{ isLookingBack ? '😤' : '😊' }}</div>
      </div>
      <div class="hair">👨‍🦱</div>
    </div>
    <div class="body">
      <div class="shirt">👕</div>
    </div>
    <div class="legs">
      <div class="leg left">🦵</div>
      <div class="leg right">🦵</div>
    </div>
    <div v-if="isLookingBack" class="alert-icon">⚠️</div>
    <div v-if="isHit" class="hit-mark">💢</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isLookingBack: boolean
  isKicking: boolean
  isHit: boolean
}>()
</script>

<style scoped>
.stick-figure {
  position: relative;
  width: 80px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s;
}

.head {
  position: relative;
  width: 50px;
  height: 50px;
  background: #ffe0b2;
  border-radius: 50%;
  border: 3px solid #333;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
}

.face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.eyes {
  display: flex;
  gap: 10px;
}

.eye {
  font-size: 12px;
  color: #333;
}

.mouth {
  font-size: 16px;
}

.hair {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 30px;
}

.body {
  position: relative;
  margin-top: -5px;
}

.shirt {
  font-size: 40px;
}

.legs {
  display: flex;
  gap: 10px;
  margin-top: -10px;
}

.leg {
  font-size: 20px;
}

.alert-icon {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  animation: alertPulse 0.5s ease-in-out infinite;
}

@keyframes alertPulse {
  0%, 100% {
    transform: translateX(-50%) scale(1);
  }
  50% {
    transform: translateX(-50%) scale(1.2);
  }
}

.hit-mark {
  position: absolute;
  top: 0;
  right: -20px;
  font-size: 20px;
  animation: hitBounce 0.3s ease-out;
}

@keyframes hitBounce {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.5);
  }
  100% {
    transform: scale(1);
  }
}

.stick-figure.looking-back .head {
  transform: rotate(180deg);
}

.stick-figure.kicking {
  animation: kickShake 0.2s ease-out;
}

@keyframes kickShake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

.stick-figure.hit {
  animation: hitShake 0.3s ease-out;
}

@keyframes hitShake {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
