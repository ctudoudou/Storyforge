import { NextResponse } from "next/server.js";

import { deleteTransitionRecord, updateTransitionRecord } from "../../../../../../lib/db.ts";
import { apiError } from "../../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string; transitionId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as {
    sourceClipId?: unknown;
    targetClipId?: unknown;
    type?: unknown;
    durationMs?: unknown;
  };

  try {
    const project = updateTransitionRecord({
      projectId: params.projectId,
      transitionId: params.transitionId,
      sourceClipId: typeof body.sourceClipId === "string" ? body.sourceClipId : undefined,
      targetClipId: typeof body.targetClipId === "string" ? body.targetClipId : undefined,
      type: typeof body.type === "string" ? body.type : undefined,
      durationMs: typeof body.durationMs === "number" ? body.durationMs : undefined,
    });
    if (!project) {
      return apiError("NOT_FOUND", "Transition not found", 404);
    }

    return NextResponse.json({ project });
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Transition update failed",
      400
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { projectId: string; transitionId: string } }
) {
  const project = deleteTransitionRecord(params.projectId, params.transitionId);
  if (!project) {
    return apiError("NOT_FOUND", "Transition not found", 404);
  }

  return NextResponse.json({ project });
}
