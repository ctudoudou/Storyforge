import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-migration-test-"));

const { createProject, getAppliedMigrations, getDb } = await import("../../src/lib/db.ts");

test("fresh local SQLite databases record applied migrations", () => {
  const migrations = getAppliedMigrations();

  assert.equal(migrations.length, 1);
  assert.equal(migrations[0].id, 1);
  assert.equal(migrations[0].name, "initial_local_project_schema");
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

