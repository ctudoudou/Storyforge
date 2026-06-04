import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chineseShortDramaScript } from "../fixtures/chinese-short-drama-script.ts";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-db-test-"));

const { createProject, deleteProject, duplicateProject, getProject, listProjects, parseProjectScript, updateProjectTitle, updateScript } = await import("../../src/lib/db.ts");

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
  assert.equal(parsed?.relationships.length, 1);
  assert.equal(parsed?.plotBeats.length, 1);
  assert.equal(parsed?.dialogueBlocks.length, 0);
  assert.equal(parsed?.scenes.length, 1);
  assert.equal(parsed?.scenes[0].mood, "待定");
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

test("local SQLite deletes projects and cascades related production records", () => {
  const created = createProject({
    title: "待删除项目",
    script: [
      "场景1：片场 - 白天",
      "林舟（导演，沉稳）检查机位。",
    ].join("\n"),
  });
  assert.ok(created);

  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.characters.length, 1);
  assert.equal(parsed?.scenes.length, 1);
  assert.equal(parsed?.timelineClips.length, 1);

  assert.equal(deleteProject(created!.id), true);
  assert.equal(getProject(created!.id), null);
  assert.equal(listProjects().some((project) => project.id === created!.id), false);
});

test("local SQLite stores parsed character relationships", () => {
  const created = createProject({
    title: "人物关系项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);

  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.characters.length, 2);
  assert.equal(parsed?.relationships.length, 1);
  assert.equal(parsed?.relationships[0].sourceName, "林夏");
  assert.equal(parsed?.relationships[0].targetName, "顾沉");
  assert.equal(parsed?.relationships[0].relation, "同场互动");
  assert.equal(parsed?.relationships[0].evidence.includes("雨声"), true);
});

test("local SQLite stores parsed plot beats", () => {
  const created = createProject({
    title: "剧情节点项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);

  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.plotBeats.length, 3);
  assert.deepEqual(parsed?.plotBeats.map((beat) => beat.type), ["conflict", "reversal", "decision"]);
  assert.equal(parsed?.plotBeats[0].summary.includes("雨声"), true);
});

test("local SQLite stores parsed dialogue blocks", () => {
  const created = createProject({
    title: "对白块项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);

  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.dialogueBlocks.length, 4);
  assert.equal(parsed?.dialogueBlocks[0].sceneNumber, 1);
  assert.equal(parsed?.dialogueBlocks[0].speaker, "林夏");
  assert.equal(parsed?.dialogueBlocks[0].content, "你现在出现，是想买走我的故事吗？");
  assert.equal(parsed?.dialogueBlocks[3].orderIndex, 3);
});

test("local SQLite stores stronger scene metadata", () => {
  const created = createProject({
    title: "场景元数据项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);

  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.scenes.length, 3);
  assert.equal(parsed?.scenes[0].mood, "压抑");
  assert.equal(parsed?.scenes[0].camera, "手持近景，雨水贴着玻璃滑落。");
  assert.equal(parsed?.scenes[1].timeOfDay, "深夜");
  assert.equal(parsed?.scenes[1].mood, "悬疑");
  assert.equal(parsed?.scenes[2].camera, "缓慢拉远，城市天光露出。");
});

test("local SQLite duplicates projects with related production records", () => {
  const created = createProject({
    title: "待复制项目",
    script: [
      "场景1：办公室 - 白天",
      "情绪：紧张",
      "苏然（编剧，敏锐）修改对白。",
    ].join("\n"),
  });
  assert.ok(created);
  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.characters.length, 1);

  const duplicated = duplicateProject(created!.id);
  assert.ok(duplicated);
  assert.notEqual(duplicated?.id, created!.id);
  assert.equal(duplicated?.title, "待复制项目 副本");
  assert.equal(duplicated?.script.content, created?.script.content);
  assert.equal(duplicated?.characters.length, 1);
  assert.equal(duplicated?.relationships.length, 0);
  assert.equal(duplicated?.plotBeats.length, 1);
  assert.equal(duplicated?.dialogueBlocks.length, 0);
  assert.equal(duplicated?.scenes.length, 1);
  assert.equal(duplicated?.scenes[0].mood, "紧张");
  assert.equal(duplicated?.timelineClips.length, 1);
});

test("local SQLite duplicates parsed character relationships", () => {
  const created = createProject({
    title: "待复制人物关系项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);
  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.relationships.length, 1);

  const duplicated = duplicateProject(created!.id);
  assert.ok(duplicated);
  assert.equal(duplicated?.relationships.length, 1);
  assert.equal(duplicated?.relationships[0].sourceName, "林夏");
  assert.equal(duplicated?.relationships[0].targetName, "顾沉");
});

test("local SQLite duplicates parsed plot beats", () => {
  const created = createProject({
    title: "待复制剧情节点项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);
  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.plotBeats.length, 3);

  const duplicated = duplicateProject(created!.id);
  assert.ok(duplicated);
  assert.equal(duplicated?.plotBeats.length, 3);
  assert.deepEqual(duplicated?.plotBeats.map((beat) => beat.type), ["conflict", "reversal", "decision"]);
});

test("local SQLite duplicates parsed dialogue blocks", () => {
  const created = createProject({
    title: "待复制对白块项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);
  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.dialogueBlocks.length, 4);

  const duplicated = duplicateProject(created!.id);
  assert.ok(duplicated);
  assert.equal(duplicated?.dialogueBlocks.length, 4);
  assert.equal(duplicated?.dialogueBlocks[0].speaker, "林夏");
  assert.equal(duplicated?.dialogueBlocks[0].content, "你现在出现，是想买走我的故事吗？");
});
