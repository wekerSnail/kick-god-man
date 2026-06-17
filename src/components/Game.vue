<template>
  <div class="game-wrapper" :class="{ 'screen-shake': isShaking, 'danger-flash': isDanger }">
    <div class="game-header">
      <div class="health-bar">
        <span class="health-label">生命值</span>
        <div class="health-hearts">
          <span v-for="i in gameState.maxHealth" :key="i" class="heart" :class="{ lost: i > gameState.health }">
            {{ i <= gameState.health ? '❤️' : '🖤' }}
          </span>
        </div>
      </div>
      <div class="level-display">
        <span class="level-label">第 {{ gameState.level }} 关</span>
      </div>
      <div class="score-display">
        <span class="kick-count">{{ gameState.kickCount }}</span>
        <span class="kick-label">/ {{ gameState.kickTarget }} 脚</span>
      </div>
    </div>

    <div ref="gameContainer" class="game-canvas-container"></div>

    <div class="inventory">
      <div class="inventory-label">道具栏 (按 1/2/3 使用) | {{ gameState.equippedWeapon ? '装备中: ' + gameState.equippedWeapon.name + ' (点击挥砍)' : '鼠标左键踹击' }}</div>
      <div class="inventory-items">
        <div 
          v-for="(item, index) in gameState.inventory" :key="item.id"
          class="inventory-slot"
          :class="{ active: item.active, weapon: item.category === 'weapon' }"
          @click="useProp(index)"
          :title="item.description"
        >
          <span class="prop-icon">{{ item.icon }}</span>
          <span class="prop-name">{{ item.name }}</span>
          <span v-if="item.category === 'weapon'" class="weapon-badge">武器</span>
          <span class="prop-key">{{ index + 1 }}</span>
        </div>
        <div v-for="i in (3 - gameState.inventory.length)" :key="'empty-' + i" class="inventory-slot empty">
          <span class="prop-icon">⬜</span>
          <span class="prop-key">{{ gameState.inventory.length + i }}</span>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <div class="pot-status">
        <span class="pot-label">键盘:</span>
        <span v-if="gameState.potActive" class="pot-active">挡脸中 ({{ Math.ceil(gameState.potRemainingTime) }}s)</span>
        <span v-else-if="gameState.potCooldown > 0" class="pot-cooldown">冷却中 ({{ Math.ceil(gameState.potCooldown) }}s)</span>
        <span v-else class="pot-ready">就绪 (按空格)</span>
      </div>
      <div class="enemy-status">
        <span class="enemy-label">神人:</span>
        <span v-if="gameState.enemyState === 'normal'" class="enemy-normal">用电脑</span>
        <span v-else-if="gameState.enemyState === 'phone_flashing'" class="enemy-warning">⚠️ 手机闪烁</span>
        <span v-else-if="gameState.enemyState === 'looking_back'" class="enemy-looking">👀 回头检查</span>
        <span v-else-if="gameState.enemyState === 'stunned'" class="enemy-stunned">💫 眩晕中</span>
        <span v-else-if="gameState.enemyState === 'meeting'" class="enemy-meeting">📢 开会中! 攻击无效</span>
      </div>
      <div class="hidden-status" v-if="gameState.isHidden">
        <span class="hidden-label">🛡️ 躲藏中</span>
      </div>
    </div>

    <div v-if="gameState.isLevelTransition" class="level-transition-overlay">
      <div class="level-transition-content">
        <div class="level-complete-icon">🎉</div>
        <h2>第 {{ gameState.level }} 关完成！</h2>
        <p>准备进入第 {{ gameState.level + 1 }} 关...</p>
      </div>
    </div>

    <div v-if="gameState.isGameOver" class="game-over-overlay">
      <div class="game-over-content">
        <h2>{{ gameState.isWin ? '🎉 胜利！' : '💀 被发现了！' }}</h2>
        <p>{{ gameState.isWin ? '你成功踹了神人100下！' : `你踹了 ${gameState.kickCount} 下后被发现` }}</p>
        <p class="score">得分: {{ gameState.score }}</p>
        <button @click="restartGame" class="restart-btn">再来一局</button>
      </div>
    </div>

    <div v-if="!gameStarted" class="start-overlay">
      <div class="start-content">
        <h1>🦶 是男人就踹他一百下</h1>
        <p>有一个神人，每天提供花里胡哨的建议折磨你</p>
        <p>你需要在他不注意时偷偷踹他</p>
        <p>踹满100下即可胜利！</p>
        <div class="controls-info">
          <p>🎮 操作说明：</p>
          <p>• WASD 移动</p>
          <p>• 鼠标 控制视角</p>
          <p>• 鼠标左键 踹击（1米内）</p>
          <p>• 空格 举键盘挡脸（5秒）</p>
          <p>• 1/2/3 使用道具</p>
          <p>• 手机闪烁时注意，神人要回头了！</p>
        </div>
        <button @click="startGame" class="start-btn">开始游戏</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { GameLoop } from '../game/GameLoop'

