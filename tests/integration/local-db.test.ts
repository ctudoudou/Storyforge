import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chineseShortDramaScript } from "../fixtures/chinese-short-drama-script.ts";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-db-test-"));

const { buildCharacterDesignPrompt } = await import("../../src/agents/asset-generator/index.ts");
const { exportProjectVideo } = await import("../../src/agents/video-assembler/index.ts");
const { createAssemblyManifest } = await import("../../src/lib/assembly-manifest.ts");
const {
  createAudioTrack,
  createProject,
  createSubtitleTracksFromDialogue,
  createTransitionRecord,
  deleteAsset,
  deleteProject,
  deleteTimelineClip,
  deleteTransitionRecord,
  duplicateProject,
  dataDir,
  getDb,
  getProject,
  linkAssetToProjectRecord,
  listAssets,
  listProjects,
  parseProjectScript,
  previewProjectScript,
  registerAsset,
  reorderTimelineClip,
  setCharacterVisualConsistency,
  splitTimelineClip,
  updateTimelineClip,
  updateTransitionRecord,
  updateProjectTitle,
  updateScript,
} = await import("../../src/lib/db.ts");

function writeLocalAsset(relativePath: string, bytes = new Uint8Array([1, 2, 3, 4])) {
  const absolutePath = join(dataDir, "assets", relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, bytes);
  return absolutePath;
}

function workflowStage(project: NonNullable<ReturnType<typeof getProject>>, id: string) {
  const stage = project.workflowStatus.stages.find((entry) => entry.id === id);
  assert.ok(stage, `Expected workflow stage ${id}`);
  return stage;
}

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

test("local SQLite derives workflow status from real project records and jobs", () => {
  const created = createProject({ title: "工作流状态项目" });
  assert.ok(created);
  assert.equal(workflowStage(created, "script").status, "empty");
  assert.equal(created.workflowStatus.currentStageId, "script");

  const scripted = updateScript(created.id, chineseShortDramaScript);
  assert.ok(scripted);
  assert.equal(workflowStage(scripted, "script").status, "ready");
  assert.equal(workflowStage(scripted, "export").status, "blocked");

  const parsed = parseProjectScript(created.id);
  assert.ok(parsed);
  assert.equal(workflowStage(parsed, "script").status, "completed");
  assert.equal(workflowStage(parsed, "characters").status, "in_progress");
  assert.equal(workflowStage(parsed, "storyboard").status, "in_progress");
  assert.equal(workflowStage(parsed, "timeline").status, "in_progress");

  for (const [index, character] of parsed.characters.entries()) {
    const relativePath = `workflow/${created.id}/character-${index}.png`;
    writeLocalAsset(relativePath);
    const asset = registerAsset({
      type: "image",
      name: `character-${index}.png`,
      relativePath,
      mimeType: "image/png",
      sizeBytes: 4,
    });
    assert.ok(asset);
    assert.ok(linkAssetToProjectRecord({
      projectId: created.id,
      targetType: "character",
      targetId: character.id,
      assetId: asset.id,
    }));
  }

  for (const [index, scene] of parsed.scenes.entries()) {
    const relativePath = `workflow/${created.id}/scene-${index}.png`;
    writeLocalAsset(relativePath);
    const asset = registerAsset({
      type: "image",
      name: `scene-${index}.png`,
      relativePath,
      mimeType: "image/png",
      sizeBytes: 4,
    });
    assert.ok(asset);
    assert.ok(linkAssetToProjectRecord({
      projectId: created.id,
      targetType: "scene",
      targetId: scene.id,
      assetId: asset.id,
    }));
  }

  const videoClips = parsed.timelineClips.filter((clip) => clip.trackType === "video");
  for (const [index, clip] of videoClips.entries()) {
    const relativePath = `workflow/${created.id}/clip-${index}.png`;
    writeLocalAsset(relativePath);
    const asset = registerAsset({
      type: "image",
      name: `clip-${index}.png`,
      relativePath,
      mimeType: "image/png",
      sizeBytes: 4,
    });
    assert.ok(asset);
    assert.ok(linkAssetToProjectRecord({
      projectId: created.id,
      targetType: "timelineClip",
      targetId: clip.id,
      assetId: asset.id,
    }));
  }

  const assetLinked = getProject(created.id);
  assert.ok(assetLinked);
  assert.equal(workflowStage(assetLinked, "characters").status, "completed");
  assert.equal(workflowStage(assetLinked, "storyboard").status, "completed");
  assert.equal(workflowStage(assetLinked, "timeline").status, "completed");
  assert.equal(workflowStage(assetLinked, "export").status, "ready");

  const exportResult = exportProjectVideo(created.id);
  assert.ok(exportResult);
  const exported = getProject(created.id);
  assert.ok(exported);
  assert.equal(workflowStage(exported, "export").status, "completed");
  assert.equal(exported.workflowStatus.latestExportJob?.id, exportResult.job.id);
  assert.equal(exported.workflowStatus.completionPercent, 100);
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
  assert.equal(withCharacterAsset?.characters[0].assetSource, "manual");
  assert.equal(withSceneAsset?.scenes[0].asset?.id, imageAsset!.id);
  assert.equal(withSceneAsset?.scenes[0].assetSource, "manual");
  assert.equal(withClipAsset?.timelineClips[0].asset?.id, videoAsset!.id);
  assert.equal(withClipAsset?.timelineClips[0].isUserEdited, true);

  const rerun = parseProjectScript(created!.id);
  assert.equal(rerun?.characters.find((character) => character.id === parsed!.characters[0].id)?.asset?.id, imageAsset!.id);
  assert.equal(rerun?.scenes.find((scene) => scene.id === parsed!.scenes[0].id)?.asset?.id, imageAsset!.id);
  assert.equal(rerun?.timelineClips.find((clip) => clip.id === parsed!.timelineClips[0].id)?.asset?.id, videoAsset!.id);

  const duplicated = duplicateProject(created!.id);
  assert.equal(duplicated?.characters[0].asset?.id, imageAsset!.id);
  assert.equal(duplicated?.characters[0].assetSource, "manual");
  assert.equal(duplicated?.scenes[0].asset?.id, imageAsset!.id);
  assert.equal(duplicated?.scenes[0].assetSource, "manual");
  assert.equal(duplicated?.timelineClips[0].asset?.id, videoAsset!.id);

  const unlinkedScene = linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "scene",
    targetId: parsed!.scenes[0].id,
    assetId: null,
  });
  assert.equal(unlinkedScene?.scenes[0].asset, null);
  assert.equal(unlinkedScene?.scenes[0].assetSource, null);
  assert.equal(listAssets().some((asset) => asset.id === imageAsset!.id), true);
});

