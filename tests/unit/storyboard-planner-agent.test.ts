import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-storyboard-planner-test-"));

const { planStoryboard, StoryboardPlannerError } = await import("../../src/agents/storyboard-planner/index.ts");
const { createProject, parseProjectScript } = await import("../../src/lib/db.ts");

function createStoryboardProject() {
  const project = createProject({
    title: "分镜规划项目",
    script: [
      "场景1：咖啡馆 - 雨夜",
      "镜头：近景，雨水顺着玻璃滑落。",
      "林夏（28岁，编剧，冷静）收起录音笔。",
      "林夏：我要把这个故事拍完。",
      "场景2：走廊 - 夜晚",
      "镜头：跟拍，顾沉推门进入。",
      "顾沉（30岁，制片人，果断）压低声音。",
      "顾沉：今晚必须完成预览。",
    ].join("\n"),
  });
  assert.ok(project);

  const parsed = parseProjectScript(project.id);
  assert.ok(parsed);
  assert.equal(parsed.scenes.length, 2);
  assert.equal(parsed.plotBeats.length, 2);
  assert.equal(parsed.dialogueBlocks.length, 2);
  assert.equal(parsed.timelineClips.length, 2);

  return parsed;
}

test("storyboard planner builds shots from SQLite scenes, beats, dialogue, and clips", () => {
  const project = createStoryboardProject();

  const plan = planStoryboard({
    projectId: project.id,
    style: "都市悬疑短剧，快节奏反转",
  });

  assert.ok(plan);
  assert.equal(plan.provider, "fake-storyboard-planner");
  assert.equal(plan.model, "fake-storyboard-planner-v1");
  assert.equal(plan.projectId, project.id);
  assert.match(plan.summary, /共规划 2 个分镜片段/);
  assert.equal(plan.shots.length, 2);
  assert.equal(plan.shots[0].title, "S01 - 咖啡馆");
  assert.match(plan.shots[0].beatSummary, /收起录音笔/);
  assert.match(plan.shots[0].dialogueSummary, /林夏: 我要把这个故事拍完。/);
  assert.equal(plan.shots[0].startMs, 0);
  assert.equal(plan.shots[0].durationMs, 5000);
  assert.equal(plan.shots[1].title, "S02 - 走廊");
  assert.equal(plan.metadata?.sceneCount, 2);
});

test("storyboard planner rejects invalid provider output", () => {
  const project = createStoryboardProject();

  assert.throws(
    () => planStoryboard(
      {
        projectId: project.id,
      },
      {
        name: "bad-storyboard-provider",
        model: "bad-model",
        planStoryboard() {
          return {
            provider: "bad-storyboard-provider",
            model: "bad-model",
            summary: "",
            shots: [],
          };
        },
      },
    ),
    StoryboardPlannerError
  );
});

test("storyboard planner requires parsed scene records", () => {
  const project = createProject({ title: "空分镜项目" });
  assert.ok(project);

  assert.throws(
    () => planStoryboard({ projectId: project.id }),
    /requires at least one scene/
  );
});
