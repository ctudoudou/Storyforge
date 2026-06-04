import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-image-agent-test-"));

const { generateImageAsset } = await import("../../src/agents/asset-generator/index.ts");
const {
  createRegenerateImageGenerationJob,
  createProject,
  dataDir,
  getAssetDetail,
  getImageGenerationByAssetId,
  listImageGenerationJobs,
  listImageGenerations,
  retryImageGenerationJob,
} = await import("../../src/lib/db.ts");

test("fake image generation provider writes a local asset record", async () => {
  const project = createProject({ title: "角色生成元数据项目" });
  assert.ok(project);

  const result = await generateImageAsset({
    target: "character",
    projectId: project.id,
    name: "林夏角色图",
    prompt: "生成林夏的短剧角色定妆图",
    negativePrompt: "文字，水印，脸部变形",
    aspectRatio: "9:16",
    character: {
      name: "林夏",
      role: "编剧",
      traits: ["敏感", "坚定"],
    },
    references: [
      {
        assetId: "asset_style_reference",
        role: "style-reference",
      },
    ],
    parentArtifacts: [
      {
        type: "character",
        id: "character_linxia",
      },
    ],
    parameters: {
      seed: 1,
    },
  });

  assert.equal(result.provider, "fake-image-generator");
  assert.equal(result.model, "fake-local-svg-v1");
  assert.equal(result.target, "character");
  assert.equal(result.negativePrompt, "文字，水印，脸部变形");
  assert.equal(result.asset.type, "image");
  assert.equal(result.asset.mimeType, "image/svg+xml");
  assert.equal(result.asset.relativePath.startsWith("generated/"), true);
  assert.equal(result.asset.thumbnailStatus, "fallback");
  assert.equal(existsSync(join(dataDir, "assets", result.asset.relativePath)), true);
  assert.equal(existsSync(join(dataDir, "assets", result.asset.thumbnailPath ?? "")), true);

  const detail = getAssetDetail(result.asset.id);
  assert.equal(detail?.versions.length, 1);
  assert.equal(detail?.versions[0].source, "import");
  assert.equal(detail?.versions[0].thumbnailStatus, "fallback");

  const generation = getImageGenerationByAssetId(result.asset.id);
  assert.equal(generation?.id, result.generation.id);
  assert.equal(generation?.projectId, project.id);
  assert.equal(generation?.assetId, result.asset.id);
  assert.equal(generation?.targetType, "character");
  assert.equal(generation?.prompt, "生成林夏的短剧角色定妆图");
  assert.equal(generation?.negativePrompt, "文字，水印，脸部变形");
  assert.equal(generation?.provider, "fake-image-generator");
  assert.equal(generation?.model, "fake-local-svg-v1");
  assert.deepEqual(generation?.parameters, { seed: 1 });
  assert.equal(generation?.seed, 1);
  assert.deepEqual(generation?.sourceAssetIds, ["asset_style_reference"]);
  assert.deepEqual(generation?.parentArtifacts, [{ type: "character", id: "character_linxia" }]);
  assert.deepEqual(generation?.metadata, { fake: true, target: "character" });

  assert.equal(result.job.status, "completed");
  assert.equal(result.job.assetId, result.asset.id);
  assert.equal(result.job.generationId, result.generation.id);
  assert.equal(result.job.errorMessage, null);
  assert.equal(typeof result.job.startedAt, "string");
  assert.equal(typeof result.job.completedAt, "string");
  assert.deepEqual(result.job.sourceAssetIds, ["asset_style_reference"]);
  assert.deepEqual(result.job.parentArtifacts, [{ type: "character", id: "character_linxia" }]);

  const regenerateJob = createRegenerateImageGenerationJob(result.generation.id);
  assert.equal(regenerateJob?.status, "queued");
  assert.equal(regenerateJob?.regenerateOfGenerationId, result.generation.id);
  assert.equal(regenerateJob?.retryOfJobId, null);
  assert.equal(regenerateJob?.prompt, result.generation.prompt);
  assert.equal(regenerateJob?.provider, result.generation.provider);
  assert.deepEqual(regenerateJob?.sourceAssetIds, ["asset_style_reference"]);
  assert.deepEqual(regenerateJob?.parentArtifacts, [
    { type: "character", id: "character_linxia" },
    { type: "generation", id: result.generation.id },
  ]);
});