test("local SQLite edits timeline clips while preserving linked assets", () => {
  const created = createProject({
    title: "时间线编辑项目",
    script: [
      "场景1：天台 - 清晨",
      "林夏（28岁，编剧）准备离开。",
      "场景2：办公室 - 白天",
      "周野（30岁，制片人）追问原因。",
      "场景3：街口 - 夜晚",
      "林夏决定重写人生。",
    ].join("\n"),
  });
  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.timelineClips.length, 3);

  const imageAsset = registerAsset({
    type: "image",
    name: "片段首帧.png",
    relativePath: "imports/timeline-first-frame.png",
    mimeType: "image/png",
    sizeBytes: 24,
  });
  assert.ok(imageAsset);

  const firstClip = parsed!.timelineClips[0];
  const linked = linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "timelineClip",
    targetId: firstClip.id,
    assetId: imageAsset!.id,
  });
  assert.equal(linked?.timelineClips[0].asset?.id, imageAsset!.id);

  const trimmed = updateTimelineClip({
    projectId: created!.id,
    clipId: firstClip.id,
    startMs: 1000,
    durationMs: 4000,
  });
  const trimmedClip = trimmed!.timelineClips.find((clip) => clip.id === firstClip.id)!;
  assert.equal(trimmedClip.startMs, 1000);
  assert.equal(trimmedClip.durationMs, 4000);
  assert.equal(trimmedClip.asset?.id, imageAsset!.id);
  assert.equal(trimmedClip.isUserEdited, true);

  const split = splitTimelineClip({
    projectId: created!.id,
    clipId: firstClip.id,
    splitMs: 2000,
  });
  const splitSource = split!.timelineClips.find((clip) => clip.id === firstClip.id)!;
  const splitChild = split!.timelineClips.find((clip) => clip.label === `${firstClip.label} - 02`)!;
  assert.equal(splitSource.durationMs, 2000);
  assert.equal(splitChild.startMs, 3000);
  assert.equal(splitChild.durationMs, 2000);
  assert.equal(splitChild.asset?.id, imageAsset!.id);

  const moved = reorderTimelineClip({
    projectId: created!.id,
    clipId: splitChild.id,
    direction: "right",
  });
  const movedClips = moved!.timelineClips.filter((clip) => clip.trackType === "video");
  assert.deepEqual(movedClips.map((clip) => clip.startMs), [0, 2000, 7000, 9000]);
  assert.equal(movedClips.find((clip) => clip.id === splitChild.id)?.asset?.id, imageAsset!.id);

  const deleted = deleteTimelineClip(created!.id, splitChild.id);
  assert.equal(deleted?.timelineClips.some((clip) => clip.id === splitChild.id), false);
  assert.equal(deleted?.timelineClips.every((clip) => clip.startMs >= 0 && clip.durationMs > 0), true);
});

