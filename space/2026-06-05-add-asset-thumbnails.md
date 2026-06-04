# Add Asset Thumbnails

## Background

The asset library can import, preview, version, and delete local files, but the grid still had to render generic file rows or full local assets. Large image and video files need lightweight preview metadata so the asset library can scale.

## Scope

- Add thumbnail metadata to `assets` and `asset_versions`.
- Generate local SVG fallback thumbnail files for imported image and video assets.
- Keep audio and unsupported file types marked as `unavailable`.
- Preserve original local files; thumbnail generation never replaces the source asset.
- Serve thumbnail files through the existing local asset route.
- Show thumbnails in the asset library grid and detail drawer.
- Clean up owned thumbnail files when an unreferenced asset is deleted.

## Thumbnail Rule

Current thumbnail generation uses local SVG fallback files because the project does not include a media processing dependency such as Sharp or FFmpeg. The metadata explicitly records `fallback`, so later real image resizing or video frame extraction can replace the generator without changing the asset API contract.

## Verification

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/integration/api-routes.test.ts tests/smoke/reference-routes.test.mjs`
- `npm run test`
- `npm run typecheck`
- `npm run build`
- Browser verification on `http://localhost:3006/assets` with a temporary imported image asset.

## Next

Start Priority 3 by defining provider adapter contracts for image generation.
