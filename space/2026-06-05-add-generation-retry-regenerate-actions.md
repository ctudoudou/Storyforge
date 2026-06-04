# Add Generation Retry And Regenerate Actions

## Background

Generation jobs now persist lifecycle status, but the next workflow needs explicit retry/regenerate actions. Retry should copy a failed job's prompt and context into a fresh queued job. Regenerate should copy a completed generation's metadata into a fresh queued job that points back to the source generation.

## Scope

- Add retry/regenerate link columns to `image_generation_jobs`.
- Add `retryImageGenerationJob` for failed jobs.
- Add `createRegenerateImageGenerationJob` for completed generation records.
- Preserve prompt text, negative prompt, provider, model, parameters, source asset IDs, and parent artifacts.
- Track retry source through `retry_of_job_id`.
- Track regeneration source through `regenerate_of_generation_id`.
- Add tests for failed-job retry and completed-generation regeneration.

## Action Rule

Retry/regenerate currently create new queued jobs. They do not immediately invoke a provider. This keeps scheduling/execution separate from durable intent and leaves room for a later worker or queue implementation.

## Verification

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/unit/image-generation-agent.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Next

Add manual asset override for each character and scene.
