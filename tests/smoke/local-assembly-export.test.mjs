import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-smoke-export-"));

const { createAssemblyManifest } = await import("../../src/lib/assembly-manifest.ts");
const { exportProjectVideo } = await import("../../src/agents/video-assembler/index.ts");
const {
  assetDir,
  createProject,
  createSubtitleTracksFromDialogue,
  createTransitionRecord,
  getProject,
  linkAssetToProjectRecord,
  listVideoExportJobs,
  parseProjectScript,
  registerAsset,
} = await import("../../src/lib/db.ts");

function smokeScript() {
  return [
    "场景1：办公室 - 白天",
    "林夏（28岁，编剧，冷静）看着白板。",
    "林夏：我们从这里开始。",
    "场景2：走廊 - 夜晚",
    "顾沉（30岁，制片人，果断）推门进入。",
    "顾沉：今晚必须完成预览。",
  ].join("\n");
}

function writeSmokeAsset(relativePath, index) {
  const absolutePath = join(assetDir, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, new Uint8Array([137, 80, 78, 71, index]));
  return absolutePath;
}

function createLinkedProject() {
  const project = createProject({ title: "Smoke local export", script: smokeScript() });
  assert.ok(project);

  const parsed = parseProjectScript(project.id);
  assert.ok(parsed);
  const videoClips = parsed.timelineClips.filter((clip) => clip.trackType === "video");
  assert.equal(videoClips.length, 2);

  for (const [index, clip] of videoClips.entries()) {
    const relativePath = `imports/smoke-export-${project.id}-${index}.png`;
    writeSmokeAsset(relativePath, index);
    const asset = registerAsset({
      type: "image",
      name: `smoke-export-${index}.png`,
      relativePath,
      mimeType: "image/png",
      sizeBytes: 5,
    });
    assert.ok(asset);
    const linked = linkAssetToProjectRecord({
      projectId: project.id,
      targetType: "timelineClip",
      targetId: clip.id,
      assetId: asset.id,
    });
    assert.ok(linked);
  }

  createSubtitleTracksFromDialogue(project.id);
  createTransitionRecord({
    projectId: project.id,
    sourceClipId: videoClips[0].id,
    targetClipId: videoClips[1].id,
    type: "fade",
    durationMs: 500,
  });

  return getProject(project.id);
}

test("smoke manifest and local export use real SQLite records and local files", () => {
  const project = createLinkedProject();
  assert.ok(project);

  const manifest = createAssemblyManifest(project.id);
  assert.ok(manifest);
  assert.equal(manifest.timeline.videoClips.length, 2);
  assert.equal(manifest.timeline.subtitleTracks.length, 2);
  assert.equal(manifest.timeline.transitions.length, 1);
  assert.equal(existsSync(manifest.timeline.videoClips[0].asset.absolutePath), true);

  const result = exportProjectVideo(project.id);
  assert.ok(result);
  assert.equal(result.job.status, "completed");
  assert.equal(result.job.outputRelativePath?.endsWith(".storyforge-export.json"), true);
  assert.equal(result.job.outputAbsolutePath ? existsSync(result.job.outputAbsolutePath) : false, true);

  const artifact = JSON.parse(readFileSync(result.job.outputAbsolutePath, "utf8"));
  assert.equal(artifact.format, "storyforge.local-video-export");
  assert.equal(artifact.project.id, project.id);
  assert.equal(artifact.timeline.videoClipCount, 2);
});

test("smoke local export records missing asset failures without mock fallbacks", () => {
  const project = createProject({ title: "Smoke missing export asset", script: smokeScript() });
  assert.ok(project);
  const parsed = parseProjectScript(project.id);
  assert.ok(parsed);

  assert.throws(() => createAssemblyManifest(project.id), /Timeline clip requires a linked local asset/);
  assert.throws(() => exportProjectVideo(project.id), /Timeline clip requires a linked local asset/);

  const jobs = listVideoExportJobs(project.id);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, "failed");
  assert.match(jobs[0].errorMessage ?? "", /Timeline clip requires a linked local asset/);
  assert.equal(jobs[0].outputRelativePath, null);
});
