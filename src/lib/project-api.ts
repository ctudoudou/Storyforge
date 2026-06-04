import { deleteProject, updateProjectTitle } from "./db.ts";

export type ApiResult<T> = {
  status: number;
  body: T;
};

export function renameProjectFromBody(
  projectId: string,
  body: { title?: unknown }
): ApiResult<{ project: NonNullable<ReturnType<typeof updateProjectTitle>> } | { error: string }> {
  if (typeof body.title !== "string") {
    return { status: 400, body: { error: "title must be a string" } };
  }

  const title = body.title.trim();
  if (!title) {
    return { status: 400, body: { error: "title cannot be empty" } };
  }

  const project = updateProjectTitle(projectId, title);
  if (!project) {
    return { status: 404, body: { error: "Project not found" } };
  }

  return { status: 200, body: { project } };
}

export function deleteProjectById(projectId: string): ApiResult<{ ok: true } | { error: string }> {
  const deleted = deleteProject(projectId);
  if (!deleted) {
    return { status: 404, body: { error: "Project not found" } };
  }

  return { status: 200, body: { ok: true } };
}