const gameContainer = ref<HTMLDivElement>()
let gameLoop: GameLoop | null = null
const gameStarted = ref(false)
const isShaking = ref(false)
const isDanger = ref(false)
let shakeTimeout: number | null = null
let dangerTimeout: number | null = null

const gameState = ref({
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
  kickTarget: 5,
  isLevelTransition: false,
  equippedWeapon: null as any
})

const startGame = () => {
  gameStarted.value = true
  if (gameContainer.value) {
    gameLoop = new GameLoop(gameContainer.value, (state) => {
      const prevState = gameState.value
      gameState.value = state
      
      if (state.kickCount > prevState.lastKickCount) {
        triggerShake()
      }
      
      if (state.enemyState === 'phone_flashing' || state.enemyState === 'looking_back') {
        triggerDanger()
      }
      
      gameState.value.lastKickCount = state.kickCount
    })
    gameLoop.start()
  }
}

const triggerShake = () => {
  isShaking.value = true
  if (shakeTimeout) clearTimeout(shakeTimeout)
  shakeTimeout = window.setTimeout(() => {
    isShaking.value = false
  }, 150)
}

const triggerDanger = () => {
  isDanger.value = true
  if (dangerTimeout) clearTimeout(dangerTimeout)
  dangerTimeout = window.setTimeout(() => {
    isDanger.value = false
  }, 500)
}

const restartGame = () => {
  if (gameLoop) {
    gameLoop.dispose()
    gameLoop = null
  }
  gameState.value = {
    kickCount: 0,
    health: 3,
    maxHealth: 3,
    isGameOver: false,
    isWin: false,
    score: 0,
    inventory: [],
    potCooldown: 0,
    potActive: false,
    potRemainingTime: 0,
    enemyState: 'normal',
    isHidden: false,
    lastKickCount: 0,
    level: 1,
    kickTarget: 5,
    isLevelTransition: false,
    equippedWeapon: null
  }
  gameStarted.value = false
  setTimeout(() => {
    if (gameContainer.value) {
      gameLoop = new GameLoop(gameContainer.value, (state) => {
        const prevState = gameState.value
        gameState.value = state
        
        if (state.kickCount > prevState.lastKickCount) {
          triggerShake()
        }
        
        if (state.enemyState === 'phone_flashing' || state.enemyState === 'looking_back') {
          triggerDanger()
        }
        
        gameState.value.lastKickCount = state.kickCount
      })
      gameLoop.start()
      gameStarted.value = true
    }
  }, 100)
}

const useProp = (index: number) => {
  if (gameLoop) {
    gameLoop.useProp(index)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleResize)
  if (gameLoop) {
    gameLoop.dispose()
  }
})

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === '1' || e.key === '2' || e.key === '3') {
    const index = parseInt(e.key) - 1
    useProp(index)
  }
}

const handleResize = () => {
  if (gameLoop) {
    gameLoop.resize()
  }
}
</script>

<style scoped>
.game-wrapper {
  background: #f0f4f8;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  transition: transform 0.1s ease-out;
}

.game-wrapper.screen-shake {
  animation: shake 0.15s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-3px); }
}

.game-wrapper.danger-flash::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at center, transparent 0%, rgba(255, 87, 34, 0.4) 100%);
  pointer-events: none;
  z-index: 50;
  animation: dangerPulse 0.5s ease-out;
}

@keyframes dangerPulse {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

.game-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  z-index: 10;
}

