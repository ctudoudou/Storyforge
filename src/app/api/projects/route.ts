import { NextResponse } from "next/server.js";
import { createProject, listProjects } from "../../../lib/db.ts";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { title?: string; script?: string };
  const project = createProject({
    title: body.title,
    script: body.script,
  });

  return NextResponse.json({ project }, { status: 201 });
}
