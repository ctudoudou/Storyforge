import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-api-test-"));

const { createProject } = await import("../../src/lib/db.ts");
const { renameProjectFromBody } = await import("../../src/lib/project-api.ts");

test("PATCH /api/projects/:projectId renames a local project", async () => {
  const created = createProject({ title: "初始标题" });
  assert.ok(created);

  const result = renameProjectFromBody(created!.id, { title: "更新后的标题" });

  assert.equal(result.status, 200);
  assert.equal("project" in result.body ? result.body.project.title : "", "更新后的标题");
});

test("PATCH /api/projects/:projectId rejects empty titles", async () => {
  const created = createProject({ title: "不能被清空" });
  assert.ok(created);

  const result = renameProjectFromBody(created!.id, { title: "   " });

  assert.equal(result.status, 400);
});
