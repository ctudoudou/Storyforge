# Add Character Visual Consistency

## Background

Character prompt templates already accepted visual consistency notes and anchor assets, but those controls only existed in prompt input. Generated character images need durable consistency settings so future generations can preserve identity, styling, and anchor references across runs.

## Scope

- Add character-level visual consistency columns to SQLite.
- Expose `visualConsistency` on character records.
- Add `setCharacterVisualConsistency` to set and clear notes plus anchor asset IDs.
- Validate anchor assets as existing local image assets.
- Preserve settings during script parser re-runs.
- Preserve settings during project duplication.
- Reuse persisted settings in character design prompt tests.

## Consistency Rule

Visual consistency controls are stored on characters, not generation jobs. Generation jobs can copy the resulting prompt and source asset IDs later, while the character record remains the editable source of truth.

## Verification

- `node --experimental-strip-types --test tests/integration/migrations.test.ts tests/integration/local-db.test.ts`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Next

Replace placeholder clip visuals with asset-backed clip previews.
