# Add Final Export Settings

## Context

Priority 6 requires final export settings so local export behavior is not hidden in transient UI state. Export jobs also need traceable settings snapshots for later real video tooling.

## Implementation Plan

- Add SQLite fields for project export settings.
- Add a settings snapshot column on `video_export_jobs`.
- Return export settings from project list/detail responses and export job responses.
- Add a real `PATCH /api/projects/:projectId` export settings update path.
- Add compact workspace controls for output format, resolution, frame rate, subtitle burn-in, and audio mix.
- Include the export settings snapshot in local export artifacts.

## Decisions

- Store current export settings on `projects`.
- Store a JSON snapshot on each `video_export_jobs` row.
- Keep the current local provider output as `.storyforge-export.json`; the settings describe target export intent and are ready for a future real video provider.

## Verification

- Cover defaults, updates, invalid values, duplication, migration columns, job snapshots, and artifact content with tests.
- Run the full test, typecheck, and build gates.
- Browser-check the workspace export settings controls after implementation.
