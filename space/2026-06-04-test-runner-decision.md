# 2026-06-04 Test Runner Decision

## Background

The development TODO asks whether test execution should continue using Node type stripping or switch to a dedicated test runner.

## Goal

Make an explicit near-term test runner decision so future route, script, and agent tests follow one documented path.

## Confirmed Details

- Current tests already run with `node --experimental-strip-types --test`.
- API route tests require Node ESM-compatible imports.
- The project does not yet have component tests, browser E2E in CI, coverage gates, or complex module mocking.
- Completed TODO items must be marked as complete and committed separately.

## Decision

Keep Node's built-in test runner with `--experimental-strip-types` for the current MVP foundation.

## Rationale

- It avoids adding another runner while tests are mostly deterministic unit, integration, smoke, route-handler, and script checks.
- The current suite runs quickly and works against temporary SQLite data directories.
- The import constraints are manageable and documented.
- The project can still switch later when component/E2E testing becomes a normal requirement.

## Tradeoffs

- The command emits an experimental warning.
- Test-imported modules need explicit ESM-compatible imports.
- Node's built-in runner has fewer batteries for DOM, coverage, watch mode, and module mocking than Vitest.

## Follow-Up Trigger

Revisit this decision when Storyforge adds normal CI browser flows, component tests, provider adapter mocks that need module interception, coverage gates, or if the experimental type-stripping warning becomes unacceptable.

## Implementation Notes

- Added `docs/testing.md`.
- Linked the testing strategy from `README.md`.
- Updated `docs/development-todo.md`.

## Verification Result

- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
