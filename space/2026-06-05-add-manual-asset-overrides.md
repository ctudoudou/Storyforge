# Add Manual Asset Overrides

## Background

Characters and scenes could already link to local image assets, but those links did not distinguish manual user selection from future generated defaults. Manual override state needs to be durable before generated assets are automatically assigned.

## Scope

- Add `asset_source` to `characters` and `scenes`.
- Expose `assetSource` on character and scene records.
- Mark character and scene links as `manual` when the existing asset-link API assigns an asset.
- Clear `assetSource` when the asset is unlinked.
- Preserve `assetSource` when duplicating projects.
- Keep existing timeline clip asset linking unchanged.
- Add migration, data-layer, and API route tests.

## Override Rule

Manual overrides are represented by `assetSource: "manual"`. Generated assignments can use `assetSource: "generated"` in a later workflow without changing the record contract.

## Verification

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/integration/local-db.test.ts tests/integration/api-routes.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Next

Add visual consistency controls across generated character images.
