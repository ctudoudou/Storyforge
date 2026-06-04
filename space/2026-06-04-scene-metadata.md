# 2026-06-04 Scene Metadata

## Background

Priority 1 requires extracting scene mood, location, time of day, and camera hints more reliably.

## Goal

Improve scene metadata parsing while keeping the existing storyboard workflow intact.

## Confirmed Details

- The parser should handle Chinese scene heading variants.
- Camera and mood hints should come from explicit script lines when present.
- Scene mood should be persisted in SQLite.
- Completed TODO items must be marked as complete and committed separately.

## Proposed Scope

- Add scene `mood` persistence.
- Parse Chinese scene numbers and heading separators.
- Parse `镜头` / `运镜` / `机位` / `画面` camera hint lines.
- Parse `情绪` / `氛围` / `气氛` / `基调` mood hint lines.
- Infer fallback mood when no explicit mood is present.
- Display mood as an existing-style scene badge in storyboard cards.
- Add parser, migration, persistence, duplication, and smoke coverage.

## Out Of Scope

- Advanced semantic camera planning.
- Multi-shot breakdown per scene.
- Manual scene metadata editing.

## Data/API Contracts

`SceneRecord` now includes:

```ts
mood: string;
```

## Test Plan

- Agent tests for scene heading variants, mood, and camera hints.
- Migration test for the `scenes.mood` column.
- SQLite parse and duplication tests for scene metadata.
- Smoke test for storyboard mood copy.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/unit/script-parser-agent.test.ts tests/integration/migrations.test.ts tests/integration/local-db.test.ts tests/smoke/reference-routes.test.mjs` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Local API verification created a real SQLite-backed project, parsed `第一场：医院走廊 — 清晨 — 焦灼`, and returned `location: 医院走廊`, `timeOfDay: 清晨`, `mood: 焦灼`, `camera: 低角度固定镜头。`.
- Browser verification loaded the real project page at `http://127.0.0.1:3000/project/project_61e623e88fd7425ba192f6cfb68c1020`. Browser control could not click the storyboard tab because CDP click/screenshot commands timed out, so the temporary verification project was deleted after API verification.
