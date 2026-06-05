import { NextResponse } from "next/server.js";

import { exportProjectVideo, VideoAssemblerError } from "../../../../../agents/video-assembler/index.ts";
import { AssemblyManifestError } from "../../../../../lib/assembly-manifest.ts";
import { listVideoExportJobs } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    return NextResponse.json({ exports: listVideoExportJobs(params.projectId) });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Video export jobs could not be read",
      500
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const result = await exportProjectVideo(params.projectId);
    if (!result) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    return NextResponse.json({ exportJob: result.job, output: result.output }, { status: 201 });
  } catch (error) {
    if (error instanceof AssemblyManifestError || error instanceof VideoAssemblerError) {
      return apiError("CONFLICT", error.message, 409);
    }

    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Video export failed",
      500
    );
  }
}
