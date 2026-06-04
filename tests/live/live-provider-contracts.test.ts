import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import type { ImageGenerationProvider } from "../../src/agents/asset-generator/index.ts";
import { generateImageAsset } from "../../src/agents/asset-generator/index.ts";
import type { CharacterDesignerProvider } from "../../src/agents/character-designer/index.ts";
import { designCharacter } from "../../src/agents/character-designer/index.ts";
import type { SceneDesignerProvider } from "../../src/agents/scene-designer/index.ts";
import { designScene } from "../../src/agents/scene-designer/index.ts";
import type { ScriptParserProvider } from "../../src/agents/script-parser/index.ts";
import { parseScriptWithAgent } from "../../src/agents/script-parser/index.ts";
import type { StoryboardPlannerProvider } from "../../src/agents/storyboard-planner/index.ts";
import { planStoryboard } from "../../src/agents/storyboard-planner/index.ts";
import type { VideoAssemblyProvider } from "../../src/agents/video-assembler/index.ts";
import { exportProjectVideo } from "../../src/agents/video-assembler/index.ts";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-live-provider-test-"));

const {
  assetDir,
  createProject,
  createSubtitleTracksFromDialogue,
  createTransitionRecord,
  getProject,
  linkAssetToProjectRecord,
  parseProjectScript,
  registerAsset,
  setCharacterVisualConsistency,
} = await import("../../src/lib/db.ts");

const runLive = process.env.STORYFORGE_RUN_LIVE_PROVIDER_TESTS === "1";
const liveSkipReason = "set STORYFORGE_RUN_LIVE_PROVIDER_TESTS=1 and STORYFORGE_LIVE_PROVIDER_MODULE to run live provider tests";

type LiveProviders = {
  scriptParserProvider?: ScriptParserProvider;
  characterDesignerProvider?: CharacterDesignerProvider;
  sceneDesignerProvider?: SceneDesignerProvider;
  storyboardPlannerProvider?: StoryboardPlannerProvider;
  imageGenerationProvider?: ImageGenerationProvider;
  videoAssemblyProvider?: VideoAssemblyProvider;
};

let cachedProviders: LiveProviders | null = null;

function sampleScript() {
  return [
    "场景1：咖啡馆 - 雨夜",
    "镜头：近景，雨水顺着玻璃滑落。",
    "情绪：压抑但克制",
    "林夏（28岁，编剧，冷静）收起录音笔。",
    "林夏：我要把这个故事拍完。",
    "场景2：走廊 - 夜晚",
    "镜头：跟拍，顾沉推门进入。",
    "顾沉（30岁，制片人，果断）压低声音。",
    "顾沉：今晚必须完成预览。",
  ].join("\n");
}

async function loadLiveProviders() {
  if (cachedProviders) return cachedProviders;

  const modulePath = process.env.STORYFORGE_LIVE_PROVIDER_MODULE;
  assert.ok(modulePath, "STORYFORGE_LIVE_PROVIDER_MODULE must point to a local provider module");

  const imported = await import(pathToFileURL(resolve(modulePath)).href) as LiveProviders & {
    liveProviders?: LiveProviders;
  };
  cachedProviders = imported.liveProviders ?? {
    scriptParserProvider: imported.scriptParserProvider,
    characterDesignerProvider: imported.characterDesignerProvider,
    sceneDesignerProvider: imported.sceneDesignerProvider,
    storyboardPlannerProvider: imported.storyboardPlannerProvider,
    imageGenerationProvider: imported.imageGenerationProvider,
    videoAssemblyProvider: imported.videoAssemblyProvider,
  };

  assert.equal(
    Object.values(cachedProviders).some(Boolean),
    true,
    "live provider module must export at least one supported provider"
  );
  return cachedProviders;
}

function createProductionProject() {
  const project = createProject({
    title: "Live provider contract project",
    script: sampleScript(),
  });
  assert.ok(project);

  const parsed = parseProjectScript(project.id);
  assert.ok(parsed);
  const character = parsed.characters.find((item) => item.name === "林夏") ?? parsed.characters[0];
  const scene = parsed.scenes[0];
  assert.ok(character);
  assert.ok(scene);

  const assetRelativePath = `imports/live-provider-scene-${project.id}.png`;
  const assetAbsolutePath = join(assetDir, assetRelativePath);
  mkdirSync(dirname(assetAbsolutePath), { recursive: true });
  writeFileSync(assetAbsolutePath, new Uint8Array([137, 80, 78, 71]));
  const asset = registerAsset({
    type: "image",
    name: "live-provider-scene.png",
    relativePath: assetRelativePath,
    mimeType: "image/png",
    sizeBytes: 4,
  });
  assert.ok(asset);

  linkAssetToProjectRecord({
    projectId: project.id,
    targetType: "scene",
    targetId: scene.id,
    assetId: asset.id,
  });
  setCharacterVisualConsistency({
    projectId: project.id,
    characterId: character.id,
    notes: "保持短发、冷感妆容和深色风衣",
    anchorAssetIds: [asset.id],
  });

  const updatedProject = getProject(project.id);
  assert.ok(updatedProject);
  return {
    project: updatedProject,
    characterId: character.id,
    sceneId: scene.id,
    assetId: asset.id,
  };
}

