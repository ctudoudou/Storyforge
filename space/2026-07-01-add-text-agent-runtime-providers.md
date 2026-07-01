# Add Text Agent Runtime Providers

## Background

Provider runtime configuration currently supports image generation and video assembly. Script parsing, character design, scene design, and storyboard planning still use deterministic providers in the product runtime unless a provider is explicitly passed in tests.

## Goal

Allow configured module providers or HTTP gateway profiles to drive text-oriented agent stages while preserving deterministic fallback behavior.

## Confirmed Details

- Keep provider-specific SDK, signing, polling, and vendor normalization outside UI/database code.
- Continue using provider-neutral Storyforge contracts.
- Extend Settings so users can configure all runtime provider endpoints from the UI.
- Keep deterministic fake providers as fallback when no runtime provider is configured.

## Open Questions

- Exact vendor gateway implementations are still external to Storyforge.
- Live provider secrets remain local environment variables.

## Proposed Scope

- Add runtime endpoints for script parsing, character design, scene design, and storyboard planning.
- Add HTTP provider adapters for those endpoints.
- Add async runtime-aware product entrypoints for script parsing, character design, scene design, and storyboard planning.
- Update parse API routes to use runtime-aware parsing.
- Extend Settings quick configuration to show all six provider endpoints.
- Add tests for HTTP contracts and runtime fallback.

## Out of Scope

- Official Volcengine or Kling SDK calls inside the app.
- Real model invocation in automated tests.
- Full job queues for text agents.

## Data/API Contracts

- Runtime config `active` and provider `endpoints` can include:
  - `scriptParsing`
  - `characterDesign`
  - `sceneDesign`
  - `storyboardPlanning`
  - `imageGeneration`
  - `videoAssembly`
- HTTP providers receive `{ provider, request }` and return the existing provider output shape for each agent.

## Test Plan

- Unit tests for HTTP text provider contracts.
- Unit tests for runtime provider fallback.
- Route/integration tests should continue passing through runtime-aware parse routes.
- Run `npm run test`, `npm run typecheck`, and `npm run build`.

## Implementation Notes

- Existing synchronous data-layer parse helpers remain available for deterministic low-level tests.
- API routes use runtime-aware async parse helpers.

## Verification Result

- `npm run typecheck` passes.
- `npm run test` passes with 133 tests.
- `npm run build` passes.
- Browser check passed at `http://127.0.0.1:3002/settings`; Settings renders six provider sections for script parsing, character design, scene design, storyboard planning, image generation, and video assembly.
