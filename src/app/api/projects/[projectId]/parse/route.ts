import { NextResponse } from "next/server";
import { apiError } from "@/lib/next-api-response";
import { parseProjectScript } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const project = parseProjectScript(params.projectId);
  if (!project) {
    return apiError("NOT_FOUND", "Project not found", 404);
  }

  return NextResponse.json({ project });
}
