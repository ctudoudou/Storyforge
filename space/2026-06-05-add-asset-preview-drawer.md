# Add Asset Preview Drawer

## Background

The asset library could import and list local files, but users could not inspect a file before assigning it to production records. There was also no clear way to see whether a local file still existed or where an imported asset was already linked.

## Scope

- Add an asset detail API that returns metadata, preview URL, local file existence, and project references.
- Add an asset detail drawer from the asset library.
- Preview local image, video, and audio files without leaving the asset library.
- Show a missing-file state when SQLite contains an asset record but the local file is unavailable.
- Show references from characters, scenes, and timeline clips with project navigation.

## Verification

- `node --experimental-strip-types --test tests/integration/api-routes.test.ts tests/smoke/reference-routes.test.mjs`

## Next

Add asset versioning for regeneration so future generated images, audio, and video can keep parent/child history instead of replacing a single asset record.