test("local SQLite stores voice audio track records and compatible local audio assets", () => {
  const created = createProject({ title: "配音轨项目", script: chineseShortDramaScript });
  assert.ok(created);

  const audioAsset = registerAsset({
    type: "audio",
    name: "林夏对白.wav",
    relativePath: "imports/linxia-dialogue.wav",
    mimeType: "audio/wav",
    sizeBytes: 128,
  });
  const imageAsset = registerAsset({
    type: "image",
    name: "错误配音图.png",
    relativePath: "imports/wrong-audio-image.png",
    mimeType: "image/png",
    sizeBytes: 24,
  });
  assert.ok(audioAsset);
  assert.ok(imageAsset);

  const withTrack = createAudioTrack({
    projectId: created!.id,
    label: "林夏对白",
    speaker: "林夏",
    startMs: 500,
    durationMs: 3200,
  });
  assert.equal(withTrack?.audioTracks.length, 1);
  assert.equal(withTrack?.audioTracks[0].label, "林夏对白");
  assert.equal(withTrack?.audioTracks[0].speaker, "林夏");
  assert.equal(withTrack?.audioTracks[0].startMs, 500);
  assert.equal(withTrack?.audioTracks[0].durationMs, 3200);

  const linked = linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "audioTrack",
    targetId: withTrack!.audioTracks[0].id,
    assetId: audioAsset!.id,
  });
  assert.equal(linked?.audioTracks[0].asset?.id, audioAsset!.id);
  assert.equal(linked?.audioTracks[0].isUserEdited, true);

  assert.throws(() => {
    linkAssetToProjectRecord({
      projectId: created!.id,
      targetType: "audioTrack",
      targetId: withTrack!.audioTracks[0].id,
      assetId: imageAsset!.id,
    });
  }, /Asset type is not compatible/);

  assert.throws(() => deleteAsset(audioAsset!.id), /Asset is still referenced/);

  const duplicated = duplicateProject(created!.id);
  assert.equal(duplicated?.audioTracks.length, 1);
  assert.equal(duplicated?.audioTracks[0].asset?.id, audioAsset!.id);
});

test("local SQLite creates subtitle track records from parsed dialogue blocks", () => {
  const created = createProject({ title: "字幕轨项目", script: chineseShortDramaScript });
  const parsed = parseProjectScript(created!.id);
  assert.equal(parsed?.dialogueBlocks.length, 4);

  const withSubtitles = createSubtitleTracksFromDialogue(created!.id);
  assert.equal(withSubtitles?.subtitleTracks.length, 4);
  assert.equal(withSubtitles?.subtitleTracks[0].sceneNumber, 1);
  assert.equal(withSubtitles?.subtitleTracks[0].dialogueBlockId, parsed!.dialogueBlocks[0].id);
  assert.equal(withSubtitles?.subtitleTracks[0].speaker, "林夏");
  assert.equal(withSubtitles?.subtitleTracks[0].text, "你现在出现，是想买走我的故事吗？");
  assert.equal(withSubtitles?.subtitleTracks[0].startMs, 0);
  assert.equal(withSubtitles?.subtitleTracks.every((subtitle) => subtitle.durationMs > 0), true);

  const readBack = getProject(created!.id);
  assert.equal(readBack?.subtitleTracks.length, 4);

  const duplicated = duplicateProject(created!.id);
  assert.equal(duplicated?.subtitleTracks.length, 4);
  assert.equal(duplicated?.subtitleTracks[0].text, "你现在出现，是想买走我的故事吗？");
});

