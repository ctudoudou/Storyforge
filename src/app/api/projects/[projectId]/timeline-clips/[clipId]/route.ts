import { NextResponse } from "next/server.js";

import { deleteTimelineClip, updateTimelineClip } from "../../../../../../lib/db.ts";
import { apiError } from "../../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

function optionalInteger(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
  return value;
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string; clipId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as {
    label?: unknown;
    startMs?: unknown;
    durationMs?: unknown;
  };

  try {
    const project = updateTimelineClip({
      projectId: params.projectId,
      clipId: params.clipId,
      label: body.label === undefined ? undefined : String(body.label),
      startMs: optionalInteger(body.startMs, "startMs"),
      durationMs: optionalInteger(body.durationMs, "durationMs"),
    });

    if (!project) {
      return apiError("NOT_FOUND", "Project or timeline clip not found", 404);
    }

    return NextResponse.json({ project });
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Timeline clip update failed",
      400
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { projectId: string; clipId: string } }
) {
  const project = deleteTimelineClip(params.projectId, params.clipId);
  if (!project) {
    return apiError("NOT_FOUND", "Project or timeline clip not found", 404);
  }

  return NextResponse.json({ project });
}
