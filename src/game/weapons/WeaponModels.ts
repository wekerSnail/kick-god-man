import * as THREE from 'three'
import type { PropType } from '../../types/game'

export function createWeaponMesh(type: PropType): THREE.Group {
  switch (type) {
    case 'mace':
      return createMaceMesh()
    case 'bat':
      return createBatMesh()
    case 'frying_pan':
      return createFryingPanMesh()
    case 'ruler':
      return createRulerMesh()
    default:
      return new THREE.Group()
  }
}

function createMaceMesh(): THREE.Group {
  const group = new THREE.Group()

  const handleGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8)
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  const handle = new THREE.Mesh(handleGeom, handleMat)
  handle.position.y = 0
  group.add(handle)

  const headGeom = new THREE.SphereGeometry(0.15, 8, 8)
  const headMat = new THREE.MeshStandardMaterial({ color: 0x666666 })
  const head = new THREE.Mesh(headGeom, headMat)
  head.position.y = 0.45
  group.add(head)

  const spikeGeom = new THREE.ConeGeometry(0.04, 0.12, 4)
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0x888888 })
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const spike = new THREE.Mesh(spikeGeom, spikeMat)
    spike.position.set(
      Math.cos(angle) * 0.15,
      0.45,
      Math.sin(angle) * 0.15
    )
    spike.rotation.z = Math.PI / 2
    spike.rotation.y = angle
    group.add(spike)
  }

  return group
}

function createBatMesh(): THREE.Group {
  const group = new THREE.Group()

  const batGeom = new THREE.CylinderGeometry(0.03, 0.06, 0.9, 8)
  const batMat = new THREE.MeshStandardMaterial({ color: 0xCD853F })
  const bat = new THREE.Mesh(batGeom, batMat)
  bat.position.y = 0.1
  group.add(bat)

  const gripGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.2, 8)
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
  const grip = new THREE.Mesh(gripGeom, gripMat)
  grip.position.y = -0.3
  group.add(grip)

  return group
}

function createFryingPanMesh(): THREE.Group {
  const group = new THREE.Group()

  const panGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16)
  const panMat = new THREE.MeshStandardMaterial({ color: 0x444444 })
  const pan = new THREE.Mesh(panGeom, panMat)
  pan.position.y = 0.15
  group.add(pan)

  const handleGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8)
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  const handle = new THREE.Mesh(handleGeom, handleMat)
  handle.position.y = -0.05
  handle.rotation.z = Math.PI / 2
  handle.position.x = -0.25
  group.add(handle)

  return group
}

function createRulerMesh(): THREE.Group {
  const group = new THREE.Group()

  const rulerGeom = new THREE.BoxGeometry(0.06, 0.6, 0.02)
  const rulerMat = new THREE.MeshStandardMaterial({ color: 0xDEB887 })
  const ruler = new THREE.Mesh(rulerGeom, rulerMat)
  ruler.position.y = 0.05
  group.add(ruler)

  for (let i = 0; i < 6; i++) {
    const markGeom = new THREE.BoxGeometry(0.04, 0.005, 0.025)
    const markMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const mark = new THREE.Mesh(markGeom, markMat)
    mark.position.set(0, -0.2 + i * 0.08, 0)
    group.add(mark)
  }

  return group
}

export function createWeaponPickupMesh(type: PropType): THREE.Group {
  const group = new THREE.Group()

  const weapon = createWeaponMesh(type)
  weapon.scale.setScalar(0.8)
  group.add(weapon)

  const glowGeom = new THREE.SphereGeometry(0.4, 16, 16)
  const color = getWeaponColor(type)
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2
  })
  const glow = new THREE.Mesh(glowGeom, glowMat)
  group.add(glow)

  return group
}

function getWeaponColor(type: PropType): number {
  switch (type) {
    case 'mace': return 0xFF4444
    case 'bat': return 0xCD853F
    case 'frying_pan': return 0x444444
    case 'ruler': return 0xDEB887
    default: return 0xFFFFFF
  }
}
