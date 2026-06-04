import { NextResponse } from "next/server.js";

import { AssemblyManifestError, createAssemblyManifest } from "../../../../../lib/assembly-manifest.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const manifest = createAssemblyManifest(params.projectId);
    if (!manifest) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    return NextResponse.json({ manifest });
  } catch (error) {
    if (error instanceof AssemblyManifestError) {
      return apiError("CONFLICT", error.message, 409);
    }

    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Assembly manifest generation failed",
      500
    );
  }
}
