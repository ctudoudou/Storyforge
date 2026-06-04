import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { parseScriptWithAgent } from "../agents/script-parser/index.ts";
import type {
  AssetRecord,
  CharacterRelationshipRecord,
  CharacterRecord,
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
  SceneRecord,
  TimelineClipRecord,
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
    createdAt: asString(row.asset_created_at),
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
  };
}

function sceneFromRow(row: Row): SceneRecord {
  return {
    id: asString(row.id),
    projectId: asString(row.project_id),
    sceneNumber: asNumber(row.scene_number),
    location: asString(row.location),
    timeOfDay: asString(row.time_of_day),
    description: asString(row.description),
    camera: asString(row.camera),
    characters: asJsonArray(row.characters).map(String),
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
    asset: assetFromRow(row),
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
        a.created_at AS asset_created_at
      FROM scenes s
      LEFT JOIN assets a ON a.id = s.asset_id
      WHERE s.project_id = ?
      ORDER BY s.scene_number ASC
    `)
    .all(projectId) as Row[];

  const relationships = db
    .prepare(`
      SELECT id, project_id, source_name, target_name, relation, evidence
      FROM character_relationships
      WHERE project_id = ?
      ORDER BY created_at ASC
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
        a.created_at AS asset_created_at
      FROM timeline_clips t
      LEFT JOIN assets a ON a.id = t.asset_id
      WHERE t.project_id = ?
      ORDER BY t.track_type ASC, t.start_ms ASC
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
    scenes: scenes.map(sceneFromRow),
    timelineClips: clips.map(timelineClipFromRow),
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
      INSERT INTO characters (id, project_id, name, age, role, traits, asset_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        timestamp,
        timestamp
      );
    }

    const insertRelationship = db.prepare(`
      INSERT INTO character_relationships (id, project_id, source_name, target_name, relation, evidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const relationship of source.relationships) {
      insertRelationship.run(
        id("relationship"),
        duplicateId,
        relationship.sourceName,
        relationship.targetName,
        relationship.relation,
        relationship.evidence,
        timestamp,
        timestamp
      );
    }

    const insertScene = db.prepare(`
      INSERT INTO scenes (
        id, project_id, scene_number, location, time_of_day, description, camera, characters, asset_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const scene of source.scenes) {
      insertScene.run(
        id("scene"),
        duplicateId,
        scene.sceneNumber,
        scene.location,
        scene.timeOfDay,
        scene.description,
        scene.camera,
        JSON.stringify(scene.characters),
        scene.asset?.id ?? null,
        timestamp,
        timestamp
      );
    }

    const insertClip = db.prepare(`
      INSERT INTO timeline_clips (id, project_id, track_type, label, start_ms, duration_ms, asset_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const clip of source.timelineClips) {
      insertClip.run(
        id("clip"),
        duplicateId,
        clip.trackType,
        clip.label,
        clip.startMs,
        clip.durationMs,
        clip.asset?.id ?? null,
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

export function parseProjectScript(projectId: string) {
  const db = getDb();
  const project = getProject(projectId);
  if (!project) return null;

  const parsed = parseScriptWithAgent(project.script.content);
  const timestamp = now();

  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM characters WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM character_relationships WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM scenes WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM timeline_clips WHERE project_id = ?").run(projectId);

    const insertCharacter = db.prepare(`
      INSERT INTO characters (id, project_id, name, age, role, traits, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const character of parsed.characters) {
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

    const insertScene = db.prepare(`
      INSERT INTO scenes (
        id, project_id, scene_number, location, time_of_day, description, camera, characters, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertClip = db.prepare(`
      INSERT INTO timeline_clips (id, project_id, track_type, label, start_ms, duration_ms, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    parsed.scenes.forEach((scene, index) => {
      insertScene.run(
        id("scene"),
        projectId,
        scene.sceneNumber,
        scene.location,
        scene.timeOfDay,
        scene.description,
        scene.camera,
        JSON.stringify(scene.characters),
        timestamp,
        timestamp
      );
      insertClip.run(
        id("clip"),
        projectId,
        "video",
        `S${String(scene.sceneNumber).padStart(2, "0")} - ${scene.location}`,
        index * 5000,
        5000,
        timestamp,
        timestamp
      );
    });

    db.prepare("UPDATE projects SET status = 'draft', updated_at = ? WHERE id = ?").run(timestamp, projectId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getProject(projectId);
}

export function listAssets(): AssetRecord[] {
  const rows = getDb()
    .prepare(
      "SELECT id AS asset_id, type AS asset_type, name AS asset_name, relative_path AS asset_relative_path, mime_type AS asset_mime_type, size_bytes AS asset_size_bytes, created_at AS asset_created_at FROM assets ORDER BY created_at DESC"
    )
    .all() as Row[];
  return rows.map(assetFromRow).filter((asset): asset is AssetRecord => Boolean(asset));
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

  db.prepare(`
    INSERT INTO assets (id, type, name, relative_path, mime_type, size_bytes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(relative_path) DO UPDATE SET
      type = excluded.type,
      name = excluded.name,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes
  `).run(
    id("asset"),
    input.type,
    input.name,
    input.relativePath,
    input.mimeType ?? null,
    input.sizeBytes ?? 0,
    timestamp
  );

  const row = db
    .prepare(
      "SELECT id AS asset_id, type AS asset_type, name AS asset_name, relative_path AS asset_relative_path, mime_type AS asset_mime_type, size_bytes AS asset_size_bytes, created_at AS asset_created_at FROM assets WHERE relative_path = ?"
    )
    .get(input.relativePath) as Row | undefined;

  return assetFromRow(row ?? null);
}
