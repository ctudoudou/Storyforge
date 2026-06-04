import { errorBody, type ApiErrorBody } from "./api-response.ts";
import { deleteProject, duplicateProject, updateProjectTitle } from "./db.ts";

export type ApiResult<T> = {
  status: number;
  body: T;
};

export function renameProjectFromBody(
  projectId: string,
  body: { title?: unknown }
): ApiResult<{ project: NonNullable<ReturnType<typeof updateProjectTitle>> } | ApiErrorBody> {
  if (typeof body.title !== "string") {
    return { status: 400, body: errorBody("BAD_REQUEST", "title must be a string") };
  }

  const title = body.title.trim();
  if (!title) {
    return { status: 400, body: errorBody("BAD_REQUEST", "title cannot be empty") };
  }

  const project = updateProjectTitle(projectId, title);
  if (!project) {
    return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
  }

  return { status: 200, body: { project } };
}

export function deleteProjectById(projectId: string): ApiResult<{ ok: true } | ApiErrorBody> {
  const deleted = deleteProject(projectId);
  if (!deleted) {
    return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
  }

  return { status: 200, body: { ok: true } };
}

export function duplicateProjectById(
  projectId: string
): ApiResult<{ project: NonNullable<ReturnType<typeof duplicateProject>> } | ApiErrorBody> {
  const project = duplicateProject(projectId);
  if (!project) {
    return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
  }

  return { status: 201, body: { project } };
}
