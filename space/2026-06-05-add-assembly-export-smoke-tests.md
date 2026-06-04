# Add Assembly Export Smoke Tests

## Background

Priority 4 needed smoke coverage that proves the manifest/export path works from real local SQLite data and local asset files, not only source-code route checks.

## Scope

- Add a smoke test that creates a temporary SQLite data directory.
- Create a real project, parse it, link local image assets, and generate an assembly manifest.
- Create a local export artifact and assert the output file exists.
- Cover missing linked local assets as explicit export failures without mock or remote fallbacks.

## Verification

- Run the new smoke test directly.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.

## Next

Continue Priority 5 with `src/agents/character-designer/`.
