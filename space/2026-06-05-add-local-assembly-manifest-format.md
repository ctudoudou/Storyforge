# Add Local Assembly Manifest Format

## Background

Priority 4 needed a stable local manifest before preview playback and export can use the timeline. Timeline clips, audio tracks, subtitles, and transitions already persisted in SQLite, but there was no single contract that described a complete assembly input.

## Scope

- Add a typed assembly manifest contract for project metadata, computed duration, video clips, audio tracks, subtitles, and transitions.
- Generate manifests from current SQLite project records without mock data.
- Resolve required linked local asset paths under `data/assets/`.
- Validate that video clips have linked local image/video assets and audio tracks have linked local audio assets.
- Return structured errors when required assets are missing or linked files no longer exist.
- Add a project API route for manifest generation.

## Verification

- Data-layer tests cover manifest generation with video, audio, subtitle, and transition records.
- Data-layer tests cover missing linked assets and missing local files.
- API route tests cover manifest readback and structured missing-asset errors.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Verify the manifest route against a real local SQLite project.

## Next

Continue Priority 4 with preview playback from local assets.
