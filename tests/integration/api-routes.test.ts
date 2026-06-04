import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chineseShortDramaFixtures } from "../fixtures/chinese-short-drama-script.ts";
import type { AudioTrackRecord, TimelineClipRecord, TransitionRecord } from "../../src/lib/types.ts";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-route-test-"));

const projectsRoute = await import("../../src/app/api/projects/route.ts");
const assetsRoute = await import("../../src/app/api/assets/route.ts");
const assetDetailRoute = await import("../../src/app/api/assets/[assetId]/detail/route.ts");
const assetVersionsRoute = await import("../../src/app/api/assets/[assetId]/versions/route.ts");
const assetVersionRoute = await import("../../src/app/api/assets/[assetId]/versions/[versionId]/route.ts");
const projectRoute = await import("../../src/app/api/projects/[projectId]/route.ts");
const assemblyManifestRoute = await import("../../src/app/api/projects/[projectId]/assembly-manifest/route.ts");
const videoExportsRoute = await import("../../src/app/api/projects/[projectId]/exports/route.ts");
const videoExportCancelRoute = await import("../../src/app/api/projects/[projectId]/exports/[jobId]/cancel/route.ts");
const assetLinksRoute = await import("../../src/app/api/projects/[projectId]/asset-links/route.ts");
const duplicateRoute = await import("../../src/app/api/projects/[projectId]/duplicate/route.ts");
const parseRoute = await import("../../src/app/api/projects/[projectId]/parse/route.ts");
const parsePreviewRoute = await import("../../src/app/api/projects/[projectId]/parse/preview/route.ts");
const scriptRoute = await import("../../src/app/api/projects/[projectId]/script/route.ts");
const audioTracksRoute = await import("../../src/app/api/projects/[projectId]/audio-tracks/route.ts");
const subtitleTracksRoute = await import("../../src/app/api/projects/[projectId]/subtitle-tracks/route.ts");
const transitionsRoute = await import("../../src/app/api/projects/[projectId]/transitions/route.ts");
const transitionRoute = await import("../../src/app/api/projects/[projectId]/transitions/[transitionId]/route.ts");
const timelineClipRoute = await import("../../src/app/api/projects/[projectId]/timeline-clips/[clipId]/route.ts");
const timelineClipSplitRoute = await import("../../src/app/api/projects/[projectId]/timeline-clips/[clipId]/split/route.ts");
const timelineClipReorderRoute = await import("../../src/app/api/projects/[projectId]/timeline-clips/[clipId]/reorder/route.ts");
const { createVideoExportJob, dataDir, listAssets, listVideoExportJobs, registerAsset } = await import("../../src/lib/db.ts");

function request(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

async function readJson(response: Response) {
  return {
    status: response.status,
    body: await response.json(),
  };
}

test("GET /api/projects returns local projects from SQLite", async () => {
  const result = await readJson(await projectsRoute.GET());

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { projects: [] });
});

test("POST /api/assets imports a local file into SQLite and data/assets", async () => {
  const formData = new FormData();
  formData.set("file", new File([new Uint8Array([137, 80, 78, 71])], "scene-ref.png", { type: "image/png" }));

  const result = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: formData,
  })));

  assert.equal(result.status, 201);
  assert.equal(result.body.asset.type, "image");
  assert.equal(result.body.asset.name, "scene-ref.png");
  assert.equal(result.body.asset.mimeType, "image/png");
  assert.equal(result.body.asset.sizeBytes, 4);
  assert.equal(result.body.asset.thumbnailStatus, "fallback");
  assert.equal(result.body.asset.thumbnailPath.startsWith("thumbnails/"), true);
  assert.equal(listAssets().some((asset) => asset.relativePath === result.body.asset.relativePath), true);
  assert.equal(existsSync(join(dataDir, "assets", result.body.asset.relativePath)), true);
  assert.equal(existsSync(join(dataDir, "assets", result.body.asset.thumbnailPath)), true);
});

test("POST /api/assets rejects unsupported file types", async () => {
  const formData = new FormData();
  formData.set("file", new File(["not allowed"], "notes.txt", { type: "text/plain" }));

  const result = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: formData,
  })));

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    error: {
      code: "BAD_REQUEST",
      message: "unsupported file type",
    },
  });
});

