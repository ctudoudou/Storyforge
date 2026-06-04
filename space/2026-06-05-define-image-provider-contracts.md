# Define Image Provider Contracts

## Background

Priority 3 starts the character and scene generation layer. Before adding real providers or UI workflows, image generation needs a stable adapter contract that can cover character images, scene images, and keyframes while preserving the project's local-first asset rules.

## Scope

- Add `src/agents/asset-generator/` using the same structure as the existing script parser agent.
- Define image generation request, provider, provider result, reference, and generated asset types.
- Validate target-specific inputs:
  - Character images require `character.name`.
  - Scene and keyframe images require `scene.location`.
  - All image generations require `projectId`, `name`, and `prompt`.
- Add a fake local SVG image provider for deterministic automated tests.
- Write generated files to `data/assets/generated/`.
- Register generated files through the existing asset data layer so SQLite records and thumbnail metadata are created.

## Local-First Rule

Provider outputs must become local asset records immediately. The current contract returns a `GeneratedImageAsset` with provider metadata for callers, but durable prompt/job history remains a later TODO.

## Verification

- `node --experimental-strip-types --test tests/unit/image-generation-agent.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Next

Add prompt templates for character design.
