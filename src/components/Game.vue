<template>
  <div
    class="game-wrapper"
    :class="{
      'shake-light': shake === 'light',
      'shake-heavy': shake === 'heavy',
    }"
  >
    <TopBar
      :health="gameState.health"
      :max-health="gameState.maxHealth"
      :level="gameState.level"
      :kick-count="gameState.kickCount"
      :kick-target="gameState.kickTarget"
    />

    <div ref="gameContainer" class="game-canvas-container"></div>

    <!-- 危险烧灼边框（仅游戏中） -->
    <ThreatVignette
      v-if="gameStarted && !gameState.isGameOver"
      :enemy-state="gameState.enemyState"
      :is-patrol-warning="gameState.isPatrolWarning"
    />

    <InventoryBar
      v-if="gameStarted"
      :inventory="gameState.inventory"
      :equipped-weapon="gameState.equippedWeapon"
      :is-charging-throw="gameState.isChargingThrow"
      :use-prop="useProp"
    />

    <StatusTicker
      v-if="gameStarted"
      :pot-active="gameState.potActive"
      :pot-remaining-time="gameState.potRemainingTime"
      :attack-cooldown="gameState.attackCooldown"
      :combo-active="gameState.comboActive"
      :enemy-state="gameState.enemyState"
      :is-hidden="gameState.isHidden"
      :invisible-active="gameState.invisibleActive"
      :speed-active="gameState.speedActive"
    />

    <!-- 彩蛋模式武器栏 -->
    <div v-if="gameState.isEasterEgg" class="easter-weapons">
      <button
        v-for="(w, idx) in gameState.easterEggWeapons"
        :key="w.type"
        class="easter-weapon"
        :class="{ 'easter-weapon--active': w.type === gameState.easterEggWeaponType }"
        @click="switchEasterEggWeapon(w.type)"
      >
        <span class="easter-weapon__key">{{ idx + 1 }}</span>
        <span class="easter-weapon__name">{{ w.name }}</span>
      </button>
    </div>

    <OverlayScreens
      :screen="overlayScreen"
      :is-win="gameState.isWin"
      :kick-count="gameState.kickCount"
      :score="gameState.score"
      :transition-level="gameState.level"
      @start="startGame"
      @restart="restartGame"
      @nextLevel="nextLevel"
      @easter-egg="startEasterEgg"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { GameLoop } from '../babylon/GameLoop'
import TopBar from './hud/TopBar.vue'
import InventoryBar from './hud/InventoryBar.vue'
import StatusTicker from './hud/StatusTicker.vue'
import ThreatVignette from './hud/ThreatVignette.vue'
import OverlayScreens from './hud/OverlayScreens.vue'

const gameContainer = ref<HTMLDivElement>()
let gameLoop: GameLoop | null = null

const gameStarted = ref(false)
const shake = ref<'none' | 'light' | 'heavy'>('none')
let shakeTimeout: number | null = null

const DEFAULT_STATE = () => ({
  kickCount: 0,
  health: 3,
  maxHealth: 3,
  isGameOver: false,
  isWin: false,
  score: 0,
  inventory: [] as any[],
  potCooldown: 0,
  potActive: false,
  potRemainingTime: 0,
  enemyState: 'normal',
  isHidden: false,
  lastKickCount: 0,
  level: 1,
  kickTarget: 10,
  isLevelTransition: false,
  equippedWeapon: null as any,
  isChargingThrow: false,
  attackCooldown: 0,
  comboActive: false,
  invisibleActive: false,
  speedActive: false,
  isPatrolWarning: false,
  isEasterEgg: false,
  easterEggTimeRemaining: 0,
  easterEggWeaponType: null as string | null,
  easterEggWeapons: [] as { type: string; name: string }[],
})

const gameState = ref(DEFAULT_STATE())

// 当前应显示的 overlay：start / transition / gameover / none
const overlayScreen = computed<'start' | 'transition' | 'gameover' | 'none'>(() => {
  if (!gameStarted.value) return 'start'
  if (gameState.value.isEasterEgg) return 'none'
  if (gameState.value.isGameOver) return 'gameover'
  if (gameState.value.isLevelTransition) return 'transition'
  return 'none'
})

