# 2026-06-05 Parser Partial Failure Recovery

## Background

Priority 1 requires failure recovery for partial parse results.

## Goal

When a parser provider returns one malformed or missing output section, keep other usable sections instead of failing the whole parse.

## Confirmed Details

- Provider output that is not an object is unrecoverable.
- Individual malformed sections should be normalized to empty arrays.
- Normalized sections should produce structured warnings.
- Preview and confirmed parse APIs should expose warnings.
- The UI should explain that only usable records will be written.

## Proposed Scope

- Normalize parser output sections in `parseScriptWithAgent`.
- Add parser warnings for malformed `characters`, `scenes`, `relationships`, `plotBeats`, and `dialogueBlocks`.
- Return structured `PARSE_FAILED` errors for unrecoverable parse failures.
- Include warnings in parse preview payloads and confirmed parse responses.
- Show partial-result warnings in the parser review UI and after confirmed writes.
- Add agent, API, and smoke coverage.

## Out Of Scope

- Field-level validation inside each array item.
- LLM retry or repair prompts.
- Background parse job retries.

## Test Plan

- Agent unit test for each malformed section.
- Agent unit test for unrecoverable provider output.
- API test for normal warning shape.
- Smoke test for partial-result warning copy.
- `npm run test`.
- `npm run typecheck`.
- `npm run build`.

## Verification Result

- `node --experimental-strip-types --test tests/unit/script-parser-agent.test.ts tests/integration/api-routes.test.ts tests/smoke/reference-routes.test.mjs` passed.
- `npm run test` passed.
- `npm run typecheck` passed after adding `PARSE_FAILED` to the shared API error code type.
- `npm run build` passed.
- Browser verification loaded `http://127.0.0.1:3000/project/new` and confirmed the script editor, autosave text, and parse button rendered after the ScriptEditor warning changes.
- The temporary browser verification project was deleted after verification.
