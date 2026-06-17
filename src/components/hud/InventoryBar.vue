<template>
  <div class="inventory">
    <div class="inventory__hint">
      <span class="hint-text">{{ hint }}</span>
    </div>
    <div class="inventory__slots">
      <button
        v-for="(item, index) in slots"
        :key="item?.id ?? `empty-${index}`"
        class="slot"
        :class="{
          'slot--empty': !item,
          'slot--weapon': item?.category === 'weapon',
          'slot--active': item?.active,
        }"
        :style="item ? { '--accent': accentOf(item.type) } : undefined"
        @click="item && useProp(index)"
        :disabled="!item"
        :title="item?.description"
      >
        <template v-if="item">
          <span class="slot__icon">{{ iconCharOf(item.type) }}</span>
          <span class="slot__name">{{ item.name }}</span>
          <span v-if="item.count > 1" class="slot__count">×{{ item.count }}</span>
        </template>
        <span class="slot__key">{{ index + 1 }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface InventorySlot {
  id: string
  type: string
  name: string
  description?: string
  category?: 'weapon' | 'consumable'
  count: number
  active?: boolean
}

const props = defineProps<{
  inventory: InventorySlot[]
  equippedWeapon: { type: string; name: string } | null
  isChargingThrow: boolean
  useProp: (index: number) => void
}>()

// 三格固定槽位
const slots = computed<(InventorySlot | null)[]>(() =>
  [0, 1, 2].map((i) => props.inventory[i] ?? null)
)

// 顶部提示文案：复刻旧逻辑但用克制的语气
const hint = computed(() => {
  if (props.isChargingThrow) return '蓄力中 … 松开右键掷出'
  const w = props.equippedWeapon
  if (w && (w.type === 'mace' || w.type === 'bat'))
    return `装备中：${w.name}　左击挥砍 / 右键蓄力掷出`
  if (w) return `装备中：${w.name}　点击挥砍`
  return '鼠标左键 — 踹击'
})

// 单字汉字图标替代 emoji —— 昭和文具印刷感的核心
const ICON_MAP: Record<string, { char: string; accent: string }> = {
  speed: { char: '走', accent: 'var(--moss)' },
  invisible: { char: '霧', accent: 'var(--steel)' },
  noise: { char: '騒', accent: 'var(--amber)' },
  combo: { char: '連', accent: 'var(--vermilion)' },
  mace: { char: '鎚', accent: 'var(--ink)' },
  bat: { char: '棒', accent: 'var(--ink)' },
  frying_pan: { char: '鍋', accent: 'var(--ink)' },
  ruler: { char: '尺', accent: 'var(--ink)' },
}
const iconCharOf = (t: string) => ICON_MAP[t]?.char ?? '？'
const accentOf = (t: string) => ICON_MAP[t]?.accent ?? 'var(--ink)'
</script>

<style scoped>
.inventory {
  background: var(--paper-warm);
  background-image: var(--bg-paper-texture);
  padding: var(--sp-3) var(--sp-5);
  border-top: var(--border-double);
  flex-shrink: 0;
}

.inventory__hint {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ink-soft);
  margin-bottom: var(--sp-2);
  letter-spacing: 0.05em;
  min-height: 18px;
}
.hint-text {
  animation: hint-blink 1.6s var(--ease-office) infinite;
}
@keyframes hint-blink {
  0%, 70% { opacity: 1; }
  85% { opacity: 0.35; }
}

.inventory__slots {
  display: flex;
  gap: var(--sp-3);
}

.slot {
  position: relative;
  width: 72px;
  height: 72px;
  background: var(--paper);
  border: var(--border-dashed);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  padding: 0;
  transition: transform 0.12s var(--ease-office), box-shadow 0.12s var(--ease-office);
  font-family: var(--font-body);
  color: var(--ink);
}
.slot:not(.slot--empty):not(:disabled) {
  border: var(--border-solid);
  box-shadow: var(--shadow-hard-sm);
}
.slot:not(.slot--empty):hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-hard);
}
.slot:active {
  transform: translate(1px, 1px);
  box-shadow: var(--shadow-press);
}
.slot--empty {
  opacity: 0.4;
  cursor: default;
}
.slot--weapon {
  border-color: var(--vermilion);
  border-width: 2px;
}
.slot--active {
  animation: slot-active 1s var(--ease-office) infinite;
}
@keyframes slot-active {
  0%, 100% {
    background: var(--paper);
    color: var(--ink);
  }
  50% {
    background: var(--moss-dark);
    color: var(--bone);
  }
}

.slot__icon {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  color: var(--accent, var(--ink));
  line-height: 1;
}
.slot__name {
  font-family: var(--font-body);
  font-size: 10px;
  color: var(--ink-soft);
  letter-spacing: 0.02em;
}
.slot--active .slot__name {
  color: var(--bone);
}
.slot__count {
  position: absolute;
  top: -6px;
  left: -6px;
  background: var(--vermilion);
  color: var(--bone);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1;
  padding: 2px 5px;
  border: 1px solid var(--ink);
}
.slot__key {
  position: absolute;
  top: 4px;
  right: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--paper-dark);
}

@media (max-width: 640px) {
  .inventory {
    padding: var(--sp-2) var(--sp-3);
  }
  .slot {
    width: 56px;
    height: 56px;
  }
  .slot__icon {
    font-size: 24px;
  }
}
</style>
