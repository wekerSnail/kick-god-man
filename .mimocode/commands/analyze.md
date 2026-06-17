---
description: Analyze codebase and generate CLAUDE.md/AGENTS.md — project context for future AI sessions
---

Invoke the codebase-analysis skill.

Analyze the current project and generate a structured context file (CLAUDE.md or AGENTS.md) that gives future AI sessions instant project understanding.

Steps:
1. Detect tech stack from config files (package.json, tsconfig.json, angular.json, vite.config, etc.)
2. Map project directory structure to purpose
3. Identify architecture patterns, code conventions, and key abstractions
4. Read existing documentation (README, SPEC, design docs)
5. Generate a structured context file with: Overview, Tech Stack, Commands, Architecture, Code Conventions, Rules, Key Files
6. Save as CLAUDE.md (or AGENTS.md) in project root
7. Confirm with user before overwriting any existing file

Focus on rules and conventions that are most valuable for future sessions. Keep under 200 lines.
