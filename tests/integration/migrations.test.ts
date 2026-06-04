import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-migration-test-"));

const { createProject, getAppliedMigrations, getDb } = await import("../../src/lib/db.ts");

test("fresh local SQLite databases record applied migrations", () => {
  const migrations = getAppliedMigrations();

  assert.equal(migrations.length, 18);
  assert.equal(migrations[0].id, 1);
  assert.equal(migrations[0].name, "initial_local_project_schema");
  assert.equal(migrations[1].id, 2);
  assert.equal(migrations[1].name, "character_relationships");
  assert.equal(migrations[2].id, 3);
  assert.equal(migrations[2].name, "plot_beats");
  assert.equal(migrations[3].id, 4);
  assert.equal(migrations[3].name, "dialogue_blocks");
  assert.equal(migrations[4].id, 5);
  assert.equal(migrations[4].name, "scene_mood");
  assert.equal(migrations[5].id, 6);
  assert.equal(migrations[5].name, "parser_user_edit_tracking");
  assert.equal(migrations[6].id, 7);
  assert.equal(migrations[6].name, "asset_versions");
  assert.equal(migrations[7].id, 8);
  assert.equal(migrations[7].name, "asset_thumbnails");
  assert.equal(migrations[8].id, 9);
  assert.equal(migrations[8].name, "image_generations");
  assert.equal(migrations[9].id, 10);
  assert.equal(migrations[9].name, "image_generation_jobs");
  assert.equal(migrations[10].id, 11);
  assert.equal(migrations[10].name, "generation_retry_regenerate_links");
  assert.equal(migrations[11].id, 12);
  assert.equal(migrations[11].name, "manual_asset_overrides");
  assert.equal(migrations[12].id, 13);
  assert.equal(migrations[12].name, "character_visual_consistency");
  assert.equal(migrations[13].id, 14);
  assert.equal(migrations[13].name, "audio_tracks");
  assert.equal(migrations[14].id, 15);
  assert.equal(migrations[14].name, "subtitle_tracks");
  assert.equal(migrations[15].id, 16);
  assert.equal(migrations[15].name, "transition_records");
  assert.equal(migrations[16].id, 17);
  assert.equal(migrations[16].name, "video_export_jobs");
  assert.equal(migrations[17].id, 18);
  assert.equal(migrations[17].name, "long_running_job_progress_cancellation");
});

test("fresh local SQLite databases are usable after migrations run", () => {
  const project = createProject({ title: "迁移验证项目" });

  assert.equal(project?.title, "迁移验证项目");
});

test("migration bookkeeping table is present in SQLite", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get() as { name: string } | undefined;

  assert.equal(row?.name, "schema_migrations");
});

test("character relationships table is present in SQLite", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'character_relationships'")
    .get() as { name: string } | undefined;

  assert.equal(row?.name, "character_relationships");
});

test("plot beats table is present in SQLite", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plot_beats'")
    .get() as { name: string } | undefined;

  assert.equal(row?.name, "plot_beats");
});

test("dialogue blocks table is present in SQLite", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'dialogue_blocks'")
    .get() as { name: string } | undefined;

  assert.equal(row?.name, "dialogue_blocks");
});

test("scenes table has mood column", () => {
  const rows = getDb().prepare("PRAGMA table_info(scenes)").all() as Array<{ name: string }>;

  assert.equal(rows.some((row) => row.name === "mood"), true);
});

test("parsed production tables track user edits", () => {
  const tables = [
    "characters",
    "character_relationships",
    "plot_beats",
    "dialogue_blocks",
    "scenes",
    "timeline_clips",
    "audio_tracks",
    "subtitle_tracks",
    "transition_records",
  ];

  for (const table of tables) {
    const rows = getDb().prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    assert.equal(rows.some((row) => row.name === "is_user_edited"), true, `${table} should track user edits`);
  }
});

test("asset versions table is present in SQLite", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'asset_versions'")
    .get() as { name: string } | undefined;

  assert.equal(row?.name, "asset_versions");
});

test("assets and versions track thumbnail metadata", () => {
  const assetColumns = getDb().prepare("PRAGMA table_info(assets)").all() as Array<{ name: string }>;
  const versionColumns = getDb().prepare("PRAGMA table_info(asset_versions)").all() as Array<{ name: string }>;

  for (const column of ["thumbnail_path", "thumbnail_status", "thumbnail_error"]) {
    assert.equal(assetColumns.some((row) => row.name === column), true, `assets should have ${column}`);
    assert.equal(versionColumns.some((row) => row.name === column), true, `asset_versions should have ${column}`);
  }
});

