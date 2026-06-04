# Add Agent Contract Coverage

## Background

After adding the core agent directories, Priority 5 needed an explicit check that every current agent exposes stable entrypoints, input/output schemas, and deterministic fake or local providers for automated tests.

## Scope

- Add `docs/agent-architecture.md`.
- Document current agent responsibilities, schema files, and test providers.
- Add smoke coverage for public agent entrypoints, exported schema types, and deterministic provider exports.
- Mark schema and fake/local provider coverage complete in the development TODO.

## Verification

- Smoke tests cover all current agent directories.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.

## Next

Continue Priority 5 with opt-in live provider tests.
