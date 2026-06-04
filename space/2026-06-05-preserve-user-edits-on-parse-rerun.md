# 2026-06-05 Preserve User Edits On Parse Rerun

## Background

Priority 1 requires parser re-run behavior that preserves user edits where possible.

## Goal

Prevent confirmed parser re-runs from silently overwriting records that users have edited or linked to local assets.

## Confirmed Details

- The current app has no full parsed-record edit UI yet, so this iteration adds the persistence contract that later edit UI can mark.
- Parser-generated records should remain replaceable on re-run.
- User-edited records should be kept and should suppress duplicate parser inserts when they match the same natural key.
- Asset-linked character, scene, and timeline records should also be preserved because local asset references are user-managed state.

## Proposed Scope

- Add `is_user_edited` tracking to parsed production tables.
- Preserve user-edited characters, relationships, plot beats, dialogue blocks, scenes, and timeline clips during parser re-runs.
- Preserve asset-linked character, scene, and timeline records.
- Add preserved-record summaries to parse preview payloads.
- Show preserved-record summaries in the review UI before confirmation.
- Add migration, data-layer, and smoke coverage.

## Natural Keys

- Character: `name`
- Relationship: sorted source/target names
- Plot beat: `sceneNumber + type`
- Dialogue block: `sceneNumber + orderIndex`
- Scene: `sceneNumber`
- Timeline clip: `trackType + startMs`

## Out Of Scope

- Full parsed-record editing UI.
- Conflict resolution UI for changed natural keys.
- Historical diff or rollback views.

## Test Plan

- Migration test for `is_user_edited` on all parsed production tables.
- SQLite test that marks parsed records as user-edited, re-runs parsing, and verifies edited records survive.
- Smoke test for preserved-record review UI copy.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/integration/local-db.test.ts tests/smoke/reference-routes.test.mjs` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verification created a real SQLite-backed project, marked `林夏` and `S01 手工场景` as user-edited, clicked `重新解析`, and confirmed the review modal showed `将保留 2 条用户编辑或已绑定素材的记录`.
- The temporary browser verification project was deleted after verification.
