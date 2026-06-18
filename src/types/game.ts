export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface UIState {
  kickCount: number
  health: number
  maxHealth: number
  isGameOver: boolean
  isWin: boolean
  score: number
  inventory: InventorySlot[]
  potCooldown: number
  potActive: boolean
  potRemainingTime: number
  enemyState: string
  isHidden: boolean
  level: number
  kickTarget: number
  isLevelTransition: boolean
  levelTransitionTimer: number
  equippedWeapon: WeaponConfig | null
  isChargingThrow: boolean
  attackCooldown: number
  comboActive: boolean
  invisibleActive: boolean
}

export interface InventorySlot {
  id: string
  type: PropType
  name: string
  icon: string
  description: string
  duration: number
  active: boolean
  category?: 'consumable' | 'weapon'
  startTime?: number
  count: number
}

export interface Prop {
  id: string
  type: PropType
  name: string
  icon: string
  description: string
  duration: number
  active: boolean
  category?: 'consumable' | 'weapon'
  startTime?: number
}

export type PropType = 'speed' | 'invisible' | 'noise' | 'combo' | 'mace' | 'bat' | 'frying_pan' | 'ruler'

export interface PropConfig {
  type: PropType
  name: string
  icon: string
  description: string
  duration: number
  spawnChance: number
  category?: 'consumable' | 'weapon'
}

export interface WeaponConfig extends PropConfig {
  category: 'weapon'
  damage: number
  stunDuration: number
  swingDuration: number
  swingRange: number
}

export const PROP_CONFIGS: PropConfig[] = [
  {
    type: 'speed',
    name: '加速鞋',
    icon: '👟',
    description: '移动速度x2',
    duration: 5000,
    spawnChance: 0.20,
    category: 'consumable'
  },
  {
    type: 'invisible',
    name: '隐身药水',
    icon: '🧪',
    description: '不被发现',
    duration: 5000,
    spawnChance: 0.20,
    category: 'consumable'
  },
  {
    type: 'noise',
    name: '噪音器',
    icon: '📢',
    description: '吸引神人注意力',
    duration: 3000,
    spawnChance: 0.15,
    category: 'consumable'
  },
  {
    type: 'combo',
    name: '连击手套',
    icon: '🥊',
    description: '5秒内连续攻击无冷却',
    duration: 5000,
    spawnChance: 0.15,
    category: 'consumable'
  }
]

export const WEAPON_CONFIGS: WeaponConfig[] = [
  {
    type: 'mace',
    name: '狼牙棒',
    icon: '🏏',
    description: '击中算5次，造成眩晕3秒',
    category: 'weapon',
    damage: 5,
    stunDuration: 3,
    swingDuration: 0.4,
    swingRange: 2.5,
    spawnChance: 0.12,
    duration: 0
  },
  {
    type: 'bat',
    name: '棒球棒',
    icon: '⚾',
    description: '击中算3次，造成眩晕2秒',
    category: 'weapon',
    damage: 3,
    stunDuration: 2,
    swingDuration: 0.35,
    swingRange: 2.8,
    spawnChance: 0.10,
    duration: 0
  },
  {
    type: 'frying_pan',
    name: '平底锅',
    icon: '🍳',
    description: '击中造成眩晕1.5秒',
    category: 'weapon',
    damage: 1,
    stunDuration: 1.5,
    swingDuration: 0.3,
    swingRange: 2.0,
    spawnChance: 0.05,
    duration: 0
  },
  {
    type: 'ruler',
    name: '戒尺',
    icon: '📏',
    description: '击中造成眩晕1秒, 攻速快',
    category: 'weapon',
    damage: 1,
    stunDuration: 1,
    swingDuration: 0.2,
    swingRange: 2.2,
    spawnChance: 0.03,
    duration: 0
  }
]

export interface HidingSpot {
  id: string
  position: Vec3
  size: Vec3
  name: string
}

export const HIDING_SPOTS: HidingSpot[] = [
  {
    id: 'plant',
    position: { x: -5, y: 0, z: -4 },
    size: { x: 2, y: 3, z: 2 },
    name: '盆栽'
  },
  {
    id: 'cabinet',
    position: { x: 5, y: 0, z: -9 },
    size: { x: 3, y: 2, z: 1 },
    name: '书架'
  },
  {
    id: 'sofa',
    position: { x: -4, y: 0, z: -2 },
    size: { x: 4, y: 1, z: 2 },
    name: '沙发'
  }
]

// ==================== 彩蛋模式（奖励神人）====================

export type EasterEggWeaponType = 'gun' | 'rocket' | 'grenade'

export interface EasterEggWeaponConfig {
  type: EasterEggWeaponType
  name: string
  glbFile: string
  damage: number
  fireRate: number         // 发/秒（枪连射间隔）
  projectileSpeed: number  // 单位/秒
  stunDuration: number     // 眩晕秒数（0=不眩晕，仅抖动）
}

export const EASTER_EGG_WEAPONS: readonly EasterEggWeaponConfig[] = [
  {
    type: 'gun',
    name: '激光枪',
    glbFile: 'blaster-a.glb',
    damage: 1,
    fireRate: 5,
    projectileSpeed: 50,
    stunDuration: 0
  },
  {
    type: 'rocket',
    name: '火箭炮',
    glbFile: 'scope-large-a.glb',
    damage: 3,
    fireRate: 0.5,
    projectileSpeed: 30,
    stunDuration: 3
  },
  {
    type: 'grenade',
    name: '手榴弹',
    glbFile: 'grenade-a.glb',
    damage: 2,
    fireRate: 0.8,
    projectileSpeed: 15,
    stunDuration: 3
  }
] as const

export const EASTER_EGG_DIALOGUES: readonly string[] = [
  '这需求不合理！',
  '我要找 PM 理论！',
  '这 bug 不是我写的！',
  '让我先喝杯咖啡...',
  '能不能先对齐一下？',
  '这个排期太紧了！',
  '我要请假！',
  '别打了，我认输还不行吗！',
  '你怎么不按套路出牌？',
  '我去找领导反映！',
  '这锅我不背！',
  '你是不是对需求有误解？',
  '我今天心情好，不跟你计较！',
  '等我写完这个 PR 再说...',
  '你再打我我就报警了！'
] as const

export interface EasterEggState {
  isActive: boolean
  timeRemaining: number
  currentWeaponType: EasterEggWeaponType
  bossShaking: boolean
  bossStunned: boolean
}
