import { NextResponse } from "next/server.js";

import { reorderTimelineClip } from "../../../../../../../lib/db.ts";
import { apiError } from "../../../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { projectId: string; clipId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as { direction?: unknown };

  if (body.direction !== "left" && body.direction !== "right") {
    return apiError("BAD_REQUEST", "direction must be left or right", 400);
  }

  try {
    const project = reorderTimelineClip({
      projectId: params.projectId,
      clipId: params.clipId,
      direction: body.direction,
    });

    if (!project) {
      return apiError("NOT_FOUND", "Project or timeline clip not found", 404);
    }

    return NextResponse.json({ project });
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Timeline clip reorder failed",
      400
    );
  }
}
