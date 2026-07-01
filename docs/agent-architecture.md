# Storyforge Agent Architecture

Storyforge agents are local-first contracts around production data. Each agent directory exposes its public surface from `index.ts`, keeps provider-agnostic schemas in `types.ts`, and includes a deterministic fake or local provider for automated tests.

## Agents

| Agent | Purpose | Contract Source | Test Provider |
| --- | --- | --- | --- |
| `script-parser` | Parse script text into production records. | `src/agents/script-parser/types.ts` | `createFakeScriptParserProvider` |
| `character-designer` | Build character design plans from SQLite character records and visual consistency settings. | `src/agents/character-designer/types.ts` | `createFakeCharacterDesignerProvider` |
| `scene-designer` | Build scene/keyframe design plans from SQLite scene records, linked scene assets, and project context. | `src/agents/scene-designer/types.ts` | `createFakeSceneDesignerProvider` |
| `storyboard-planner` | Build storyboard shot plans from scenes, plot beats, dialogue blocks, and timeline clips. | `src/agents/storyboard-planner/types.ts` | `createFakeStoryboardPlannerProvider` |
| `asset-generator` | Generate local image assets through provider adapters. | `src/agents/asset-generator/types.ts` | `createFakeImageGenerationProvider` |
| `video-assembler` | Create local export artifacts from assembly manifests. | `src/agents/video-assembler/types.ts` | `createLocalManifestVideoAssemblyProvider` |

## Rules

- Agent input/output types stay serializable and provider-agnostic.
- Agents read current SQLite/project state through the data layer rather than mock runtime data.
- Provider output is validated before being returned or persisted.
- Deterministic fake/local providers are the default for automated tests.
- Live providers must remain opt-in and should preserve the same public contract.
- Long-running agents persist job progress events and cancellation state through SQLite before writing final outputs.
- Runtime provider selection must go through `src/agents/provider-runtime.ts` or an explicit provider argument, not direct vendor calls inside product UI or database code.

## Long-Running Jobs

`asset-generator` and `video-assembler` use SQLite job records for progress and cancellation. Job status supports `queued`, `running`, `completed`, `failed`, and `canceled`; canceled jobs cannot be overwritten by later completion updates.

Agent entrypoints may receive an `onJobCreated` hook so a future task queue or test can capture the job id and request cancellation without using mock data.

## Live Provider Tests

Live provider tests live under `tests/live/` and run with `npm run test:live`. They are skipped unless `STORYFORGE_RUN_LIVE_PROVIDER_TESTS=1` is set.

Use `STORYFORGE_LIVE_PROVIDER_MODULE` to point at a local git-ignored module that exports one or more live providers. See `docs/live-provider-tests.md` for the module shape and secret handling rules.

## Runtime Provider Configuration

Runtime script parsing, character design, scene design, storyboard planning, image generation, and video assembly can use `STORYFORGE_PROVIDER_MODULE`, `STORYFORGE_PROVIDER_CONFIG`, or `.storyforge/providers.json`. See `docs/provider-configuration.md` for the local HTTP, Volcengine gateway, Kling gateway, and local service profile shape.
