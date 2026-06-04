import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScript } from "../../src/lib/script-parser.ts";

test("parseScript extracts real characters and scenes from user text", () => {
  const parsed = parseScript(
    [
      "场景1：会议室 - 白天",
      "陈岚（32岁，制片人，冷静）正在检查预算表。",
      "周远（摄影指导，谨慎）提醒灯光风险。",
      "",
      "场景2：天台 - 夜晚",
      "陈岚（果断）决定重拍关键镜头。",
    ].join("\n")
  );

  assert.equal(parsed.characters.length, 2);
  assert.equal(parsed.characters[0].name, "陈岚");
  assert.equal(parsed.characters[0].age, 32);
  assert.deepEqual(parsed.characters[0].traits, ["制片人", "冷静", "果断"]);

  assert.equal(parsed.scenes.length, 2);
  assert.equal(parsed.scenes[0].location, "会议室");
  assert.equal(parsed.scenes[0].timeOfDay, "白天");
  assert.deepEqual(parsed.scenes[0].characters, ["陈岚", "周远"]);
});

