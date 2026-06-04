import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chineseShortDramaFixtures } from "../fixtures/chinese-short-drama-script.ts";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-route-test-"));

const projectsRoute = await import("../../src/app/api/projects/route.ts");
const assetsRoute = await import("../../src/app/api/assets/route.ts");
const projectRoute = await import("../../src/app/api/projects/[projectId]/route.ts");
const assetLinksRoute = await import("../../src/app/api/projects/[projectId]/asset-links/route.ts");
const duplicateRoute = await import("../../src/app/api/projects/[projectId]/duplicate/route.ts");
const parseRoute = await import("../../src/app/api/projects/[projectId]/parse/route.ts");
const parsePreviewRoute = await import("../../src/app/api/projects/[projectId]/parse/preview/route.ts");
const { dataDir, listAssets } = await import("../../src/lib/db.ts");

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
  assert.equal(listAssets().some((asset) => asset.relativePath === result.body.asset.relativePath), true);
  assert.equal(existsSync(join(dataDir, "assets", result.body.asset.relativePath)), true);
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
