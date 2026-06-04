# Add Project-Level Settings

## Context

Priority 6 requires durable project-level controls for style, aspect ratio, language, voice, and duration. These settings need to be real local project metadata, not transient UI state or mock defaults.

## Implementation Plan

- Add a SQLite migration for project settings.
- Return settings from project list and detail responses.
- Add a real `PATCH /api/projects/:projectId` settings update path.
- Add compact workspace controls without changing the existing reference layout.
- Cover defaults, updates, invalid values, detail responses, and schema columns with tests.

## Decisions

- Keep `durationSeconds` as the computed current timeline duration.
- Add `target_duration_seconds` for the creative target duration setting.
- Preserve project settings when duplicating a project, while review state still resets to draft.

## Verification

- Run focused integration tests for migrations, local DB, API routes, and smoke UI copy.
- Run the full test, typecheck, and build gates.
- Browser-check the workspace settings controls after the app builds.
