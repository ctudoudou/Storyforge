# 2026-06-04 Agent Backed Script Parser

## Background

Priority 1 starts by replacing the deterministic parser with an agent-backed parser behind the same data contract.

## Goal

Introduce a script parser agent boundary without breaking the current local SQLite parse flow or UI contract.

## Confirmed Details

- The current UI and database expect parsed `characters` and `scenes`.
- Normal automated tests must use a deterministic fake provider.
- Provider-level output should make room for relationships and plot beats for later iterations.
- Completed TODO items must be marked as complete and committed separately.

## Proposed Scope

- Add `src/agents/script-parser/`.
- Move deterministic parsing logic behind a fake script parser provider.
- Keep `src/lib/script-parser.ts` as the compatible `{ characters, scenes }` entrypoint.
- Add Chinese short-drama parser fixture coverage.
- Add tests for provider boundary, relationships, plot beats, and invalid provider output.
- Mark the TODO as complete after verification.

## Out Of Scope

- Live LLM provider integration.
- Async parser jobs.
- Persisting relationships or plot beats to SQLite.
- Parser review UI.

## Data/API Contracts

The existing parse API continues writing the current `characters`, `scenes`, and timeline clips. The agent output additionally contains provider-level `relationships` and `plotBeats`, which are not persisted yet.

## Test Plan

- Agent unit tests for Chinese short-drama fixture output.
- Existing parser unit tests remain compatible.
- Existing SQLite parse integration tests remain compatible.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/unit/script-parser.test.ts tests/unit/script-parser-agent.test.ts tests/integration/local-db.test.ts` passed.
- `npm run test` passed.
- `npm run typecheck` passed.
- `npm run build` passed.
