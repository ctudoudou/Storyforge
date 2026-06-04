# Add Asset Deletion Protection

## Background

The asset library can import, link, preview, and version local files, but deletion needed guardrails before users can safely clean up local assets. Deleting an asset that is still linked to characters, scenes, or timeline clips would break existing production records.

## Scope

- Add a protected asset delete API.
- Reject deletion when an asset is still referenced by project production records.
- Delete unreferenced asset records from SQLite.
- Remove local files for the asset and all of its versions when those files are not shared by other assets.
- Ignore already-missing local files during deletion.
- Surface deletion errors and disabled delete states in the asset detail drawer.

## File Cleanup Rule

Deleting an unreferenced asset removes the asset row, cascades its version rows, and deletes every local file path owned by that asset or its versions. A local file is not removed if another asset or another asset version still points to the same relative path.

## Verification

- `node --experimental-strip-types --test tests/integration/api-routes.test.ts tests/smoke/reference-routes.test.mjs`

## Next

Add thumbnail generation for large images and videos so the asset library can stay fast as the local media folder grows.
