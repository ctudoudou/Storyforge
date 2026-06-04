# 2026-06-05 Chinese Short Drama Parser Fixtures

## Background

Priority 1 requires deterministic parser fixtures for Chinese short-drama scripts.

## Goal

Expand parser coverage beyond one default script so future parser changes can be checked against varied Chinese short-drama structures.

## Confirmed Details

- Fixture data should stay local and deterministic.
- Existing tests should keep using `chineseShortDramaScript` without a large migration.
- New tests should cover multiple script shapes through a fixture collection.

## Proposed Scope

- Keep the existing default `chineseShortDramaScript` export.
- Add `chineseShortDramaFixtures` with multiple scripts and expected parser outputs.
- Cover scene heading variants, character introductions, relationships, reversals, decisions, dialogue, mood, and camera hints.
- Reuse fixtures in parser unit tests and API preview tests.

## Fixture Coverage

- `contract-reversal`: mixed Chinese-number and numeric scene headings, conflict/reversal/decision, mood and camera hints.
- `hospital-hearing`: `第一场` heading, explicit mood/camera, conflict and decision beats.
- `garage-livestream`: Chinese scene numbers above ten, inferred time of day, camera hints, reversal and conflict beats.

## Out Of Scope

- Live LLM parser fixtures.
- Snapshot testing against long generated JSON files.
- Non-Chinese scripts.

## Test Plan

- Parser unit tests iterate the full fixture set.
- API preview integration test uses one fixture from the set.
- Existing SQLite tests continue using the default fixture.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/unit/script-parser-agent.test.ts tests/integration/api-routes.test.ts tests/integration/local-db.test.ts` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
