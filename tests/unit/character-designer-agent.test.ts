import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-character-designer-test-"));

const { designCharacter, CharacterDesignerError } = await import("../../src/agents/character-designer/index.ts");
const {
  assetDir,
  createProject,
  getProject,
  parseProjectScript,
  registerAsset,
  setCharacterVisualConsistency,
} = await import("../../src/lib/db.ts");

function createCharacterProject() {
  const project = createProject({
    title: "角色设计项目",
    script: [
      "场景1：咖啡馆 - 雨夜",
      "林夏（28岁，编剧，冷静）收起录音笔。",
      "林夏：我要把这个故事拍完。",
    ].join("\n"),
  });
  assert.ok(project);

  const parsed = parseProjectScript(project.id);
  assert.ok(parsed);
  const character = parsed.characters.find((item) => item.name === "林夏");
  assert.ok(character);

  const anchorRelativePath = `imports/character-designer-${project.id}.png`;
  const anchorAbsolutePath = join(assetDir, anchorRelativePath);
  mkdirSync(dirname(anchorAbsolutePath), { recursive: true });
  writeFileSync(anchorAbsolutePath, new Uint8Array([137, 80, 78, 71]));
  const anchorAsset = registerAsset({
    type: "image",
    name: "character-anchor.png",
    relativePath: anchorRelativePath,
    mimeType: "image/png",
    sizeBytes: 4,
  });
  assert.ok(anchorAsset);

  const updated = setCharacterVisualConsistency({
    projectId: project.id,
    characterId: character.id,
    notes: "保持短发、冷感妆容和深色风衣",
    anchorAssetIds: [anchorAsset.id],
  });
  assert.ok(updated);

  return {
    project: getProject(project.id),
    characterId: character.id,
    anchorAssetId: anchorAsset.id,
  };
}

test("character designer builds a provider-agnostic plan from SQLite character records", () => {
  const { project, characterId, anchorAssetId } = createCharacterProject();
  assert.ok(project);

  const plan = designCharacter({
    projectId: project.id,
    characterId,
    style: "冷调都市现实主义，雨夜霓虹",
    references: [
      {
        assetId: anchorAssetId,
        role: "style-reference",
      },
    ],
  });

  assert.ok(plan);
  assert.equal(plan.provider, "fake-character-designer");
  assert.equal(plan.model, "fake-character-designer-v1");
  assert.equal(plan.projectId, project.id);
  assert.equal(plan.characterId, characterId);
  assert.equal(plan.characterName, "林夏");
  assert.match(plan.prompt.prompt, /角色名称：林夏/);
  assert.match(plan.prompt.prompt, /冷调都市现实主义/);
  assert.match(plan.prompt.prompt, /保持短发、冷感妆容和深色风衣/);
  assert.match(plan.prompt.prompt, new RegExp(anchorAssetId));
  assert.match(plan.visualBrief, /林夏/);
  assert.match(plan.visualBrief, /保持短发、冷感妆容和深色风衣/);
  assert.deepEqual(plan.metadata?.anchorAssetIds, [anchorAssetId]);
  assert.equal(plan.consistencyChecklist.includes("保持面部识别度"), true);
});

test("character designer rejects invalid provider output", () => {
  const { project, characterId } = createCharacterProject();
  assert.ok(project);

  assert.throws(
    () => designCharacter(
      {
        projectId: project.id,
        characterId,
      },
      {
        name: "bad-character-provider",
        model: "bad-model",
        designCharacter() {
          return {
            provider: "bad-character-provider",
            model: "bad-model",
            visualBrief: "",
            consistencyChecklist: ["保持面部识别度"],
          };
        },
      },
    ),
    CharacterDesignerError
  );
});
