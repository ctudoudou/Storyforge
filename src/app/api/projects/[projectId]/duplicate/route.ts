import { NextResponse } from "next/server";
import { duplicateProjectById } from "@/lib/project-api";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const result = duplicateProjectById(params.projectId);
  return NextResponse.json(result.body, { status: result.status });
}
