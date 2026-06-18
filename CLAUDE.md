# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"踹他一百下" (Kick Him 100 Times) — a 3D stealth/action game where the player sneaks up on an office worker and kicks them while avoiding detection. Built with Vue 3 + Babylon.js 9 + TypeScript.

## Commands

```bash
pnpm install          # Install dependencies (use pnpm, not npm)
pnpm dev              # Dev server on port 3000, binds 0.0.0.0
pnpm build            # vue-tsc -b && vite build — type errors block the build
pnpm preview          # Preview production build
```

**Important**: `pnpm build` runs type checking first. Fix type errors before building.

## Architecture

### Active Engine: `src/babylon/`

The game uses **Babylon.js 9** (`@babylonjs/core` + `@babylonjs/loaders`). The `src/game/` directory is **dead code** (old Three.js version) — do not edit or reference it.

### Key Files

| File | Purpose |
|------|---------|
| `src/babylon/GameLoop.ts` | Main orchestrator — owns all systems, update loop, state bridge to Vue |
| `src/babylon/entities/Player.ts` | Player entity (movement, kick, weapon, throw charge, animations) |
| `src/babylon/entities/Enemy.ts` | Enemy AI (state machine: normal/phone/stunned/meeting/patrol) |
| `src/babylon/state/EnemyStates.ts` | Enemy state implementations |
| `src/babylon/environment/OfficeLevel.ts` | Office environment geometry (walls, furniture) |
| `src/babylon/environment/HidingSpots.ts` | Hide spots (plant, cabinet, sofa) |
| `src/babylon/core/EngineContext.ts` | Babylon engine, scene, camera, shadow setup |
| `src/babylon/core/AssetManager.ts` | GLB model loading and caching |
| `src/babylon/core/InputManager.ts` | Keyboard/mouse → abstract actions |
| `src/babylon/systems/ProjectileSystem.ts` | Thrown weapon physics |
| `src/babylon/weapons/WeaponModels.ts` | Procedural 3D weapon meshes |
| `src/babylon/easter-egg/EasterEggMode.ts` | Easter egg mode controller (30s FPS shooting minigame) |
| `src/babylon/easter-egg/EasterEggWeapons.ts` | Easter egg weapon system (gun/rocket/grenade) |
| `src/babylon/easter-egg/EasterEggBoss.ts` | Boss behavior in easter egg mode |
| `src/babylon/easter-egg/FirstPersonCamera.ts` | FPS camera for easter egg mode |
| `src/babylon/easter-egg/RightHand.ts` | Right hand model with weapon attachment |
| `src/babylon/easter-egg/EasterEggExplosion.ts` | Particle explosion effects |
| `src/babylon/easter-egg/EasterEggHUD.ts` | Countdown HUD for easter egg mode |
| `src/types/game.ts` | TypeScript interfaces, enums, weapon configs |
| `src/components/Game.vue` | Main game UI — imports from babylon/GameLoop |
| `src/components/hud/` | HUD components (TopBar, InventoryBar, StatusTicker, etc.) |

### Design Patterns

- **No ECS**: Traditional OOP classes, each owning their Babylon.js transforms/meshes
- **EventBus**: Decoupled communication between systems (typed event names)
- **InputManager**: Raw DOM events → abstract actions (`moveForward`, `kick`, `usePot`, `throwWeapon`)
- **GameLoop**: Pure orchestrator — delegates to subsystems, syncs state to Vue via `onStateChange` callback each frame
- **State bridge**: Game engine pushes state to Vue `ref()` every frame; Vue never reads engine state directly

### Input Bindings

| Key/Action | InputManager Action | Behavior |
|------------|---------------------|----------|
| W/A/S/D | `moveForward`/`moveLeft`/`moveBackward`/`moveRight` | Movement |
| Left Click | (direct `kick()` call via document click) | Kick or weapon swing |
| Right Mouse Button | `throwWeapon` | Hold to charge throw, release to fire |
| Space | `usePot` | Activate keyboard shield |
| 1/2/3 | `useProp1`/`useProp2`/`useProp3` | Use inventory items |

**Critical**: Left-click kick is wired via `document.addEventListener('click')` in `GameLoop.init()`, NOT through InputManager. Right-click throw IS through InputManager (`mousedown`/`mouseup` button === 2).

## Babylon.js Conventions

- 3D models are loaded as GLB files via `AssetManager` (player, enemy, office, keyboard)
- Weapon meshes are procedural geometry from `WeaponModels.ts`
- Materials use `PBRMaterial`
- UI progress bars use `DynamicTexture` on `Plane` meshes with `billboardMode = BILLBOARDMODE_ALL`
- Shadows: `ShadowGenerator` attached to a directional light
- Camera: `FreeCamera` positioned at an isometric-like offset, lerped to follow player

## Easter Egg Mode (彩蛋模式)

30-second FPS shooting minigame triggered from transition screen:
- **Trigger**: "奖励神人" button on level transition overlay
- **Gameplay**: First-person view with right hand + weapon, shoot walking Boss
- **Weapons**: Gun (auto-fire), Rocket (projectile + explosion), Grenade (arc throw + explosion)
- **Boss reactions**: Shake on hit (gun), stun 3s (rocket/grenade), random taunts
- **Implementation**: `src/babylon/easter-egg/` module, integrated via GameLoop

## Game Mechanics Reference

- **7 levels** with kick targets: `[10, 20, 35, 50, 70, 100, 150]`
- **Attack cooldown**: 5 seconds (unless combo glove active)
- **Weapons**: Mace (damage 5, stun 3s), Bat (damage 3, stun 2s), Frying Pan/Ruler (damage 1)
- **Throw**: Only mace/bat can be thrown (`canThrow()` check). Hold right-click to charge, release to fire. Power oscillates via sine wave.
- **Enemy states**: normal → phone_flashing → looking_back, plus stunned, meeting, patrolling, attacked
- **Meeting skill**: 50% chance every 12-20s, attacks blocked, weapons consumed
- **Keyboard shield (Space)**: 5s duration, 50% damage reduction, 5s cooldown after expiry
- **Invisible**: 5s duration, flickers when <1.5s remaining

## Path Aliases

- `@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)

## Build & Deploy

- CI: `.github/workflows/deploy.yml` — pnpm 8, Node 20, deploy to GitHub Pages
- Base path in production: `/kick-god-man/` (set in `vite.config.ts`)
- Output goes to `./dist`

## TypeScript Rules

- `noUnusedLocals: true` and `noUnusedParameters: true` — remove or prefix with `_` any unused variables/parameters
- `verbatimModuleSyntax: true` — use `import type` for type-only imports

## Asset Sources

- Character models: `src/assets/kenney_animated-characters-protagonists/`
- Furniture models: `src/assets/kenney_furniture-kit/`
- Weapon models: `src/assets/kenney_blaster-kit_2.1/`
- Mini characters: `src/assets/kenney_mini-characters/`
