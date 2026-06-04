import { NextResponse } from "next/server.js";
import { previewProjectScript } from "../../../../../../lib/db.ts";
import { apiError } from "../../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const preview = previewProjectScript(params.projectId);
  if (!preview) {
    return apiError("NOT_FOUND", "Project not found", 404);
  }

  return NextResponse.json({ preview });
}
