# 2026-06-04 Character Relationships

## Background

Priority 1 requires extracting character relationships, not only character mentions.

## Goal

Persist parser-provided character relationships and display them in the existing characters workspace.

## Confirmed Details

- The parser agent already exposes provider-level relationships.
- The UI style must continue following the supplied reference baseline.
- Relationship extraction should use real SQLite persistence, not runtime mock data.
- Completed TODO items must be marked as complete and committed separately.

## Proposed Scope

- Add a SQLite `character_relationships` migration.
- Add relationship records to `ProjectDetail`.
- Write relationships during script parsing.
- Copy relationships during project duplication.
- Rely on project cascade deletion for relationship cleanup.
- Display relationships in the existing character workspace.
- Add migration, data-layer, duplication, and smoke coverage.

## Out Of Scope

- Manual relationship editing.
- Graph visualization.
- Relationship confidence scoring.
- Persisting plot beats.

## Data/API Contracts

`ProjectDetail` now includes:

```ts
relationships: Array<{
  id: string;
  projectId: string;
  sourceName: string;
  targetName: string;
  relation: string;
  evidence: string;
}>
```

## Test Plan

- Migration tests for the relationship table.
- SQLite parse tests for relationship persistence.
- Duplication tests for relationship copying.
- Smoke test for the character relationship UI copy.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/integration/local-db.test.ts tests/smoke/reference-routes.test.mjs` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verified that a parsed local project shows `人物关系`, `林夏`, `顾沉`, and `同场互动` in the characters workspace.
- Temporary browser verification project was deleted through `DELETE /api/projects/:projectId`.
