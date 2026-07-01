import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScriptWithAgent, parseScriptWithRuntimeAgent } from "../../src/agents/script-parser/index.ts";
import { chineseShortDramaFixtures, chineseShortDramaScript } from "../fixtures/chinese-short-drama-script.ts";

test("script parser agent keeps the existing parser data contract", () => {
  const parsed = parseScriptWithAgent(chineseShortDramaScript);

  assert.equal(parsed.characters.length, 2);
  assert.equal(parsed.characters[0].name, "林夏");
  assert.equal(parsed.characters[0].age, 28);
  assert.deepEqual(parsed.characters[0].traits, ["编剧", "敏感", "坚定"]);

  assert.equal(parsed.scenes.length, 3);
  assert.equal(parsed.scenes[0].location, "旧城区咖啡馆");
  assert.equal(parsed.scenes[0].timeOfDay, "夜晚");
  assert.equal(parsed.scenes[0].mood, "压抑");
  assert.equal(parsed.scenes[0].camera, "手持近景，雨水贴着玻璃滑落。");
  assert.deepEqual(parsed.scenes[0].characters, ["林夏", "顾沉"]);
});

test("script parser runtime falls back to deterministic provider without config", async () => {
  const originalConfig = process.env.STORYFORGE_PROVIDER_CONFIG;
  const originalConfigFile = process.env.STORYFORGE_PROVIDER_CONFIG_FILE;
  const originalModule = process.env.STORYFORGE_PROVIDER_MODULE;
  const originalLiveModule = process.env.STORYFORGE_LIVE_PROVIDER_MODULE;
  try {
    delete process.env.STORYFORGE_PROVIDER_CONFIG;
    process.env.STORYFORGE_PROVIDER_CONFIG_FILE = "/tmp/storyforge-missing-provider-config.json";
    delete process.env.STORYFORGE_PROVIDER_MODULE;
    delete process.env.STORYFORGE_LIVE_PROVIDER_MODULE;
    const parsed = await parseScriptWithRuntimeAgent(chineseShortDramaScript);
    assert.equal(parsed.characters.length > 0, true);
    assert.equal(parsed.scenes.length > 0, true);
  } finally {
    if (originalConfig === undefined) {
      delete process.env.STORYFORGE_PROVIDER_CONFIG;
    } else {
      process.env.STORYFORGE_PROVIDER_CONFIG = originalConfig;
    }
    if (originalConfigFile === undefined) {
      delete process.env.STORYFORGE_PROVIDER_CONFIG_FILE;
    } else {
      process.env.STORYFORGE_PROVIDER_CONFIG_FILE = originalConfigFile;
    }
    if (originalModule === undefined) {
      delete process.env.STORYFORGE_PROVIDER_MODULE;
    } else {
      process.env.STORYFORGE_PROVIDER_MODULE = originalModule;
    }
    if (originalLiveModule === undefined) {
      delete process.env.STORYFORGE_LIVE_PROVIDER_MODULE;
    } else {
      process.env.STORYFORGE_LIVE_PROVIDER_MODULE = originalLiveModule;
    }
  }
});

test("script parser agent extracts stronger scene metadata", () => {
  const parsed = parseScriptWithAgent(chineseShortDramaScript);

  assert.deepEqual(
    parsed.scenes.map((scene) => [scene.sceneNumber, scene.location, scene.timeOfDay, scene.mood]),
    [
      [1, "旧城区咖啡馆", "夜晚", "压抑"],
      [2, "咖啡馆后巷", "深夜", "悬疑"],
      [3, "天台", "清晨", "释然"],
    ]
  );
  assert.equal(parsed.scenes[2].camera, "缓慢拉远，城市天光露出。");
});

test("script parser agent handles Chinese scene heading variants", () => {
  const parsed = parseScriptWithAgent([
    "第一场：医院走廊 — 清晨 — 焦灼",
    "机位：低角度固定镜头。",
    "林夏（28岁，编剧）握着检查单。",
    "",
    "场景十：地下车库深夜",
    "画面：手持跟拍，车灯扫过墙面。",
    "顾沉（32岁，制片人）发现真相。",
  ].join("\n"));

  assert.deepEqual(
    parsed.scenes.map((scene) => [scene.sceneNumber, scene.location, scene.timeOfDay, scene.mood, scene.camera]),
    [
      [1, "医院走廊", "清晨", "焦灼", "低角度固定镜头。"],
      [10, "地下车库", "深夜", "悬疑", "手持跟拍，车灯扫过墙面。"],
    ]
  );
});

