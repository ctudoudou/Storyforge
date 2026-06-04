# Add Preview Playback From Local Assets

## Background

Priority 4 needed the workspace preview button to use the real local assembly manifest instead of remaining a static control. The manifest already validates linked local asset files, so preview playback can rely on it as the single source of timeline truth.

## Scope

- Connect the workspace `预览合成` button to the local assembly manifest API.
- Add a manifest-backed preview surface that renders linked local image/video assets.
- Show local audio tracks from the manifest with native audio controls.
- Show active subtitle text based on manifest timing.
- Show active transition state based on manifest source clip timing and duration.
- Preserve explicit missing-asset errors from the manifest API instead of falling back to mock or remote media.

## Verification

- Smoke tests cover the manifest-backed preview entrypoint and preview UI copy.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Verify preview playback in the browser against a real local SQLite project with linked local assets.

## Next

Continue Priority 4 with export using a local video assembly tool.
