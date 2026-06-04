# Add Transition Records

## Background

Priority 4 needed a persisted transition layer before local preview or assembly manifests can describe how adjacent shots connect. Timeline clips already supported editing, while video-clip boundaries still had no production record.

## Scope

- Add a dedicated `transition_records` SQLite table with source clip, target clip, transition type, duration, and user-edit tracking.
- Include transition records in project readback and project duplication.
- Add project API routes to create, update, and delete transitions.
- Validate that transitions connect adjacent video clips only, without changing clip timing.
- Render transition markers between connected video clips on the timeline.
- Add a compact timeline control to create a default fade transition from the selected clip to the next adjacent video clip.

## Verification

- Migration tests cover the `transition_records` table.
- Data-layer tests cover transition creation, update, deletion, project readback, project duplication, and clip-delete cascade.
- API route tests cover transition creation, validation, update, and deletion.
- Smoke tests cover the timeline transition marker UI.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Verify transition creation in the browser with a real local SQLite project.

## Next

Continue Priority 4 with a local assembly manifest format.
