# Live Provider Tests

Live provider tests are opt-in. They are not part of `npm run test`, and they must not run unless the developer explicitly enables them.

## Run

```bash
STORYFORGE_RUN_LIVE_PROVIDER_TESTS=1 \
STORYFORGE_LIVE_PROVIDER_MODULE=/absolute/path/to/live-providers.ts \
npm run test:live
```

Without `STORYFORGE_RUN_LIVE_PROVIDER_TESTS=1`, `npm run test:live` skips every live test.

## Provider Module

The module path should point to a local file outside committed source, such as `.storyforge-live/live-providers.ts`. The `.storyforge-live/` directory is ignored by Git.

Export either `liveProviders` or named provider exports:

```ts
export const liveProviders = {
  scriptParserProvider,
  characterDesignerProvider,
  sceneDesignerProvider,
  storyboardPlannerProvider,
  imageGenerationProvider,
  videoAssemblyProvider,
};
```

Each provider is optional. When a provider is missing, its live test is skipped. When live tests are enabled, at least one supported provider must be exported.

## Secrets

- Keep provider keys in `.env.local`, `.env.*.local`, shell environment variables, or another git-ignored local file.
- Do not commit live provider modules, API keys, generated credentials, request logs, or provider responses containing sensitive data.
- Live tests reuse the same public agent contracts as deterministic providers, so secrets should only be read inside the local provider module.

## Contract

Live provider output must satisfy the same validation as deterministic providers:

- parser providers return serializable parser sections.
- designer and planner providers return non-empty brief/summary fields and checklist/shot arrays.
- image providers return non-empty image bytes with a supported mime type and extension.
- video assembly providers write a local output artifact and return the output path.
