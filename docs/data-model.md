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
- `scenes`: parsed or user-edited scene records linked to a project.
- `timeline_clips`: timeline clips linked to a project and optional asset.

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
- `GET /api/projects/:projectId`: read one project with script, characters, scenes, and timeline clips.
- `PATCH /api/projects/:projectId`: update project metadata such as title.
- `DELETE /api/projects/:projectId`: delete a project and its dependent records while leaving local asset files intact.
- `POST /api/projects/:projectId/duplicate`: copy a project and dependent records while keeping existing local asset references.
- `PUT /api/projects/:projectId/script`: save script text.
- `POST /api/projects/:projectId/parse`: parse saved script into local character, scene, and timeline records.
- `GET /api/assets`: list registered local assets.
- `GET /api/assets/:assetPath*`: read a local asset file from `data/assets/`.

## Current Parser

The first parser is deterministic and local. It extracts:

- Scene headings in the form `场景1：地点 - 时间`.
- Character mentions in the form `姓名（年龄岁，特征，特征）`.
- Scene participation based on character mentions inside each scene.

This is intentionally not an AI provider integration yet. Future agent iterations can replace or augment the parser while keeping the same database-backed UI contract.

## Migrations

Schema migrations live in `src/lib/db.ts` as explicit versioned entries. Each migration has:

- `id`: monotonically increasing integer.
- `name`: stable descriptive name.
- `sql`: migration SQL.

When the app opens the local database, it creates `schema_migrations`, applies pending migrations in order, and records each applied migration. New schema changes should be added as a new migration entry instead of modifying already-applied migrations.
