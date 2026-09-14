---
name: world-contributions
description: >-
  Validation and workflow rules for contributor assets, objects.ts, and placements.ts.
  Use when adding new world objects, creating sample items, reviewing contributor PRs, or updating Zod schemas.
---

# World Contributions Skill — Growing Worlds

## 1. Contributor Area Boundaries
Contributors only edit:
1. `public/assets/worlds/<worldId>/<object-id>.svg`
2. `src/data/worlds/<worldId>/objects.ts` (1–5 lines)
3. `src/data/worlds/<worldId>/placements.ts` (3–8 lines)

## 2. Validation Checklist
- **Object ID**: Kebab-case (`^[a-z0-9-]+$`). Always suffix with `-<yourName>` (e.g. `butterfly-alex`, `red-mushroom-sewmini`) to ensure global uniqueness and prevent label collisions.
- **Asset Path**: Must start with `/assets/worlds/<worldId>/` and exist on disk.
- **Coordinates**: `0 <= x <= 100`, `0 <= y <= 100`.
- **Contributor Attribution**: Includes valid GitHub username and optional avatar / PR number.
- **No Overwriting**: Avoid placing objects directly over existing ones without intentional artistic grouping.

## 3. Two-Commit Flow
- Commit 1: Asset + `objects.ts`
- Commit 2: `placements.ts` + attribution