const triggerShake = (intensity: 'light' | 'heavy') => {
  shake.value = intensity
  if (shakeTimeout) window.clearTimeout(shakeTimeout)
  shakeTimeout = window.setTimeout(() => {
    shake.value = 'none'
  }, intensity === 'heavy' ? 120 : 80)
}

const attachLoop = () => {
  if (!gameContainer.value) return
  gameLoop = new GameLoop(gameContainer.value, (state) => {
    const prev = gameState.value
    gameState.value = { ...state, lastKickCount: prev.lastKickCount }

    // 命中分级震动：踢数增加 = light；武器挥砍（增幅≥3）= heavy
    if (state.kickCount > prev.lastKickCount) {
      const delta = state.kickCount - prev.lastKickCount
      triggerShake(delta >= 3 ? 'heavy' : 'light')
    }

    // 手榴弹爆炸震动
    if (state.grenadeShake) {
      triggerShake('heavy')
    }

    gameState.value.lastKickCount = state.kickCount
  })
}

const startGame = async () => {
  gameStarted.value = true
  attachLoop()
  await gameLoop!.init()
  gameLoop!.start()
}

const restartGame = () => {
  if (gameLoop) {
    gameLoop.dispose()
    gameLoop = null
  }
  gameState.value = DEFAULT_STATE()
  gameStarted.value = false
  window.setTimeout(async () => {
    gameStarted.value = true
    attachLoop()
    await gameLoop!.init()
    gameLoop!.start()
  }, 100)
}

let _fromEasterEgg = false

const nextLevel = () => {
  gameState.value.isLevelTransition = false
  if (_fromEasterEgg) {
    _fromEasterEgg = false
    gameLoop?.advanceLevelAfterEasterEgg()
  } else {
    gameLoop?.completeLevelTransition()
  }
}

const useProp = (index: number) => {
  gameLoop?.useProp(index)
}

const switchEasterEggWeapon = (type: string) => {
  gameLoop?.switchEasterEggWeapon(type as any)
}

const startEasterEgg = () => {
  _fromEasterEgg = true
  gameState.value.isLevelTransition = false
  gameLoop?.startEasterEgg(() => {
    // 彩蛋模式结束，恢复过渡画面状态
    gameState.value = {
      ...gameState.value,
      isLevelTransition: true,
      isEasterEgg: false,
      easterEggTimeRemaining: 0,
      easterEggWeaponType: null
    }
  })
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (['1','2','3','4','5','6'].includes(e.key)) {
    if (gameState.value.isEasterEgg) {
      const weapons = gameState.value.easterEggWeapons
      const idx = parseInt(e.key) - 1
      if (weapons[idx]) {
        switchEasterEggWeapon(weapons[idx].type)
      }
    } else {
      useProp(parseInt(e.key) - 1)
    }
  }
}

const handleResize = () => {
  gameLoop?.resize()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleResize)
  if (shakeTimeout) window.clearTimeout(shakeTimeout)
  gameLoop?.dispose()
})
</script>

<style scoped>
.game-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: var(--ink);
  font-family: var(--font-body);
}

.game-canvas-container {
  flex: 1;
  min-height: 0;
  cursor: crosshair;
  user-select: none;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* 命中分级震动 —— 取代旧版每次都抖 */
.game-wrapper.shake-light {
  animation: shake-light 0.08s var(--ease-office);
}
.game-wrapper.shake-heavy {
  animation: shake-heavy 0.12s var(--ease-office);
}
@keyframes shake-light {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-2px); }
}
@keyframes shake-heavy {
  0%, 100% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(-4px) translateY(1px); }
  50% { transform: translateX(4px) translateY(-1px); }
  75% { transform: translateX(-2px) translateY(1px); }
}

/* 彩蛋模式武器栏 */
.easter-weapons {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 50;
}
.easter-weapon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(30, 30, 30, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(4px);
}
.easter-weapon:hover {
  background: rgba(50, 50, 50, 0.8);
  border-color: rgba(255, 255, 255, 0.3);
}
.easter-weapon--active {
  background: rgba(84, 160, 255, 0.3);
  border-color: rgba(84, 160, 255, 0.8);
  color: #fff;
  box-shadow: 0 0 12px rgba(84, 160, 255, 0.4);
}
.easter-weapon__key {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  opacity: 0.6;
}
.easter-weapon--active .easter-weapon__key {
  opacity: 1;
}
.easter-weapon__name {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
}
</style>
