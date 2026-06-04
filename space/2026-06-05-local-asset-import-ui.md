# 2026-06-05 Local Asset Import UI

## Background

Priority 2 requires local file import/upload UI for images, audio, and video.

## Goal

Let users import local files from the Assets page and immediately see the registered SQLite-backed asset record.

## Confirmed Details

- The UI should use the existing dark reference style.
- Runtime UI must use the real `/api/assets` endpoint.
- Uploaded files are already stored and registered by `POST /api/assets`.
- The existing empty state should remain visible when there are no assets.

## Proposed Scope

- Add a hidden file input and `导入本地素材` action.
- Restrict selectable file types to supported images, audio, and video.
- POST selected files to `/api/assets`.
- Add imported asset records to the list without reloading the page.
- Show upload progress state, success text, and API errors.
- Display asset type icon, MIME/type, local path, and size.

## Out Of Scope

- Assigning assets to characters, scenes, or timeline clips.
- Asset preview drawer.
- Thumbnail generation.
- Asset deletion.

## Test Plan

- Smoke test locks the import UI copy.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.
- Browser verification opens `/assets` and confirms the import action renders.

## Verification Result

- `node --experimental-strip-types --test tests/smoke/reference-routes.test.mjs` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verification opened `http://127.0.0.1:3000/assets` and confirmed `预设资产`, `导入本地素材`, and the real local asset empty/list state rendered.
