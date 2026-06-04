import { NextResponse } from "next/server";
import { apiError } from "@/lib/next-api-response";
import { getProject } from "@/lib/db";
import { deleteProjectById, renameProjectFromBody } from "@/lib/project-api";

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
  const body = (await request.json().catch(() => ({}))) as { title?: unknown };
  const result = renameProjectFromBody(params.projectId, body);

  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const result = deleteProjectById(params.projectId);
  return NextResponse.json(result.body, { status: result.status });
}
