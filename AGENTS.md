# AGENTS.md — Kick Game

## Project Overview

A 3D stealth/action game ("踹他一百下") built with Vue 3 + Babylon.js 9 + TypeScript. Player sneaks up on an office worker ("神人") and kicks them while avoiding detection.

## Tech Stack

- **Runtime**: Vue 3 (Composition API) + Babylon.js 9 (`@babylonjs/core` + `@babylonjs/loaders`)
- **Language**: TypeScript (strict: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`)
- **Build**: Vite 5.4 + vue-tsc
- **Package Manager**: pnpm
- **Deploy**: GitHub Pages via GitHub Actions (push to `master`)

## Commands

```bash
pnpm install          # Install dependencies (use pnpm, not npm)
pnpm dev              # Dev server on port 3000, binds 0.0.0.0
pnpm build            # vue-tsc -b && vite build — type errors block the build
pnpm preview          # Preview production build
```

**Important**: `pnpm build` runs type checking first. Fix type errors before building.

## Architecture

```
src/
├── main.ts                         # Vue app entry
├── App.vue                         # Root component
├── babylon/                        # Game engine (Babylon.js 9)
│   ├── GameLoop.ts                 # Main orchestrator (owns all systems)
│   ├── Props.ts                    # Prop spawning and pickup
│   ├── core/
│   │   ├── EngineContext.ts        # Engine/Scene/Camera/Shadow setup
│   │   ├── AssetManager.ts        # GLB model loading and caching
│   │   ├── EventBus.ts            # Pub-sub event system
│   │   ├── InputManager.ts        # Keyboard/mouse → abstract actions
│   │   └── StateMachine.ts        # Generic FSM
│   ├── entities/
│   │   ├── Player.ts              # Player entity (movement, kick, weapon, throw)
│   │   └── Enemy.ts               # Enemy AI (thin shell, delegates to states)
│   ├── state/
│   │   └── EnemyStates.ts         # Enemy state implementations (6 states)
│   ├── systems/
│   │   ├── AudioManager.ts        # Web Audio API sound effects
│   │   ├── CollisionSystem.ts     # Hit detection + enemy detection
│   │   ├── LevelManager.ts        # Level progression
│   │   └── ProjectileSystem.ts    # Thrown weapon physics
│   ├── environment/
│   │   ├── OfficeLevel.ts         # Office geometry (walls, furniture, lighting)
│   │   └── HidingSpots.ts         # Hide spots (plant, cabinet, sofa)
│   ├── weapons/
│   │   └── WeaponModels.ts        # Procedural 3D weapon meshes
│   └── easter-egg/                # 30s FPS shooting minigame
│       ├── EasterEggMode.ts       # Mode controller + lifecycle
│       ├── EasterEggWeapons.ts    # Gun/rocket/grenade system
│       ├── EasterEggBoss.ts       # Boss walking + reactions
│       ├── FirstPersonCamera.ts   # FPS camera
│       ├── RightHand.ts           # Right hand model + weapon attach
│       ├── EasterEggExplosion.ts  # Particle explosion effects
│       └── EasterEggHUD.ts        # Countdown HUD
├── components/
│   ├── Game.vue                   # Main game UI
│   └── hud/
│       ├── TopBar.vue             # Health, level, kick counter
│       ├── InventoryBar.vue       # Prop/weapon slots
│       ├── StatusTicker.vue       # Bottom status bar
│       ├── ThreatVignette.vue     # Danger/warning border overlay
│       └── OverlayScreens.vue     # Start/transition/game-over screens
├── styles/
│   └── theme.css                  # Design tokens (昭和 Office 怪谈)
└── types/
    └── game.ts                    # TypeScript interfaces, enums, configs
```

## Key Design Patterns

- **No ECS**: Traditional OOP classes, each owning their Babylon.js transforms/meshes
- **EventBus**: Decoupled communication between systems (typed event names)
- **InputManager**: Raw DOM events → abstract actions (`moveForward`, `kick`, `usePot`, `throwWeapon`)
- **StateMachine**: Generic FSM used by Enemy for state transitions
- **GameLoop**: Pure orchestrator — delegates to subsystems, syncs state to Vue via `onStateChange` callback each frame
- **State bridge**: Game engine pushes state to Vue `ref()` every frame; Vue never reads engine state directly

## Babylon.js Conventions

- 3D models loaded as GLB files via `AssetManager` (player, enemy, office, keyboard)
- Weapon meshes are procedural geometry from `WeaponModels.ts`
- Materials use `PBRMaterial`
- UI progress bars use `DynamicTexture` on `Plane` meshes with `billboardMode = BILLBOARDMODE_ALL`
- Shadows: `ShadowGenerator` attached to a directional light
- Camera: `FreeCamera` positioned at an isometric-like offset, lerped to follow player

## Visual System

The game uses a "昭和 Office 怪谈" (Showa Office Kwaidan) aesthetic:
- Design tokens in `src/styles/theme.css` — all colors/fonts/spacing via CSS variables
- No purple gradients, no emoji icons, no Material Design defaults
- Fonts: DotGothic16 (display), Zen Kaku Gothic New (body), VT323 (counters), Reggae One (stamps)
- HUD components in `src/components/hud/` — pure Vue/CSS overlays on top of Babylon canvas

## Game Mechanics Reference

- **7 levels** with kick targets: `[10, 20, 35, 50, 70, 100, 150]`
- **Attack cooldown**: 5 seconds (unless combo glove active)
- **Weapons**: Mace (damage 5, stun 3s), Bat (damage 3, stun 2s), Frying Pan/Ruler (damage 1)
- **Throw**: Only mace/bat can be thrown. Hold right-click to charge, release to fire.
- **Enemy states**: normal → phone_flashing → looking_back, plus stunned, meeting, patrolling
- **Meeting skill**: 50% chance every 12-20s, attacks blocked, weapons consumed
- **Patrol skill**: 60% chance every 20-35s, vision cone detection, backstab-only vulnerability
- **Keyboard shield (Space)**: 5s duration, 50% damage reduction, 5s cooldown after expiry
- **Invisible**: 5s duration, flickers when <1.5s remaining

## Build & Deploy

- CI: `.github/workflows/deploy.yml` — pnpm 8, Node 20, deploy to GitHub Pages
- Base path in production: `/kick-god-man/` (set in `vite.config.ts`)
- Output goes to `./dist`

## Path Aliases

- `@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)

## TypeScript Rules

- `noUnusedLocals: true` and `noUnusedParameters: true` — remove or prefix with `_` any unused variables/parameters
- `verbatimModuleSyntax: true` — use `import type` for type-only imports

## Asset Sources

- Character models: `src/assets/kenney_animated-characters-protagonists/`
- Furniture models: `src/assets/kenney_furniture-kit/`
- Weapon models: `src/assets/kenney_blaster-kit_2.1/`
- Mini characters: `src/assets/kenney_mini-characters/`
