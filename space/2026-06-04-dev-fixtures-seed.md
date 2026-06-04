# 2026-06-04 Development Fixtures Seed

## Background

The development TODO lists a simple seed/import script for local development fixtures without shipping mock data in the runtime UI.

## Goal

Provide an explicit local command that creates realistic development data through the real SQLite data layer.

## Confirmed Details

- Runtime UI must not load mock data automatically.
- Seed data is only created when the developer runs the command.
- The command should be rerunnable without accumulating duplicate fixture projects.
- Completed TODO items must be marked as complete and committed separately.

## Proposed Scope

- Add `npm run seed:dev`.
- Create one Chinese short-drama fixture project through the real data layer.
- Parse the script through the existing parser so characters, scenes, and timeline records are real SQLite rows.
- Register a local fixture asset under `data/assets/fixtures/`.
- Add a test that runs the command twice against a temporary data directory.
- Mark the TODO as complete after verification.

## Out Of Scope

- UI controls for importing fixtures.
- Large media files.
- Provider-backed generated assets.

## Test Plan

- Run the seed script behavior test.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/integration/seed-dev-fixtures.test.ts` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
