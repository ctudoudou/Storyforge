import { NextResponse } from "next/server.js";
import { parseProjectScript } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";
import type { ProjectDetail, ScriptParseWarning } from "../../../../../lib/types.ts";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const project = parseProjectScript(params.projectId);
    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    const { parseWarnings = [], ...projectBody } = project as ProjectDetail & { parseWarnings?: ScriptParseWarning[] };
    return NextResponse.json({ project: projectBody, warnings: parseWarnings });
  } catch (error) {
    return apiError(
      "PARSE_FAILED",
      error instanceof Error ? error.message : "Script parser failed",
      422
    );
  }
}