test("GET /api/assets/:assetId/detail returns preview metadata and project references", async () => {
  const fixture = chineseShortDramaFixtures[0];
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "素材详情路由项目",
      script: fixture.script,
    }),
  })));
  const parsed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));

  const formData = new FormData();
  formData.set("file", new File([new Uint8Array([137, 80, 78, 71])], "detail-ref.png", { type: "image/png" }));
  const imported = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: formData,
  })));

  await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "character",
        targetId: parsed.body.project.characters[0].id,
        assetId: imported.body.asset.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  );
  await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "scene",
        targetId: parsed.body.project.scenes[0].id,
        assetId: imported.body.asset.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  );

  const result = await readJson(await assetDetailRoute.GET(
    request(`/api/assets/${imported.body.asset.id}/detail`),
    { params: { assetId: imported.body.asset.id } },
  ));

  assert.equal(result.status, 200);
  assert.equal(result.body.detail.asset.id, imported.body.asset.id);
  assert.equal(result.body.detail.assetUrl.startsWith("/api/assets/imports/"), true);
  assert.equal(result.body.detail.thumbnailUrl.startsWith("/api/assets/thumbnails/"), true);
  assert.equal(result.body.detail.fileExists, true);
  assert.equal(result.body.detail.versions.length, 1);
  assert.equal(result.body.detail.versions[0].isActive, true);
  assert.equal(result.body.detail.versions[0].thumbnailStatus, "fallback");
  assert.equal(result.body.detail.references.length, 2);
  assert.deepEqual(
    result.body.detail.references.map((reference: { targetType: string }) => reference.targetType).sort(),
    ["character", "scene"]
  );
  assert.equal(result.body.detail.references.every((reference: { projectTitle: string }) => reference.projectTitle === "素材详情路由项目"), true);
});

test("asset version routes create regeneration history and switch active files", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "素材版本路由项目",
      script: "场景1：版本工作台 - 白天\n沈听（导演，谨慎）检查角色图。",
    }),
  })));
  const parsed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));

  const formData = new FormData();
  formData.set("file", new File([new Uint8Array([137, 80, 78, 71])], "version-one.png", { type: "image/png" }));
  const imported = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: formData,
  })));
  await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "character",
        targetId: parsed.body.project.characters[0].id,
        assetId: imported.body.asset.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  );

  const versionTwoRelativePath = "imports/version-two.png";
  mkdirSync(join(dataDir, "assets", "imports"), { recursive: true });
  writeFileSync(join(dataDir, "assets", versionTwoRelativePath), new Uint8Array([1, 2, 3, 4, 5]));

  const versioned = await readJson(await assetVersionsRoute.POST(
    request(`/api/assets/${imported.body.asset.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "version-two.png",
        relativePath: versionTwoRelativePath,
        mimeType: "image/png",
        sizeBytes: 5,
        source: "regeneration",
        provider: "fake-provider",
        model: "fake-image-model",
        prompt: "角色图重新生成",
        parameters: { seed: 7 },
        makeActive: true,
      }),
    }),
    { params: { assetId: imported.body.asset.id } },
  ));
  const oldVersion = versioned.body.detail.versions.find((version: { versionNumber: number }) => version.versionNumber === 1);
  const newVersion = versioned.body.detail.versions.find((version: { versionNumber: number }) => version.versionNumber === 2);
  const projectAfterVersionSwitch = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(versioned.status, 201);
  assert.equal(versioned.body.detail.asset.relativePath, versionTwoRelativePath);
  assert.equal(versioned.body.detail.asset.thumbnailStatus, "fallback");
  assert.equal(existsSync(join(dataDir, "assets", versioned.body.detail.asset.thumbnailPath)), true);
  assert.equal(versioned.body.detail.versions.length, 2);
  assert.equal(newVersion.isActive, true);
  assert.equal(newVersion.thumbnailStatus, "fallback");
  assert.equal(newVersion.source, "regeneration");
  assert.equal(newVersion.provider, "fake-provider");
  assert.deepEqual(newVersion.parameters, { seed: 7 });
  assert.equal(oldVersion.isActive, false);
  assert.equal(projectAfterVersionSwitch.body.project.characters[0].asset.relativePath, versionTwoRelativePath);
  assert.equal(projectAfterVersionSwitch.body.project.characters[0].asset.thumbnailStatus, "fallback");
  assert.equal(existsSync(join(dataDir, "assets", imported.body.asset.relativePath)), true);
  assert.equal(existsSync(join(dataDir, "assets", versionTwoRelativePath)), true);

  const restored = await readJson(await assetVersionRoute.PATCH(
    request(`/api/assets/${imported.body.asset.id}/versions/${oldVersion.id}`, { method: "PATCH" }),
    { params: { assetId: imported.body.asset.id, versionId: oldVersion.id } },
  ));
  const projectAfterRestore = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(restored.status, 200);
  assert.equal(restored.body.detail.asset.relativePath, imported.body.asset.relativePath);
  assert.equal(restored.body.detail.asset.thumbnailPath, imported.body.asset.thumbnailPath);
  assert.equal(restored.body.detail.versions.find((version: { id: string }) => version.id === oldVersion.id).isActive, true);
  assert.equal(projectAfterRestore.body.project.characters[0].asset.relativePath, imported.body.asset.relativePath);
  assert.equal(existsSync(join(dataDir, "assets", versionTwoRelativePath)), true);
});

test("DELETE /api/assets/:assetId/detail rejects referenced assets", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "素材删除保护项目",
      script: "场景1：删除保护间 - 白天\n许真（美术，谨慎）检查资产。",
    }),
  })));
  const parsed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));

  const formData = new FormData();
  formData.set("file", new File([new Uint8Array([137, 80, 78, 71])], "referenced-delete.png", { type: "image/png" }));
  const imported = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: formData,
  })));
  await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "character",
        targetId: parsed.body.project.characters[0].id,
        assetId: imported.body.asset.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  );

  const result = await readJson(await assetDetailRoute.DELETE(
    request(`/api/assets/${imported.body.asset.id}/detail`, { method: "DELETE" }),
    { params: { assetId: imported.body.asset.id } },
  ));

  assert.equal(result.status, 409);
  assert.deepEqual(result.body, {
    error: {
      code: "CONFLICT",
      message: "Asset is still referenced by project records",
    },
  });
  assert.equal(listAssets().some((asset) => asset.id === imported.body.asset.id), true);
  assert.equal(existsSync(join(dataDir, "assets", imported.body.asset.relativePath)), true);
});

test("DELETE /api/assets/:assetId/detail deletes unreferenced assets and version files", async () => {
  const formData = new FormData();
  formData.set("file", new File([new Uint8Array([137, 80, 78, 71])], "unreferenced-delete.png", { type: "image/png" }));
  const imported = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: formData,
  })));
  const secondRelativePath = "imports/delete-version-two.png";
  mkdirSync(join(dataDir, "assets", "imports"), { recursive: true });
  writeFileSync(join(dataDir, "assets", secondRelativePath), new Uint8Array([1, 2, 3, 4]));
  await assetVersionsRoute.POST(
    request(`/api/assets/${imported.body.asset.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "delete-version-two.png",
        relativePath: secondRelativePath,
        mimeType: "image/png",
        sizeBytes: 4,
      }),
    }),
    { params: { assetId: imported.body.asset.id } },
  );

  const result = await readJson(await assetDetailRoute.DELETE(
    request(`/api/assets/${imported.body.asset.id}/detail`, { method: "DELETE" }),
    { params: { assetId: imported.body.asset.id } },
  ));
  const missing = await readJson(await assetDetailRoute.GET(
    request(`/api/assets/${imported.body.asset.id}/detail`),
    { params: { assetId: imported.body.asset.id } },
  ));

  assert.equal(result.status, 200);
  assert.equal(result.body.result.deleted, true);
  assert.equal(result.body.result.removedFiles.includes(imported.body.asset.relativePath), true);
  assert.equal(result.body.result.removedFiles.includes(imported.body.asset.thumbnailPath), true);
  assert.equal(result.body.result.removedFiles.includes(secondRelativePath), true);
  assert.equal(listAssets().some((asset) => asset.id === imported.body.asset.id), false);
  assert.equal(existsSync(join(dataDir, "assets", imported.body.asset.relativePath)), false);
  assert.equal(existsSync(join(dataDir, "assets", imported.body.asset.thumbnailPath)), false);
  assert.equal(existsSync(join(dataDir, "assets", secondRelativePath)), false);
  assert.equal(missing.status, 404);
});

