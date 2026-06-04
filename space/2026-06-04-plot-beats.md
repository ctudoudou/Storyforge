# 2026-06-04 Plot Beats

## Background

Priority 1 requires extracting plot beats and conflict/reversal points from parsed scripts.

## Goal

Persist parser-provided plot beats and surface them in the existing storyboard workflow.

## Confirmed Details

- The script parser agent already exposes provider-level plot beats.
- The UI style must continue following the supplied reference baseline.
- Plot beats should use real SQLite persistence, not runtime mock data.
- Completed TODO items must be marked as complete and committed separately.

## Proposed Scope

- Add a SQLite `plot_beats` migration.
- Add plot beat records to `ProjectDetail`.
- Write plot beats during script parsing.
- Copy plot beats during project duplication.
- Rely on project cascade deletion for cleanup.
- Display plot beats in the existing storyboard workspace.
- Add migration, data-layer, duplication, and smoke coverage.

## Out Of Scope

- Manual plot beat editing.
- LLM-backed beat extraction.
- Timeline editing based on beats.
- Dialogue block persistence.

## Data/API Contracts

`ProjectDetail` now includes:

```ts
plotBeats: Array<{
  id: string;
  projectId: string;
  sceneNumber: number;
  type: "setup" | "conflict" | "reversal" | "decision";
  summary: string;
}>
```

## Test Plan

- Migration tests for the plot beat table.
- SQLite parse tests for plot beat persistence.
- Duplication tests for plot beat copying.
- Smoke test for storyboard plot beat UI copy.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/integration/local-db.test.ts tests/smoke/reference-routes.test.mjs` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verified that a parsed local project shows `剧情节点`, `冲突`, `反转`, and `决断` in the storyboard workspace.
- Temporary browser verification project was deleted through `DELETE /api/projects/:projectId`.
