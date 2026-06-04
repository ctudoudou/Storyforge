import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScriptWithAgent } from "../../src/agents/script-parser/index.ts";
import { chineseShortDramaScript } from "../fixtures/chinese-short-drama-script.ts";

test("script parser agent keeps the existing parser data contract", () => {
  const parsed = parseScriptWithAgent(chineseShortDramaScript);

  assert.equal(parsed.characters.length, 2);
  assert.equal(parsed.characters[0].name, "林夏");
  assert.equal(parsed.characters[0].age, 28);
  assert.deepEqual(parsed.characters[0].traits, ["编剧", "敏感", "坚定"]);

  assert.equal(parsed.scenes.length, 3);
  assert.equal(parsed.scenes[0].location, "旧城区咖啡馆");
  assert.equal(parsed.scenes[0].timeOfDay, "夜晚");
  assert.deepEqual(parsed.scenes[0].characters, ["林夏", "顾沉"]);
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

test("script parser agent validates provider output shape", () => {
  assert.throws(
    () => parseScriptWithAgent("", {
      provider: {
        name: "invalid-provider",
        parse: () => ({
          characters: [],
          scenes: [],
          relationships: [],
          plotBeats: [],
          dialogueBlocks: null,
        }) as never,
      },
    }),
    /invalid dialogue blocks/
  );
});
