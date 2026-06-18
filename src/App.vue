<template>
  <div class="game-container">
    <Game />
  </div>
</template>

<script setup lang="ts">
import Game from './components/Game.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #E8F0FE;
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: 'Nunito', 'Microsoft YaHei', sans-serif;
}

.game-container {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
