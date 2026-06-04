# Add Subtitle Track Records

## Background

Priority 4 needed a real subtitle track before preview and assembly can represent short-drama dialogue. Parsed dialogue blocks already existed, but they were only visible in the storyboard workspace and had no timeline timing.

## Scope

- Add a dedicated `subtitle_tracks` SQLite table with scene number, source dialogue block, speaker, text, start time, duration, and user-edit tracking.
- Include subtitle tracks in project readback, duration calculation, and project duplication.
- Add a project API route that generates subtitle records from parsed dialogue blocks.
- Derive subtitle timing from the corresponding scene video clip and dialogue order, without mock data.
- Render subtitle records on a dedicated timeline subtitle track.
- Add a compact timeline control to generate subtitle tracks from current parsed dialogue.

## Verification

- Migration tests cover the `subtitle_tracks` table.
- Data-layer tests cover subtitle generation from parsed dialogue blocks, project readback, and duplication.
- API route tests cover subtitle generation from parsed dialogue blocks.
- Smoke tests cover the timeline subtitle track UI.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Verify subtitle generation in the browser with a real local SQLite project.

## Next

Continue Priority 4 with transition records.
