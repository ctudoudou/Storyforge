import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, normalize, sep } from "node:path";
import Database from "better-sqlite3";
import { parseScriptWithAgent } from "../agents/script-parser/index.ts";
import type {
  AssetDeleteResult,
  AssetDetail,
  AssetLinkTargetType,
  AssetReferenceRecord,
  AssetRecord,
  AudioTrackRecord,
  AssetVersionRecord,
  CharacterRelationshipRecord,
  CharacterRecord,
  DialogueBlockRecord,
  GeneratedArtifactReference,
  ImageGenerationJobRecord,
  ImageGenerationJobStatus,
  ImageGenerationRecord,
  PlotBeatRecord,
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
  PreservedParseRecords,
  SceneRecord,
  ScriptParsePreview,
  SubtitleTrackRecord,
  TimelineClipRecord,
  TransitionRecord,
} from "./types";

const rootDir = process.cwd();
export const dataDir = process.env.STORYFORGE_DATA_DIR || join(rootDir, "data");
export const assetDir = join(dataDir, "assets");
const dbPath = join(dataDir, "storyforge.sqlite");

type Row = Record<string, unknown>;

let database: Database.Database | null = null;

type Migration = {
  id: number;
  name: string;
  sql: string;
};

const migrations: Migration[] = [
  {
    id: 1,
    name: "initial_local_project_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scripts (
        project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
        content TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        relative_path TEXT NOT NULL UNIQUE,
        mime_type TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        age INTEGER,
        role TEXT NOT NULL DEFAULT '',
        traits TEXT NOT NULL DEFAULT '[]',
        asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scenes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        scene_number INTEGER NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        time_of_day TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        camera TEXT NOT NULL DEFAULT '',
        characters TEXT NOT NULL DEFAULT '[]',
        asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS timeline_clips (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        track_type TEXT NOT NULL,
        label TEXT NOT NULL,
        start_ms INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: 2,
    name: "character_relationships",
    sql: `
      CREATE TABLE IF NOT EXISTS character_relationships (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        source_name TEXT NOT NULL,
        target_name TEXT NOT NULL,
        relation TEXT NOT NULL DEFAULT '',
        evidence TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: 3,
    name: "plot_beats",
    sql: `
      CREATE TABLE IF NOT EXISTS plot_beats (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        scene_number INTEGER NOT NULL,
        type TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: 4,
    name: "dialogue_blocks",
    sql: `
      CREATE TABLE IF NOT EXISTS dialogue_blocks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        scene_number INTEGER NOT NULL,
        speaker TEXT NOT NULL,
        content TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: 5,
    name: "scene_mood",
    sql: `
      ALTER TABLE scenes ADD COLUMN mood TEXT NOT NULL DEFAULT '';
    `,
  },
  {
    id: 6,
    name: "parser_user_edit_tracking",
    sql: `
      ALTER TABLE characters ADD COLUMN is_user_edited INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE character_relationships ADD COLUMN is_user_edited INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE plot_beats ADD COLUMN is_user_edited INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE dialogue_blocks ADD COLUMN is_user_edited INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE scenes ADD COLUMN is_user_edited INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE timeline_clips ADD COLUMN is_user_edited INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    id: 7,
    name: "asset_versions",
    sql: `
      CREATE TABLE IF NOT EXISTS asset_versions (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'import',
        provider TEXT,
        model TEXT,
        prompt TEXT,
        parameters TEXT,
        parent_version_id TEXT REFERENCES asset_versions(id) ON DELETE SET NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(asset_id, version_number),
        UNIQUE(asset_id, relative_path)
      );

      INSERT INTO asset_versions (
        id, asset_id, version_number, name, relative_path, mime_type, size_bytes, source, is_active, created_at
      )
      SELECT
        'version_' || lower(hex(randomblob(16))),
        a.id,
        1,
        a.name,
        a.relative_path,
        a.mime_type,
        a.size_bytes,
        'import',
        1,
        a.created_at
      FROM assets a
      WHERE NOT EXISTS (
        SELECT 1 FROM asset_versions av WHERE av.asset_id = a.id
      );
    `,
  },
  {
    id: 8,
    name: "asset_thumbnails",
    sql: `
      ALTER TABLE assets ADD COLUMN thumbnail_path TEXT;
      ALTER TABLE assets ADD COLUMN thumbnail_status TEXT NOT NULL DEFAULT 'unavailable';
      ALTER TABLE assets ADD COLUMN thumbnail_error TEXT;
      ALTER TABLE asset_versions ADD COLUMN thumbnail_path TEXT;
      ALTER TABLE asset_versions ADD COLUMN thumbnail_status TEXT NOT NULL DEFAULT 'unavailable';
      ALTER TABLE asset_versions ADD COLUMN thumbnail_error TEXT;
    `,
  },
  {
    id: 9,
    name: "image_generations",
    sql: `
      CREATE TABLE IF NOT EXISTS image_generations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        negative_prompt TEXT,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        parameters TEXT NOT NULL DEFAULT '{}',
        seed INTEGER,
        source_asset_ids TEXT NOT NULL DEFAULT '[]',
        parent_artifacts TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_image_generations_project_id ON image_generations(project_id);
      CREATE INDEX IF NOT EXISTS idx_image_generations_asset_id ON image_generations(asset_id);
      CREATE INDEX IF NOT EXISTS idx_image_generations_target_type ON image_generations(target_type);
    `,
  },
  {
    id: 10,
    name: "image_generation_jobs",
    sql: `
      CREATE TABLE IF NOT EXISTS image_generation_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
        generation_id TEXT REFERENCES image_generations(id) ON DELETE SET NULL,
        target_type TEXT NOT NULL,
        status TEXT NOT NULL,
        prompt TEXT NOT NULL,
        negative_prompt TEXT,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        parameters TEXT NOT NULL DEFAULT '{}',
        source_asset_ids TEXT NOT NULL DEFAULT '[]',
        parent_artifacts TEXT NOT NULL DEFAULT '[]',
        error_message TEXT,
        queued_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_project_id ON image_generation_jobs(project_id);
      CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_status ON image_generation_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_asset_id ON image_generation_jobs(asset_id);
    `,
  },
  {
    id: 11,
    name: "generation_retry_regenerate_links",
    sql: `
      ALTER TABLE image_generation_jobs ADD COLUMN retry_of_job_id TEXT REFERENCES image_generation_jobs(id) ON DELETE SET NULL;
      ALTER TABLE image_generation_jobs ADD COLUMN regenerate_of_generation_id TEXT REFERENCES image_generations(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_retry_of_job_id ON image_generation_jobs(retry_of_job_id);
      CREATE INDEX IF NOT EXISTS idx_image_generation_jobs_regenerate_of_generation_id ON image_generation_jobs(regenerate_of_generation_id);
    `,
  },
  {
    id: 12,
    name: "manual_asset_overrides",
    sql: `
      ALTER TABLE characters ADD COLUMN asset_source TEXT;
      ALTER TABLE scenes ADD COLUMN asset_source TEXT;
    `,
  },
  {
    id: 13,
    name: "character_visual_consistency",
    sql: `
      ALTER TABLE characters ADD COLUMN visual_consistency_notes TEXT NOT NULL DEFAULT '';
      ALTER TABLE characters ADD COLUMN visual_consistency_anchor_asset_ids TEXT NOT NULL DEFAULT '[]';
    `,
  },
  {
    id: 14,
    name: "audio_tracks",
    sql: `
      CREATE TABLE IF NOT EXISTS audio_tracks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        speaker TEXT NOT NULL DEFAULT '',
        start_ms INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
        is_user_edited INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audio_tracks_project_id ON audio_tracks(project_id);
      CREATE INDEX IF NOT EXISTS idx_audio_tracks_asset_id ON audio_tracks(asset_id);
    `,
  },
  {
    id: 15,
    name: "subtitle_tracks",
    sql: `
      CREATE TABLE IF NOT EXISTS subtitle_tracks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        scene_number INTEGER NOT NULL,
        dialogue_block_id TEXT REFERENCES dialogue_blocks(id) ON DELETE SET NULL,
        speaker TEXT NOT NULL DEFAULT '',
        text TEXT NOT NULL,
        start_ms INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        is_user_edited INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_subtitle_tracks_project_id ON subtitle_tracks(project_id);
      CREATE INDEX IF NOT EXISTS idx_subtitle_tracks_dialogue_block_id ON subtitle_tracks(dialogue_block_id);
      CREATE INDEX IF NOT EXISTS idx_subtitle_tracks_scene_number ON subtitle_tracks(project_id, scene_number);
    `,
  },
  {
    id: 16,
    name: "transition_records",
    sql: `
      CREATE TABLE IF NOT EXISTS transition_records (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        source_clip_id TEXT NOT NULL REFERENCES timeline_clips(id) ON DELETE CASCADE,
        target_clip_id TEXT NOT NULL REFERENCES timeline_clips(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'fade',
        duration_ms INTEGER NOT NULL DEFAULT 500,
        is_user_edited INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, source_clip_id, target_clip_id),
        CHECK (source_clip_id <> target_clip_id)
      );

      CREATE INDEX IF NOT EXISTS idx_transition_records_project_id ON transition_records(project_id);
      CREATE INDEX IF NOT EXISTS idx_transition_records_source_clip_id ON transition_records(source_clip_id);
      CREATE INDEX IF NOT EXISTS idx_transition_records_target_clip_id ON transition_records(target_clip_id);
    `,
  },
];

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function asNullableNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function asBoolean(value: unknown) {
  return value === true || value === 1;
}

function asJsonArray(value: unknown) {
  if (typeof value !== "string" || !value) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
}

function applyMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const hasMigration = db.prepare("SELECT id FROM schema_migrations WHERE id = ?");
  const recordMigration = db.prepare(
    "INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)"
  );

  for (const migration of migrations) {
    if (hasMigration.get(migration.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      recordMigration.run(migration.id, migration.name, now());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

function assetFromRow(row: Row | null): AssetRecord | null {
  if (!row || !row.asset_id) return null;
  return {
    id: asString(row.asset_id),
    type: asString(row.asset_type, "other") as AssetRecord["type"],
    name: asString(row.asset_name),
    relativePath: asString(row.asset_relative_path),
    mimeType: row.asset_mime_type === null ? null : asString(row.asset_mime_type),
    sizeBytes: asNumber(row.asset_size_bytes),
    thumbnailPath: row.asset_thumbnail_path === null ? null : asString(row.asset_thumbnail_path),
    thumbnailStatus: asString(row.asset_thumbnail_status, "unavailable") as AssetRecord["thumbnailStatus"],
    thumbnailError: row.asset_thumbnail_error === null ? null : asString(row.asset_thumbnail_error),
    createdAt: asString(row.asset_created_at),
  };
}

function asJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = JSON.parse(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
}

function assetVersionFromRow(row: Row): AssetVersionRecord {
  return {
    id: asString(row.id),
    assetId: asString(row.asset_id),
    versionNumber: asNumber(row.version_number),
    name: asString(row.name),
    relativePath: asString(row.relative_path),
    mimeType: row.mime_type === null ? null : asString(row.mime_type),
    sizeBytes: asNumber(row.size_bytes),
    thumbnailPath: row.thumbnail_path === null ? null : asString(row.thumbnail_path),
    thumbnailStatus: asString(row.thumbnail_status, "unavailable") as AssetRecord["thumbnailStatus"],
    thumbnailError: row.thumbnail_error === null ? null : asString(row.thumbnail_error),
    source: asString(row.source, "import") as AssetVersionRecord["source"],
    provider: row.provider === null ? null : asString(row.provider),
    model: row.model === null ? null : asString(row.model),
    prompt: row.prompt === null ? null : asString(row.prompt),
    parameters: asJsonObject(row.parameters),
    parentVersionId: row.parent_version_id === null ? null : asString(row.parent_version_id),
    isActive: asBoolean(row.is_active),
    createdAt: asString(row.created_at),
  };
}

function asJsonObjectRecord(value: unknown): Record<string, unknown> {
  return asJsonObject(value) ?? {};
}

function asGeneratedArtifactReferences(value: unknown): GeneratedArtifactReference[] {
  return asJsonArray(value)
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      type: asString(item.type) as GeneratedArtifactReference["type"],
      id: asString(item.id),
    }))
    .filter((item) => Boolean(item.type && item.id));
}

function imageGenerationFromRow(row: Row): ImageGenerationRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    assetId: asString(row.asset_id),
    targetType: asString(row.target_type, "character") as ImageGenerationRecord["targetType"],
    prompt: asString(row.prompt),
    negativePrompt: row.negative_prompt === null ? null : asString(row.negative_prompt),
    provider: asString(row.provider),
    model: asString(row.model),
    parameters: asJsonObjectRecord(row.parameters),
    seed: asNullableNumber(row.seed),
    sourceAssetIds: asJsonArray(row.source_asset_ids).map(String).filter(Boolean),
    parentArtifacts: asGeneratedArtifactReferences(row.parent_artifacts),
    metadata: asJsonObjectRecord(row.metadata),
    createdAt: asString(row.created_at),
  };
}