test("POST /api/assets/:assetId/versions rejects paths outside local assets", async () => {
  const formData = new FormData();
  formData.set("file", new File([new Uint8Array([137, 80, 78, 71])], "safe-version-base.png", { type: "image/png" }));
  const imported = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: formData,
  })));

  const result = await readJson(await assetVersionsRoute.POST(
    request(`/api/assets/${imported.body.asset.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "escape.png",
        relativePath: "../escape.png",
      }),
    }),
    { params: { assetId: imported.body.asset.id } },
  ));

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    error: {
      code: "BAD_REQUEST",
      message: "relativePath must stay inside the local asset directory",
    },
  });
});

test("GET /api/assets/:assetId/detail reports missing local files", async () => {
  const missingAsset = registerAsset({
    type: "image",
    name: "missing-local-file.png",
    relativePath: "imports/missing-local-file.png",
    mimeType: "image/png",
    sizeBytes: 128,
  });
  assert.ok(missingAsset);

  const result = await readJson(await assetDetailRoute.GET(
    request(`/api/assets/${missingAsset!.id}/detail`),
    { params: { assetId: missingAsset!.id } },
  ));

  assert.equal(result.status, 200);
  assert.equal(result.body.detail.asset.id, missingAsset!.id);
  assert.equal(result.body.detail.fileExists, false);
  assert.deepEqual(result.body.detail.references, []);
});

test("PATCH /api/projects/:projectId/asset-links links and unlinks local assets", async () => {
  const fixture = chineseShortDramaFixtures[0];
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "素材绑定路由项目",
      script: fixture.script,
    }),
  })));
  const parsed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));

  const imageForm = new FormData();
  imageForm.set("file", new File([new Uint8Array([137, 80, 78, 71])], "character-link.png", { type: "image/png" }));
  const imageAsset = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: imageForm,
  })));

  const videoForm = new FormData();
  videoForm.set("file", new File([new Uint8Array([0, 0, 0, 24])], "clip-link.mp4", { type: "video/mp4" }));
  const videoAsset = await readJson(await assetsRoute.POST(request("/api/assets", {
    method: "POST",
    body: videoForm,
  })));

  const characterLinked = await readJson(await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "character",
        targetId: parsed.body.project.characters[0].id,
        assetId: imageAsset.body.asset.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  const sceneLinked = await readJson(await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "scene",
        targetId: parsed.body.project.scenes[0].id,
        assetId: imageAsset.body.asset.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  const clipLinked = await readJson(await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "timelineClip",
        targetId: parsed.body.project.timelineClips[0].id,
        assetId: videoAsset.body.asset.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  const unlinkedScene = await readJson(await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "scene",
        targetId: parsed.body.project.scenes[0].id,
        assetId: null,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  const incompatible = await readJson(await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "character",
        targetId: parsed.body.project.characters[0].id,
        assetId: videoAsset.body.asset.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(characterLinked.status, 200);
  assert.equal(characterLinked.body.project.characters[0].asset.id, imageAsset.body.asset.id);
  assert.equal(characterLinked.body.project.characters[0].assetSource, "manual");
  assert.equal(sceneLinked.status, 200);
  assert.equal(sceneLinked.body.project.scenes[0].asset.id, imageAsset.body.asset.id);
  assert.equal(sceneLinked.body.project.scenes[0].assetSource, "manual");
  assert.equal(clipLinked.status, 200);
  assert.equal(clipLinked.body.project.timelineClips[0].asset.id, videoAsset.body.asset.id);
  assert.equal(unlinkedScene.status, 200);
  assert.equal(unlinkedScene.body.project.scenes[0].asset, null);
  assert.equal(unlinkedScene.body.project.scenes[0].assetSource, null);
  assert.equal(listAssets().some((asset) => asset.id === imageAsset.body.asset.id), true);
  assert.equal(incompatible.status, 400);
  assert.deepEqual(incompatible.body, {
    error: {
      code: "BAD_REQUEST",
      message: "Asset type is not compatible",
    },
  });
});

test("timeline clip routes update, split, reorder, and delete local clips", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "时间线 API 项目",
      script: [
        "场景1：天台 - 清晨",
        "林夏（28岁，编剧）准备离开。",
        "场景2：办公室 - 白天",
        "周野（30岁，制片人）追问原因。",
        "场景3：街口 - 夜晚",
        "林夏决定重写人生。",
      ].join("\n"),
    }),
  })));
  const parsed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));
  const firstClip = parsed.body.project.timelineClips[0];
  const imageAsset = registerAsset({
    type: "image",
    name: "时间线首帧.png",
    relativePath: "imports/api-timeline-first-frame.png",
    mimeType: "image/png",
    sizeBytes: 24,
  });
  assert.ok(imageAsset);
  await readJson(await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "timelineClip",
        targetId: firstClip.id,
        assetId: imageAsset!.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));

  const updated = await readJson(await timelineClipRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/timeline-clips/${firstClip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startMs: 1000, durationMs: 4000 }),
    }),
    { params: { projectId: created.body.project.id, clipId: firstClip.id } },
  ));
  assert.equal(updated.status, 200);
  assert.equal(updated.body.project.timelineClips.find((clip: TimelineClipRecord) => clip.id === firstClip.id).durationMs, 4000);

  const split = await readJson(await timelineClipSplitRoute.POST(
    request(`/api/projects/${created.body.project.id}/timeline-clips/${firstClip.id}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splitMs: 2000 }),
    }),
    { params: { projectId: created.body.project.id, clipId: firstClip.id } },
  ));
  const splitChild = split.body.project.timelineClips.find((clip: TimelineClipRecord) => clip.label === `${firstClip.label} - 02`);
  assert.equal(split.status, 200);
  assert.equal(splitChild.asset.id, imageAsset!.id);

  const reordered = await readJson(await timelineClipReorderRoute.POST(
    request(`/api/projects/${created.body.project.id}/timeline-clips/${splitChild.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: "right" }),
    }),
    { params: { projectId: created.body.project.id, clipId: splitChild.id } },
  ));
  assert.equal(reordered.status, 200);
  assert.deepEqual(
    reordered.body.project.timelineClips
      .filter((clip: TimelineClipRecord) => clip.trackType === "video")
      .map((clip: TimelineClipRecord) => clip.startMs),
    [0, 2000, 7000, 9000]
  );

  const deleted = await readJson(await timelineClipRoute.DELETE(
    request(`/api/projects/${created.body.project.id}/timeline-clips/${splitChild.id}`, { method: "DELETE" }),
    { params: { projectId: created.body.project.id, clipId: splitChild.id } },
  ));
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.project.timelineClips.some((clip: TimelineClipRecord) => clip.id === splitChild.id), false);

  const invalid = await readJson(await timelineClipRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/timeline-clips/${firstClip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMs: 0 }),
    }),
    { params: { projectId: created.body.project.id, clipId: firstClip.id } },
  ));
  assert.equal(invalid.status, 400);
});

test("audio track routes create records and link compatible local audio assets", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "配音 API 项目", script: "场景1：录音棚 - 夜晚" }),
  })));
  const audioAsset = registerAsset({
    type: "audio",
    name: "旁白.wav",
    relativePath: "imports/api-narration.wav",
    mimeType: "audio/wav",
    sizeBytes: 128,
  });
  const imageAsset = registerAsset({
    type: "image",
    name: "非音频.png",
    relativePath: "imports/api-not-audio.png",
    mimeType: "image/png",
    sizeBytes: 24,
  });
  assert.ok(audioAsset);
  assert.ok(imageAsset);

  const createdTrack = await readJson(await audioTracksRoute.POST(
    request(`/api/projects/${created.body.project.id}/audio-tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "旁白轨",
        speaker: "旁白",
        startMs: 250,
        durationMs: 3000,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  const audioTrack = createdTrack.body.project.audioTracks[0] as AudioTrackRecord;
  assert.equal(createdTrack.status, 201);
  assert.equal(audioTrack.label, "旁白轨");
  assert.equal(audioTrack.startMs, 250);
  assert.equal(audioTrack.durationMs, 3000);

  const linked = await readJson(await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "audioTrack",
        targetId: audioTrack.id,
        assetId: audioAsset!.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(linked.status, 200);
  assert.equal(linked.body.project.audioTracks[0].asset.id, audioAsset!.id);

  const incompatible = await readJson(await assetLinksRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/asset-links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "audioTrack",
        targetId: audioTrack.id,
        assetId: imageAsset!.id,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(incompatible.status, 400);

  const readBack = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(readBack.body.project.audioTracks[0].asset.id, audioAsset!.id);
});

test("subtitle track route creates records from parsed dialogue blocks", async () => {
  const fixture = chineseShortDramaFixtures[0];
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "字幕 API 项目", script: fixture.script }),
  })));
  const parsed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(parsed.body.project.dialogueBlocks.length, fixture.expected.dialogueSpeakers.length);

  const generated = await readJson(await subtitleTracksRoute.POST(
    request(`/api/projects/${created.body.project.id}/subtitle-tracks`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(generated.status, 201);
  assert.equal(generated.body.project.subtitleTracks.length, fixture.expected.dialogueSpeakers.length);
  assert.equal(generated.body.project.subtitleTracks[0].dialogueBlockId, parsed.body.project.dialogueBlocks[0].id);
  assert.equal(generated.body.project.subtitleTracks[0].text, parsed.body.project.dialogueBlocks[0].content);

  const readBack = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(readBack.body.project.subtitleTracks[0].text, parsed.body.project.dialogueBlocks[0].content);
});

test("transition routes create, update, and delete adjacent clip records", async () => {
  const fixture = chineseShortDramaFixtures[0];
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "转场 API 项目", script: fixture.script }),
  })));
  const parsed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));
  const videoClips = parsed.body.project.timelineClips.filter((clip: TimelineClipRecord) => clip.trackType === "video");
  assert.equal(videoClips.length, 3);

  const createdTransition = await readJson(await transitionsRoute.POST(
    request(`/api/projects/${created.body.project.id}/transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceClipId: videoClips[0].id,
        targetClipId: videoClips[1].id,
        type: "fade",
        durationMs: 600,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(createdTransition.status, 201);
  const transition = createdTransition.body.project.transitions[0] as TransitionRecord;
  assert.equal(transition.sourceClipId, videoClips[0].id);
  assert.equal(transition.targetClipId, videoClips[1].id);
  assert.equal(transition.type, "fade");
  assert.equal(transition.durationMs, 600);

  const invalid = await readJson(await transitionsRoute.POST(
    request(`/api/projects/${created.body.project.id}/transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceClipId: videoClips[0].id,
        targetClipId: videoClips[2].id,
        type: "wipe",
        durationMs: 500,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(invalid.status, 400);

  const updated = await readJson(await transitionRoute.PATCH(
    request(`/api/projects/${created.body.project.id}/transitions/${transition.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "dissolve", durationMs: 900 }),
    }),
    { params: { projectId: created.body.project.id, transitionId: transition.id } },
  ));
  assert.equal(updated.status, 200);
  assert.equal(updated.body.project.transitions[0].type, "dissolve");
  assert.equal(updated.body.project.transitions[0].durationMs, 900);
  assert.deepEqual(
    updated.body.project.timelineClips
      .filter((clip: TimelineClipRecord) => clip.trackType === "video")
      .map((clip: TimelineClipRecord) => clip.startMs),
    videoClips.map((clip: TimelineClipRecord) => clip.startMs)
  );

  const deleted = await readJson(await transitionRoute.DELETE(
    request(`/api/projects/${created.body.project.id}/transitions/${transition.id}`, { method: "DELETE" }),
    { params: { projectId: created.body.project.id, transitionId: transition.id } },
  ));
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.project.transitions.length, 0);
});

test("assembly manifest route returns local asset paths and timeline metadata", async () => {
  const fixture = chineseShortDramaFixtures[1];
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "合成清单 API 项目", script: fixture.script }),
  })));
  const parsed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));
  const videoClips = parsed.body.project.timelineClips.filter((clip: TimelineClipRecord) => clip.trackType === "video");
  assert.equal(videoClips.length, 2);

  for (const [index, clip] of videoClips.entries()) {
    const relativePath = `imports/api-manifest-video-${index}.png`;
    mkdirSync(join(dataDir, "assets", "imports"), { recursive: true });
    writeFileSync(join(dataDir, "assets", relativePath), new Uint8Array([1, 2, 3, 4]));
    const asset = registerAsset({
      type: "image",
      name: `api-manifest-video-${index}.png`,
      relativePath,
      mimeType: "image/png",
      sizeBytes: 4,
    });
    assert.ok(asset);
    await readJson(await assetLinksRoute.PATCH(
      request(`/api/projects/${created.body.project.id}/asset-links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "timelineClip",
          targetId: clip.id,
          assetId: asset!.id,
        }),
      }),
      { params: { projectId: created.body.project.id } },
    ));
  }

  const transition = await readJson(await transitionsRoute.POST(
    request(`/api/projects/${created.body.project.id}/transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceClipId: videoClips[0].id,
        targetClipId: videoClips[1].id,
        type: "fade",
        durationMs: 500,
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(transition.status, 201);

  const result = await readJson(await assemblyManifestRoute.GET(
    request(`/api/projects/${created.body.project.id}/assembly-manifest`),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(result.status, 200);
  assert.equal(result.body.manifest.version, 1);
  assert.equal(result.body.manifest.project.id, created.body.project.id);
  assert.equal(result.body.manifest.timeline.videoClips.length, 2);
  assert.equal(result.body.manifest.timeline.videoClips[0].asset.relativePath, "imports/api-manifest-video-0.png");
  assert.equal(result.body.manifest.timeline.videoClips[0].asset.absolutePath.endsWith("imports/api-manifest-video-0.png"), true);
  assert.equal(result.body.manifest.timeline.transitions.length, 1);
  assert.equal(result.body.manifest.timeline.durationMs, 10000);

  const exportSettings = await readJson(await projectRoute.PATCH(
    request(`/api/projects/${created.body.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exportSettings: {
          outputFormat: "storyforge_json",
          resolution: "1920x1080",
          frameRate: 24,
          burnInSubtitles: false,
          audioMix: "voice_focus",
        },
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(exportSettings.status, 200);

  const exported = await readJson(await videoExportsRoute.POST(
    request(`/api/projects/${created.body.project.id}/exports`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(exported.status, 201);
  assert.equal(exported.body.exportJob.status, "completed");
  assert.equal(exported.body.exportJob.projectId, created.body.project.id);
  assert.equal(exported.body.exportJob.tool, "local-manifest-assembler");
  assert.equal(exported.body.exportJob.outputRelativePath.endsWith(".storyforge-export.json"), true);
  assert.equal(existsSync(exported.body.exportJob.outputAbsolutePath), true);
  assert.equal(exported.body.exportJob.manifestVersion, 1);
  assert.equal(exported.body.exportJob.durationMs, 10000);
  assert.deepEqual(exported.body.exportJob.exportSettings, exportSettings.body.project.exportSettings);

  const artifact = JSON.parse(readFileSync(exported.body.exportJob.outputAbsolutePath, "utf8"));
  assert.deepEqual(artifact.exportSettings, exportSettings.body.project.exportSettings);

  const listed = await readJson(await videoExportsRoute.GET(
    request(`/api/projects/${created.body.project.id}/exports`),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(listed.status, 200);
  assert.equal(listed.body.exports[0].id, exported.body.exportJob.id);
  assert.deepEqual(listed.body.exports[0].exportSettings, exportSettings.body.project.exportSettings);
});

test("POST /api/projects/:projectId/exports/:jobId/cancel cancels a local export job", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "导出取消 API 项目",
    }),
  })));
  assert.equal(created.status, 201);

  const job = createVideoExportJob({
    projectId: created.body.project.id,
    tool: "api-cancel-test",
  });
  assert.ok(job);

  const result = await readJson(await videoExportCancelRoute.POST(
    request(`/api/projects/${created.body.project.id}/exports/${job.id}/cancel`, { method: "POST" }),
    { params: { projectId: created.body.project.id, jobId: job.id } },
  ));

  assert.equal(result.status, 200);
  assert.equal(result.body.exportJob.id, job.id);
  assert.equal(result.body.exportJob.status, "canceled");
  assert.equal(result.body.exportJob.progressMessage, "Video export canceled.");
  assert.equal(typeof result.body.exportJob.cancelRequestedAt, "string");
});