function createAssemblyReadyProject() {
  const { project } = createProductionProject();
  const videoClips = project.timelineClips.filter((clip) => clip.trackType === "video");
  assert.equal(videoClips.length >= 2, true);

  for (const [index, clip] of videoClips.entries()) {
    const clipRelativePath = `imports/live-provider-video-${project.id}-${index}.png`;
    const clipAbsolutePath = join(assetDir, clipRelativePath);
    mkdirSync(dirname(clipAbsolutePath), { recursive: true });
    writeFileSync(clipAbsolutePath, new Uint8Array([137, 80, 78, 71, index]));
    const clipAsset = registerAsset({
      type: "image",
      name: `live-provider-video-${index}.png`,
      relativePath: clipRelativePath,
      mimeType: "image/png",
      sizeBytes: 5,
    });
    assert.ok(clipAsset);
    linkAssetToProjectRecord({
      projectId: project.id,
      targetType: "timelineClip",
      targetId: clip.id,
      assetId: clipAsset.id,
    });
  }

  createSubtitleTracksFromDialogue(project.id);
  createTransitionRecord({
    projectId: project.id,
    sourceClipId: videoClips[0].id,
    targetClipId: videoClips[1].id,
    type: "fade",
    durationMs: 500,
  });

  const updatedProject = getProject(project.id);
  assert.ok(updatedProject);
  return updatedProject;
}

test("live provider module is opt-in and exports at least one provider", { skip: runLive ? false : liveSkipReason }, async () => {
  const providers = await loadLiveProviders();
  assert.equal(Object.values(providers).some(Boolean), true);
});

test("live script parser provider satisfies the parser contract", { skip: runLive ? false : liveSkipReason }, async (t) => {
  const providers = await loadLiveProviders();
  if (!providers.scriptParserProvider) return t.skip("scriptParserProvider was not exported");

  const output = parseScriptWithAgent(sampleScript(), { provider: providers.scriptParserProvider });
  assert.equal(output.characters.length > 0, true);
  assert.equal(output.scenes.length > 0, true);
  assert.equal(Array.isArray(output.relationships), true);
  assert.equal(Array.isArray(output.plotBeats), true);
  assert.equal(Array.isArray(output.dialogueBlocks), true);
});

test("live character designer provider satisfies the character design contract", { skip: runLive ? false : liveSkipReason }, async (t) => {
  const providers = await loadLiveProviders();
  if (!providers.characterDesignerProvider) return t.skip("characterDesignerProvider was not exported");
  const { project, characterId, assetId } = createProductionProject();

  const plan = designCharacter({
    projectId: project.id,
    characterId,
    references: [{ assetId, role: "style-reference" }],
  }, providers.characterDesignerProvider);
  assert.ok(plan);
  assert.equal(plan.provider.length > 0, true);
  assert.equal(plan.visualBrief.length > 0, true);
  assert.equal(plan.consistencyChecklist.length > 0, true);
});

test("live scene designer provider satisfies the scene design contract", { skip: runLive ? false : liveSkipReason }, async (t) => {
  const providers = await loadLiveProviders();
  if (!providers.sceneDesignerProvider) return t.skip("sceneDesignerProvider was not exported");
  const { project, sceneId } = createProductionProject();

  const plan = designScene({
    projectId: project.id,
    sceneId,
    target: "keyframe",
  }, providers.sceneDesignerProvider);
  assert.ok(plan);
  assert.equal(plan.provider.length > 0, true);
  assert.equal(plan.visualBrief.length > 0, true);
  assert.equal(plan.continuityChecklist.length > 0, true);
});

test("live storyboard planner provider satisfies the storyboard contract", { skip: runLive ? false : liveSkipReason }, async (t) => {
  const providers = await loadLiveProviders();
  if (!providers.storyboardPlannerProvider) return t.skip("storyboardPlannerProvider was not exported");
  const { project } = createProductionProject();

  const plan = planStoryboard({
    projectId: project.id,
  }, providers.storyboardPlannerProvider);
  assert.ok(plan);
  assert.equal(plan.provider.length > 0, true);
  assert.equal(plan.summary.length > 0, true);
  assert.equal(plan.shots.length > 0, true);
});

test("live image generation provider satisfies the local asset contract", { skip: runLive ? false : liveSkipReason }, async (t) => {
  const providers = await loadLiveProviders();
  if (!providers.imageGenerationProvider) return t.skip("imageGenerationProvider was not exported");
  const { project } = createProductionProject();

  const result = await generateImageAsset({
    target: "character",
    projectId: project.id,
    name: "live-provider-character",
    prompt: "生成林夏的短剧角色定妆图，主体清晰，不添加文字。",
    character: {
      name: "林夏",
      role: "编剧",
      traits: ["冷静", "坚定"],
    },
  }, { provider: providers.imageGenerationProvider });
  assert.equal(result.job.status, "completed");
  assert.equal(existsSync(join(assetDir, result.asset.relativePath)), true);
});

test("live video assembly provider satisfies the local export contract", { skip: runLive ? false : liveSkipReason }, async (t) => {
  const providers = await loadLiveProviders();
  if (!providers.videoAssemblyProvider) return t.skip("videoAssemblyProvider was not exported");
  const project = createAssemblyReadyProject();

  const result = exportProjectVideo(project.id, providers.videoAssemblyProvider);
  assert.ok(result);
  assert.equal(result.job.status, "completed");
  assert.equal(result.job.outputAbsolutePath ? existsSync(result.job.outputAbsolutePath) : false, true);
});
