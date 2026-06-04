import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Next routes mount the reference UI pages", async () => {
  const home = await read("src/app/page.tsx");
  const project = await read("src/app/project/[projectId]/page.tsx");

  assert.match(home, /<Dashboard \/>/);
  assert.match(project, /<ProjectWorkspace projectId=\{params\.projectId\} \/>/);
});

test("reference workspace copy and stages remain intact", async () => {
  const workspace = await read("src/app/pages/ProjectWorkspace.tsx");
  const scriptEditor = await read("src/app/components/workspace/ScriptEditor.tsx");

  assert.match(workspace, /剧本解析/);
  assert.match(workspace, /人物关系与设定/);
  assert.match(workspace, /分镜生成/);
  assert.match(workspace, /时间线与合成/);
  assert.match(await read("src/app/components/workspace/CharacterGraph.tsx"), /人物关系/);
  assert.match(await read("src/app/components/workspace/Storyboard.tsx"), /剧情节点/);
  assert.match(await read("src/app/components/workspace/Storyboard.tsx"), /对白块/);
  assert.match(await read("src/app/components/workspace/Storyboard.tsx"), /待定情绪/);
  assert.match(await read("src/app/components/workspace/AssetLinkControl.tsx"), /绑定素材/);
  assert.match(await read("src/app/components/workspace/AssetLinkControl.tsx"), /解除绑定/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /画面素材/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /配音素材/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /本地资产预览/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /剪辑参数/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /音频参数/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /添加配音轨/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /字幕轨/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /生成字幕轨/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /暂无字幕片段/);
  assert.match(await read("src/app/components/workspace/Timeline.tsx"), /拆分片段/);
  assert.match(scriptEditor, /解析剧本/);
  assert.match(scriptEditor, /解析结果预览/);
  assert.match(scriptEditor, /确认写入/);
  assert.match(scriptEditor, /取消不会修改现有记录/);
  assert.match(scriptEditor, /用户编辑或已绑定素材/);
  assert.match(scriptEditor, /部分可用结果/);
  assert.match(scriptEditor, /确认后只会写入当前可用记录/);
});

test("old mock content and remote image placeholders are removed from runtime UI", async () => {
  const files = [
    "src/app/pages/Dashboard.tsx",
    "src/app/pages/ProjectWorkspace.tsx",
    "src/app/components/workspace/ScriptEditor.tsx",
    "src/app/components/workspace/CharacterGraph.tsx",
    "src/app/components/workspace/Storyboard.tsx",
    "src/app/components/workspace/Timeline.tsx",
  ];
  const combined = (await Promise.all(files.map(read))).join("\n");

  assert.doesNotMatch(combined, /霸道总裁爱上我|赛博朋克2077|重生之我在豪门当保姆/);
  assert.doesNotMatch(combined, /images\.unsplash\.com/);
  assert.doesNotMatch(combined, /Dummy tracks|recentProjects/);
});

test("core views keep explicit loading and empty-state copy", async () => {
  const files = [
    "src/app/pages/ProjectWorkspace.tsx",
    "src/app/components/workspace/ScriptEditor.tsx",
    "src/app/components/workspace/CharacterGraph.tsx",
    "src/app/components/workspace/Storyboard.tsx",
    "src/app/components/workspace/Timeline.tsx",
    "src/app/pages/Projects.tsx",
    "src/app/pages/Assets.tsx",
  ];
  const combined = (await Promise.all(files.map(read))).join("\n");

  assert.match(combined, /正在读取剧本数据/);
  assert.match(combined, /尚未输入剧本/);
  assert.match(combined, /本地数据库暂无人物记录/);
  assert.match(combined, /本地数据库暂无场景记录/);
  assert.match(combined, /暂无时间线片段/);
  assert.match(combined, /当前片段未绑定本地素材/);
  assert.match(combined, /待绑定画面素材/);
  assert.match(combined, /本地数据库暂无项目/);
  assert.match(combined, /本地素材目录暂无已登记素材/);
  assert.match(combined, /导入本地素材/);
  assert.match(combined, /导入中/);
  assert.match(combined, /查看详情/);
  assert.match(combined, /素材详情/);
  assert.match(combined, /项目引用/);
  assert.match(combined, /本地文件缺失/);
  assert.match(combined, /版本历史/);
  assert.match(combined, /当前版本/);
  assert.match(combined, /设为当前/);
  assert.match(combined, /删除保护/);
  assert.match(combined, /删除素材/);
  assert.match(combined, /解除绑定后才能删除/);
  assert.match(combined, /暂无缩略图/);
  assert.match(combined, /缩略图状态/);
  assert.match(combined, /fallback/);
});
