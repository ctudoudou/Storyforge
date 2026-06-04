# 2026-06-04 Local SQLite Data Baseline

## Background

The user requested removing all mock data and using real local data instead. The database should be local SQLite, and images or other assets should be managed in a local directory.

## Goal

Replace hard-coded UI data with a local SQLite-backed data layer and local asset directory contract.

## Confirmed Details

- Remove hard-coded project, script, character, scene, and timeline mock data.
- Use a local SQLite database.
- Manage images and other assets in a local directory.
- Keep the existing UI style and layout.

## Open Questions

- How should users import or upload local assets in the UI?
- Should project title editing be added next?
- Should parsing remain deterministic for now, or should the next iteration connect an AI parser agent?
- What exact asset versioning policy should be used for regenerated character and scene images?

## Proposed Scope

- Add local SQLite tables for projects, scripts, assets, characters, scenes, and timeline clips.
- Add local asset directory support under `data/assets/`.
- Add API routes for project list, creation, detail, script save, script parse, and asset reads.
- Update UI pages to read real data via API.
- Add tests for parsing, SQLite persistence, and old mock removal.

## Out Of Scope

- Real image generation.
- File upload UI.
- AI provider integration.
- Project title editing.
- Video rendering or export.

## Data/API Contracts

Documented in `docs/data-model.md`.

## Test Plan

- Unit test the deterministic script parser.
- Integration test local SQLite project creation, script persistence, parsing, scene creation, character creation, and timeline clip creation.
- Smoke test that key routes remain wired and old mock data/remote images are removed.
- Run typecheck and production build.
- Verify local browser UI against the SQLite-backed project.

## Implementation Notes

- Added `better-sqlite3` as the stable local SQLite driver.
- Added `src/lib/db.ts` as the local data access layer.
- Added `src/lib/script-parser.ts` as the deterministic first-pass parser.
- Added `data/assets/.gitkeep` and ignored generated SQLite/assets in `.gitignore`.
- Replaced hard-coded project lists with `GET /api/projects`.
- Replaced `/project/new` behavior with real project creation and redirect.
- Replaced default script, character cards, storyboard scenes, and timeline clips with SQLite records.
- Removed remote Unsplash image usage from runtime workspace components.
- Added local asset serving through `GET /api/assets/:assetPath*`.

## Verification Result

- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- `GET /api/projects` returned local SQLite project data.
- Created a real local project through `POST /api/projects`.
- Saved script text through `PUT /api/projects/:projectId/script`.
- Parsed script through `POST /api/projects/:projectId/parse`.
- Browser verified `/project/:projectId` displays the real project title, script text, and parsed characters.
- Browser verified character, storyboard, and timeline tabs show SQLite-derived records.
- Browser verified old mock title `霸道总裁爱上我` is absent.

