# 2026-06-04 Dialogue Blocks

## Background

Priority 1 requires extracting dialogue blocks per scene from scripts.

## Goal

Persist parser-provided dialogue blocks and surface them in the existing storyboard workflow.

## Confirmed Details

- Dialogue extraction must use the script parser agent provider output.
- The UI style must continue following the supplied reference baseline.
- Dialogue blocks should use real SQLite persistence, not runtime mock data.
- Completed TODO items must be marked as complete and committed separately.

## Proposed Scope

- Add agent-level dialogue block output.
- Add a SQLite `dialogue_blocks` migration.
- Add dialogue block records to `ProjectDetail`.
- Write dialogue blocks during script parsing.
- Copy dialogue blocks during project duplication.
- Rely on project cascade deletion for cleanup.
- Display dialogue blocks inside existing storyboard scene cards.
- Add agent, migration, data-layer, duplication, and smoke coverage.

## Out Of Scope

- Dialogue editing UI.
- Voice track generation.
- Subtitle generation.
- Speaker identity resolution beyond parsed speaker names.

## Data/API Contracts

`ProjectDetail` now includes:

```ts
dialogueBlocks: Array<{
  id: string;
  projectId: string;
  sceneNumber: number;
  speaker: string;
  content: string;
  orderIndex: number;
}>
```

## Test Plan

- Agent unit tests for dialogue extraction.
- Migration tests for the dialogue block table.
- SQLite parse tests for dialogue block persistence.
- Duplication tests for dialogue block copying.
- Smoke test for storyboard dialogue UI copy.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/unit/script-parser-agent.test.ts tests/integration/migrations.test.ts tests/integration/local-db.test.ts tests/smoke/reference-routes.test.mjs` passed after fixing plot beat priority for dialogue text containing `真相`.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verified that a parsed local project shows `对白块` and `你现在出现，是想买走我的故事吗？` in the storyboard workspace.
- Temporary browser verification project was deleted through `DELETE /api/projects/:projectId`.
