import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCharacterDesignPrompt } from "../../src/agents/asset-generator/index.ts";

test("character design prompt includes Chinese short-drama context", () => {
  const prompt = buildCharacterDesignPrompt({
    projectTitle: "雨夜重逢",
    storySummary: "女编剧在旧城区咖啡馆与制片人重新谈判自己的故事。",
    style: "冷调都市现实主义，雨夜霓虹，克制表演",
    aspectRatio: "9:16",
    character: {
      name: "林夏",
      role: "编剧",
      traits: ["敏感", "坚定", "戒备"],
    },
    visualConsistency: {
      notes: "保持短发、清冷妆容和深色风衣",
      anchorAssetIds: ["asset_character_anchor"],
    },
    references: [
      {
        assetId: "asset_style_reference",
        role: "style-reference",
      },
    ],
  });

  assert.equal(prompt.target, "character");
  assert.equal(prompt.title, "林夏角色设计");
  assert.equal(prompt.aspectRatio, "9:16");
  assert.match(prompt.prompt, /角色名称：林夏/);
  assert.match(prompt.prompt, /角色定位：编剧/);
  assert.match(prompt.prompt, /性格与状态：敏感、坚定、戒备/);
  assert.match(prompt.prompt, /所属项目：雨夜重逢/);
  assert.match(prompt.prompt, /冷调都市现实主义/);
  assert.match(prompt.prompt, /一致性锚点资产：asset_character_anchor/);
  assert.match(prompt.prompt, /参考资产：style-reference:asset_style_reference/);
  assert.equal(prompt.references.length, 1);
  assert.equal(prompt.parameters.characterName, "林夏");
  assert.equal(prompt.parameters.hasReferenceAssets, true);
  assert.equal(prompt.parameters.hasConsistencyAnchors, true);
});

test("character design prompt has provider agnostic defaults", () => {
  const prompt = buildCharacterDesignPrompt({
    character: {
      name: "顾沉",
    },
  });

  assert.match(prompt.prompt, /角色定位：待定角色/);
  assert.match(prompt.prompt, /性格与状态：待补充/);
  assert.match(prompt.prompt, /视觉风格：写实短剧定妆照/);
  assert.match(prompt.prompt, /参考资产：无/);
  assert.equal(prompt.aspectRatio, "9:16");
  assert.equal(prompt.references.length, 0);
  assert.equal(prompt.parameters.promptType, "character-design");
});

test("character design prompt validates required character name", () => {
  assert.throws(
    () => buildCharacterDesignPrompt({
      character: {
        name: " ",
      },
    }),
    /character\.name is required/
  );
});
