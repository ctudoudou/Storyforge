import { NextResponse } from "next/server.js";

import { createTransitionRecord } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as {
    sourceClipId?: unknown;
    targetClipId?: unknown;
    type?: unknown;
    durationMs?: unknown;
  };

  if (typeof body.sourceClipId !== "string" || typeof body.targetClipId !== "string") {
    return apiError("BAD_REQUEST", "sourceClipId and targetClipId must be strings", 400);
  }

  try {
    const project = createTransitionRecord({
      projectId: params.projectId,
      sourceClipId: body.sourceClipId,
      targetClipId: body.targetClipId,
      type: typeof body.type === "string" ? body.type : undefined,
      durationMs: typeof body.durationMs === "number" ? body.durationMs : undefined,
    });
    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Transition creation failed",
      400
    );
  }
}
