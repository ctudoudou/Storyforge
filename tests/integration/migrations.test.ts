import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-migration-test-"));

const { createProject, getAppliedMigrations, getDb } = await import("../../src/lib/db.ts");

test("fresh local SQLite databases record applied migrations", () => {
  const migrations = getAppliedMigrations();

  assert.equal(migrations.length, 6);
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
  ];

  for (const table of tables) {
    const rows = getDb().prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    assert.equal(rows.some((row) => row.name === "is_user_edited"), true, `${table} should track user edits`);
  }
});