test("image generation validates target specific contract fields", async () => {
  const project = createProject({ title: "生成校验项目" });
  assert.ok(project);

  await assert.rejects(
    () => generateImageAsset({
      target: "character",
      projectId: project.id,
      name: "missing-character",
      prompt: "角色图",
    }),
    /requires character\.name/
  );

  await assert.rejects(
    () => generateImageAsset({
      target: "scene",
      projectId: project.id,
      name: "missing-scene",
      prompt: "场景图",
    }),
    /requires scene\.location/
  );

  await assert.rejects(
    () => generateImageAsset({
      target: "keyframe",
      projectId: project.id,
      name: "missing-prompt",
      prompt: "",
      scene: {
        location: "天台",
      },
    }),
    /prompt is required/
  );
});

test("image generation supports scene and keyframe outputs", async () => {
  const project = createProject({ title: "场景关键帧生成项目" });
  assert.ok(project);

  const scene = await generateImageAsset({
    target: "scene",
    projectId: project.id,
    name: "天台清晨",
    prompt: "清晨天台场景图",
    scene: {
      location: "天台",
      timeOfDay: "清晨",
      mood: "释然",
    },
  });
  const keyframe = await generateImageAsset({
    target: "keyframe",
    projectId: project.id,
    name: "天台远景关键帧",
    prompt: "镜头缓慢拉远，城市天光露出",
    parentArtifacts: [
      {
        type: "scene",
        id: "scene_rooftop",
      },
      {
        type: "plotBeat",
        id: "beat_decision",
      },
    ],
    scene: {
      location: "天台",
      camera: "缓慢拉远",
    },
  });

  assert.equal(scene.target, "scene");
  assert.equal(keyframe.target, "keyframe");
  assert.equal(scene.asset.relativePath.startsWith("generated/"), true);
  assert.equal(keyframe.asset.relativePath.startsWith("generated/"), true);

  const generations = listImageGenerations(project.id);
  const jobs = listImageGenerationJobs(project.id);
  assert.equal(generations.length, 2);
  assert.equal(jobs.length, 2);
  assert.equal(generations.some((generation) => generation.targetType === "scene"), true);
  assert.equal(generations.some((generation) => generation.targetType === "keyframe"), true);
  assert.equal(jobs.every((job) => job.status === "completed"), true);
  assert.deepEqual(
    getImageGenerationByAssetId(keyframe.asset.id)?.parentArtifacts,
    [
      { type: "scene", id: "scene_rooftop" },
      { type: "plotBeat", id: "beat_decision" },
    ]
  );
});

test("image generation rejects invalid provider output", async () => {
  const project = createProject({ title: "异常 Provider 项目" });
  assert.ok(project);

  await assert.rejects(
    () => generateImageAsset(
      {
        target: "scene",
        projectId: project.id,
        name: "bad-provider",
        prompt: "场景图",
        scene: {
          location: "街口",
        },
      },
      {
        provider: {
          name: "bad-provider",
          model: "bad-model",
          generateImage: () => ({
            data: new Uint8Array(),
            mimeType: "image/svg+xml",
            extension: ".svg",
          }),
        },
      }
    ),
    /empty image data/
  );

  const jobs = listImageGenerationJobs(project.id);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, "failed");
  assert.equal(jobs[0].assetId, null);
  assert.equal(jobs[0].generationId, null);
  assert.match(jobs[0].errorMessage ?? "", /empty image data/);
  assert.equal(typeof jobs[0].startedAt, "string");
  assert.equal(typeof jobs[0].completedAt, "string");

  const retryJob = retryImageGenerationJob(jobs[0].id);
  assert.equal(retryJob?.status, "queued");
  assert.equal(retryJob?.retryOfJobId, jobs[0].id);
  assert.equal(retryJob?.regenerateOfGenerationId, null);
  assert.equal(retryJob?.prompt, jobs[0].prompt);
  assert.equal(retryJob?.provider, "bad-provider");
  assert.equal(retryJob?.errorMessage, null);
});
