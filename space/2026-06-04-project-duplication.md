# 2026-06-04 Project Duplication

## Background

The development TODO lists project duplicate/copy behavior as the third Priority 0 foundation item.

## Goal

Allow users to duplicate local SQLite-backed projects from project management surfaces.

## Confirmed Details

- Duplicated projects should copy scripts, characters, scenes, and timeline clips.
- Duplicated projects should keep references to existing local assets rather than copying files.
- Completed TODO items must be marked as complete.
- Each completed TODO should be committed separately.

## Open Questions

- Whether future duplication should offer options for copying only script, only structure, or full production data.

## Proposed Scope

- Add a project duplication function to the SQLite data layer.
- Add `POST /api/projects/:projectId/duplicate`.
- Add duplicate action to dashboard project cards.
- Add duplicate action to the project list.
- Add tests for duplication behavior.
- Mark the TODO as complete.

## Out Of Scope

- Deep-copying physical asset files.
- Duplicate-project naming customization.
- Selective copy options.

## Data/API Contracts

- `POST /api/projects/:projectId/duplicate`
- Missing projects return `404`.
- Successful duplication returns the new project with status `201`.
- Child records receive new IDs.
- Local asset references are preserved.

## Test Plan

- Data-layer integration test for duplicating project and child records.
- API behavior test for successful duplication and missing-project `404`.
- Existing smoke tests, typecheck, build.
- Browser verification from the dashboard and project list.

## Implementation Notes

- Added `duplicateProject` in `src/lib/db.ts`.
- Added `duplicateProjectById` in `src/lib/project-api.ts`.
- Added `POST` handling in `src/app/api/projects/[projectId]/duplicate/route.ts`.
- Added duplicate actions in `src/app/pages/Dashboard.tsx`.
- Added duplicate actions in `src/app/pages/Projects.tsx`.
- Updated `docs/development-todo.md` and `docs/data-model.md`.

## Verification Result

- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verified duplication from the dashboard.
- Browser verified duplication from the project list.
- API verification confirmed temporary duplicate-test projects were removed from SQLite after validation.
