# Add Generation Job Status

## Background

Generated image metadata records only describe successful artifacts. Failed provider calls still need durable state so retries, user-visible progress, and operational debugging can work without relying on in-memory errors.

## Scope

- Add an `image_generation_jobs` SQLite table.
- Track `queued`, `running`, `completed`, and `failed` statuses.
- Store prompt text, negative prompt, provider, model, parameters, source asset IDs, parent artifacts, timestamps, and failure messages.
- Link completed jobs to both the generated asset and the final `image_generations` record.
- Update `generateImageAsset` to create a queued job, mark it running, complete it after asset and metadata registration, and mark it failed on provider or validation errors after job creation.
- Extend tests to cover completed jobs and failed jobs.

## Status Rule

`image_generation_jobs` records describe lifecycle. `image_generations` records describe completed generated artifacts. Failed jobs intentionally do not require an asset record.

## Verification

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/unit/image-generation-agent.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Next

Add retry and regenerate actions.