function imageGenerationJobFromRow(row: Row): ImageGenerationJobRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    assetId: row.asset_id === null ? null : asString(row.asset_id),
    generationId: row.generation_id === null ? null : asString(row.generation_id),
    retryOfJobId: row.retry_of_job_id === null ? null : asString(row.retry_of_job_id),
    regenerateOfGenerationId: row.regenerate_of_generation_id === null ? null : asString(row.regenerate_of_generation_id),
    targetType: asString(row.target_type, "character") as ImageGenerationRecord["targetType"],
    status: asString(row.status, "queued") as ImageGenerationJobStatus,
    prompt: asString(row.prompt),
    negativePrompt: row.negative_prompt === null ? null : asString(row.negative_prompt),
    provider: asString(row.provider),
    model: asString(row.model),
    parameters: asJsonObjectRecord(row.parameters),
    sourceAssetIds: asJsonArray(row.source_asset_ids).map(String).filter(Boolean),
    parentArtifacts: asGeneratedArtifactReferences(row.parent_artifacts),
    errorMessage: row.error_message === null ? null : asString(row.error_message),
    queuedAt: asString(row.queued_at),
    startedAt: row.started_at === null ? null : asString(row.started_at),
    completedAt: row.completed_at === null ? null : asString(row.completed_at),
    updatedAt: asString(row.updated_at),
  };
}

function projectSummaryFromRow(row: Row): ProjectSummary {
  return {
    id: asString(row.id),
    title: asString(row.title),
    status: asString(row.status, "draft") as ProjectStatus,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    durationSeconds: asNumber(row.duration_seconds),
    sceneCount: asNumber(row.scene_count),
  };
}

function characterFromRow(row: Row): CharacterRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    name: asString(row.name),
    age: asNullableNumber(row.age),
    role: asString(row.role),
    traits: asJsonArray(row.traits).map(String),
    isUserEdited: asBoolean(row.is_user_edited),
    assetSource: row.asset_source === null ? null : asString(row.asset_source) as CharacterRecord["assetSource"],
    visualConsistency: {
      notes: asString(row.visual_consistency_notes),
      anchorAssetIds: asJsonArray(row.visual_consistency_anchor_asset_ids).map(String).filter(Boolean),
    },
    asset: assetFromRow(row),
  };
}

function relationshipFromRow(row: Row): CharacterRelationshipRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    sourceName: asString(row.source_name),
    targetName: asString(row.target_name),
    relation: asString(row.relation),
    evidence: asString(row.evidence),
    isUserEdited: asBoolean(row.is_user_edited),
  };
}

function plotBeatFromRow(row: Row): PlotBeatRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    sceneNumber: asNumber(row.scene_number),
    type: asString(row.type, "setup") as PlotBeatRecord["type"],
    summary: asString(row.summary),
    isUserEdited: asBoolean(row.is_user_edited),
  };
}

function dialogueBlockFromRow(row: Row): DialogueBlockRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    sceneNumber: asNumber(row.scene_number),
    speaker: asString(row.speaker),
    content: asString(row.content),
    orderIndex: asNumber(row.order_index),
    isUserEdited: asBoolean(row.is_user_edited),
  };
}

function sceneFromRow(row: Row): SceneRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    sceneNumber: asNumber(row.scene_number),
    location: asString(row.location),
    timeOfDay: asString(row.time_of_day),
    mood: asString(row.mood),
    description: asString(row.description),
    camera: asString(row.camera),
    characters: asJsonArray(row.characters).map(String),
    isUserEdited: asBoolean(row.is_user_edited),
    assetSource: row.asset_source === null ? null : asString(row.asset_source) as SceneRecord["assetSource"],
    asset: assetFromRow(row),
  };
}

function timelineClipFromRow(row: Row): TimelineClipRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    trackType: asString(row.track_type, "video") as TimelineClipRecord["trackType"],
    label: asString(row.label),
    startMs: asNumber(row.start_ms),
    durationMs: asNumber(row.duration_ms),
    isUserEdited: asBoolean(row.is_user_edited),
    asset: assetFromRow(row),
  };
}

function audioTrackFromRow(row: Row): AudioTrackRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    trackType: "audio",
    label: asString(row.label),
    speaker: asString(row.speaker),
    startMs: asNumber(row.start_ms),
    durationMs: asNumber(row.duration_ms),
    isUserEdited: asBoolean(row.is_user_edited),
    asset: assetFromRow(row),
  };
}

function subtitleTrackFromRow(row: Row): SubtitleTrackRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    sceneNumber: asNumber(row.scene_number),
    dialogueBlockId: row.dialogue_block_id === null ? null : asString(row.dialogue_block_id),
    speaker: asString(row.speaker),
    text: asString(row.text),
    startMs: asNumber(row.start_ms),
    durationMs: asNumber(row.duration_ms),
    isUserEdited: asBoolean(row.is_user_edited),
  };
}

function transitionFromRow(row: Row): TransitionRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    sourceClipId: asString(row.source_clip_id),
    targetClipId: asString(row.target_clip_id),
    type: asString(row.type, "fade") as TransitionRecord["type"],
    durationMs: asNumber(row.duration_ms),
    isUserEdited: asBoolean(row.is_user_edited),
  };
}

