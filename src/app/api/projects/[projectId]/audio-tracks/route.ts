import { NextResponse } from "next/server.js";

import { createAudioTrack } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

function optionalInteger(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
  return value;
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as {
    label?: unknown;
    speaker?: unknown;
    startMs?: unknown;
    durationMs?: unknown;
    assetId?: unknown;
  };

  try {
    const project = createAudioTrack({
      projectId: params.projectId,
      label: body.label === undefined ? undefined : String(body.label),
      speaker: body.speaker === undefined ? undefined : String(body.speaker),
      startMs: optionalInteger(body.startMs, "startMs"),
      durationMs: optionalInteger(body.durationMs, "durationMs"),
      assetId: body.assetId === undefined || body.assetId === null ? null : String(body.assetId),
    });

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Audio track creation failed",
      400
    );
  }
}
