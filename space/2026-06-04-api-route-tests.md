# 2026-06-04 API Route Tests

## Background

The development TODO lists API route tests as a Priority 0 foundation item because previous coverage mostly exercised data-layer and route-helper functions.

## Goal

Exercise the actual Next.js route handler functions for project CRUD and duplication while keeping tests local-first.

## Confirmed Details

- Tests should run against a temporary SQLite data directory.
- Tests should call route handlers, not only `src/lib/db.ts` functions.
- Structured API errors should be verified at the route response level.
- Completed TODO items must be marked as complete and committed separately.

## Proposed Scope

- Make route handler modules importable in the Node test runner.
- Add route tests for project list, create, read, rename, duplicate, and delete.
- Verify structured route errors for invalid rename, missing duplicate, and missing read after delete.
- Mark the TODO as complete after verification.

## Out Of Scope

- Full browser-level API testing.
- Authentication or authorization behavior.
- Asset upload/import route coverage.

## Test Plan

- Run the new `tests/integration/api-routes.test.ts` directly.
- Run the full `npm run test` suite.
- Run `npm run typecheck`.
- Run `npm run build`.

## Implementation Notes

- Changed API route `NextResponse` imports to `next/server.js` so Node ESM tests can import route modules.
- Changed API route lib imports to explicit relative `.ts` imports for the same test runner path.
- Added route handler tests using real `Request` objects and `Response.json()`.
- Updated `docs/development-todo.md`.

## Verification Result

- `node --experimental-strip-types --test tests/integration/api-routes.test.ts` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- HTTP smoke verified `GET /api/projects` on the restarted dev server.