test("assembly manifest route returns structured errors for missing local assets", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "缺失素材清单 API 项目",
      script: "场景1：办公室 - 白天\n林夏（28岁，编剧）检查分镜板。",
    }),
  })));
  await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));

  const result = await readJson(await assemblyManifestRoute.GET(
    request(`/api/projects/${created.body.project.id}/assembly-manifest`),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(result.status, 409);
  assert.equal(result.body.error.code, "CONFLICT");
  assert.match(result.body.error.message, /Timeline clip requires a linked local asset/);

  const exported = await readJson(await videoExportsRoute.POST(
    request(`/api/projects/${created.body.project.id}/exports`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(exported.status, 409);
  assert.equal(exported.body.error.code, "CONFLICT");
  assert.match(exported.body.error.message, /Timeline clip requires a linked local asset/);

  const exportJobs = listVideoExportJobs(created.body.project.id);
  assert.equal(exportJobs.length, 1);
  assert.equal(exportJobs[0].status, "failed");
  assert.match(exportJobs[0].errorMessage ?? "", /Timeline clip requires a linked local asset/);
});

test("POST /api/projects creates a local project", async () => {
  const result = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "路由测试项目", script: "场景1：办公室 - 白天" }),
  })));

  assert.equal(result.status, 201);
  assert.equal(result.body.project.title, "路由测试项目");
  assert.equal(result.body.project.script.content, "场景1：办公室 - 白天");
});

