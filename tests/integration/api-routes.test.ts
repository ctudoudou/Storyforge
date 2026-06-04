import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chineseShortDramaFixtures } from "../fixtures/chinese-short-drama-script.ts";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-route-test-"));

const projectsRoute = await import("../../src/app/api/projects/route.ts");
const assetsRoute = await import("../../src/app/api/assets/route.ts");
const assetDetailRoute = await import("../../src/app/api/assets/[assetId]/detail/route.ts");
const assetVersionsRoute = await import("../../src/app/api/assets/[assetId]/versions/route.ts");
const assetVersionRoute = await import("../../src/app/api/assets/[assetId]/versions/[versionId]/route.ts");
const projectRoute = await import("../../src/app/api/projects/[projectId]/route.ts");
const assetLinksRoute = await import("../../src/app/api/projects/[projectId]/asset-links/route.ts");
const duplicateRoute = await import("../../src/app/api/projects/[projectId]/duplicate/route.ts");
const parseRoute = await import("../../src/app/api/projects/[projectId]/parse/route.ts");
const parsePreviewRoute = await import("../../src/app/api/projects/[projectId]/parse/preview/route.ts");
const { dataDir, listAssets, registerAsset } = await import("../../src/lib/db.ts");

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
  assert.equal(sceneLinked.status, 200);
  assert.equal(sceneLinked.body.project.scenes[0].asset.id, imageAsset.body.asset.id);
  assert.equal(clipLinked.status, 200);
  assert.equal(clipLinked.body.project.timelineClips[0].asset.id, videoAsset.body.asset.id);
  assert.equal(unlinkedScene.status, 200);
  assert.equal(unlinkedScene.body.project.scenes[0].asset, null);
  assert.equal(listAssets().some((asset) => asset.id === imageAsset.body.asset.id), true);
  assert.equal(incompatible.status, 400);
  assert.deepEqual(incompatible.body, {
    error: {
      code: "BAD_REQUEST",
      message: "Asset type is not compatible",
    },
  });
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
