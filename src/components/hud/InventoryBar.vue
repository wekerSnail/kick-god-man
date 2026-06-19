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

const slots = computed<(InventorySlot | null)[]>(() =>
  [0, 1, 2, 3, 4, 5].map((i) => props.inventory[i] ?? null)
)

const hint = computed(() => {
  if (props.isChargingThrow) return '蓄力中 … 松开右键掷出'
  const w = props.equippedWeapon
  if (w && (w.type === 'mace' || w.type === 'bat'))
    return `装备中：${w.name}　左击挥砍 / 右键蓄力掷出`
  if (w) return `装备中：${w.name}　点击挥砍`
  const hasKeyboard = props.inventory.some(i => i.type === 'keyboard')
  return hasKeyboard ? '鼠标左键 — 键盘挡脸' : '鼠标左键 — 踹击'
})

// emoji 图标，更直观有趣
const ICON_MAP: Record<string, { char: string; accent: string }> = {
  speed: { char: '👟', accent: 'var(--moss)' },
  invisible: { char: '👻', accent: 'var(--steel)' },
  noise: { char: '📢', accent: 'var(--amber)' },
  combo: { char: '🥊', accent: 'var(--vermilion)' },
  mace: { char: '🏏', accent: 'var(--sky)' },
  bat: { char: '⚾', accent: 'var(--amber)' },
  frying_pan: { char: '🍳', accent: 'var(--ink-soft)' },
  ruler: { char: '📏', accent: 'var(--mint)' },
  keyboard: { char: '⌨️', accent: 'var(--lavender)' },
}
const iconCharOf = (t: string) => ICON_MAP[t]?.char ?? '❓'
const accentOf = (t: string) => ICON_MAP[t]?.accent ?? 'var(--ink)'
</script>

<style scoped>
.inventory {
  background: var(--paper-warm);
  padding: var(--sp-3) var(--sp-5);
  border-top: 2px solid rgba(84, 160, 255, 0.1);
  flex-shrink: 0;
}

.inventory__hint {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
  margin-bottom: var(--sp-2);
  letter-spacing: 0.02em;
  min-height: 18px;
}
.hint-text {
  animation: hint-blink 2s ease infinite;
}
@keyframes hint-blink {
  0%, 70% { opacity: 1; }
  85% { opacity: 0.5; }
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
  border: 2px dashed var(--paper-dark);
  border-radius: var(--radius-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s var(--ease-stamp), box-shadow 0.2s var(--ease-stamp);
  font-family: var(--font-body);
  color: var(--ink);
}
.slot:not(.slot--empty):not(:disabled) {
  border: 2px solid rgba(84, 160, 255, 0.2);
  box-shadow: var(--shadow-hard-sm);
}
.slot:not(.slot--empty):hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: var(--shadow-glow);
}
.slot:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: var(--shadow-press);
}
.slot--empty {
  opacity: 0.35;
  cursor: default;
}
.slot--weapon {
  border-color: var(--sky) !important;
  border-width: 2px;
  border-style: solid;
  box-shadow: 0 2px 12px rgba(84, 160, 255, 0.2);
}
.slot--active {
  animation: slot-active 1s ease infinite;
}
@keyframes slot-active {
  0%, 100% {
    background: var(--paper);
    color: var(--ink);
  }
  50% {
    background: var(--mint);
    color: var(--paper);
  }
}

.slot__icon {
  font-size: 28px;
  line-height: 1;
}
.slot__name {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-soft);
  letter-spacing: 0.02em;
}
.slot--active .slot__name {
  color: var(--paper);
}
.slot__count {
  position: absolute;
  top: -6px;
  left: -6px;
  background: var(--vermilion);
  color: var(--paper);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  box-shadow: 0 2px 6px rgba(255, 107, 107, 0.3);
}
.slot__key {
  position: absolute;
  top: 4px;
  right: 6px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
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
    font-size: 22px;
  }
}
</style>
