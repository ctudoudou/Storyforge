import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.STORYFORGE_DATA_DIR = mkdtempSync(join(tmpdir(), "storyforge-route-test-"));

const projectsRoute = await import("../../src/app/api/projects/route.ts");
const projectRoute = await import("../../src/app/api/projects/[projectId]/route.ts");
const duplicateRoute = await import("../../src/app/api/projects/[projectId]/duplicate/route.ts");

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
