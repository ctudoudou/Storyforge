# Add Opt-In Live Provider Tests

## Background

Priority 5 needed a live-provider test path that exercises the same agent contracts as deterministic providers without running by default, leaking secrets, or adding remote calls to ordinary development tests.

## Scope

- Add `npm run test:live`.
- Add `tests/live/live-provider-contracts.test.ts`.
- Require `STORYFORGE_RUN_LIVE_PROVIDER_TESTS=1` before any live provider test executes.
- Load live providers from `STORYFORGE_LIVE_PROVIDER_MODULE`.
- Allow provider-by-provider rollout while requiring at least one provider when live tests are enabled.
- Document environment variables, local module shape, and secret handling.
- Ignore `.storyforge-live/` for local provider modules.

## Verification

- `npm run test:live` skips all tests by default.
- `npm run test` remains deterministic and local-only.
- Run `npm run typecheck`.
- Run `npm run build`.

## Next

Continue Priority 5 with progress events and cancellation for long-running jobs.
