# Add Timeline Clip Editing

## Background

Priority 4 needed real editing controls before timeline preview and assembly can become useful. Timeline clips were persisted in SQLite, but the UI only allowed selection and asset binding.

## Scope

- Add SQLite-backed timeline clip update, split, reorder, and delete operations.
- Reject invalid negative start times and zero-length durations.
- Preserve linked local assets when trimming, splitting, and reordering clips.
- Add API routes for clip mutation under the project timeline namespace.
- Wire the existing timeline toolbar and properties panel to the persisted APIs.
- Keep the reference visual structure intact while adding compact editing controls.

## Verification

- Data-layer tests cover trim, split, reorder, delete, and asset-link preservation.
- API route tests cover PATCH, split, reorder, DELETE, and invalid duration handling.
- Smoke tests cover timeline editing controls.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Verify the timeline edit controls in the browser with a real local SQLite project.

## Next

Continue Priority 4 with voice/audio track records.
