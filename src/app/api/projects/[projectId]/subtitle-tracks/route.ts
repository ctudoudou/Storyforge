import { NextResponse } from "next/server.js";

import { createSubtitleTracksFromDialogue } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const project = createSubtitleTracksFromDialogue(params.projectId);
    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Subtitle track creation failed",
      400
    );
  }
}