test("script parser agent covers Chinese short-drama fixture set", () => {
  for (const fixture of chineseShortDramaFixtures) {
    const parsed = parseScriptWithAgent(fixture.script);

    assert.deepEqual(parsed.characters.map((character) => character.name), fixture.expected.characterNames, fixture.id);
    assert.deepEqual(parsed.scenes.map((scene) => scene.sceneNumber), fixture.expected.sceneNumbers, fixture.id);
    assert.deepEqual(parsed.scenes.map((scene) => scene.location), fixture.expected.locations, fixture.id);
    assert.deepEqual(parsed.scenes.map((scene) => scene.timeOfDay), fixture.expected.timeOfDays, fixture.id);
    assert.deepEqual(parsed.scenes.map((scene) => scene.mood), fixture.expected.moods, fixture.id);
    assert.deepEqual(parsed.scenes.map((scene) => scene.camera), fixture.expected.cameras, fixture.id);
    assert.deepEqual(parsed.dialogueBlocks.map((dialogue) => dialogue.speaker), fixture.expected.dialogueSpeakers, fixture.id);
    assert.deepEqual(parsed.plotBeats.map((beat) => beat.type), fixture.expected.plotBeatTypes, fixture.id);
    assert.equal(parsed.relationships.length >= 1, true, fixture.id);
  }
});

test("script parser agent exposes provider-level relationships and plot beats", () => {
  const parsed = parseScriptWithAgent(chineseShortDramaScript);

  assert.equal(parsed.relationships.length >= 1, true);
  assert.deepEqual(
    parsed.relationships.map((relationship) => [relationship.source, relationship.target]),
    [["林夏", "顾沉"]]
  );

  assert.equal(parsed.plotBeats.length, 3);
  assert.equal(parsed.plotBeats.some((beat) => beat.type === "conflict"), true);
  assert.equal(parsed.plotBeats.some((beat) => beat.type === "reversal"), true);
  assert.equal(parsed.plotBeats.some((beat) => beat.type === "decision"), true);
});

test("script parser agent extracts dialogue blocks per scene", () => {
  const parsed = parseScriptWithAgent(chineseShortDramaScript);

  assert.equal(parsed.dialogueBlocks.length, 4);
  assert.deepEqual(parsed.dialogueBlocks.map((dialogue) => dialogue.speaker), ["林夏", "顾沉", "林夏", "顾沉"]);
  assert.equal(parsed.dialogueBlocks[0].sceneNumber, 1);
  assert.equal(parsed.dialogueBlocks[0].content, "你现在出现，是想买走我的故事吗？");
  assert.equal(parsed.dialogueBlocks[3].sceneNumber, 3);
  assert.equal(parsed.dialogueBlocks[3].orderIndex, 3);
});

test("script parser agent recovers from partial provider output failures", () => {
  const sections = ["characters", "scenes", "relationships", "plotBeats", "dialogueBlocks"] as const;

  for (const section of sections) {
    const parsed = parseScriptWithAgent("", {
      provider: {
        name: `partial-${section}-provider`,
        parse: () => ({
          characters: section === "characters" ? null : [],
          scenes: section === "scenes" ? null : [],
          relationships: section === "relationships" ? null : [],
          plotBeats: section === "plotBeats" ? null : [],
          dialogueBlocks: section === "dialogueBlocks" ? null : [],
        }) as never,
      },
    });

    assert.deepEqual(parsed[section], [], section);
    assert.equal(parsed.warnings.length, 1, section);
    assert.equal(parsed.warnings[0].section, section);
  }
});

test("script parser agent rejects unrecoverable provider output", () => {
  assert.throws(
    () => parseScriptWithAgent("", {
      provider: {
        name: "unrecoverable-provider",
        parse: () => null,
      },
    }),
    /unrecoverable output/
  );
});
