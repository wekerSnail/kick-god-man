---
name: codebase-analysis
description: Analyze a codebase and generate CLAUDE.md / AGENTS.md — project context, conventions, architecture, and rules for future AI sessions
---

# Codebase Analysis

Generate a structured context file (CLAUDE.md or AGENTS.md) that gives future AI sessions instant project understanding.

## When to use

- First time working in a new project
- After major architectural changes that make existing docs stale
- User explicitly asks to "analyze the codebase" or "create CLAUDE.md/AGENTS.md"

## Procedure

### Phase 1 — Survey

1. **Tech stack detection**: Read `package.json`, `build.gradle`, `Cargo.toml`, `go.mod`, or equivalent to identify language, framework, runtime, and package manager.
2. **Project structure**: Glob top-level directories and key subdirectories (`src/`, `lib/`, `app/`, `tests/`, `docs/`). Map the directory tree to purpose (source, tests, config, assets).
3. **Entry points**: Find main entry files (`main.ts`, `index.js`, `App.vue`, `app.module.ts`, etc.) and router definitions.
4. **Configuration**: Read build configs (`vite.config.ts`, `angular.json`, `webpack.config.js`, `tsconfig.json`), environment files, and CI configs.

### Phase 2 — Deep analysis

5. **Architecture patterns**: Identify component/module organization (feature-based, layer-based, monorepo). Look for abstract base classes, dependency injection, state management patterns.
6. **Code conventions**: Detect naming conventions (file naming, variable casing), formatting rules (`.prettierrc`, `.editorconfig`, `.eslintrc`), and import patterns (path aliases, barrel exports).
7. **Database/data layer**: Identify ORM, database type, migration patterns, and query patterns (raw SQL vs query builder vs ORM).
8. **Testing strategy**: Check test framework, test file locations, and coverage patterns.
9. **Existing documentation**: Read README.md, CONTRIBUTING.md, existing CLAUDE.md, AGENTS.md, SPEC.md, or design docs.

### Phase 3 — Generate

10. **Write the context file** with these sections (adapt to project needs):

```markdown
# Project: [Name]

## Overview
[1-2 sentence description of what this project does]

## Tech Stack
- Language: ...
- Framework: ...
- Runtime: ...
- Package manager: ...
- Build tool: ...

## Commands
- `dev` / `start` — ...
- `build` — ...
- `test` — ...
- `lint` — ...

## Architecture
[Directory structure with purpose annotations]
[Key abstractions: base classes, services, stores]
[Data flow patterns]

## Code Conventions
- File naming: ...
- Component patterns: ...
- Import aliases: ...
- Formatting: ...

## Rules (for AI sessions)
[Project-specific constraints that every session must follow]
[Hard constraints from .cursorrules, .claude-instructions, or user-stated rules]

## Key Files
[Paths to the most important files with one-line descriptions]
```

### Phase 4 — Validate

11. **Spot-check**: Verify that referenced file paths actually exist.
12. **Confirm with user**: Present the generated file and ask if any rules or conventions are missing.

## Output

- Save as `CLAUDE.md` (for Claude Code) or `AGENTS.md` (for OpenCode/Cursor) in the project root.
- If both formats are requested, generate both — they share content but may differ in format.
- Always confirm with the user before overwriting an existing file.

## Notes

- Prefer concrete file paths and command examples over abstract descriptions.
- Include "Rules" section for hard constraints — these are the most valuable part for future sessions.
- Keep the file under 200 lines. If the project is complex, focus on the top-level patterns and key files.
