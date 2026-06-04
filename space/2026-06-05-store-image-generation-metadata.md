# Store Image Generation Metadata

## Background

Generated images were already written to local files and registered as assets, but the prompt and provider context only existed in the in-memory return value. The generation layer needs durable metadata before retries, regeneration, and UI review states can be built.

## Scope

- Add an `image_generations` SQLite table.
- Store project ID, asset ID, target type, prompt text, negative prompt, provider, model, parameters, seed, source asset IDs, parent artifact references, provider metadata, and creation time.
- Link generation metadata to the local asset record through `asset_id`.
- Add data-layer helpers to register, fetch by ID, fetch by asset ID, and list by project.
- Extend `generateImageAsset` so fake and future providers persist metadata after local asset registration.
- Extend image generation tests to cover character, scene, and keyframe records.

## Parent Artifact Rule

Parent artifact references are stored as a generic list of `{ type, id }` entries. This keeps the current contract flexible for characters, scenes, plot beats, timeline clips, source assets, and future generation records without forcing an early UI workflow.

## Verification

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/unit/image-generation-agent.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Next

Add generation job status: queued, running, completed, failed.