test("local SQLite stores transition records between adjacent video clips", () => {
  const created = createProject({ title: "转场项目", script: chineseShortDramaScript });
  const parsed = parseProjectScript(created!.id);
  const videoClips = parsed!.timelineClips.filter((clip) => clip.trackType === "video");
  assert.equal(videoClips.length, 3);

  const originalStarts = videoClips.map((clip) => clip.startMs);
  const withTransition = createTransitionRecord({
    projectId: created!.id,
    sourceClipId: videoClips[0].id,
    targetClipId: videoClips[1].id,
    type: "fade",
    durationMs: 700,
  });
  assert.equal(withTransition?.transitions.length, 1);
  assert.equal(withTransition?.transitions[0].sourceClipId, videoClips[0].id);
  assert.equal(withTransition?.transitions[0].targetClipId, videoClips[1].id);
  assert.equal(withTransition?.transitions[0].type, "fade");
  assert.equal(withTransition?.transitions[0].durationMs, 700);
  assert.deepEqual(withTransition?.timelineClips.map((clip) => clip.startMs), originalStarts);

  assert.throws(() => {
    createTransitionRecord({
      projectId: created!.id,
      sourceClipId: videoClips[0].id,
      targetClipId: videoClips[2].id,
      type: "wipe",
      durationMs: 500,
    });
  }, /adjacent video clips/);

  const updated = updateTransitionRecord({
    projectId: created!.id,
    transitionId: withTransition!.transitions[0].id,
    type: "dissolve",
    durationMs: 900,
  });
  assert.equal(updated?.transitions[0].type, "dissolve");
  assert.equal(updated?.transitions[0].durationMs, 900);
  assert.deepEqual(updated?.timelineClips.map((clip) => clip.startMs), originalStarts);

  const duplicated = duplicateProject(created!.id);
  assert.equal(duplicated?.transitions.length, 1);
  assert.notEqual(duplicated?.transitions[0].sourceClipId, updated!.transitions[0].sourceClipId);
  assert.equal(duplicated?.transitions[0].type, "dissolve");

  const removed = deleteTransitionRecord(created!.id, updated!.transitions[0].id);
  assert.equal(removed?.transitions.length, 0);

  const recreated = createTransitionRecord({
    projectId: created!.id,
    sourceClipId: videoClips[0].id,
    targetClipId: videoClips[1].id,
    type: "fade",
    durationMs: 500,
  });
  assert.equal(recreated?.transitions.length, 1);
  const afterClipDelete = deleteTimelineClip(created!.id, videoClips[1].id);
  assert.equal(afterClipDelete?.transitions.length, 0);
});

test("local assembly manifest includes local assets and timeline metadata", () => {
  const created = createProject({ title: "合成清单项目", script: chineseShortDramaScript });
  const parsed = parseProjectScript(created!.id);
  const videoClips = parsed!.timelineClips.filter((clip) => clip.trackType === "video");
  assert.equal(videoClips.length, 3);

  videoClips.forEach((clip, index) => {
    const relativePath = `imports/manifest-video-${index}.png`;
    writeLocalAsset(relativePath);
    const asset = registerAsset({
      type: "image",
      name: `manifest-video-${index}.png`,
      relativePath,
      mimeType: "image/png",
      sizeBytes: 4,
    });
    assert.ok(asset);
    const linked = linkAssetToProjectRecord({
      projectId: created!.id,
      targetType: "timelineClip",
      targetId: clip.id,
      assetId: asset!.id,
    });
    assert.equal(linked?.timelineClips.find((item) => item.id === clip.id)?.asset?.id, asset!.id);
  });

  const audioRelativePath = "imports/manifest-audio.wav";
  writeLocalAsset(audioRelativePath);
  const audioAsset = registerAsset({
    type: "audio",
    name: "manifest-audio.wav",
    relativePath: audioRelativePath,
    mimeType: "audio/wav",
    sizeBytes: 4,
  });
  assert.ok(audioAsset);
  const withAudio = createAudioTrack({
    projectId: created!.id,
    label: "对白音轨",
    speaker: "林夏",
    startMs: 0,
    durationMs: 5000,
  });
  linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "audioTrack",
    targetId: withAudio!.audioTracks[0].id,
    assetId: audioAsset!.id,
  });

  const withSubtitles = createSubtitleTracksFromDialogue(created!.id);
  assert.equal(withSubtitles?.subtitleTracks.length, 4);
  const withTransition = createTransitionRecord({
    projectId: created!.id,
    sourceClipId: videoClips[0].id,
    targetClipId: videoClips[1].id,
    type: "fade",
    durationMs: 500,
  });
  assert.equal(withTransition?.transitions.length, 1);

  const manifest = createAssemblyManifest(created!.id);
  assert.ok(manifest);
  assert.equal(manifest?.version, 1);
  assert.equal(manifest?.project.id, created!.id);
  const manifestDurationMs = Math.max(
    ...manifest!.timeline.videoClips.map((clip) => clip.startMs + clip.durationMs),
    ...manifest!.timeline.audioTracks.map((track) => track.startMs + track.durationMs),
    ...manifest!.timeline.subtitleTracks.map((subtitle) => subtitle.startMs + subtitle.durationMs)
  );
  assert.equal(manifest?.timeline.durationMs, manifestDurationMs);
  assert.equal(manifest!.timeline.durationMs >= 15000, true);
  assert.equal(manifest?.timeline.videoClips.length, 3);
  assert.equal(manifest?.timeline.videoClips[0].asset.relativePath, "imports/manifest-video-0.png");
  assert.equal(manifest?.timeline.videoClips[0].asset.absolutePath.endsWith("imports/manifest-video-0.png"), true);
  assert.equal(manifest?.timeline.audioTracks.length, 1);
  assert.equal(manifest?.timeline.audioTracks[0].asset.relativePath, audioRelativePath);
  assert.equal(manifest?.timeline.subtitleTracks.length, 4);
  assert.equal(manifest?.timeline.transitions[0].sourceClipId, videoClips[0].id);
  assert.equal(manifest?.timeline.transitions[0].targetClipId, videoClips[1].id);
});

