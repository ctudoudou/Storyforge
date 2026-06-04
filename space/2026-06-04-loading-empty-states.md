# 2026-06-04 Loading And Empty States

## Background

The development TODO lists loading and empty states for every workspace tab as the next Priority 0 foundation item.

## Goal

Make empty local data states explicit across the core views without changing the supplied UI style baseline.

## Confirmed Details

- Keep the current reference UI structure and styling direction.
- Do not add mock data for empty states.
- Empty states should explain what is missing and what action should happen next.
- Completed TODO items must be marked as complete and committed separately.

## Proposed Scope

- Add active-tab loading copy for workspace project reads.
- Add empty script guidance.
- Add empty character, storyboard, and timeline guidance.
- Improve projects and assets loading/empty states.
- Add smoke coverage for key loading and empty-state copy.
- Mark the TODO as complete after verification.

## Out Of Scope

- New onboarding flow.
- New upload/import UI.
- Shared skeleton component system.
- Visual redesign of the reference interface.

## Test Plan

- Smoke test for core loading and empty-state copy.
- Existing integration, unit, smoke, typecheck, and build checks.
- Browser verification of empty workspace/project/assets states.

## Implementation Notes

- Added active-tab loading copy in the workspace shell.
- Added empty script, character, storyboard, and timeline guidance.
- Improved project list and assets empty-state guidance.
- Added visible assets list load failure handling.
- Added smoke coverage for key loading and empty-state copy.
- Updated `docs/development-todo.md`.

## Verification Result

- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Browser verified empty states for script, characters, storyboard, timeline, and assets.
