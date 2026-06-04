import { NextResponse } from "next/server.js";

import { splitTimelineClip } from "../../../../../../../lib/db.ts";
import { apiError } from "../../../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { projectId: string; clipId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as { splitMs?: unknown };

  try {
    const splitMs = body.splitMs === undefined ? undefined : body.splitMs;
    if (splitMs !== undefined && (typeof splitMs !== "number" || !Number.isInteger(splitMs))) {
      throw new Error("splitMs must be an integer");
    }

    const project = splitTimelineClip({
      projectId: params.projectId,
      clipId: params.clipId,
      splitMs,
    });

    if (!project) {
      return apiError("NOT_FOUND", "Project or timeline clip not found", 404);
    }

    return NextResponse.json({ project });
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Timeline clip split failed",
      400
    );
  }
}
