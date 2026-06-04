# 2026-06-04 Project Title Editing

## Background

The development TODO lists explicit project title editing as the first Priority 0 foundation item.

## Goal

Allow users to rename local SQLite-backed projects without leaving the existing UI baseline.

## Confirmed Details

- Project data is stored in local SQLite.
- UI styling should remain aligned with the supplied reference baseline.
- Completed TODO items must be marked as complete.
- Each completed TODO should be committed separately.

## Open Questions

- None for this iteration.

## Proposed Scope

- Add a project title update function to the SQLite data layer.
- Add `PATCH /api/projects/:projectId`.
- Add workspace header title editing.
- Add project-list title editing.
- Add tests for title update behavior.
- Mark the TODO as complete.

## Out Of Scope

- Project deletion.
- Project duplication.
- Bulk project management.
- Asset renaming.

## Data/API Contracts

- `PATCH /api/projects/:projectId`
- Request body: `{ "title": "New title" }`
- Empty titles are rejected with `400`.
- Missing projects return `404`.
- Successful updates return the updated project.

## Test Plan

- Data-layer integration test for title updates.
- API route integration test for title updates and empty-title validation.
- Existing smoke tests, typecheck, build.
- Browser verification from the workspace header and project list.

## Implementation Notes

- Added `updateProjectTitle` in `src/lib/db.ts`.
- Added `PATCH` handling in `src/app/api/projects/[projectId]/route.ts`.
- Added inline title editing in `src/app/pages/ProjectWorkspace.tsx`.
- Added inline title editing in `src/app/pages/Projects.tsx`.
- Updated `docs/development-todo.md` and `docs/data-model.md`.

## Verification Result

- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verified renaming from the workspace header.
- Browser verified renaming from the project list.
- Browser restored the verification project title to `未命名项目` after validation.