test("image generations table stores provider metadata", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'image_generations'")
    .get() as { name: string } | undefined;
  const columns = getDb().prepare("PRAGMA table_info(image_generations)").all() as Array<{ name: string }>;

  assert.equal(row?.name, "image_generations");
  for (const column of [
    "project_id",
    "asset_id",
    "target_type",
    "prompt",
    "negative_prompt",
    "provider",
    "model",
    "parameters",
    "seed",
    "source_asset_ids",
    "parent_artifacts",
    "metadata",
  ]) {
    assert.equal(columns.some((entry) => entry.name === column), true, `image_generations should have ${column}`);
  }
});

test("image generation jobs table stores lifecycle state", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'image_generation_jobs'")
    .get() as { name: string } | undefined;
  const columns = getDb().prepare("PRAGMA table_info(image_generation_jobs)").all() as Array<{ name: string }>;

  assert.equal(row?.name, "image_generation_jobs");
  for (const column of [
    "project_id",
    "asset_id",
    "generation_id",
    "target_type",
    "status",
    "prompt",
    "negative_prompt",
    "provider",
    "model",
    "parameters",
    "source_asset_ids",
    "parent_artifacts",
    "retry_of_job_id",
    "regenerate_of_generation_id",
    "progress_percent",
    "progress_message",
    "error_message",
    "queued_at",
    "started_at",
    "completed_at",
    "cancel_requested_at",
    "canceled_at",
    "updated_at",
  ]) {
    assert.equal(columns.some((entry) => entry.name === column), true, `image_generation_jobs should have ${column}`);
  }
});

test("video export jobs table stores local export lifecycle state", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'video_export_jobs'")
    .get() as { name: string } | undefined;
  const columns = getDb().prepare("PRAGMA table_info(video_export_jobs)").all() as Array<{ name: string }>;

  assert.equal(row?.name, "video_export_jobs");
  for (const column of [
    "id",
    "project_id",
    "status",
    "tool",
    "output_relative_path",
    "manifest_version",
    "duration_ms",
    "progress_percent",
    "progress_message",
    "error_message",
    "queued_at",
    "started_at",
    "completed_at",
    "cancel_requested_at",
    "canceled_at",
    "updated_at",
  ]) {
    assert.equal(columns.some((entry) => entry.name === column), true, `video_export_jobs should have ${column}`);
  }
});

test("long-running job event tables store progress history", () => {
  for (const table of ["image_generation_job_events", "video_export_job_events"]) {
    const row = getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table) as { name: string } | undefined;
    const columns = getDb().prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;

    assert.equal(row?.name, table);
    for (const column of ["id", "job_id", "event_type", "progress_percent", "message", "created_at"]) {
      assert.equal(columns.some((entry) => entry.name === column), true, `${table} should have ${column}`);
    }
  }
});

test("characters and scenes track manual asset override source", () => {
  for (const table of ["characters", "scenes"]) {
    const columns = getDb().prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    assert.equal(columns.some((entry) => entry.name === "asset_source"), true, `${table} should have asset_source`);
  }
});

test("characters track visual consistency controls", () => {
  const columns = getDb().prepare("PRAGMA table_info(characters)").all() as Array<{ name: string }>;

  assert.equal(columns.some((entry) => entry.name === "visual_consistency_notes"), true);
  assert.equal(columns.some((entry) => entry.name === "visual_consistency_anchor_asset_ids"), true);
});

test("audio tracks table stores voice track metadata", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audio_tracks'")
    .get() as { name: string } | undefined;
  const columns = getDb().prepare("PRAGMA table_info(audio_tracks)").all() as Array<{ name: string }>;

  assert.equal(row?.name, "audio_tracks");
  for (const column of ["project_id", "label", "speaker", "start_ms", "duration_ms", "asset_id", "is_user_edited"]) {
    assert.equal(columns.some((entry) => entry.name === column), true, `audio_tracks should have ${column}`);
  }
});

test("subtitle tracks table stores text timing metadata", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'subtitle_tracks'")
    .get() as { name: string } | undefined;
  const columns = getDb().prepare("PRAGMA table_info(subtitle_tracks)").all() as Array<{ name: string }>;

  assert.equal(row?.name, "subtitle_tracks");
  for (const column of ["project_id", "scene_number", "dialogue_block_id", "speaker", "text", "start_ms", "duration_ms", "is_user_edited"]) {
    assert.equal(columns.some((entry) => entry.name === column), true, `subtitle_tracks should have ${column}`);
  }
});

test("transition records table stores adjacent clip metadata", () => {
  const row = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transition_records'")
    .get() as { name: string } | undefined;
  const columns = getDb().prepare("PRAGMA table_info(transition_records)").all() as Array<{ name: string }>;

  assert.equal(row?.name, "transition_records");
  for (const column of ["project_id", "source_clip_id", "target_clip_id", "type", "duration_ms", "is_user_edited"]) {
    assert.equal(columns.some((item) => item.name === column), true, `transition_records should have ${column}`);
  }
});
