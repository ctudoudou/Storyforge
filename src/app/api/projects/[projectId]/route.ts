import { NextResponse } from "next/server.js";
import { getProject } from "../../../../lib/db.ts";
import { apiError } from "../../../../lib/next-api-response.ts";
import {
  deleteProjectById,
  renameProjectFromBody,
  updateProjectExportSettingsFromBody,
  updateProjectReviewStateFromBody,
  updateProjectSettingsFromBody,
} from "../../../../lib/project-api.ts";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const project = getProject(params.projectId);
  if (!project) {
    return apiError("NOT_FOUND", "Project not found", 404);
  }

  return NextResponse.json({ project });
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as {
    exportSettings?: unknown;
    reviewState?: unknown;
    settings?: unknown;
    title?: unknown;
  };
  const result = "exportSettings" in body
    ? updateProjectExportSettingsFromBody(params.projectId, body)
    : "settings" in body
      ? updateProjectSettingsFromBody(params.projectId, body)
      : "reviewState" in body
        ? updateProjectReviewStateFromBody(params.projectId, body)
        : renameProjectFromBody(params.projectId, body);

  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const result = deleteProjectById(params.projectId);
  return NextResponse.json(result.body, { status: result.status });
}
