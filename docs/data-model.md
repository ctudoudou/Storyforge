# Storyforge Local Data Model

Storyforge uses a local SQLite database for metadata and a local filesystem directory for generated or imported media assets.

## Local Paths

- SQLite database: `data/storyforge.sqlite`
- Asset directory: `data/assets/`

The database file and generated asset files are ignored by Git. The repository keeps `data/assets/.gitkeep` so the asset directory exists in fresh checkouts.

For tests, `STORYFORGE_DATA_DIR` can point the data layer at a temporary directory.

## Tables

- `schema_migrations`: applied SQLite schema migration versions.
- `projects`: project title, status, duration, and timestamps.
- `scripts`: project script text.
- `assets`: local file metadata for image, audio, video, or other assets.
- `characters`: parsed or user-edited character records linked to a project.
- `character_relationships`: parsed or user-edited character relationship records linked to a project.
- `plot_beats`: parsed or user-edited plot beat records linked to a project and scene number.
- `dialogue_blocks`: parsed or user-edited dialogue records linked to a project and scene number.
- `scenes`: parsed or user-edited scene records linked to a project, including location, time of day, mood, camera, description, characters, and optional asset reference.
- `timeline_clips`: parsed or user-edited timeline clips linked to a project and optional asset.
- `audio_tracks`: user-edited voice/audio records linked to a project and optional local audio asset.
- `subtitle_tracks`: generated or user-edited subtitle records linked to parsed dialogue blocks.
- `transition_records`: user-edited transition records connecting adjacent timeline video clips.
- `video_export_jobs`: local video export lifecycle records with output paths and error details.

Parsed production tables include `is_user_edited`. Parser re-runs delete parser-generated rows, preserve rows marked as user-edited, and also preserve asset-linked character, scene, and timeline rows so local asset references are not silently lost.

## Assembly Manifest

`GET /api/projects/:projectId/assembly-manifest` generates a local assembly manifest from current SQLite records and verified files under `data/assets/`. It does not persist a new table row; it is a derived contract for preview and export.

The manifest includes:

- project ID, title, generated timestamp, and computed duration.
- video clips with timing and required linked local image/video asset paths.
- audio tracks with timing and required linked local audio asset paths.
- subtitle records with text, speaker, scene number, and timing.
- transition records with source clip, target clip, type, and duration.

Generation fails with a structured `CONFLICT` error when required video or audio assets are not linked or the linked local file is missing.

The workspace preview player consumes this manifest directly, so preview state and later export state use the same local asset and timing contract.

## Workflow Status

Project detail responses include `workflowStatus`, derived from saved script text, parsed production records, linked local assets, timeline clips, and the latest local video export job. The status covers script, characters, storyboard, timeline, and export without runtime mock data.

## Generated Artifact History

Generated and imported visual assets keep local history in `asset_versions`. Regenerated outputs are stored as new versions with source metadata, parent version links, prompt/provider metadata, active-version switching, and old local files preserved for undo-style restoration.

The asset detail drawer reads this history directly from SQLite and local asset files, including missing-file status for the active asset and version files.

## Local Video Exports

`POST /api/projects/:projectId/exports` creates a `video_export_jobs` record, reads the local assembly manifest, and writes an explicit local export artifact under `data/exports/`. The current local assembler writes a `.storyforge-export.json` artifact that contains the manifest and timeline summary; later video tooling can replace this provider while keeping the same job and manifest contract.

Export jobs include queued/running/completed/failed/canceled status, progress percent/message, progress events, the local output path, manifest version, duration, timestamps, cancellation timestamps, and error details. Missing local assets fail before output creation and persist the failed job error.

## API

Error responses use this shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

- `GET /api/projects`: list local projects.
- `POST /api/projects`: create a local draft project.
- `GET /api/projects/:projectId`: read one project with script, characters, character relationships, plot beats, dialogue blocks, scenes, and timeline clips.
- `PATCH /api/projects/:projectId`: update project metadata such as title.
- `DELETE /api/projects/:projectId`: delete a project and its dependent records while leaving local asset files intact.
- `POST /api/projects/:projectId/duplicate`: copy a project and dependent records while keeping existing local asset references.
- `PUT /api/projects/:projectId/script`: save script text.
- `POST /api/projects/:projectId/parse/preview`: parse saved script and return a review payload without writing production records, including a `preservedRecords` summary for user-edited or asset-linked records that will survive confirmation and `warnings` for skipped malformed parser sections.
- `POST /api/projects/:projectId/parse`: parse saved script into local character, scene, and timeline records. The response includes `warnings` when partial parser output was recovered.
- `GET /api/projects/:projectId/assembly-manifest`: generate a local assembly manifest for preview/export from current project records and verified local asset files.
- `GET /api/projects/:projectId/exports`: list local video export jobs for a project.
- `POST /api/projects/:projectId/exports`: create a local video export artifact from the current assembly manifest.
- `POST /api/projects/:projectId/exports/:jobId/cancel`: cancel a queued or running local video export job.
- `GET /api/assets`: list registered local assets.
- `POST /api/assets`: import an image, audio, or video file into `data/assets/imports/` and register it in SQLite. Uploads are limited to supported file types and 50MB.
- `GET /api/assets/:assetPath*`: read a local asset file from `data/assets/`.

## Current Parser

The current parser is agent-backed with a deterministic fake provider for normal local tests. The compatibility entrypoint still returns the existing database/UI contract:

- `characters`
- `scenes`

The fake provider currently extracts Chinese scene heading variants such as `场景1：地点 - 时间`, `场景一：地点｜时间｜情绪`, and `第一场：地点 — 时间 — 情绪`. It also extracts camera hint lines such as `镜头：...` / `运镜：...`, mood hint lines such as `情绪：...` / `氛围：...`, character mentions in the form `姓名（年龄岁，特征，特征）`, and scene participation based on character mentions inside each scene.

The provider-level agent output also includes `relationships`, `plotBeats`, and `dialogueBlocks`. These are persisted in SQLite and returned in `ProjectDetail`.

If a parser provider returns a malformed section, the parser normalizes that section to an empty array and emits a warning. If the provider returns unrecoverable output, parse API routes return a structured `PARSE_FAILED` error.

## Migrations

Schema migrations live in `src/lib/db.ts` as explicit versioned entries. Each migration has:

- `id`: monotonically increasing integer.
- `name`: stable descriptive name.
- `sql`: migration SQL.

When the app opens the local database, it creates `schema_migrations`, applies pending migrations in order, and records each applied migration. New schema changes should be added as a new migration entry instead of modifying already-applied migrations.