test("GET /api/projects/:projectId reads one local project", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "读取路由项目" }),
  })));

  const result = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(result.status, 200);
  assert.equal(result.body.project.id, created.body.project.id);
  assert.equal(result.body.project.title, "读取路由项目");
});

test("PUT /api/projects/:projectId/script saves imported script content", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "导入剧本路由项目" }),
  })));

  const importedScript = "场景1：导入片场 - 夜晚\n林夏：这是从本地文件导入的剧本。";
  const saved = await readJson(await scriptRoute.PUT(
    request(`/api/projects/${created.body.project.id}/script`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: importedScript }),
    }),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(saved.status, 200);
  assert.equal(saved.body.project.script.content, importedScript);

  const result = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(result.body.project.script.content, importedScript);
});

test("PATCH /api/projects/:projectId renames one local project", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "旧标题" }),
  })));

  const result = await readJson(await projectRoute.PATCH(
    request(`/api/projects/${created.body.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新标题" }),
    }),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(result.status, 200);
  assert.equal(result.body.project.title, "新标题");
});

test("PATCH /api/projects/:projectId updates review state", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "审阅状态 API 项目" }),
  })));

  const reviewed = await readJson(await projectRoute.PATCH(
    request(`/api/projects/${created.body.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewState: "needs_changes" }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.project.reviewState, "needs_changes");

  const invalid = await readJson(await projectRoute.PATCH(
    request(`/api/projects/${created.body.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewState: "archived" }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "BAD_REQUEST");
});

test("PATCH /api/projects/:projectId updates project-level settings", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "项目设置 API 项目" }),
  })));

  assert.deepEqual(created.body.project.settings, {
    stylePreset: "modern_drama",
    aspectRatio: "9:16",
    language: "zh-CN",
    voicePreset: "narrator_female",
    targetDurationSeconds: 60,
  });

  const updated = await readJson(await projectRoute.PATCH(
    request(`/api/projects/${created.body.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          stylePreset: "workplace",
          aspectRatio: "16:9",
          language: "en-US",
          voicePreset: "dialogue_mixed",
          targetDurationSeconds: 240,
        },
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(updated.status, 200);
  assert.equal(updated.body.project.settings.stylePreset, "workplace");
  assert.equal(updated.body.project.settings.aspectRatio, "16:9");
  assert.equal(updated.body.project.settings.language, "en-US");
  assert.equal(updated.body.project.settings.voicePreset, "dialogue_mixed");
  assert.equal(updated.body.project.settings.targetDurationSeconds, 240);

  const detail = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));
  assert.deepEqual(detail.body.project.settings, updated.body.project.settings);

  const invalid = await readJson(await projectRoute.PATCH(
    request(`/api/projects/${created.body.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { aspectRatio: "4:5" } }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "BAD_REQUEST");
});

test("PATCH /api/projects/:projectId updates final export settings", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "导出设置 API 项目" }),
  })));

  assert.deepEqual(created.body.project.exportSettings, {
    outputFormat: "mp4",
    resolution: "1080x1920",
    frameRate: 30,
    burnInSubtitles: true,
    audioMix: "balanced",
  });

  const updated = await readJson(await projectRoute.PATCH(
    request(`/api/projects/${created.body.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exportSettings: {
          outputFormat: "storyforge_json",
          resolution: "1920x1080",
          frameRate: 24,
          burnInSubtitles: false,
          audioMix: "music_focus",
        },
      }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(updated.status, 200);
  assert.equal(updated.body.project.exportSettings.outputFormat, "storyforge_json");
  assert.equal(updated.body.project.exportSettings.resolution, "1920x1080");
  assert.equal(updated.body.project.exportSettings.frameRate, 24);
  assert.equal(updated.body.project.exportSettings.burnInSubtitles, false);
  assert.equal(updated.body.project.exportSettings.audioMix, "music_focus");

  const detail = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));
  assert.deepEqual(detail.body.project.exportSettings, updated.body.project.exportSettings);

  const invalid = await readJson(await projectRoute.PATCH(
    request(`/api/projects/${created.body.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exportSettings: { frameRate: 60 } }),
    }),
    { params: { projectId: created.body.project.id } },
  ));
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "BAD_REQUEST");
});

test("PATCH /api/projects/:projectId returns structured errors", async () => {
  const result = await readJson(await projectRoute.PATCH(
    request("/api/projects/project_missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    }),
    { params: { projectId: "project_missing" } },
  ));

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    error: {
      code: "BAD_REQUEST",
      message: "title cannot be empty",
    },
  });
});

test("POST /api/projects/:projectId/duplicate duplicates a local project", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "复制路由项目", script: "场景1：天台 - 夜晚" }),
  })));

  const result = await readJson(await duplicateRoute.POST(
    request(`/api/projects/${created.body.project.id}/duplicate`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(result.status, 201);
  assert.notEqual(result.body.project.id, created.body.project.id);
  assert.equal(result.body.project.title, "复制路由项目 副本");
});

test("POST /api/projects/:projectId/duplicate returns structured 404 errors", async () => {
  const result = await readJson(await duplicateRoute.POST(
    request("/api/projects/project_missing/duplicate", { method: "POST" }),
    { params: { projectId: "project_missing" } },
  ));

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    error: {
      code: "NOT_FOUND",
      message: "Project not found",
    },
  });
});

test("POST /api/projects/:projectId/parse/preview returns results without writing records", async () => {
  const fixture = chineseShortDramaFixtures[1];
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "解析预览项目",
      script: fixture.script,
    }),
  })));

  const preview = await readJson(await parsePreviewRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse/preview`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));
  const beforeConfirm = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));
  const confirmed = await readJson(await parseRoute.POST(
    request(`/api/projects/${created.body.project.id}/parse`, { method: "POST" }),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(preview.status, 200);
  assert.equal(preview.body.preview.characters.length, fixture.expected.characterNames.length);
  assert.deepEqual(preview.body.preview.warnings, []);
  assert.equal(preview.body.preview.scenes[0].mood, fixture.expected.moods[0]);
  assert.equal(preview.body.preview.scenes[0].camera, fixture.expected.cameras[0]);
  assert.equal(beforeConfirm.body.project.characters.length, 0);
  assert.equal(beforeConfirm.body.project.scenes.length, 0);
  assert.equal(confirmed.body.project.characters.length, fixture.expected.characterNames.length);
  assert.deepEqual(confirmed.body.warnings, []);
  assert.equal(confirmed.body.project.scenes[0].mood, fixture.expected.moods[0]);
});

test("POST /api/projects/:projectId/parse/preview returns structured 404 errors", async () => {
  const result = await readJson(await parsePreviewRoute.POST(
    request("/api/projects/project_missing/parse/preview", { method: "POST" }),
    { params: { projectId: "project_missing" } },
  ));

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    error: {
      code: "NOT_FOUND",
      message: "Project not found",
    },
  });
});

test("DELETE /api/projects/:projectId deletes a local project", async () => {
  const created = await readJson(await projectsRoute.POST(request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "删除路由项目" }),
  })));

  const result = await readJson(await projectRoute.DELETE(
    request(`/api/projects/${created.body.project.id}`, { method: "DELETE" }),
    { params: { projectId: created.body.project.id } },
  ));
  const missing = await readJson(await projectRoute.GET(
    request(`/api/projects/${created.body.project.id}`),
    { params: { projectId: created.body.project.id } },
  ));

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, {
    error: {
      code: "NOT_FOUND",
      message: "Project not found",
    },
  });
});
