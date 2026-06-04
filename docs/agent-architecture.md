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
