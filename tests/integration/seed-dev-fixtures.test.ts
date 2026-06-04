import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

const dataDir = mkdtempSync(join(tmpdir(), "storyforge-seed-test-"));
process.env.STORYFORGE_DATA_DIR = dataDir;

const { getProject, listAssets, listProjects } = await import("../../src/lib/db.ts");

test("development seed script creates rerunnable local fixtures", async () => {
  const env = { ...process.env, STORYFORGE_DATA_DIR: dataDir };
  execFileSync(process.execPath, ["--experimental-strip-types", "scripts/seed-dev-fixtures.ts"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  execFileSync(process.execPath, ["--experimental-strip-types", "scripts/seed-dev-fixtures.ts"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });

  const fixtureProjects = listProjects().filter((project) => project.title === "开发示例：雨夜重逢短剧");
  assert.equal(fixtureProjects.length, 1);

  const project = getProject(fixtureProjects[0].id);
  assert.ok(project);
  assert.equal(project!.characters.length > 0, true);
  assert.equal(project!.scenes.length, 3);
  assert.equal(project!.timelineClips.length, 3);

  const assets = listAssets().filter((asset) => asset.relativePath === "fixtures/dev-scene-note.txt");
  assert.equal(assets.length, 1);
  assert.equal(existsSync(join(dataDir, "assets", "fixtures", "dev-scene-note.txt")), true);
});
