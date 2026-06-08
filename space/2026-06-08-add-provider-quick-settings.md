# Add Provider Quick Settings

## Background

Runtime provider configuration already supports local HTTP services, Volcengine gateway profiles, Kling gateway profiles, and local provider modules. Users need a frontend Settings entry to create the common HTTP profile configuration without editing JSON by hand.

## Goal

Add a settings surface that reads and writes the local provider runtime config used by image generation and video assembly.

## Confirmed Details

- Keep the existing UI baseline and styling.
- Store quick settings in the local git-ignored provider config file.
- Support local HTTP, Volcengine gateway, and Kling gateway presets.
- Do not store real tokens in committed files; reference token environment variable names.

## Open Questions

- Exact official Volcengine and Kling SDK signing flows remain outside this iteration.
- Additional agent stages still need async runtime provider selection in a later iteration.

## Proposed Scope

- Add `/settings` page and connect the existing sidebar Settings entry.
- Add `/api/provider-config` GET and PUT endpoints.
- Validate provider config before writing.
- Add tests for API persistence and settings UI routing.

## Out of Scope

- Live vendor API calls.
- Secret management UI that writes actual tokens.
- Script parser, character designer, scene designer, and storyboard runtime provider switching.

## Data/API Contracts

- `GET /api/provider-config` returns `{ config, configPath, source, environmentOverride }`.
- `PUT /api/provider-config` accepts `{ config }` and writes the validated config file.
- Saved config remains compatible with `src/agents/provider-runtime.ts`.

## Test Plan

- Integration tests for missing config, saving config, and rejecting invalid provider configs.
- Smoke tests that `/settings` mounts and keeps the provider quick settings text.
- Run `npm run test`, `npm run typecheck`, and `npm run build`.

## Implementation Notes

- `.storyforge/providers.json` remains git-ignored.
- `STORYFORGE_PROVIDER_CONFIG` takes precedence; the settings API rejects writes while that environment override is active.

## Verification Result

- `npm run typecheck` passes.
- `npm run test` passes with 129 tests.
- `npm run build` passes and includes `/settings`.
- Browser check passed at `http://127.0.0.1:3002/settings` with visible local, Volcengine, Kling, image generation, and video assembly controls.
