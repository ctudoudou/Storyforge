# Add Asset Versioning

## Background

Asset references now support importing, linking, and previewing local files, but regeneration would have overwritten the current asset metadata without preserving previous local files or generation context. The asset library needs a version history before real generation providers are wired in.

## Scope

- Add SQLite schema support for `asset_versions`.
- Backfill existing assets with an initial active version.
- Create version records with regeneration metadata: source, provider, model, prompt, parameters, and parent version.
- Switch the active version without changing production record `asset_id` references.
- Show version history in the asset detail drawer.
- Keep old local files available when a newer version becomes active.

## Verification

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/integration/api-routes.test.ts tests/smoke/reference-routes.test.mjs`

## Next

Add asset deletion rules that prevent breaking existing project references. Deletion should refuse or require unlinking when an asset is still referenced by characters, scenes, or timeline clips.
