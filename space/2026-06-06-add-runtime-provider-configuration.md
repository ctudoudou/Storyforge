# Add Runtime Provider Configuration

## Context

The product needs flexible API integration instead of hard-coded vendors. The target provider set includes Volcengine, Kling, and local API services.

## Implementation Plan

- Keep deterministic fake/local providers as default fallback.
- Add a git-ignored runtime provider configuration path.
- Support provider modules for custom SDK, signing, upload, polling, and vendor-specific normalization.
- Support HTTP provider profiles for local services and gateway-style vendor integrations.
- Wire runtime provider resolution into image generation and video assembly first.

## Decisions

- Use `.storyforge/providers.json`, `STORYFORGE_PROVIDER_CONFIG`, or `STORYFORGE_PROVIDER_MODULE` for local runtime setup.
- Do not commit API keys, request logs, provider responses, or vendor credentials.
- Treat `volcengine` and `kling` as provider profile kinds, but route them through an HTTP gateway/module in this iteration because their exact signing and async job semantics should stay outside product UI code.
- Refactor script parsing and planning providers to async runtime selection in a later iteration.

## Verification

- Unit-test HTTP image generation provider contract with mocked `fetch`.
- Unit-test HTTP video assembly provider contract with mocked `fetch`.
- Preserve default fake/local behavior when no runtime provider config exists.
- `npm run test` passes.
- `npm run build` passes.
- `npm run typecheck` passes when run outside the `.next/types` generation window.
