# 2026-06-04 Database Migrations

## Background

The development TODO lists database migration versioning as a Priority 0 foundation item. The existing local database initialization used table creation directly.

## Goal

Track local SQLite schema changes with explicit migration versions and migration bookkeeping.

## Confirmed Details

- Existing local databases should remain compatible.
- Fresh local databases should initialize through migrations.
- Completed TODO items must be marked as complete.
- Each completed TODO should be committed separately.

## Open Questions

- Whether future migrations should move into separate files once the migration list grows.

## Proposed Scope

- Add a `schema_migrations` table.
- Move initial schema creation into a versioned migration.
- Apply pending migrations at database startup.
- Add tests for fresh database initialization and migration bookkeeping.
- Document migration workflow.
- Mark the TODO as complete.

## Out Of Scope

- Multi-file migration loader.
- Rollback migrations.
- Data repair tooling.

## Data/API Contracts

- New table: `schema_migrations`.
- Initial migration ID: `1`.
- Initial migration name: `initial_local_project_schema`.

## Test Plan

- Integration test that a fresh database records applied migrations.
- Integration test that a fresh database is usable after migrations run.
- Integration test that `schema_migrations` exists.
- Existing smoke tests, typecheck, build.

## Implementation Notes

- Added versioned migrations in `src/lib/db.ts`.
- Added `getAppliedMigrations`.
- Added `tests/integration/migrations.test.ts`.
- Updated `docs/development-todo.md` and `docs/data-model.md`.

## Verification Result

- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
- Real local SQLite database contains migration record `1: initial_local_project_schema`.
