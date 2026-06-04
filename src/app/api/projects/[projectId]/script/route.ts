import { NextResponse } from "next/server.js";
import { updateScript } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as { content?: unknown };
  if (typeof body.content !== "string") {
    return apiError("BAD_REQUEST", "content must be a string", 400);
  }

  const project = updateScript(params.projectId, body.content);
  if (!project) {
    return apiError("NOT_FOUND", "Project not found", 404);
  }

  return NextResponse.json({ project });
}
