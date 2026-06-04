import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chineseShortDramaScript } from "../fixtures/chinese-short-drama-script.ts";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-db-test-"));

const { createProject, deleteProject, duplicateProject, getDb, getProject, linkAssetToProjectRecord, listAssets, listProjects, parseProjectScript, previewProjectScript, registerAsset, updateProjectTitle, updateScript } = await import("../../src/lib/db.ts");

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

test("local SQLite can preview parser output without writing production records", () => {
  const created = createProject({
    title: "解析预览项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);

  const preview = previewProjectScript(created!.id);
  const unchanged = getProject(created!.id);

  assert.equal(preview?.characters.length, 2);
  assert.equal(preview?.relationships.length, 1);
  assert.equal(preview?.plotBeats.length, 3);
  assert.equal(preview?.dialogueBlocks.length, 4);
  assert.equal(preview?.scenes[0].mood, "压抑");
  assert.equal(unchanged?.characters.length, 0);
  assert.equal(unchanged?.relationships.length, 0);
  assert.equal(unchanged?.plotBeats.length, 0);
  assert.equal(unchanged?.dialogueBlocks.length, 0);
  assert.equal(unchanged?.scenes.length, 0);
  assert.equal(unchanged?.timelineClips.length, 0);
});

test("local SQLite preserves user-edited parser records during re-runs", () => {
  const created = createProject({
    title: "重跑保留项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);

  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.characters.length, 2);
  assert.equal(parsed?.scenes.length, 3);

  const db = getDb();
  db.prepare("UPDATE characters SET age = 31, traits = ?, is_user_edited = 1 WHERE project_id = ? AND name = ?")
    .run(JSON.stringify(["手工编辑"]), created!.id, "林夏");
  db.prepare("UPDATE character_relationships SET relation = ?, evidence = ?, is_user_edited = 1 WHERE project_id = ?")
    .run("手工关系", "手工证据", created!.id);
  db.prepare("UPDATE plot_beats SET summary = ?, is_user_edited = 1 WHERE project_id = ? AND scene_number = 1 AND type = 'conflict'")
    .run("手工剧情节点", created!.id);
  db.prepare("UPDATE dialogue_blocks SET content = ?, is_user_edited = 1 WHERE project_id = ? AND scene_number = 1 AND order_index = 0")
    .run("手工对白", created!.id);
  db.prepare("UPDATE scenes SET location = ?, mood = ?, is_user_edited = 1 WHERE project_id = ? AND scene_number = 1")
    .run("手工场景", "手工情绪", created!.id);
  db.prepare("UPDATE timeline_clips SET label = ?, is_user_edited = 1 WHERE project_id = ? AND start_ms = 0")
    .run("手工片段", created!.id);

  const preview = previewProjectScript(created!.id);
  assert.deepEqual(preview?.preservedRecords.characters, ["林夏"]);
  assert.deepEqual(preview?.preservedRecords.scenes, ["S01 手工场景"]);
  assert.deepEqual(preview?.preservedRecords.timelineClips, ["手工片段"]);

  const rerun = parseProjectScript(created!.id);
  const preservedCharacter = rerun?.characters.find((character) => character.name === "林夏");
  const regeneratedCharacter = rerun?.characters.find((character) => character.name === "顾沉");
  const preservedScene = rerun?.scenes.find((scene) => scene.sceneNumber === 1);
  const regeneratedScene = rerun?.scenes.find((scene) => scene.sceneNumber === 2);
  const preservedDialogue = rerun?.dialogueBlocks.find((dialogue) => dialogue.sceneNumber === 1 && dialogue.orderIndex === 0);
  const preservedClip = rerun?.timelineClips.find((clip) => clip.startMs === 0);

  assert.equal(rerun?.characters.length, 2);
  assert.equal(preservedCharacter?.age, 31);
  assert.deepEqual(preservedCharacter?.traits, ["手工编辑"]);
  assert.equal(preservedCharacter?.isUserEdited, true);
  assert.equal(regeneratedCharacter?.isUserEdited, false);
  assert.equal(rerun?.relationships.length, 1);
  assert.equal(rerun?.relationships[0].relation, "手工关系");
  assert.equal(rerun?.plotBeats.length, 3);
  assert.equal(rerun?.plotBeats.find((beat) => beat.sceneNumber === 1 && beat.type === "conflict")?.summary, "手工剧情节点");
  assert.equal(rerun?.dialogueBlocks.length, 4);
  assert.equal(preservedDialogue?.content, "手工对白");
  assert.equal(rerun?.scenes.length, 3);
  assert.equal(preservedScene?.location, "手工场景");
  assert.equal(preservedScene?.mood, "手工情绪");
  assert.equal(regeneratedScene?.location, "咖啡馆后巷");
  assert.equal(rerun?.timelineClips.length, 3);
  assert.equal(preservedClip?.label, "手工片段");
});

test("local SQLite links and unlinks local assets to production records", () => {
  const created = createProject({
    title: "素材绑定项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);

  const parsed = parseProjectScript(created!.id);
  assert.ok(parsed?.characters[0]);
  assert.ok(parsed?.scenes[0]);
  assert.ok(parsed?.timelineClips[0]);

  const imageAsset = registerAsset({
    type: "image",
    name: "角色参考.png",
    relativePath: "imports/role-ref.png",
    mimeType: "image/png",
    sizeBytes: 12,
  });
  const videoAsset = registerAsset({
    type: "video",
    name: "片段参考.mp4",
    relativePath: "imports/clip-ref.mp4",
    mimeType: "video/mp4",
    sizeBytes: 24,
  });
  assert.ok(imageAsset);
  assert.ok(videoAsset);

  const withCharacterAsset = linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "character",
    targetId: parsed!.characters[0].id,
    assetId: imageAsset!.id,
  });
  const withSceneAsset = linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "scene",
    targetId: parsed!.scenes[0].id,
    assetId: imageAsset!.id,
  });
  const withClipAsset = linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "timelineClip",
    targetId: parsed!.timelineClips[0].id,
    assetId: videoAsset!.id,
  });

  assert.equal(withCharacterAsset?.characters[0].asset?.id, imageAsset!.id);
  assert.equal(withSceneAsset?.scenes[0].asset?.id, imageAsset!.id);
  assert.equal(withClipAsset?.timelineClips[0].asset?.id, videoAsset!.id);
  assert.equal(withClipAsset?.timelineClips[0].isUserEdited, true);

  const rerun = parseProjectScript(created!.id);
  assert.equal(rerun?.characters.find((character) => character.id === parsed!.characters[0].id)?.asset?.id, imageAsset!.id);
  assert.equal(rerun?.scenes.find((scene) => scene.id === parsed!.scenes[0].id)?.asset?.id, imageAsset!.id);
  assert.equal(rerun?.timelineClips.find((clip) => clip.id === parsed!.timelineClips[0].id)?.asset?.id, videoAsset!.id);

  const duplicated = duplicateProject(created!.id);
  assert.equal(duplicated?.characters[0].asset?.id, imageAsset!.id);
  assert.equal(duplicated?.scenes[0].asset?.id, imageAsset!.id);
  assert.equal(duplicated?.timelineClips[0].asset?.id, videoAsset!.id);

  const unlinkedScene = linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "scene",
    targetId: parsed!.scenes[0].id,
    assetId: null,
  });
  assert.equal(unlinkedScene?.scenes[0].asset, null);
  assert.equal(listAssets().some((asset) => asset.id === imageAsset!.id), true);
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
