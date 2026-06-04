import { NextResponse } from "next/server";
import { updateScript } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as { content?: unknown };
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

  const project = updateScript(params.projectId, body.content);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

