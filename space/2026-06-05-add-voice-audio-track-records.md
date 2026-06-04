# Add Voice Audio Track Records

## Background

Priority 4 needed dedicated voice/audio records before local preview and assembly can handle sound. The UI had an audio lane, but project data still relied on generic timeline clip shape and empty audio placeholders.

## Scope

- Add a dedicated `audio_tracks` SQLite table with label, speaker, start, duration, asset, and user-edit tracking.
- Include audio tracks in project readback, project duplication, duration calculation, and asset reference/delete protection.
- Add a project API route for creating audio track records.
- Extend asset linking so audio tracks only accept local audio assets.
- Render persisted audio tracks in the timeline audio lane with start/duration-backed layout.
- Add a compact timeline control to create a local voice/audio track without mock data.

## Verification

- Migration tests cover the `audio_tracks` table.
- Data-layer tests cover audio track creation, compatible audio asset linking, incompatible asset rejection, duplicate preservation, and delete protection.
- API route tests cover audio track creation, asset linking, and project readback.
- Smoke tests cover audio timeline controls and audio parameter copy.
- Run `npm run test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Verify audio track creation and binding in the browser with a real local SQLite project and local audio asset.

## Next

Continue Priority 4 with subtitle track records.
