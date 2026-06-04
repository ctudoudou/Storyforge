# Add Workflow Status

## Goal

Show step-by-step project workflow status across script, characters, storyboard, timeline, and export using real local data.

## Scope

- Add `workflowStatus` to project detail responses.
- Derive stage status from saved script text, parsed SQLite records, linked local assets, timeline clips, and latest export jobs.
- Add a compact workspace status strip without changing the existing reference layout direction.
- Keep status calculation server-side so the UI does not duplicate data rules.

## Verification

- Integration tests cover empty, script-only, parsed, asset-linked, and exported project states.
- Existing route and UI smoke tests should continue to protect the reference copy and runtime mock removal.
