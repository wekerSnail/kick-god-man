# AGENTS.md — Kick Game

## Project Overview

A 3D stealth/action game ("是男人就踹他一百下") built with Vue 3 + Three.js + TypeScript. Player sneaks up on an office worker ("神人") and kicks them while avoiding detection.

## Tech Stack

- **Runtime**: Vue 3 (Composition API) + Three.js (WebGL)
- **Language**: TypeScript (strict: `noUnusedLocals`, `noUnusedParameters`)
- **Build**: Vite 5.4
- **Package Manager**: pnpm
- **Deploy**: GitHub Pages via GitHub Actions (push to `master`)

## Commands

```bash
# Install dependencies (use pnpm, not npm)
pnpm install

# Dev server (port 3000, binds 0.0.0.0)
pnpm dev

# Type check + production build
pnpm build

# Preview production build
pnpm preview
```

**Important**: `pnpm build` runs `vue-tsc -b && vite build` — type errors block the build.

## Architecture

```
src/
├── main.ts                    # Vue app entry
├── App.vue                    # Root component
├── components/
│   └── Game.vue               # Main game UI (HUD, overlays, inventory)
├── game/
│   ├── core/                  # Engine infrastructure
│   │   ├── EventBus.ts        # Pub-sub event system
│   │   ├── InputManager.ts    # Keyboard/mouse → abstract actions
│   │   ├── ObjectPool.ts      # Generic object pool
│   │   └── ResourceCache.ts   # Geometry/material cache
│   ├── systems/               # Game subsystems
│   │   ├── AudioManager.ts    # Web Audio API sound effects
│   │   ├── CollisionSystem.ts # Hit detection
│   │   ├── LevelManager.ts    # Level progression
│   │   └── ProjectileSystem.ts# Thrown weapon physics
│   ├── weapons/
│   │   └── WeaponModels.ts    # Procedural 3D weapon meshes
│   ├── GameLoop.ts            # Main orchestrator (owns all systems)
│   ├── Player.ts              # Player entity (input, weapons, animations)
│   ├── Enemy.ts               # Enemy AI (state machine: normal/phone/stunned/meeting)
│   ├── Props.ts               # Item spawning and pickup
│   ├── HidingSpots.ts         # Hide spots (plant, cabinet, sofa)
│   └── SceneManager.ts        # Three.js scene/camera/renderer setup
└── types/
    └── game.ts                # TypeScript interfaces, enums, configs
```

## Key Design Patterns

- **No ECS**: Traditional OOP classes, each owning their Three.js meshes
- **EventBus**: Decoupled communication between systems (typed event names)
- **InputManager**: Raw DOM events → abstract actions (`moveForward`, `kick`, `usePot`)
- **GameLoop**: Pure orchestrator — delegates to subsystems, syncs state to Vue via callback
- **State bridge**: Game engine pushes state to Vue `ref()` via `onStateChange` callback each frame

## Three.js Conventions

- All 3D models are **procedural geometry** (no external assets, no GLTF loaders)
- Materials use `MeshStandardMaterial` — needs lights to be visible
- For UI text overlays, use **CanvasTexture + Sprite** (not MeshStandardMaterial) — works without lighting
- Shadows: `PCFSoftShadowMap`, mobile uses 1024px, desktop 2048px
- `devicePixelRatio` capped at 2

## Game Mechanics Reference

- **7 levels** with kick targets: `[10, 20, 35, 50, 70, 100, 150]`
- **Attack cooldown**: 5 seconds between attacks (unless combo glove active)
- **Weapons**: Mace (damage 5, stun 3s), Bat (damage 3, stun 2s), Frying Pan/Ruler (damage 1)
- **Enemy states**: normal → phone_flashing → looking_back, plus stunned and meeting
- **Meeting skill**: 50% chance every 12-20s, attacks blocked, weapons consumed

## UI Rendering Gotcha

3D progress bars using `MeshStandardMaterial` appear black because they're small and miss lighting. Use **CanvasTexture + Sprite** instead — see `potCountdownSprite` and `throwCountdownSprite` patterns in Player.ts.

## Build & Deploy

- CI: `.github/workflows/deploy.yml` — pnpm 8, Node 20, deploy to GitHub Pages
- Base path in production: `/kick-god-man/` (set in `vite.config.ts`)

## Path Aliases

- `@/*` maps to `./src/*`
