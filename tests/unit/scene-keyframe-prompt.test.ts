import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSceneKeyframePrompt } from "../../src/agents/asset-generator/index.ts";

test("scene prompt includes Chinese location, mood, camera, and references", () => {
  const prompt = buildSceneKeyframePrompt({
    target: "scene",
    projectTitle: "雨夜重逢",
    storySummary: "旧城区咖啡馆里的谈判逐渐失控。",
    style: "冷调都市现实主义，雨夜玻璃反光",
    aspectRatio: "16:9",
    scene: {
      location: "旧城区咖啡馆",
      timeOfDay: "夜晚",
      mood: "压抑",
      camera: "手持近景，雨水贴着玻璃滑落",
    },
    characters: [
      {
        name: "林夏",
        role: "编剧",
        traits: ["敏感", "坚定"],
      },
    ],
    visualConsistency: {
      notes: "保持旧城区潮湿玻璃、暖色台灯和窄桌布局",
      anchorAssetIds: ["asset_scene_anchor"],
    },
    references: [
      {
        assetId: "asset_composition_ref",
        role: "composition-reference",
      },
    ],
  });

  assert.equal(prompt.target, "scene");
  assert.equal(prompt.title, "旧城区咖啡馆场景图");
  assert.equal(prompt.aspectRatio, "16:9");
  assert.match(prompt.prompt, /画面类型：场景设定图/);
  assert.match(prompt.prompt, /场景地点：旧城区咖啡馆/);
  assert.match(prompt.prompt, /情绪氛围：压抑/);
  assert.match(prompt.prompt, /镜头提示：手持近景/);
  assert.match(prompt.prompt, /登场人物：林夏（编剧，敏感、坚定）/);
  assert.match(prompt.prompt, /参考资产：composition-reference:asset_composition_ref/);
  assert.equal(prompt.parameters.promptType, "scene-design");
  assert.equal(prompt.parameters.hasReferenceAssets, true);
});

test("keyframe prompt includes beat summary and action-focused output rule", () => {
  const prompt = buildSceneKeyframePrompt({
    target: "keyframe",
    beatSummary: "林夏发现顾沉隐藏了合同真相。",
    scene: {
      location: "咖啡馆后巷",
      timeOfDay: "深夜",
      mood: "悬疑",
      camera: "低角度固定镜头，车灯扫过墙面",
    },
  });

  assert.equal(prompt.target, "keyframe");
  assert.equal(prompt.title, "咖啡馆后巷关键帧");
  assert.match(prompt.prompt, /画面类型：关键帧画面/);
  assert.match(prompt.prompt, /剧情节点：林夏发现顾沉隐藏了合同真相。/);
  assert.match(prompt.prompt, /单张剧情关键帧/);
  assert.equal(prompt.parameters.promptType, "keyframe-design");
});

test("scene and keyframe prompts validate required scene location", () => {
  assert.throws(
    () => buildSceneKeyframePrompt({
      target: "scene",
      scene: {
        location: "",
      },
    }),
    /scene\.location is required/
  );
});
