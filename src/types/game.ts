import * as THREE from 'three'

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
}

export interface InventorySlot {
  id: string
  type: PropType
  name: string
  icon: string
  description: string
  duration: number
  active: boolean
  startTime?: number
}

export interface Prop {
  id: string
  type: PropType
  name: string
  icon: string
  description: string
  duration: number
  active: boolean
  startTime?: number
}

export type PropType = 'speed' | 'invisible' | 'noise' | 'power'

export interface PropConfig {
  type: PropType
  name: string
  icon: string
  description: string
  duration: number
  spawnChance: number
}

export const PROP_CONFIGS: PropConfig[] = [
  {
    type: 'speed',
    name: '加速鞋',
    icon: '👟',
    description: '移动速度x2',
    duration: 5000,
    spawnChance: 0.25
  },
  {
    type: 'invisible',
    name: '隐身药水',
    icon: '🧪',
    description: '不被发现',
    duration: 5000,
    spawnChance: 0.25
  },
  {
    type: 'noise',
    name: '噪音器',
    icon: '📢',
    description: '吸引神人注意力',
    duration: 3000,
    spawnChance: 0.25
  },
  {
    type: 'power',
    name: '力量手套',
    icon: '🧤',
    description: '踹击计数+2',
    duration: 5000,
    spawnChance: 0.25
  }
]

export interface HidingSpot {
  id: string
  position: THREE.Vector3
  size: THREE.Vector3
  name: string
}

export const HIDING_SPOTS: HidingSpot[] = [
  {
    id: 'plant',
    position: new THREE.Vector3(-8, 0, -8),
    size: new THREE.Vector3(2, 3, 2),
    name: '盆栽'
  },
  {
    id: 'cabinet',
    position: new THREE.Vector3(8, 0, -8),
    size: new THREE.Vector3(3, 2, 1),
    name: '文件柜'
  },
  {
    id: 'sofa',
    position: new THREE.Vector3(-8, 0, 8),
    size: new THREE.Vector3(4, 1, 2),
    name: '沙发'
  }
]