export function getDb() {
  if (database) return database;

  mkdirSync(dirname(dbPath), { recursive: true });
  mkdirSync(assetDir, { recursive: true });

  database = new Database(dbPath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  applyMigrations(database);

  return database;
}

export function getAppliedMigrations() {
  const rows = getDb()
    .prepare("SELECT id, name, applied_at FROM schema_migrations ORDER BY id ASC")
    .all() as Row[];

  return rows.map((row) => ({
    id: asNumber(row.id),
    name: asString(row.name),
    appliedAt: asString(row.applied_at),
  }));
}

export function listProjects(): ProjectSummary[] {
  const rows = getDb()
    .prepare(`
      SELECT
        p.id,
        p.title,
        p.status,
        p.duration_seconds,
        p.created_at,
        p.updated_at,
        COUNT(s.id) AS scene_count
      FROM projects p
      LEFT JOIN scenes s ON s.project_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `)
    .all() as Row[];

  return rows.map(projectSummaryFromRow);
}

export function createProject(input: { title?: string; script?: string } = {}) {
  const db = getDb();
  const timestamp = now();
  const projectId = id("project");
  const title = input.title?.trim() || "未命名项目";
  const script = input.script ?? "";

  db.prepare(
    "INSERT INTO projects (id, title, status, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?)"
  ).run(projectId, title, timestamp, timestamp);
  db.prepare("INSERT INTO scripts (project_id, content, updated_at) VALUES (?, ?, ?)").run(
    projectId,
    script,
    timestamp
  );

  return getProject(projectId);
}

export function getProject(projectId: string): ProjectDetail | null {
  const db = getDb();
  const summaryRow = db
    .prepare(`
      SELECT
        p.id,
        p.title,
        p.status,
        p.duration_seconds,
        p.created_at,
        p.updated_at,
        COUNT(s.id) AS scene_count
      FROM projects p
      LEFT JOIN scenes s ON s.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `)
    .get(projectId) as Row | undefined;

  if (!summaryRow) return null;

  const scriptRow =
    (db.prepare("SELECT project_id, content, updated_at FROM scripts WHERE project_id = ?").get(projectId) as
      | Row
      | undefined) ?? {};

  const characters = db
    .prepare(`
      SELECT
        c.*,
        a.id AS asset_id,
        a.type AS asset_type,
        a.name AS asset_name,
        a.relative_path AS asset_relative_path,
        a.mime_type AS asset_mime_type,
        a.size_bytes AS asset_size_bytes,
        a.thumbnail_path AS asset_thumbnail_path,
        a.thumbnail_status AS asset_thumbnail_status,
        a.thumbnail_error AS asset_thumbnail_error,
        a.created_at AS asset_created_at
      FROM characters c
      LEFT JOIN assets a ON a.id = c.asset_id
      WHERE c.project_id = ?
      ORDER BY c.created_at ASC
    `)
    .all(projectId) as Row[];

  const scenes = db
    .prepare(`
      SELECT
        s.*,
        a.id AS asset_id,
        a.type AS asset_type,
        a.name AS asset_name,
        a.relative_path AS asset_relative_path,
        a.mime_type AS asset_mime_type,
        a.size_bytes AS asset_size_bytes,
        a.thumbnail_path AS asset_thumbnail_path,
        a.thumbnail_status AS asset_thumbnail_status,
        a.thumbnail_error AS asset_thumbnail_error,
        a.created_at AS asset_created_at
      FROM scenes s
      LEFT JOIN assets a ON a.id = s.asset_id
      WHERE s.project_id = ?
      ORDER BY s.scene_number ASC
    `)
    .all(projectId) as Row[];

  const relationships = db
    .prepare(`
      SELECT id, project_id, source_name, target_name, relation, evidence, is_user_edited
      FROM character_relationships
      WHERE project_id = ?
      ORDER BY created_at ASC
    `)
    .all(projectId) as Row[];

  const plotBeats = db
    .prepare(`
      SELECT id, project_id, scene_number, type, summary, is_user_edited
      FROM plot_beats
      WHERE project_id = ?
      ORDER BY scene_number ASC, created_at ASC
    `)
    .all(projectId) as Row[];

  const dialogueBlocks = db
    .prepare(`
      SELECT id, project_id, scene_number, speaker, content, order_index, is_user_edited
      FROM dialogue_blocks
      WHERE project_id = ?
      ORDER BY scene_number ASC, order_index ASC
    `)
    .all(projectId) as Row[];

  const clips = db
    .prepare(`
      SELECT
        t.*,
        a.id AS asset_id,
        a.type AS asset_type,
        a.name AS asset_name,
        a.relative_path AS asset_relative_path,
        a.mime_type AS asset_mime_type,
        a.size_bytes AS asset_size_bytes,
        a.thumbnail_path AS asset_thumbnail_path,
        a.thumbnail_status AS asset_thumbnail_status,
        a.thumbnail_error AS asset_thumbnail_error,
        a.created_at AS asset_created_at
      FROM timeline_clips t
      LEFT JOIN assets a ON a.id = t.asset_id
      WHERE t.project_id = ?
      ORDER BY t.track_type ASC, t.start_ms ASC
    `)
    .all(projectId) as Row[];

  const audioTracks = db
    .prepare(`
      SELECT
        at.*,
        a.id AS asset_id,
        a.type AS asset_type,
        a.name AS asset_name,
        a.relative_path AS asset_relative_path,
        a.mime_type AS asset_mime_type,
        a.size_bytes AS asset_size_bytes,
        a.thumbnail_path AS asset_thumbnail_path,
        a.thumbnail_status AS asset_thumbnail_status,
        a.thumbnail_error AS asset_thumbnail_error,
        a.created_at AS asset_created_at
      FROM audio_tracks at
      LEFT JOIN assets a ON a.id = at.asset_id
      WHERE at.project_id = ?
      ORDER BY at.start_ms ASC, at.created_at ASC
    `)
    .all(projectId) as Row[];

  const subtitleTracks = db
    .prepare(`
      SELECT id, project_id, scene_number, dialogue_block_id, speaker, text, start_ms, duration_ms, is_user_edited
      FROM subtitle_tracks
      WHERE project_id = ?
      ORDER BY start_ms ASC, scene_number ASC, created_at ASC
    `)
    .all(projectId) as Row[];

  const transitions = db
    .prepare(`
      SELECT tr.id, tr.project_id, tr.source_clip_id, tr.target_clip_id, tr.type, tr.duration_ms, tr.is_user_edited
      FROM transition_records tr
      JOIN timeline_clips source ON source.id = tr.source_clip_id
      WHERE tr.project_id = ?
      ORDER BY source.start_ms ASC, tr.created_at ASC
    `)
    .all(projectId) as Row[];

  return {
    ...projectSummaryFromRow(summaryRow),
    script: {
      projectId,
      content: asString(scriptRow.content),
      updatedAt: asString(scriptRow.updated_at, asString(summaryRow.updated_at)),
    },
    characters: characters.map(characterFromRow),
    relationships: relationships.map(relationshipFromRow),
    plotBeats: plotBeats.map(plotBeatFromRow),
    dialogueBlocks: dialogueBlocks.map(dialogueBlockFromRow),
    scenes: scenes.map(sceneFromRow),
    timelineClips: clips.map(timelineClipFromRow),
    audioTracks: audioTracks.map(audioTrackFromRow),
    subtitleTracks: subtitleTracks.map(subtitleTrackFromRow),
    transitions: transitions.map(transitionFromRow),
  };
}

export function updateProjectTitle(projectId: string, title: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("Project title cannot be empty");
  }

  const db = getDb();
  const timestamp = now();
  const result = db
    .prepare("UPDATE projects SET title = ?, updated_at = ? WHERE id = ?")
    .run(trimmedTitle, timestamp, projectId);

  if (result.changes === 0) return null;
  return getProject(projectId);
}

function validateTimelineTiming(startMs: number, durationMs: number) {
  if (!Number.isInteger(startMs) || startMs < 0) {
    throw new Error("Timeline clip start must be a non-negative integer");
  }
  if (!Number.isInteger(durationMs) || durationMs <= 0) {
    throw new Error("Timeline clip duration must be a positive integer");
  }
}

const transitionTypes = new Set<TransitionRecord["type"]>(["cut", "fade", "dissolve", "wipe"]);

function validateTransitionType(value: unknown): TransitionRecord["type"] {
  const type = typeof value === "string" && value.trim() ? value.trim() : "fade";
  if (!transitionTypes.has(type as TransitionRecord["type"])) {
    throw new Error("Transition type is not supported");
  }
  return type as TransitionRecord["type"];
}

function validateTransitionDuration(durationMs: number, sourceDurationMs: number, targetDurationMs: number) {
  if (!Number.isInteger(durationMs) || durationMs <= 0) {
    throw new Error("Transition duration must be a positive integer");
  }
  if (durationMs > Math.min(sourceDurationMs, targetDurationMs)) {
    throw new Error("Transition duration cannot exceed connected clip duration");
  }
}

function getAdjacentVideoTransitionContext(
  db: Database.Database,
  projectId: string,
  sourceClipId: string,
  targetClipId: string
) {
  if (sourceClipId === targetClipId) {
    throw new Error("Transition clips must be different");
  }

  const videoClips = db
    .prepare(`
      SELECT id, track_type, duration_ms
      FROM timeline_clips
      WHERE project_id = ? AND track_type = 'video'
      ORDER BY start_ms ASC, created_at ASC
    `)
    .all(projectId) as Row[];
  const sourceIndex = videoClips.findIndex((clip) => asString(clip.id) === sourceClipId);
  const targetIndex = videoClips.findIndex((clip) => asString(clip.id) === targetClipId);
  if (sourceIndex < 0 || targetIndex < 0) {
    throw new Error("Transition clips must exist on the video track");
  }
  if (targetIndex !== sourceIndex + 1) {
    throw new Error("Transition clips must be adjacent video clips");
  }

  return {
    source: videoClips[sourceIndex],
    target: videoClips[targetIndex],
  };
}

function updateProjectTimelineDuration(db: Database.Database, projectId: string, timestamp: string) {
  const durationRow = db
    .prepare(`
      SELECT MAX(duration_ms) AS duration_ms FROM (
        SELECT start_ms + duration_ms AS duration_ms FROM timeline_clips WHERE project_id = ?
        UNION ALL
        SELECT start_ms + duration_ms AS duration_ms FROM audio_tracks WHERE project_id = ?
        UNION ALL
        SELECT start_ms + duration_ms AS duration_ms FROM subtitle_tracks WHERE project_id = ?
      )
    `)
    .get(projectId, projectId, projectId) as Row | undefined;
  const durationSeconds = Math.ceil(Math.max(0, asNumber(durationRow?.duration_ms)) / 1000);

  db.prepare("UPDATE projects SET duration_seconds = ?, updated_at = ? WHERE id = ?").run(
    durationSeconds,
    timestamp,
    projectId
  );
}

export function updateTimelineClip(input: {
  projectId: string;
  clipId: string;
  label?: string;
  startMs?: number;
  durationMs?: number;
}) {
  const db = getDb();
  const clip = db
    .prepare("SELECT id, label, start_ms, duration_ms FROM timeline_clips WHERE project_id = ? AND id = ?")
    .get(input.projectId, input.clipId) as Row | undefined;
  if (!clip) return null;

  const label = input.label === undefined ? asString(clip.label) : input.label.trim();
  if (!label) {
    throw new Error("Timeline clip label cannot be empty");
  }

  const startMs = input.startMs ?? asNumber(clip.start_ms);
  const durationMs = input.durationMs ?? asNumber(clip.duration_ms);
  validateTimelineTiming(startMs, durationMs);

  const timestamp = now();
  db.prepare(`
    UPDATE timeline_clips
    SET label = ?, start_ms = ?, duration_ms = ?, is_user_edited = 1, updated_at = ?
    WHERE project_id = ? AND id = ?
  `).run(label, startMs, durationMs, timestamp, input.projectId, input.clipId);
  updateProjectTimelineDuration(db, input.projectId, timestamp);

  return getProject(input.projectId);
}

export function deleteTimelineClip(projectId: string, clipId: string) {
  const db = getDb();
  const clip = db
    .prepare("SELECT id FROM timeline_clips WHERE project_id = ? AND id = ?")
    .get(projectId, clipId) as Row | undefined;
  if (!clip) return null;

  const timestamp = now();
  db.prepare("DELETE FROM timeline_clips WHERE project_id = ? AND id = ?").run(projectId, clipId);
  updateProjectTimelineDuration(db, projectId, timestamp);

  return getProject(projectId);
}

