import { NextResponse } from "next/server.js";
import { cancelVideoExportJob, getVideoExportJob } from "../../../../../../../lib/db.ts";
import { apiError } from "../../../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string; jobId: string } }
) {
  try {
    const existing = getVideoExportJob(params.jobId);
    if (!existing || existing.projectId !== params.projectId) {
      return apiError("NOT_FOUND", "Video export job not found", 404);
    }

    const exportJob = cancelVideoExportJob(params.jobId);
    if (!exportJob) {
      return apiError("INTERNAL_ERROR", "Video export job could not be canceled", 500);
    }

    return NextResponse.json({ exportJob });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Video export job could not be canceled",
      500
    );
  }
}
