# Add Asset-Backed Clip Previews

## Background

Priority 4 timeline work still showed placeholder-only visuals for video clips. This made the timeline feel disconnected from the local asset library even when a clip already had a linked image or video asset.

## Scope

- Render linked local image/video assets inside video timeline clips.
- Use the local asset API route and prefer `thumbnailPath` when available.
- Keep a clear unbound state for video and audio clips without linked assets.
- Prevent the main preview from falling back to a scene asset when the selected clip has no asset.
- Keep the existing reference UI structure and styling direction intact.

## Verification

- Add smoke coverage for asset-backed timeline copy and unbound clip states.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Verify the timeline route in the browser with a real local SQLite project and local imported asset.

## Next

Continue Priority 4 with timeline editing: trim, reorder, split, and delete.
