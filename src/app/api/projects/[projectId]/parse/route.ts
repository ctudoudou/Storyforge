import { NextResponse } from "next/server";
import { parseProjectScript } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const project = parseProjectScript(params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