export function splitTimelineClip(input: {
  projectId: string;
  clipId: string;
  splitMs?: number;
}) {
  const db = getDb();
  const clip = db
    .prepare("SELECT id, track_type, label, start_ms, duration_ms, asset_id FROM timeline_clips WHERE project_id = ? AND id = ?")
    .get(input.projectId, input.clipId) as Row | undefined;
  if (!clip) return null;

  const durationMs = asNumber(clip.duration_ms);
  const splitMs = input.splitMs ?? Math.floor(durationMs / 2);
  if (!Number.isInteger(splitMs) || splitMs <= 0 || splitMs >= durationMs) {
    throw new Error("Timeline split point must be inside the clip duration");
  }

  const timestamp = now();
  const newClipId = id("clip");
  const label = asString(clip.label);
  const startMs = asNumber(clip.start_ms);

  db.exec("BEGIN");
  try {
    db.prepare(`
      UPDATE timeline_clips
      SET duration_ms = ?, is_user_edited = 1, updated_at = ?
      WHERE project_id = ? AND id = ?
    `).run(splitMs, timestamp, input.projectId, input.clipId);
    db.prepare(`
      INSERT INTO timeline_clips (id, project_id, track_type, label, start_ms, duration_ms, asset_id, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      newClipId,
      input.projectId,
      asString(clip.track_type, "video"),
      `${label} - 02`,
      startMs + splitMs,
      durationMs - splitMs,
      clip.asset_id ?? null,
      timestamp,
      timestamp
    );
    updateProjectTimelineDuration(db, input.projectId, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getProject(input.projectId);
}

export function reorderTimelineClip(input: {
  projectId: string;
  clipId: string;
  direction: "left" | "right";
}) {
  const db = getDb();
  if (input.direction !== "left" && input.direction !== "right") {
    throw new Error("Timeline reorder direction must be left or right");
  }

  const current = db
    .prepare("SELECT id, track_type FROM timeline_clips WHERE project_id = ? AND id = ?")
    .get(input.projectId, input.clipId) as Row | undefined;
  if (!current) return null;

  const trackType = asString(current.track_type, "video");
  const clips = db
    .prepare("SELECT id, duration_ms FROM timeline_clips WHERE project_id = ? AND track_type = ? ORDER BY start_ms ASC, created_at ASC")
    .all(input.projectId, trackType) as Row[];
  const currentIndex = clips.findIndex((clip) => asString(clip.id) === input.clipId);
  const targetIndex = input.direction === "left" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= clips.length) {
    return getProject(input.projectId);
  }

  const reordered = [...clips];
  [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];

  const timestamp = now();
  db.exec("BEGIN");
  try {
    let nextStartMs = 0;
    const updateClip = db.prepare(`
      UPDATE timeline_clips
      SET start_ms = ?, is_user_edited = 1, updated_at = ?
      WHERE project_id = ? AND id = ?
    `);
    for (const clip of reordered) {
      updateClip.run(nextStartMs, timestamp, input.projectId, asString(clip.id));
      nextStartMs += asNumber(clip.duration_ms);
    }
    updateProjectTimelineDuration(db, input.projectId, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getProject(input.projectId);
}

export function createTransitionRecord(input: {
  projectId: string;
  sourceClipId: string;
  targetClipId: string;
  type?: string;
  durationMs?: number;
}) {
  const db = getDb();
  const projectExists = db.prepare("SELECT id FROM projects WHERE id = ?").get(input.projectId);
  if (!projectExists) return null;

  const context = getAdjacentVideoTransitionContext(db, input.projectId, input.sourceClipId, input.targetClipId);
  const type = validateTransitionType(input.type);
  const durationMs = input.durationMs ?? 500;
  validateTransitionDuration(
    durationMs,
    asNumber(context.source.duration_ms),
    asNumber(context.target.duration_ms)
  );

  const timestamp = now();
  const existing = db
    .prepare("SELECT id FROM transition_records WHERE project_id = ? AND source_clip_id = ? AND target_clip_id = ?")
    .get(input.projectId, input.sourceClipId, input.targetClipId) as Row | undefined;

  if (existing) {
    db.prepare(`
      UPDATE transition_records
      SET type = ?, duration_ms = ?, is_user_edited = 1, updated_at = ?
      WHERE project_id = ? AND id = ?
    `).run(type, durationMs, timestamp, input.projectId, asString(existing.id));
  } else {
    db.prepare(`
      INSERT INTO transition_records (id, project_id, source_clip_id, target_clip_id, type, duration_ms, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id("transition"),
      input.projectId,
      input.sourceClipId,
      input.targetClipId,
      type,
      durationMs,
      timestamp,
      timestamp
    );
  }
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, input.projectId);

  return getProject(input.projectId);
}

export function updateTransitionRecord(input: {
  projectId: string;
  transitionId: string;
  sourceClipId?: string;
  targetClipId?: string;
  type?: string;
  durationMs?: number;
}) {
  const db = getDb();
  const current = db
    .prepare("SELECT id, source_clip_id, target_clip_id, type, duration_ms FROM transition_records WHERE project_id = ? AND id = ?")
    .get(input.projectId, input.transitionId) as Row | undefined;
  if (!current) return null;

  const sourceClipId = input.sourceClipId ?? asString(current.source_clip_id);
  const targetClipId = input.targetClipId ?? asString(current.target_clip_id);
  const context = getAdjacentVideoTransitionContext(db, input.projectId, sourceClipId, targetClipId);
  const type = input.type === undefined ? asString(current.type, "fade") as TransitionRecord["type"] : validateTransitionType(input.type);
  const durationMs = input.durationMs ?? asNumber(current.duration_ms, 500);
  validateTransitionDuration(
    durationMs,
    asNumber(context.source.duration_ms),
    asNumber(context.target.duration_ms)
  );

  const timestamp = now();
  db.prepare(`
    UPDATE transition_records
    SET source_clip_id = ?, target_clip_id = ?, type = ?, duration_ms = ?, is_user_edited = 1, updated_at = ?
    WHERE project_id = ? AND id = ?
  `).run(sourceClipId, targetClipId, type, durationMs, timestamp, input.projectId, input.transitionId);
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, input.projectId);

  return getProject(input.projectId);
}

export function deleteTransitionRecord(projectId: string, transitionId: string) {
  const db = getDb();
  const transition = db
    .prepare("SELECT id FROM transition_records WHERE project_id = ? AND id = ?")
    .get(projectId, transitionId) as Row | undefined;
  if (!transition) return null;

  const timestamp = now();
  db.prepare("DELETE FROM transition_records WHERE project_id = ? AND id = ?").run(projectId, transitionId);
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, projectId);
  return getProject(projectId);
}

export function createAudioTrack(input: {
  projectId: string;
  label?: string;
  speaker?: string;
  startMs?: number;
  durationMs?: number;
  assetId?: string | null;
}) {
  const db = getDb();
  const projectExists = db.prepare("SELECT id FROM projects WHERE id = ?").get(input.projectId);
  if (!projectExists) return null;

  const label = input.label?.trim() || "配音轨";
  const speaker = input.speaker?.trim() || "";
  const startMs = input.startMs ?? 0;
  const durationMs = input.durationMs ?? 5000;
  validateTimelineTiming(startMs, durationMs);

  if (input.assetId) {
    const asset = db.prepare("SELECT id, type FROM assets WHERE id = ?").get(input.assetId) as Row | undefined;
    if (!asset) {
      throw new Error("Asset not found");
    }
    if (asString(asset.type, "other") !== "audio") {
      throw new Error("Asset type is not compatible");
    }
  }

  const timestamp = now();
  db.prepare(`
    INSERT INTO audio_tracks (id, project_id, label, speaker, start_ms, duration_ms, asset_id, is_user_edited, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id("audio"),
    input.projectId,
    label,
    speaker,
    startMs,
    durationMs,
    input.assetId ?? null,
    timestamp,
    timestamp
  );
  updateProjectTimelineDuration(db, input.projectId, timestamp);

  return getProject(input.projectId);
}

function subtitleDurationMs(text: string, slotDurationMs: number) {
  const readingDuration = Math.max(1200, Math.min(4200, text.trim().length * 140));
  return Math.max(800, Math.min(slotDurationMs, readingDuration));
}

export function createSubtitleTracksFromDialogue(projectId: string) {
  const db = getDb();
  const projectExists = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!projectExists) return null;

  const dialogueRows = db
    .prepare(`
      SELECT id, project_id, scene_number, speaker, content, order_index
      FROM dialogue_blocks
      WHERE project_id = ?
      ORDER BY scene_number ASC, order_index ASC
    `)
    .all(projectId) as Row[];
  const scenes = db
    .prepare("SELECT scene_number FROM scenes WHERE project_id = ? ORDER BY scene_number ASC")
    .all(projectId) as Row[];
  const videoClips = db
    .prepare("SELECT label, start_ms, duration_ms FROM timeline_clips WHERE project_id = ? AND track_type = 'video' ORDER BY start_ms ASC, created_at ASC")
    .all(projectId) as Row[];
  const userEditedSubtitles = db
    .prepare("SELECT dialogue_block_id FROM subtitle_tracks WHERE project_id = ? AND is_user_edited = 1 AND dialogue_block_id IS NOT NULL")
    .all(projectId) as Row[];
  const preservedDialogueIds = new Set(userEditedSubtitles.map((row) => asString(row.dialogue_block_id)).filter(Boolean));

  const sceneNumbers = scenes.map((scene) => asNumber(scene.scene_number));
  const sceneTiming = new Map<number, { startMs: number; durationMs: number }>();
  sceneNumbers.forEach((sceneNumber, index) => {
    const scenePrefix = `S${String(sceneNumber).padStart(2, "0")}`;
    const matchingClip = videoClips.find((clip) => asString(clip.label).startsWith(scenePrefix)) ?? videoClips[index];
    sceneTiming.set(sceneNumber, {
      startMs: matchingClip ? asNumber(matchingClip.start_ms) : index * 5000,
      durationMs: Math.max(1000, matchingClip ? asNumber(matchingClip.duration_ms, 5000) : 5000),
    });
  });

  const dialogueCountsByScene = new Map<number, number>();
  for (const dialogue of dialogueRows) {
    const sceneNumber = asNumber(dialogue.scene_number);
    dialogueCountsByScene.set(sceneNumber, (dialogueCountsByScene.get(sceneNumber) ?? 0) + 1);
  }

  const timestamp = now();
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM subtitle_tracks WHERE project_id = ? AND is_user_edited = 0").run(projectId);

    const insertSubtitle = db.prepare(`
      INSERT INTO subtitle_tracks (id, project_id, scene_number, dialogue_block_id, speaker, text, start_ms, duration_ms, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);
    for (const dialogue of dialogueRows) {
      const dialogueId = asString(dialogue.id);
      if (preservedDialogueIds.has(dialogueId)) continue;

      const sceneNumber = asNumber(dialogue.scene_number);
      const timing = sceneTiming.get(sceneNumber) ?? { startMs: 0, durationMs: 5000 };
      const dialogueCount = Math.max(1, dialogueCountsByScene.get(sceneNumber) ?? 1);
      const slotDuration = Math.max(800, Math.floor(timing.durationMs / dialogueCount));
      const startMs = timing.startMs + asNumber(dialogue.order_index) * slotDuration;
      const text = asString(dialogue.content).trim();
      if (!text) continue;

      insertSubtitle.run(
        id("subtitle"),
        projectId,
        sceneNumber,
        dialogueId,
        asString(dialogue.speaker),
        text,
        startMs,
        subtitleDurationMs(text, slotDuration),
        timestamp,
        timestamp
      );
    }

    updateProjectTimelineDuration(db, projectId, timestamp);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getProject(projectId);
}

export function setCharacterVisualConsistency(input: {
  projectId: string;
  characterId: string;
  notes?: string;
  anchorAssetIds?: string[];
}) {
  const db = getDb();
  const character = db
    .prepare("SELECT id FROM characters WHERE project_id = ? AND id = ?")
    .get(input.projectId, input.characterId) as Row | undefined;
  if (!character) return null;

  const anchorAssetIds = Array.from(new Set(input.anchorAssetIds?.map((assetId) => assetId.trim()).filter(Boolean) ?? []));
  for (const assetId of anchorAssetIds) {
    const asset = db.prepare("SELECT id, type FROM assets WHERE id = ?").get(assetId) as Row | undefined;
    if (!asset) {
      throw new Error("Asset not found");
    }
    if (asString(asset.type, "other") !== "image") {
      throw new Error("Asset type is not compatible");
    }
  }

  const timestamp = now();
  db.prepare(`
    UPDATE characters
    SET
      visual_consistency_notes = ?,
      visual_consistency_anchor_asset_ids = ?,
      is_user_edited = 1,
      updated_at = ?
    WHERE project_id = ? AND id = ?
  `).run(
    input.notes?.trim() ?? "",
    JSON.stringify(anchorAssetIds),
    timestamp,
    input.projectId,
    input.characterId
  );
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, input.projectId);

  return getProject(input.projectId);
}