.health-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.health-label {
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.health-hearts {
  display: flex;
  gap: 8px;
}

.heart {
  font-size: 28px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.heart.lost {
  opacity: 0.4;
  transform: scale(0.7);
  filter: grayscale(1);
}

.level-display {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.25);
  padding: 8px 16px;
  border-radius: 20px;
}

.level-label {
  font-weight: 700;
  font-size: 16px;
  color: #ffd700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.score-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
  background: rgba(255,255,255,0.25);
  padding: 8px 16px;
  border-radius: 20px;
}

.kick-count {
  font-size: 32px;
  font-weight: 800;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  color: #ffd700;
}

.kick-label {
  font-size: 14px;
  opacity: 0.95;
  font-weight: 500;
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

.inventory {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 12px 24px;
  border-top: 3px solid #667eea;
}

.inventory-label {
  font-size: 11px;
  color: #667eea;
  margin-bottom: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.inventory-items {
  display: flex;
  gap: 12px;
}

.inventory-slot {
  width: 64px;
  height: 64px;
  background: linear-gradient(145deg, #ffffff 0%, #f0f4f8 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.inventory-slot:hover:not(.empty) {
  border-color: #667eea;
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.inventory-slot.active {
  border-color: #4caf50;
  background: linear-gradient(145deg, #e8f5e9 0%, #c8e6c9 100%);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
  animation: activePulse 1s infinite;
}

@keyframes activePulse {
  0%, 100% { box-shadow: 0 0 10px rgba(76, 175, 80, 0.4); }
  50% { box-shadow: 0 0 25px rgba(76, 175, 80, 0.6); }
}

.inventory-slot.empty {
  opacity: 0.4;
  cursor: default;
}

.prop-icon {
  font-size: 26px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.prop-name {
  font-size: 9px;
  color: #64748b;
  margin-top: 3px;
  font-weight: 500;
}

.prop-key {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 10px;
  color: #667eea;
  font-weight: 700;
  background: rgba(102, 126, 234, 0.15);
  padding: 2px 5px;
  border-radius: 4px;
}

.status-bar {
  padding: 10px 24px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  display: flex;
  gap: 24px;
  font-size: 13px;
  border-top: 1px solid #e2e8f0;
}

.pot-status, .enemy-status, .hidden-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f1f5f9;
  border-radius: 8px;
}

.pot-label, .enemy-label, .hidden-label {
  font-weight: 600;
  color: #475569;
}

.pot-active {
  color: #4caf50;
  font-weight: bold;
}

.pot-cooldown {
  color: #ff9800;
}

.pot-ready {
  color: #2196f3;
}

.enemy-normal {
  color: #64748b;
}

.enemy-warning {
  color: #ff5722;
  font-weight: bold;
  animation: warningFlash 0.3s infinite;
}

@keyframes warningFlash {
  0%, 100% { opacity: 1; color: #ff5722; }
  50% { opacity: 0.6; color: #ff0000; }
}

.enemy-looking {
  color: #f44336;
  font-weight: bold;
  animation: lookingPulse 0.5s infinite;
}

@keyframes lookingPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.enemy-stunned {
  color: #ffd700;
  font-weight: bold;
  animation: stunPulse 0.5s infinite;
}

@keyframes stunPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.enemy-meeting {
  color: #FF4444;
  font-weight: bold;
  animation: meetingPulse 0.8s infinite;
}

@keyframes meetingPulse {
  0%, 100% { opacity: 1; text-shadow: 0 0 8px rgba(255, 68, 68, 0.6); }
  50% { opacity: 0.7; text-shadow: 0 0 16px rgba(255, 68, 68, 0.9); }
}

.inventory-slot.weapon {
  border-color: #ff9800;
  background: linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%);
}

.weapon-badge {
  font-size: 8px;
  color: #ff9800;
  font-weight: bold;
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
}

.hidden-label {
  color: #4caf50;
  font-weight: bold;
}

.level-transition-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 90;
  backdrop-filter: blur(4px);
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

.level-transition-content {
  text-align: center;
  color: white;
  animation: bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}

.level-complete-icon {
  font-size: 72px;
  margin-bottom: 16px;
  animation: iconPulse 0.8s ease-in-out infinite alternate;
}

@keyframes iconPulse {
  0% { transform: scale(1) rotate(0deg); }
  100% { transform: scale(1.1) rotate(5deg); }
}

.level-transition-content h2 {
  font-size: 36px;
  margin-bottom: 12px;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.level-transition-content p {
  font-size: 20px;
  opacity: 0.9;
}

.game-over-overlay,
.start-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(241, 245, 249, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.game-over-content,
.start-content {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  padding: 48px;
  border-radius: 24px;
  text-align: center;
  max-width: 480px;
  width: 90%;
  border: 2px solid #e2e8f0;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
}

.game-over-content h2,
.start-content h1 {
  margin-bottom: 20px;
  color: #1e293b;
}

.start-content h1 {
  font-size: clamp(24px, 5vw, 36px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.3;
}

.game-over-content p,
.start-content p {
  margin-bottom: 12px;
  color: #64748b;
  line-height: 1.8;
  font-size: clamp(14px, 3vw, 16px);
}

.score {
  font-size: 32px;
  font-weight: 800;
  color: #ffd700;
  margin: 20px 0 !important;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.controls-info {
  background: #f1f5f9;
  padding: clamp(12px, 3vw, 20px);
  border-radius: 16px;
  margin: 20px 0;
  text-align: left;
  border: 1px solid #e2e8f0;
}

.controls-info p {
  margin-bottom: 6px !important;
  font-size: clamp(12px, 2.5vw, 14px);
  color: #475569;
}

.restart-btn,
.start-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: clamp(12px, 3vw, 16px) clamp(24px, 6vw, 48px);
  font-size: clamp(16px, 3vw, 20px);
  font-weight: 700;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  margin-top: 20px;
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}

.restart-btn:hover,
.start-btn:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5);
}

.restart-btn:active,
.start-btn:active {
  transform: translateY(-2px) scale(0.98);
}
</style>
