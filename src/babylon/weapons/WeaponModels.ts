import {
  Scene,
  TransformNode,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial
} from '@babylonjs/core'
import type { PropType } from '../../types/game'

export function createWeaponMesh(type: PropType, scene: Scene): TransformNode {
  switch (type) {
    case 'mace':
      return createMaceMesh(scene)
    case 'bat':
      return createBatMesh(scene)
    case 'frying_pan':
      return createFryingPanMesh(scene)
    case 'ruler':
      return createRulerMesh(scene)
    default:
      return new TransformNode('weapon', scene)
  }
}

function createMaceMesh(scene: Scene): TransformNode {
  const group = new TransformNode('mace', scene)

  const handle = MeshBuilder.CreateCylinder('handle', {
    diameterTop: 0.08,
    diameterBottom: 0.08,
    height: 0.8,
    tessellation: 8
  }, scene)
  handle.position.y = 0
  handle.parent = group
  const handleMat = new PBRMaterial('maceHandleMat', scene)
  handleMat.albedoColor = Color3.FromHexString('#8B4513')
  handle.material = handleMat

  const head = MeshBuilder.CreateSphere('head', {
    diameter: 0.3,
    segments: 8
  }, scene)
  head.position.y = 0.45
  head.parent = group
  const headMat = new PBRMaterial('maceHeadMat', scene)
  headMat.albedoColor = Color3.FromHexString('#666666')
  head.material = headMat

  const spikeMat = new PBRMaterial('spikeMat', scene)
  spikeMat.albedoColor = Color3.FromHexString('#888888')

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const spike = MeshBuilder.CreateCylinder(`spike_${i}`, {
      diameterTop: 0,
      diameterBottom: 0.08,
      height: 0.12,
      tessellation: 4
    }, scene)
    spike.position = new Vector3(
      Math.cos(angle) * 0.15,
      0.45,
      Math.sin(angle) * 0.15
    )
    spike.rotation.z = Math.PI / 2
    spike.rotation.y = angle
    spike.parent = group
    spike.material = spikeMat
  }

  return group
}

function createBatMesh(scene: Scene): TransformNode {
  const group = new TransformNode('bat', scene)

  const bat = MeshBuilder.CreateCylinder('bat', {
    diameterTop: 0.06,
    diameterBottom: 0.12,
    height: 0.9,
    tessellation: 8
  }, scene)
  bat.position.y = 0.1
  bat.parent = group
  const batMat = new PBRMaterial('batMat', scene)
  batMat.albedoColor = Color3.FromHexString('#CD853F')
  bat.material = batMat

  const grip = MeshBuilder.CreateCylinder('grip', {
    diameter: 0.07,
    height: 0.2,
    tessellation: 8
  }, scene)
  grip.position.y = -0.3
  grip.parent = group
  const gripMat = new PBRMaterial('gripMat', scene)
  gripMat.albedoColor = Color3.FromHexString('#333333')
  grip.material = gripMat

  return group
}

function createFryingPanMesh(scene: Scene): TransformNode {
  const group = new TransformNode('fryingPan', scene)

  const pan = MeshBuilder.CreateCylinder('pan', {
    diameter: 0.4,
    height: 0.04,
    tessellation: 16
  }, scene)
  pan.position.y = 0.15
  pan.parent = group
  const panMat = new PBRMaterial('panMat', scene)
  panMat.albedoColor = Color3.FromHexString('#444444')
  pan.material = panMat

  const handle = MeshBuilder.CreateCylinder('handle', {
    diameter: 0.05,
    height: 0.35,
    tessellation: 8
  }, scene)
  handle.position = new Vector3(-0.25, -0.05, 0)
  handle.rotation.z = Math.PI / 2
  handle.parent = group
  const handleMat = new PBRMaterial('panHandleMat', scene)
  handleMat.albedoColor = Color3.FromHexString('#8B4513')
  handle.material = handleMat

  return group
}

function createRulerMesh(scene: Scene): TransformNode {
  const group = new TransformNode('ruler', scene)

  const ruler = MeshBuilder.CreateBox('ruler', {
    width: 0.06,
    height: 0.6,
    depth: 0.02
  }, scene)
  ruler.position.y = 0.05
  ruler.parent = group
  const rulerMat = new PBRMaterial('rulerMat', scene)
  rulerMat.albedoColor = Color3.FromHexString('#DEB887')
  ruler.material = rulerMat

  const markMat = new PBRMaterial('markMat', scene)
  markMat.albedoColor = Color3.FromHexString('#333333')

  for (let i = 0; i < 6; i++) {
    const mark = MeshBuilder.CreateBox(`mark_${i}`, {
      width: 0.04,
      height: 0.005,
      depth: 0.025
    }, scene)
    mark.position = new Vector3(0, -0.2 + i * 0.08, 0)
    mark.parent = group
    mark.material = markMat
  }

  return group
}

export function createWeaponPickupMesh(type: PropType, scene: Scene): TransformNode {
  const group = new TransformNode('weaponPickup', scene)

  const weapon = createWeaponMesh(type, scene)
  weapon.scaling = new Vector3(0.8, 0.8, 0.8)
  weapon.parent = group

  const glow = MeshBuilder.CreateSphere('glow', {
    diameter: 0.8,
    segments: 16
  }, scene)
  glow.parent = group
  const glowMat = new StandardMaterial('glowMat', scene)
  const color = getWeaponColor(type)
  glowMat.diffuseColor = color
  glowMat.emissiveColor = color
  glowMat.alpha = 0.2
  glow.material = glowMat

  return group
}

function getWeaponColor(type: PropType): Color3 {
  switch (type) {
    case 'mace': return Color3.FromHexString('#FF4444')
    case 'bat': return Color3.FromHexString('#CD853F')
    case 'frying_pan': return Color3.FromHexString('#444444')
    case 'ruler': return Color3.FromHexString('#DEB887')
    default: return Color3.White()
  }
}
