import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-scene-designer-test-"));

const { designScene, SceneDesignerError } = await import("../../src/agents/scene-designer/index.ts");
const {
  assetDir,
  createProject,
  getProject,
  linkAssetToProjectRecord,
  parseProjectScript,
  registerAsset,
} = await import("../../src/lib/db.ts");

function createSceneProject() {
  const project = createProject({
    title: "场景设计项目",
    script: [
      "场景1：咖啡馆 - 雨夜",
      "镜头：近景，雨水顺着玻璃滑落。",
      "情绪：压抑但克制",
      "林夏（28岁，编剧，冷静）收起录音笔。",
      "林夏：我要把这个故事拍完。",
    ].join("\n"),
  });
  assert.ok(project);

  const parsed = parseProjectScript(project.id);
  assert.ok(parsed);
  const scene = parsed.scenes.find((item) => item.location === "咖啡馆");
  assert.ok(scene);

  const relativePath = `imports/scene-designer-${project.id}.png`;
  const absolutePath = join(assetDir, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, new Uint8Array([137, 80, 78, 71]));
  const asset = registerAsset({
    type: "image",
    name: "scene-reference.png",
    relativePath,
    mimeType: "image/png",
    sizeBytes: 4,
  });
  assert.ok(asset);

  const linked = linkAssetToProjectRecord({
    projectId: project.id,
    targetType: "scene",
    targetId: scene.id,
    assetId: asset.id,
  });
  assert.ok(linked);

  return {
    project: getProject(project.id),
    sceneId: scene.id,
    assetId: asset.id,
  };
}

test("scene designer builds a provider-agnostic plan from SQLite scene records", () => {
  const { project, sceneId, assetId } = createSceneProject();
  assert.ok(project);

  const plan = designScene({
    projectId: project.id,
    sceneId,
    target: "keyframe",
    style: "冷调都市现实主义，雨夜霓虹",
    beatSummary: "林夏决定夺回故事主导权",
  });

  assert.ok(plan);
  assert.equal(plan.provider, "fake-scene-designer");
  assert.equal(plan.model, "fake-scene-designer-v1");
  assert.equal(plan.projectId, project.id);
  assert.equal(plan.sceneId, sceneId);
  assert.equal(plan.sceneLabel, "S01 - 咖啡馆");
  assert.equal(plan.prompt.target, "keyframe");
  assert.match(plan.prompt.prompt, /场景地点：咖啡馆/);
  assert.match(plan.prompt.prompt, /剧情节点：林夏决定夺回故事主导权/);
  assert.match(plan.prompt.prompt, /冷调都市现实主义/);
  assert.equal(plan.prompt.references.some((reference) => reference.assetId === assetId && reference.role === "scene-reference"), true);
  assert.match(plan.visualBrief, /S01 - 咖啡馆/);
  assert.equal(plan.metadata?.linkedSceneAssetId, assetId);
  assert.equal(plan.continuityChecklist.includes("保持地点空间关系"), true);
});

test("scene designer rejects invalid provider output", () => {
  const { project, sceneId } = createSceneProject();
  assert.ok(project);

  assert.throws(
    () => designScene(
      {
        projectId: project.id,
        sceneId,
      },
      {
        name: "bad-scene-provider",
        model: "bad-model",
        designScene() {
          return {
            provider: "bad-scene-provider",
            model: "bad-model",
            visualBrief: "",
            continuityChecklist: ["保持地点空间关系"],
          };
        },
      },
    ),
    SceneDesignerError
  );
});