export function deleteProject(projectId: string) {
  const result = getDb().prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  return result.changes > 0;
}

export function duplicateProject(projectId: string) {
  const db = getDb();
  const source = getProject(projectId);
  if (!source) return null;

  const timestamp = now();
  const duplicateId = id("project");
  const duplicateTitle = `${source.title} 副本`;

  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO projects (id, title, status, duration_seconds, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(duplicateId, duplicateTitle, "draft", source.durationSeconds, timestamp, timestamp);
    db.prepare("INSERT INTO scripts (project_id, content, updated_at) VALUES (?, ?, ?)").run(
      duplicateId,
      source.script.content,
      timestamp
    );

    const insertCharacter = db.prepare(`
      INSERT INTO characters (
        id, project_id, name, age, role, traits, asset_id, asset_source, visual_consistency_notes,
        visual_consistency_anchor_asset_ids, is_user_edited, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const character of source.characters) {
      insertCharacter.run(
        id("character"),
        duplicateId,
        character.name,
        character.age,
        character.role,
        JSON.stringify(character.traits),
        character.asset?.id ?? null,
        character.assetSource,
        character.visualConsistency.notes,
        JSON.stringify(character.visualConsistency.anchorAssetIds),
        character.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertRelationship = db.prepare(`
      INSERT INTO character_relationships (id, project_id, source_name, target_name, relation, evidence, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const relationship of source.relationships) {
      insertRelationship.run(
        id("relationship"),
        duplicateId,
        relationship.sourceName,
        relationship.targetName,
        relationship.relation,
        relationship.evidence,
        relationship.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertPlotBeat = db.prepare(`
      INSERT INTO plot_beats (id, project_id, scene_number, type, summary, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const beat of source.plotBeats) {
      insertPlotBeat.run(
        id("plotbeat"),
        duplicateId,
        beat.sceneNumber,
        beat.type,
        beat.summary,
        beat.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertDialogue = db.prepare(`
      INSERT INTO dialogue_blocks (id, project_id, scene_number, speaker, content, order_index, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const dialogue of source.dialogueBlocks) {
      insertDialogue.run(
        id("dialogue"),
        duplicateId,
        dialogue.sceneNumber,
        dialogue.speaker,
        dialogue.content,
        dialogue.orderIndex,
        dialogue.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertScene = db.prepare(`
      INSERT INTO scenes (
        id, project_id, scene_number, location, time_of_day, mood, description, camera, characters, asset_id, asset_source, is_user_edited, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const scene of source.scenes) {
      insertScene.run(
        id("scene"),
        duplicateId,
        scene.sceneNumber,
        scene.location,
        scene.timeOfDay,
        scene.mood,
        scene.description,
        scene.camera,
        JSON.stringify(scene.characters),
        scene.asset?.id ?? null,
        scene.assetSource,
        scene.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertClip = db.prepare(`
      INSERT INTO timeline_clips (id, project_id, track_type, label, start_ms, duration_ms, asset_id, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const clipIdMap = new Map<string, string>();
    for (const clip of source.timelineClips) {
      const duplicateClipId = id("clip");
      clipIdMap.set(clip.id, duplicateClipId);
      insertClip.run(
        duplicateClipId,
        duplicateId,
        clip.trackType,
        clip.label,
        clip.startMs,
        clip.durationMs,
        clip.asset?.id ?? null,
        clip.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertTransition = db.prepare(`
      INSERT INTO transition_records (id, project_id, source_clip_id, target_clip_id, type, duration_ms, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const transition of source.transitions) {
      const sourceClipId = clipIdMap.get(transition.sourceClipId);
      const targetClipId = clipIdMap.get(transition.targetClipId);
      if (!sourceClipId || !targetClipId) continue;

      insertTransition.run(
        id("transition"),
        duplicateId,
        sourceClipId,
        targetClipId,
        transition.type,
        transition.durationMs,
        transition.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertAudioTrack = db.prepare(`
      INSERT INTO audio_tracks (id, project_id, label, speaker, start_ms, duration_ms, asset_id, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const audioTrack of source.audioTracks) {
      insertAudioTrack.run(
        id("audio"),
        duplicateId,
        audioTrack.label,
        audioTrack.speaker,
        audioTrack.startMs,
        audioTrack.durationMs,
        audioTrack.asset?.id ?? null,
        audioTrack.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertSubtitleTrack = db.prepare(`
      INSERT INTO subtitle_tracks (id, project_id, scene_number, dialogue_block_id, speaker, text, start_ms, duration_ms, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const subtitleTrack of source.subtitleTracks) {
      insertSubtitleTrack.run(
        id("subtitle"),
        duplicateId,
        subtitleTrack.sceneNumber,
        null,
        subtitleTrack.speaker,
        subtitleTrack.text,
        subtitleTrack.startMs,
        subtitleTrack.durationMs,
        subtitleTrack.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getProject(duplicateId);
}

export function updateScript(projectId: string, content: string) {
  const db = getDb();
  const timestamp = now();

  db.prepare(
    `
      INSERT INTO scripts (project_id, content, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
    `
  ).run(projectId, content, timestamp);
  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, projectId);

  return getProject(projectId);
}

function relationshipKey(source: string, target: string) {
  return [source, target].sort().join("::");
}

function plotBeatKey(sceneNumber: number, type: string) {
  return `${sceneNumber}::${type}`;
}

function dialogueBlockKey(sceneNumber: number, orderIndex: number) {
  return `${sceneNumber}::${orderIndex}`;
}

function timelineClipKey(trackType: string, startMs: number) {
  return `${trackType}::${startMs}`;
}

function getPreservedParseRecords(db: Database.Database, projectId: string): PreservedParseRecords {
  const characters = db
    .prepare("SELECT name FROM characters WHERE project_id = ? AND (is_user_edited = 1 OR asset_id IS NOT NULL OR visual_consistency_notes != '' OR visual_consistency_anchor_asset_ids != '[]') ORDER BY created_at ASC")
    .all(projectId) as Row[];
  const relationships = db
    .prepare("SELECT source_name, target_name FROM character_relationships WHERE project_id = ? AND is_user_edited = 1 ORDER BY created_at ASC")
    .all(projectId) as Row[];
  const plotBeats = db
    .prepare("SELECT scene_number, type FROM plot_beats WHERE project_id = ? AND is_user_edited = 1 ORDER BY scene_number ASC, created_at ASC")
    .all(projectId) as Row[];
  const dialogueBlocks = db
    .prepare("SELECT scene_number, speaker, order_index FROM dialogue_blocks WHERE project_id = ? AND is_user_edited = 1 ORDER BY scene_number ASC, order_index ASC")
    .all(projectId) as Row[];
  const scenes = db
    .prepare("SELECT scene_number, location FROM scenes WHERE project_id = ? AND (is_user_edited = 1 OR asset_id IS NOT NULL) ORDER BY scene_number ASC")
    .all(projectId) as Row[];
  const timelineClips = db
    .prepare("SELECT label FROM timeline_clips WHERE project_id = ? AND (is_user_edited = 1 OR asset_id IS NOT NULL) ORDER BY track_type ASC, start_ms ASC")
    .all(projectId) as Row[];

  return {
    characters: characters.map((row) => asString(row.name)).filter(Boolean),
    relationships: relationships
      .map((row) => `${asString(row.source_name)} - ${asString(row.target_name)}`)
      .filter((label) => label !== " - "),
    plotBeats: plotBeats.map((row) => `S${String(asNumber(row.scene_number)).padStart(2, "0")} ${asString(row.type)}`),
    dialogueBlocks: dialogueBlocks.map((row) => `S${String(asNumber(row.scene_number)).padStart(2, "0")} ${asString(row.speaker)} #${asNumber(row.order_index) + 1}`),
    scenes: scenes.map((row) => `S${String(asNumber(row.scene_number)).padStart(2, "0")} ${asString(row.location)}`),
    timelineClips: timelineClips.map((row) => asString(row.label)).filter(Boolean),
  };
}

export function previewProjectScript(projectId: string): ScriptParsePreview | null {
  const db = getDb();
  const project = getProject(projectId);
  if (!project) return null;

  const parsed = parseScriptWithAgent(project.script.content);

  return {
    characters: parsed.characters.map((character) => ({
      name: character.name,
      age: character.age,
      role: character.role,
      traits: character.traits,
    })),
    relationships: parsed.relationships.map((relationship) => ({
      sourceName: relationship.source,
      targetName: relationship.target,
      relation: relationship.relation,
      evidence: relationship.evidence,
    })),
    plotBeats: parsed.plotBeats.map((beat) => ({
      sceneNumber: beat.sceneNumber,
      type: beat.type,
      summary: beat.summary,
    })),
    dialogueBlocks: parsed.dialogueBlocks.map((dialogue) => ({
      sceneNumber: dialogue.sceneNumber,
      speaker: dialogue.speaker,
      content: dialogue.content,
      orderIndex: dialogue.orderIndex,
    })),
    scenes: parsed.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      location: scene.location,
      timeOfDay: scene.timeOfDay,
      mood: scene.mood,
      description: scene.description,
      camera: scene.camera,
      characters: scene.characters,
    })),
    timelineClips: parsed.scenes.map((scene, index) => ({
      trackType: "video",
      label: `S${String(scene.sceneNumber).padStart(2, "0")} - ${scene.location}`,
      startMs: index * 5000,
      durationMs: 5000,
    })),
    preservedRecords: getPreservedParseRecords(db, projectId),
    warnings: parsed.warnings,
  };
}

export function parseProjectScript(projectId: string) {
  const db = getDb();
  const project = getProject(projectId);
  if (!project) return null;

  const parsed = parseScriptWithAgent(project.script.content);
  const timestamp = now();
  const preservedCharacterNames = new Set(
    project.characters
      .filter((character) => (
        character.isUserEdited ||
        character.asset ||
        Boolean(character.visualConsistency.notes) ||
        character.visualConsistency.anchorAssetIds.length > 0
      ))
      .map((character) => character.name)
  );
  const preservedRelationshipKeys = new Set(
    project.relationships
      .filter((relationship) => relationship.isUserEdited)
      .map((relationship) => relationshipKey(relationship.sourceName, relationship.targetName))
  );
  const preservedPlotBeatKeys = new Set(
    project.plotBeats
      .filter((beat) => beat.isUserEdited)
      .map((beat) => plotBeatKey(beat.sceneNumber, beat.type))
  );
  const preservedDialogueKeys = new Set(
    project.dialogueBlocks
      .filter((dialogue) => dialogue.isUserEdited)
      .map((dialogue) => dialogueBlockKey(dialogue.sceneNumber, dialogue.orderIndex))
  );
  const preservedSceneNumbers = new Set(
    project.scenes.filter((scene) => scene.isUserEdited || scene.asset).map((scene) => scene.sceneNumber)
  );
  const preservedTimelineKeys = new Set(
    project.timelineClips
      .filter((clip) => clip.isUserEdited || clip.asset)
      .map((clip) => timelineClipKey(clip.trackType, clip.startMs))
  );

  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM characters WHERE project_id = ? AND is_user_edited = 0 AND asset_id IS NULL AND visual_consistency_notes = '' AND visual_consistency_anchor_asset_ids = '[]'").run(projectId);
    db.prepare("DELETE FROM character_relationships WHERE project_id = ? AND is_user_edited = 0").run(projectId);
    db.prepare("DELETE FROM plot_beats WHERE project_id = ? AND is_user_edited = 0").run(projectId);
    db.prepare("DELETE FROM dialogue_blocks WHERE project_id = ? AND is_user_edited = 0").run(projectId);
    db.prepare("DELETE FROM scenes WHERE project_id = ? AND is_user_edited = 0 AND asset_id IS NULL").run(projectId);
    db.prepare("DELETE FROM timeline_clips WHERE project_id = ? AND is_user_edited = 0 AND asset_id IS NULL").run(projectId);

    const insertCharacter = db.prepare(`
      INSERT INTO characters (id, project_id, name, age, role, traits, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const character of parsed.characters) {
      if (preservedCharacterNames.has(character.name)) continue;
      insertCharacter.run(
        id("character"),
        projectId,
        character.name,
        character.age,
        character.role,
        JSON.stringify(character.traits),
        timestamp,
        timestamp
      );
    }

    const insertRelationship = db.prepare(`
      INSERT INTO character_relationships (id, project_id, source_name, target_name, relation, evidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const relationship of parsed.relationships) {
      if (preservedRelationshipKeys.has(relationshipKey(relationship.source, relationship.target))) continue;
      insertRelationship.run(
        id("relationship"),
        projectId,
        relationship.source,
        relationship.target,
        relationship.relation,
        relationship.evidence,
        timestamp,
        timestamp
      );
    }

    const insertPlotBeat = db.prepare(`
      INSERT INTO plot_beats (id, project_id, scene_number, type, summary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const beat of parsed.plotBeats) {
      if (preservedPlotBeatKeys.has(plotBeatKey(beat.sceneNumber, beat.type))) continue;
      insertPlotBeat.run(
        id("plotbeat"),
        projectId,
        beat.sceneNumber,
        beat.type,
        beat.summary,
        timestamp,
        timestamp
      );
    }

    const insertDialogue = db.prepare(`
      INSERT INTO dialogue_blocks (id, project_id, scene_number, speaker, content, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const dialogue of parsed.dialogueBlocks) {
      if (preservedDialogueKeys.has(dialogueBlockKey(dialogue.sceneNumber, dialogue.orderIndex))) continue;
      insertDialogue.run(
        id("dialogue"),
        projectId,
        dialogue.sceneNumber,
        dialogue.speaker,
        dialogue.content,
        dialogue.orderIndex,
        timestamp,
        timestamp
      );
    }

    const insertScene = db.prepare(`
      INSERT INTO scenes (
        id, project_id, scene_number, location, time_of_day, mood, description, camera, characters, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertClip = db.prepare(`
      INSERT INTO timeline_clips (id, project_id, track_type, label, start_ms, duration_ms, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    parsed.scenes.forEach((scene, index) => {
      if (!preservedSceneNumbers.has(scene.sceneNumber)) {
        insertScene.run(
          id("scene"),
          projectId,
          scene.sceneNumber,
          scene.location,
          scene.timeOfDay,
          scene.mood,
          scene.description,
          scene.camera,
          JSON.stringify(scene.characters),
          timestamp,
          timestamp
        );
      }

      const clipLabel = `S${String(scene.sceneNumber).padStart(2, "0")} - ${scene.location}`;
      if (!preservedTimelineKeys.has(timelineClipKey("video", index * 5000))) {
        insertClip.run(
          id("clip"),
          projectId,
          "video",
          clipLabel,
          index * 5000,
          5000,
          timestamp,
          timestamp
        );
      }
    });

    db.prepare("UPDATE projects SET status = 'draft', updated_at = ? WHERE id = ?").run(timestamp, projectId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const updatedProject = getProject(projectId);
  if (!updatedProject) return null;

  return Object.assign(updatedProject, { parseWarnings: parsed.warnings });
}

export function listAssets(): AssetRecord[] {
  const rows = getDb()
    .prepare(
      "SELECT id AS asset_id, type AS asset_type, name AS asset_name, relative_path AS asset_relative_path, mime_type AS asset_mime_type, size_bytes AS asset_size_bytes, thumbnail_path AS asset_thumbnail_path, thumbnail_status AS asset_thumbnail_status, thumbnail_error AS asset_thumbnail_error, created_at AS asset_created_at FROM assets ORDER BY created_at DESC"
    )
    .all() as Row[];
  return rows.map(assetFromRow).filter((asset): asset is AssetRecord => Boolean(asset));
}

function getAssetById(assetId: string): AssetRecord | null {
  const row = getDb()
    .prepare(
      "SELECT id AS asset_id, type AS asset_type, name AS asset_name, relative_path AS asset_relative_path, mime_type AS asset_mime_type, size_bytes AS asset_size_bytes, thumbnail_path AS asset_thumbnail_path, thumbnail_status AS asset_thumbnail_status, thumbnail_error AS asset_thumbnail_error, created_at AS asset_created_at FROM assets WHERE id = ?"
    )
    .get(assetId) as Row | undefined;

  return assetFromRow(row ?? null);
}

function assetReferencesFromRows(rows: Row[]): AssetReferenceRecord[] {
  return rows.map((row) => ({
    targetType: asString(row.target_type, "character") as AssetLinkTargetType,
    targetId: asString(row.target_id),
    targetLabel: asString(row.target_label),
    projectId: asString(row.project_id),
    projectTitle: asString(row.project_title),
  }));
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createAssetThumbnail(input: {
  type: AssetRecord["type"];
  name: string;
  relativePath: string;
}) {
  if (!["image", "video"].includes(input.type)) {
    return {
      thumbnailPath: null,
      thumbnailStatus: "unavailable" as const,
      thumbnailError: null,
    };
  }

  try {
    const thumbnailsDir = join(assetDir, "thumbnails");
    mkdirSync(thumbnailsDir, { recursive: true });
    const thumbnailName = `${randomUUID().replaceAll("-", "")}-${basename(input.relativePath)}.svg`;
    const thumbnailPath = `thumbnails/${thumbnailName}`;
    const label = input.type === "video" ? "VIDEO" : "IMAGE";
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" role="img">`,
      `<rect width="320" height="180" fill="#0a0a0a"/>`,
      `<rect x="1" y="1" width="318" height="178" fill="#171717" stroke="#404040"/>`,
      `<text x="24" y="64" fill="#a3a3a3" font-family="Arial, sans-serif" font-size="18" font-weight="700">${label}</text>`,
      `<text x="24" y="104" fill="#e5e5e5" font-family="Arial, sans-serif" font-size="16">${escapeSvgText(input.name).slice(0, 42)}</text>`,
      `<text x="24" y="132" fill="#737373" font-family="Arial, sans-serif" font-size="12">${escapeSvgText(input.relativePath).slice(0, 52)}</text>`,
      `</svg>`,
    ].join("");
    writeFileSync(join(assetDir, thumbnailPath), svg);

    return {
      thumbnailPath,
      thumbnailStatus: "fallback" as const,
      thumbnailError: null,
    };
  } catch (error) {
    return {
      thumbnailPath: null,
      thumbnailStatus: "failed" as const,
      thumbnailError: error instanceof Error ? error.message : "thumbnail generation failed",
    };
  }
}

export function getAssetDetail(assetId: string): Omit<AssetDetail, "assetUrl" | "thumbnailUrl" | "fileExists"> | null {
  const asset = getAssetById(assetId);
  if (!asset) return null;

  const versionRows = getDb()
    .prepare(`
      SELECT
        id,
        asset_id,
        version_number,
        name,
        relative_path,
        mime_type,
        size_bytes,
        thumbnail_path,
        thumbnail_status,
        thumbnail_error,
        source,
        provider,
        model,
        prompt,
        parameters,
        parent_version_id,
        is_active,
        created_at
      FROM asset_versions
      WHERE asset_id = ?
      ORDER BY version_number DESC
    `)
    .all(assetId) as Row[];

  const rows = getDb()
    .prepare(`
      SELECT 'character' AS target_type, c.id AS target_id, c.name AS target_label, p.id AS project_id, p.title AS project_title
      FROM characters c
      JOIN projects p ON p.id = c.project_id
      WHERE c.asset_id = ?
      UNION ALL
      SELECT 'scene' AS target_type, s.id AS target_id, 'S' || printf('%02d', s.scene_number) || ' - ' || s.location AS target_label, p.id AS project_id, p.title AS project_title
      FROM scenes s
      JOIN projects p ON p.id = s.project_id
      WHERE s.asset_id = ?
      UNION ALL
      SELECT 'timelineClip' AS target_type, t.id AS target_id, t.label AS target_label, p.id AS project_id, p.title AS project_title
      FROM timeline_clips t
      JOIN projects p ON p.id = t.project_id
      WHERE t.asset_id = ?
      UNION ALL
      SELECT 'audioTrack' AS target_type, at.id AS target_id, at.label AS target_label, p.id AS project_id, p.title AS project_title
      FROM audio_tracks at
      JOIN projects p ON p.id = at.project_id
      WHERE at.asset_id = ?
      ORDER BY project_title ASC, target_type ASC, target_label ASC
    `)
    .all(assetId, assetId, assetId, assetId) as Row[];

  return {
    asset,
    versions: versionRows.map(assetVersionFromRow),
    references: assetReferencesFromRows(rows),
  };
}

function ensureInitialAssetVersion(asset: AssetRecord) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM asset_versions WHERE asset_id = ? LIMIT 1").get(asset.id);
  if (existing) return;

  db.prepare(`
    INSERT INTO asset_versions (
      id, asset_id, version_number, name, relative_path, mime_type, size_bytes, thumbnail_path, thumbnail_status, thumbnail_error, source, is_active, created_at
    )
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 'import', 1, ?)
  `).run(
    id("version"),
    asset.id,
    asset.name,
    asset.relativePath,
    asset.mimeType,
    asset.sizeBytes,
    asset.thumbnailPath,
    asset.thumbnailStatus,
    asset.thumbnailError,
    asset.createdAt
  );
}

export function registerAsset(input: {
  type: AssetRecord["type"];
  name: string;
  relativePath: string;
  mimeType?: string | null;
  sizeBytes?: number;
}) {
  const db = getDb();
  const timestamp = now();
  const thumbnail = createAssetThumbnail({
    type: input.type,
    name: input.name,
    relativePath: input.relativePath,
  });

  db.prepare(`
    INSERT INTO assets (id, type, name, relative_path, mime_type, size_bytes, thumbnail_path, thumbnail_status, thumbnail_error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(relative_path) DO UPDATE SET
      type = excluded.type,
      name = excluded.name,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      thumbnail_path = excluded.thumbnail_path,
      thumbnail_status = excluded.thumbnail_status,
      thumbnail_error = excluded.thumbnail_error
  `).run(
    id("asset"),
    input.type,
    input.name,
    input.relativePath,
    input.mimeType ?? null,
    input.sizeBytes ?? 0,
    thumbnail.thumbnailPath,
    thumbnail.thumbnailStatus,
    thumbnail.thumbnailError,
    timestamp
  );

  const row = db
    .prepare(
      "SELECT id AS asset_id, type AS asset_type, name AS asset_name, relative_path AS asset_relative_path, mime_type AS asset_mime_type, size_bytes AS asset_size_bytes, thumbnail_path AS asset_thumbnail_path, thumbnail_status AS asset_thumbnail_status, thumbnail_error AS asset_thumbnail_error, created_at AS asset_created_at FROM assets WHERE relative_path = ?"
    )
    .get(input.relativePath) as Row | undefined;

  const asset = assetFromRow(row ?? null);
  if (asset) {
    ensureInitialAssetVersion(asset);
  }

  return asset;
}

export function registerImageGeneration(input: {
  projectId: string;
  assetId: string;
  targetType: ImageGenerationRecord["targetType"];
  prompt: string;
  negativePrompt?: string | null;
  provider: string;
  model: string;
  parameters?: Record<string, unknown>;
  seed?: number | null;
  sourceAssetIds?: string[];
  parentArtifacts?: GeneratedArtifactReference[];
  metadata?: Record<string, unknown>;
}) {
  const timestamp = now();
  const generationId = id("generation");

  getDb().prepare(`
    INSERT INTO image_generations (
      id,
      project_id,
      asset_id,
      target_type,
      prompt,
      negative_prompt,
      provider,
      model,
      parameters,
      seed,
      source_asset_ids,
      parent_artifacts,
      metadata,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    generationId,
    input.projectId,
    input.assetId,
    input.targetType,
    input.prompt,
    input.negativePrompt ?? null,
    input.provider,
    input.model,
    JSON.stringify(input.parameters ?? {}),
    input.seed ?? null,
    JSON.stringify(input.sourceAssetIds ?? []),
    JSON.stringify(input.parentArtifacts ?? []),
    JSON.stringify(input.metadata ?? {}),
    timestamp
  );

  return getImageGeneration(generationId);
}

export function getImageGeneration(generationId: string): ImageGenerationRecord | null {
  const row = getDb()
    .prepare("SELECT * FROM image_generations WHERE id = ?")
    .get(generationId) as Row | undefined;

  return row ? imageGenerationFromRow(row) : null;
}

export function getImageGenerationByAssetId(assetId: string): ImageGenerationRecord | null {
  const row = getDb()
    .prepare("SELECT * FROM image_generations WHERE asset_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(assetId) as Row | undefined;

  return row ? imageGenerationFromRow(row) : null;
}

export function listImageGenerations(projectId: string): ImageGenerationRecord[] {
  const rows = getDb()
    .prepare("SELECT * FROM image_generations WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId) as Row[];

  return rows.map(imageGenerationFromRow);
}

export function createImageGenerationJob(input: {
  projectId: string;
  targetType: ImageGenerationRecord["targetType"];
  prompt: string;
  negativePrompt?: string | null;
  provider: string;
  model: string;
  parameters?: Record<string, unknown>;
  sourceAssetIds?: string[];
  parentArtifacts?: GeneratedArtifactReference[];
  retryOfJobId?: string | null;
  regenerateOfGenerationId?: string | null;
}) {
  const timestamp = now();
  const jobId = id("generation_job");

  getDb().prepare(`
    INSERT INTO image_generation_jobs (
      id,
      project_id,
      target_type,
      status,
      prompt,
      negative_prompt,
      provider,
      model,
      parameters,
      source_asset_ids,
      parent_artifacts,
      retry_of_job_id,
      regenerate_of_generation_id,
      queued_at,
      updated_at
    )
    VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    input.projectId,
    input.targetType,
    input.prompt,
    input.negativePrompt ?? null,
    input.provider,
    input.model,
    JSON.stringify(input.parameters ?? {}),
    JSON.stringify(input.sourceAssetIds ?? []),
    JSON.stringify(input.parentArtifacts ?? []),
    input.retryOfJobId ?? null,
    input.regenerateOfGenerationId ?? null,
    timestamp,
    timestamp
  );

  return getImageGenerationJob(jobId);
}

export function updateImageGenerationJobStatus(input: {
  jobId: string;
  status: ImageGenerationJobStatus;
  assetId?: string | null;
  generationId?: string | null;
  errorMessage?: string | null;
}) {
  const timestamp = now();
  const existing = getImageGenerationJob(input.jobId);
  if (!existing) return null;

  getDb().prepare(`
    UPDATE image_generation_jobs
    SET
      status = ?,
      asset_id = COALESCE(?, asset_id),
      generation_id = COALESCE(?, generation_id),
      error_message = ?,
      started_at = CASE
        WHEN ? = 'running' AND started_at IS NULL THEN ?
        ELSE started_at
      END,
      completed_at = CASE
        WHEN ? IN ('completed', 'failed') THEN ?
        ELSE completed_at
      END,
      updated_at = ?
    WHERE id = ?
  `).run(
    input.status,
    input.assetId ?? null,
    input.generationId ?? null,
    input.errorMessage ?? null,
    input.status,
    timestamp,
    input.status,
    timestamp,
    timestamp,
    input.jobId
  );

  return getImageGenerationJob(input.jobId);
}

export function getImageGenerationJob(jobId: string): ImageGenerationJobRecord | null {
  const row = getDb()
    .prepare("SELECT * FROM image_generation_jobs WHERE id = ?")
    .get(jobId) as Row | undefined;

  return row ? imageGenerationJobFromRow(row) : null;
}

export function listImageGenerationJobs(projectId: string): ImageGenerationJobRecord[] {
  const rows = getDb()
    .prepare("SELECT * FROM image_generation_jobs WHERE project_id = ? ORDER BY queued_at DESC")
    .all(projectId) as Row[];

  return rows.map(imageGenerationJobFromRow);
}

export function retryImageGenerationJob(jobId: string): ImageGenerationJobRecord | null {
  const failedJob = getImageGenerationJob(jobId);
  if (!failedJob || failedJob.status !== "failed") return null;

  return createImageGenerationJob({
    projectId: failedJob.projectId,
    targetType: failedJob.targetType,
    prompt: failedJob.prompt,
    negativePrompt: failedJob.negativePrompt,
    provider: failedJob.provider,
    model: failedJob.model,
    parameters: failedJob.parameters,
    sourceAssetIds: failedJob.sourceAssetIds,
    parentArtifacts: failedJob.parentArtifacts,
    retryOfJobId: failedJob.id,
  });
}

export function createRegenerateImageGenerationJob(generationId: string): ImageGenerationJobRecord | null {
  const generation = getImageGeneration(generationId);
  if (!generation) return null;

  return createImageGenerationJob({
    projectId: generation.projectId,
    targetType: generation.targetType,
    prompt: generation.prompt,
    negativePrompt: generation.negativePrompt,
    provider: generation.provider,
    model: generation.model,
    parameters: generation.parameters,
    sourceAssetIds: generation.sourceAssetIds,
    parentArtifacts: [
      ...generation.parentArtifacts,
      {
        type: "generation",
        id: generation.id,
      },
    ],
    regenerateOfGenerationId: generation.id,
  });
}

export function addAssetVersion(input: {
  assetId: string;
  name: string;
  relativePath: string;
  mimeType?: string | null;
  sizeBytes?: number;
  source?: AssetVersionRecord["source"];
  provider?: string | null;
  model?: string | null;
  prompt?: string | null;
  parameters?: Record<string, unknown> | null;
  parentVersionId?: string | null;
  makeActive?: boolean;
}) {
  const db = getDb();
  const asset = getAssetById(input.assetId);
  if (!asset) return null;

  const timestamp = now();
  const nextVersion = asNumber(
    (db.prepare("SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number FROM asset_versions WHERE asset_id = ?")
      .get(input.assetId) as Row | undefined)?.version_number,
    1
  );
  const activeVersion = db
    .prepare("SELECT id FROM asset_versions WHERE asset_id = ? AND is_active = 1 LIMIT 1")
    .get(input.assetId) as Row | undefined;
  const versionId = id("version");
  const source = input.source ?? "regeneration";
  const thumbnail = createAssetThumbnail({
    type: asset.type,
    name: input.name,
    relativePath: input.relativePath,
  });

  db.exec("BEGIN");
  try {
    db.prepare(`
      INSERT INTO asset_versions (
        id, asset_id, version_number, name, relative_path, mime_type, size_bytes, thumbnail_path, thumbnail_status, thumbnail_error, source, provider, model, prompt, parameters, parent_version_id, is_active, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      versionId,
      input.assetId,
      nextVersion,
      input.name,
      input.relativePath,
      input.mimeType ?? null,
      input.sizeBytes ?? 0,
      thumbnail.thumbnailPath,
      thumbnail.thumbnailStatus,
      thumbnail.thumbnailError,
      source,
      input.provider ?? null,
      input.model ?? null,
      input.prompt ?? null,
      input.parameters ? JSON.stringify(input.parameters) : null,
      input.parentVersionId ?? (activeVersion ? asString(activeVersion.id) : null),
      timestamp
    );

    if (input.makeActive ?? true) {
      db.prepare("UPDATE asset_versions SET is_active = 0 WHERE asset_id = ?").run(input.assetId);
      db.prepare("UPDATE asset_versions SET is_active = 1 WHERE id = ?").run(versionId);
      db.prepare(`
        UPDATE assets
        SET name = ?, relative_path = ?, mime_type = ?, size_bytes = ?, thumbnail_path = ?, thumbnail_status = ?, thumbnail_error = ?
        WHERE id = ?
      `).run(
        input.name,
        input.relativePath,
        input.mimeType ?? null,
        input.sizeBytes ?? 0,
        thumbnail.thumbnailPath,
        thumbnail.thumbnailStatus,
        thumbnail.thumbnailError,
        input.assetId
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getAssetDetail(input.assetId);
}

export function activateAssetVersion(assetId: string, versionId: string) {
  const db = getDb();
  const version = db
    .prepare(`
      SELECT id, asset_id, name, relative_path, mime_type, size_bytes
        , thumbnail_path, thumbnail_status, thumbnail_error
      FROM asset_versions
      WHERE asset_id = ? AND id = ?
    `)
    .get(assetId, versionId) as Row | undefined;

  if (!version) return null;

  db.exec("BEGIN");
  try {
    db.prepare("UPDATE asset_versions SET is_active = 0 WHERE asset_id = ?").run(assetId);
    db.prepare("UPDATE asset_versions SET is_active = 1 WHERE id = ?").run(versionId);
    db.prepare(`
      UPDATE assets
      SET name = ?, relative_path = ?, mime_type = ?, size_bytes = ?, thumbnail_path = ?, thumbnail_status = ?, thumbnail_error = ?
      WHERE id = ?
    `).run(
      asString(version.name),
      asString(version.relative_path),
      version.mime_type === null ? null : asString(version.mime_type),
      asNumber(version.size_bytes),
      version.thumbnail_path === null ? null : asString(version.thumbnail_path),
      asString(version.thumbnail_status, "unavailable"),
      version.thumbnail_error === null ? null : asString(version.thumbnail_error),
      assetId
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getAssetDetail(assetId);
}

function isSafeAssetRelativePath(relativePath: string) {
  const absolutePath = join(assetDir, relativePath);
  const normalizedAssetDir = normalize(assetDir);
  return absolutePath.startsWith(normalizedAssetDir + sep);
}

function collectAssetFilePaths(db: Database.Database, assetId: string) {
  const rows = db
    .prepare(`
      SELECT relative_path FROM assets WHERE id = ?
      UNION
      SELECT thumbnail_path AS relative_path FROM assets WHERE id = ? AND thumbnail_path IS NOT NULL
      UNION
      SELECT relative_path FROM asset_versions WHERE asset_id = ?
      UNION
      SELECT thumbnail_path AS relative_path FROM asset_versions WHERE asset_id = ? AND thumbnail_path IS NOT NULL
    `)
    .all(assetId, assetId, assetId, assetId) as Row[];

  return rows.map((row) => asString(row.relative_path)).filter(Boolean);
}

function relativePathUsedByOtherAssets(db: Database.Database, assetId: string, relativePath: string) {
  const row = db
    .prepare(`
      SELECT 1 AS used
      FROM assets
      WHERE id != ? AND relative_path = ?
      UNION
      SELECT 1 AS used
      FROM assets
      WHERE id != ? AND thumbnail_path = ?
      UNION
      SELECT 1 AS used
      FROM asset_versions
      WHERE asset_id != ? AND relative_path = ?
      UNION
      SELECT 1 AS used
      FROM asset_versions
      WHERE asset_id != ? AND thumbnail_path = ?
      LIMIT 1
    `)
    .get(assetId, relativePath, assetId, relativePath, assetId, relativePath, assetId, relativePath) as Row | undefined;

  return Boolean(row);
}

export function deleteAsset(assetId: string): AssetDeleteResult | null {
  const db = getDb();
  const detail = getAssetDetail(assetId);
  if (!detail) return null;
  if (detail.references.length > 0) {
    throw new Error("Asset is still referenced");
  }

  const relativePaths = collectAssetFilePaths(db, assetId).filter((relativePath) => (
    isSafeAssetRelativePath(relativePath) && !relativePathUsedByOtherAssets(db, assetId, relativePath)
  ));

  const deleted = db.prepare("DELETE FROM assets WHERE id = ?").run(assetId);
  if (deleted.changes === 0) return null;

  const removedFiles: string[] = [];
  for (const relativePath of relativePaths) {
    const absolutePath = join(assetDir, relativePath);
    if (!existsSync(absolutePath)) continue;
    const stats = statSync(absolutePath);
    if (!stats.isFile()) continue;
    unlinkSync(absolutePath);
    removedFiles.push(relativePath);
  }

  return {
    deleted: true,
    asset: detail.asset,
    removedFiles,
  };
}

export function linkAssetToProjectRecord(input: {
  projectId: string;
  targetType: AssetLinkTargetType;
  targetId: string;
  assetId: string | null;
}) {
  const db = getDb();
  const projectExists = db.prepare("SELECT id FROM projects WHERE id = ?").get(input.projectId);
  if (!projectExists) return null;

  const tableByTarget: Record<AssetLinkTargetType, string> = {
    character: "characters",
    scene: "scenes",
    timelineClip: "timeline_clips",
    audioTrack: "audio_tracks",
  };
  const table = tableByTarget[input.targetType];
  const targetColumns = input.targetType === "timelineClip" ? "id, track_type" : "id";
  const targetRow = db
    .prepare(`SELECT ${targetColumns} FROM ${table} WHERE project_id = ? AND id = ?`)
    .get(input.projectId, input.targetId) as Row | undefined;
  if (!targetRow) return null;

  if (input.assetId) {
    const assetRow = db.prepare("SELECT id, type FROM assets WHERE id = ?").get(input.assetId) as Row | undefined;
    if (!assetRow) {
      throw new Error("Asset not found");
    }

    const assetType = asString(assetRow.type, "other") as AssetRecord["type"];
    const trackType = asString(targetRow.track_type, "video");
    if ((input.targetType === "character" || input.targetType === "scene") && assetType !== "image") {
      throw new Error("Asset type is not compatible");
    }
    if (input.targetType === "timelineClip" && trackType === "audio" && assetType !== "audio") {
      throw new Error("Asset type is not compatible");
    }
    if (input.targetType === "timelineClip" && trackType === "video" && !["video", "image"].includes(assetType)) {
      throw new Error("Asset type is not compatible");
    }
    if (input.targetType === "audioTrack" && assetType !== "audio") {
      throw new Error("Asset type is not compatible");
    }
  }

  const timestamp = now();
  const result = input.targetType === "character" || input.targetType === "scene"
    ? db
      .prepare(
        `UPDATE ${table} SET asset_id = ?, asset_source = ?, is_user_edited = 1, updated_at = ? WHERE project_id = ? AND id = ?`
      )
      .run(input.assetId, input.assetId ? "manual" : null, timestamp, input.projectId, input.targetId)
    : db
      .prepare(
        `UPDATE ${table} SET asset_id = ?, is_user_edited = 1, updated_at = ? WHERE project_id = ? AND id = ?`
      )
      .run(input.assetId, timestamp, input.projectId, input.targetId);

  if (result.changes === 0) return null;

  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, input.projectId);
  return getProject(input.projectId);
}
