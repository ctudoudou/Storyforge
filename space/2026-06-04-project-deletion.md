# 2026-06-04 Project Deletion

## Background

The development TODO lists project deletion with confirmation as the second Priority 0 foundation item.

## Goal

Allow users to delete local SQLite-backed projects from project management surfaces with an explicit confirmation step.

## Confirmed Details

- Deleting a project should remove related scripts, characters, scenes, and timeline clips.
- Local asset files should not be deleted automatically.
- Completed TODO items must be marked as complete.
- Each completed TODO should be committed separately.

## Open Questions

- Whether a future iteration should offer an optional "also delete unused local assets" action.

## Proposed Scope

- Add a project delete function to the SQLite data layer.
- Add `DELETE /api/projects/:projectId`.
- Add delete action to the dashboard project cards.
- Add delete action to the project list.
- Add tests for delete behavior.
- Mark the TODO as complete.

## Out Of Scope

- Project duplication.
- Asset garbage collection.
- Undo after delete.

## Data/API Contracts

- `DELETE /api/projects/:projectId`
- Missing projects return `404`.
- Successful deletes return `{ "ok": true }`.
- SQLite foreign keys cascade dependent project records.
- Local files under `data/assets/` are not removed.

## Test Plan

- Data-layer integration test for project deletion and cascade behavior.
- API behavior test for successful deletion and missing-project `404`.
- Existing smoke tests, typecheck, build.
- Browser verification from the dashboard and project list.

## Implementation Notes

- Added `deleteProject` in `src/lib/db.ts`.
- Added `deleteProjectById` in `src/lib/project-api.ts`.
- Added `DELETE` handling in `src/app/api/projects/[projectId]/route.ts`.
- Added confirmed delete actions in `src/app/pages/Dashboard.tsx`.
- Added confirmed delete actions in `src/app/pages/Projects.tsx`.
- Updated `docs/development-todo.md` and `docs/data-model.md`.

## Verification Result

- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verified deletion from the dashboard.
- Browser verified deletion from the project list.
- API verification confirmed temporary delete-test projects were removed from SQLite.