test("local assembly manifest reports missing required assets", () => {
  const created = createProject({
    title: "缺失素材清单项目",
    script: "场景1：办公室 - 白天\n林夏（28岁，编剧）检查分镜板。",
  });
  const parsed = parseProjectScript(created!.id);
  const firstClip = parsed!.timelineClips[0];

  assert.throws(() => createAssemblyManifest(created!.id), /Timeline clip requires a linked local asset/);

  const asset = registerAsset({
    type: "image",
    name: "missing-video.png",
    relativePath: "imports/missing-video.png",
    mimeType: "image/png",
    sizeBytes: 4,
  });
  linkAssetToProjectRecord({
    projectId: created!.id,
    targetType: "timelineClip",
    targetId: firstClip.id,
    assetId: asset!.id,
  });

  assert.throws(() => createAssemblyManifest(created!.id), /Required local asset file is missing/);
});

test("local SQLite stores character visual consistency controls", () => {
  const created = createProject({
    title: "角色一致性项目",
    script: chineseShortDramaScript,
  });
  assert.ok(created);

  const parsed = parseProjectScript(created!.id);
  assert.ok(parsed?.characters[0]);
  const anchorAsset = registerAsset({
    type: "image",
    name: "林夏锚点.png",
    relativePath: "imports/linxia-anchor.png",
    mimeType: "image/png",
    sizeBytes: 32,
  });
  assert.ok(anchorAsset);

  const withConsistency = setCharacterVisualConsistency({
    projectId: created!.id,
    characterId: parsed!.characters[0].id,
    notes: "保持短发、清冷妆容和深色风衣",
    anchorAssetIds: [anchorAsset!.id, anchorAsset!.id],
  });
  const character = withConsistency?.characters[0];
  assert.equal(character?.visualConsistency.notes, "保持短发、清冷妆容和深色风衣");
  assert.deepEqual(character?.visualConsistency.anchorAssetIds, [anchorAsset!.id]);
  assert.equal(character?.isUserEdited, true);

  const prompt = buildCharacterDesignPrompt({
    character: {
      name: character!.name,
      role: character!.role,
      traits: character!.traits,
    },
    visualConsistency: character!.visualConsistency,
  });
  assert.match(prompt.prompt, /保持短发、清冷妆容和深色风衣/);
  assert.match(prompt.prompt, new RegExp(anchorAsset!.id));
  assert.equal(prompt.parameters.hasConsistencyAnchors, true);

  const rerun = parseProjectScript(created!.id);
  assert.equal(rerun?.characters.find((item) => item.id === parsed!.characters[0].id)?.visualConsistency.notes, "保持短发、清冷妆容和深色风衣");

  const duplicated = duplicateProject(created!.id);
  assert.equal(duplicated?.characters[0].visualConsistency.notes, "保持短发、清冷妆容和深色风衣");
  assert.deepEqual(duplicated?.characters[0].visualConsistency.anchorAssetIds, [anchorAsset!.id]);

  const cleared = setCharacterVisualConsistency({
    projectId: created!.id,
    characterId: parsed!.characters[0].id,
    notes: "",
    anchorAssetIds: [],
  });
  assert.equal(cleared?.characters[0].visualConsistency.notes, "");
  assert.deepEqual(cleared?.characters[0].visualConsistency.anchorAssetIds, []);
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
