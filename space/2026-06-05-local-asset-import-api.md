# 2026-06-05 Local Asset Import API

## Background

Priority 2 starts local asset management. Imported files should be copied into the local asset directory and registered in SQLite.

## Goal

Add a real upload/register API so UI import can use actual local persistence instead of mock asset data.

## Confirmed Details

- Uploaded files are stored under `data/assets/imports/`.
- Registered metadata goes into the existing `assets` table.
- Supported asset types are image, audio, and video.
- Unsupported files and files over 50MB are rejected.

## Proposed Scope

- Add `POST /api/assets`.
- Accept multipart form data with a `file` field.
- Validate file type from MIME type and extension.
- Validate non-empty files and the 50MB size limit.
- Store files under a unique local filename.
- Register imported assets via `registerAsset`.
- Add API route coverage for successful import and unsupported type rejection.

## Out Of Scope

- Browser UI for selecting files.
- Linking imported assets to characters, scenes, or timeline clips.
- Thumbnail generation.
- Deletion rules.

## Test Plan

- API route test imports a PNG file, verifies SQLite metadata, and verifies the local file exists.
- API route test rejects unsupported text files.
- `npm run typecheck`.

## Verification Result

- `node --experimental-strip-types --test tests/integration/api-routes.test.ts` passed.
- `npm run typecheck` passed.
