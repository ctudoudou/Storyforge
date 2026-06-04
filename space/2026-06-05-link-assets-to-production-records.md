# Link Assets To Production Records

## Background

The local asset import flow can register image, audio, and video files in SQLite, but imported assets were not assignable to parsed production records. This left character cards, scene boards, and timeline clips unable to reference real local files after import.

## Scope

- Add a project-scoped asset link API for characters, scenes, and timeline clips.
- Persist link and unlink actions in SQLite through the existing `asset_id` fields.
- Mark linked or unlinked records as user-edited so parser re-runs preserve the user's production choices.
- Keep local files and `assets` rows intact when a production record is unlinked.
- Add UI controls to bind local assets from the characters, storyboard, and timeline workspaces.
- Keep asset type compatibility enforced:
  - Characters and scenes accept image assets.
  - Video timeline clips accept video or image assets.
  - Audio timeline clips accept audio assets.

## Verification

- `node --experimental-strip-types --test tests/integration/local-db.test.ts tests/integration/api-routes.test.ts tests/smoke/reference-routes.test.mjs`

## Next

Add asset preview pages or drawers so users can inspect imported local files and references before assigning or replacing them.
