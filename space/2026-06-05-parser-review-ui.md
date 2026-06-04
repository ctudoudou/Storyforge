# 2026-06-05 Parser Review UI

## Background

Priority 1 requires a parser result review UI before writing final records.

## Goal

Let users inspect parser output before it overwrites local SQLite production records.

## Confirmed Details

- The preview step should not write characters, relationships, plot beats, dialogue blocks, scenes, or timeline clips.
- The existing confirmed parse path remains responsible for final persistence.
- Canceling preview should leave existing records unchanged.
- The reference UI style should stay intact.

## Proposed Scope

- Add a parse preview API route.
- Add a data-layer preview function that parses script content without writing SQLite records.
- Show a review modal with counts and representative characters, plot beats, and scenes.
- Add confirm and cancel actions.
- Warn when confirming would replace existing parsed records.
- Add data-layer, API route, and smoke coverage.

## Out Of Scope

- Inline editing of preview records.
- Preserving user edits during re-runs.
- Persisting preview drafts.

## Test Plan

- Data-layer test proves preview does not write records.
- API route test proves preview returns parser output and confirm writes via the existing parse route.
- Smoke test proves review UI copy remains present.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/integration/local-db.test.ts tests/integration/api-routes.test.ts tests/smoke/reference-routes.test.mjs` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verification created a real SQLite-backed project, clicked `解析剧本`, and confirmed the `解析结果预览` modal showed `医院走廊`, `焦灼`, and `低角度固定镜头。`.
- Browser verification clicked `取消`; API verification confirmed characters, scenes, plot beats, and dialogue blocks remained at `0`.
- Browser verification clicked `确认写入`; API verification confirmed `2` characters, `1` scene, `mood: 焦灼`, and `camera: 低角度固定镜头。`.
- The temporary browser verification project was deleted after verification.
