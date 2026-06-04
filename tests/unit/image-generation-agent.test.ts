import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-image-agent-test-"));

const { generateImageAsset } = await import("../../src/agents/asset-generator/index.ts");
const { dataDir, getAssetDetail } = await import("../../src/lib/db.ts");

test("fake image generation provider writes a local asset record", async () => {
  const result = await generateImageAsset({
    target: "character",
    projectId: "project_test",
    name: "林夏角色图",
    prompt: "生成林夏的短剧角色定妆图",
    aspectRatio: "9:16",
    character: {
      name: "林夏",
      role: "编剧",
      traits: ["敏感", "坚定"],
    },
    parameters: {
      seed: 1,
    },
  });

  assert.equal(result.provider, "fake-image-generator");
  assert.equal(result.model, "fake-local-svg-v1");
  assert.equal(result.target, "character");
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
});

test("image generation validates target specific contract fields", async () => {
  await assert.rejects(
    () => generateImageAsset({
      target: "character",
      projectId: "project_test",
      name: "missing-character",
      prompt: "角色图",
    }),
    /requires character\.name/
  );

  await assert.rejects(
    () => generateImageAsset({
      target: "scene",
      projectId: "project_test",
      name: "missing-scene",
      prompt: "场景图",
    }),
    /requires scene\.location/
  );

  await assert.rejects(
    () => generateImageAsset({
      target: "keyframe",
      projectId: "project_test",
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
  const scene = await generateImageAsset({
    target: "scene",
    projectId: "project_test",
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
    projectId: "project_test",
    name: "天台远景关键帧",
    prompt: "镜头缓慢拉远，城市天光露出",
    scene: {
      location: "天台",
      camera: "缓慢拉远",
    },
  });

  assert.equal(scene.target, "scene");
  assert.equal(keyframe.target, "keyframe");
  assert.equal(scene.asset.relativePath.startsWith("generated/"), true);
  assert.equal(keyframe.asset.relativePath.startsWith("generated/"), true);
});

test("image generation rejects invalid provider output", async () => {
  await assert.rejects(
    () => generateImageAsset(
      {
        target: "scene",
        projectId: "project_test",
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
});
