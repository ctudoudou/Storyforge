import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { parseScriptWithAgent } from "../agents/script-parser/index.ts";
import type {
  AssetDetail,
  AssetLinkTargetType,
  AssetReferenceRecord,
  AssetRecord,
  CharacterRelationshipRecord,
  CharacterRecord,
  DialogueBlockRecord,
  PlotBeatRecord,
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
  PreservedParseRecords,
  SceneRecord,
  ScriptParsePreview,
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
    isUserEdited: asBoolean(row.is_user_edited),
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
    plotBeats: plotBeats.map(plotBeatFromRow),
    dialogueBlocks: dialogueBlocks.map(dialogueBlockFromRow),
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
      INSERT INTO characters (id, project_id, name, age, role, traits, asset_id, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        id, project_id, scene_number, location, time_of_day, mood, description, camera, characters, asset_id, is_user_edited, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        scene.isUserEdited ? 1 : 0,
        timestamp,
        timestamp
      );
    }

    const insertClip = db.prepare(`
      INSERT INTO timeline_clips (id, project_id, track_type, label, start_ms, duration_ms, asset_id, is_user_edited, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        clip.isUserEdited ? 1 : 0,
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
    .prepare("SELECT name FROM characters WHERE project_id = ? AND (is_user_edited = 1 OR asset_id IS NOT NULL) ORDER BY created_at ASC")
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
    project.characters.filter((character) => character.isUserEdited || character.asset).map((character) => character.name)
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
    db.prepare("DELETE FROM characters WHERE project_id = ? AND is_user_edited = 0 AND asset_id IS NULL").run(projectId);
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
      "SELECT id AS asset_id, type AS asset_type, name AS asset_name, relative_path AS asset_relative_path, mime_type AS asset_mime_type, size_bytes AS asset_size_bytes, created_at AS asset_created_at FROM assets ORDER BY created_at DESC"
    )
    .all() as Row[];
  return rows.map(assetFromRow).filter((asset): asset is AssetRecord => Boolean(asset));
}

function getAssetById(assetId: string): AssetRecord | null {
  const row = getDb()
    .prepare(
      "SELECT id AS asset_id, type AS asset_type, name AS asset_name, relative_path AS asset_relative_path, mime_type AS asset_mime_type, size_bytes AS asset_size_bytes, created_at AS asset_created_at FROM assets WHERE id = ?"
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

export function getAssetDetail(assetId: string): Omit<AssetDetail, "assetUrl" | "fileExists"> | null {
  const asset = getAssetById(assetId);
  if (!asset) return null;

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
      ORDER BY project_title ASC, target_type ASC, target_label ASC
    `)
    .all(assetId, assetId, assetId) as Row[];

  return {
    asset,
    references: assetReferencesFromRows(rows),
  };
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
  }

  const timestamp = now();
  const result = db
    .prepare(
      `UPDATE ${table} SET asset_id = ?, is_user_edited = 1, updated_at = ? WHERE project_id = ? AND id = ?`
    )
    .run(input.assetId, timestamp, input.projectId, input.targetId);

  if (result.changes === 0) return null;

  db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, input.projectId);
  return getProject(input.projectId);
}
