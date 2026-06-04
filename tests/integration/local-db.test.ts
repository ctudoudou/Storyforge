import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-db-test-"));

const { createProject, listProjects, parseProjectScript, updateProjectTitle, updateScript } = await import("../../src/lib/db.ts");

test("local SQLite stores projects, scripts, parsed characters, scenes, and timeline clips", () => {
  const created = createProject({ title: "真实项目" });
  assert.ok(created);
  assert.equal(created?.title, "真实项目");
  assert.equal(listProjects().length, 1);

  const updated = updateScript(
    created!.id,
    [
      "场景1：剪辑室 - 白天",
      "许念（29岁，导演，专注）盯着监视器。",
      "韩川（演员，紧张）等待补拍通知。",
    ].join("\n")
  );
  assert.equal(updated?.script.content.includes("剪辑室"), true);

  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.characters.length, 2);
  assert.equal(parsed?.scenes.length, 1);
  assert.equal(parsed?.timelineClips.length, 1);
  assert.equal(parsed?.timelineClips[0].label, "S01 - 剪辑室");
});

test("local SQLite updates project titles without replacing related data", () => {
  const created = createProject({ title: "待重命名项目" });
  assert.ok(created);

  const renamed = updateProjectTitle(created!.id, "正式项目标题");
  assert.equal(renamed?.title, "正式项目标题");
  assert.equal(renamed?.script.content, "");

  const projects = listProjects();
  assert.equal(projects.some((project) => project.title === "正式项目标题"), true);
});

