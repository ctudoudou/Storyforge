import { NextResponse } from "next/server.js";

import { linkAssetToProjectRecord } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";
import type { AssetLinkTargetType } from "../../../../../lib/types.ts";

export const runtime = "nodejs";

const targetTypes = new Set<AssetLinkTargetType>(["character", "scene", "timelineClip"]);

function isTargetType(value: unknown): value is AssetLinkTargetType {
  return typeof value === "string" && targetTypes.has(value as AssetLinkTargetType);
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as {
    targetType?: unknown;
    targetId?: unknown;
    assetId?: unknown;
  };

  if (!isTargetType(body.targetType)) {
    return apiError("BAD_REQUEST", "targetType must be character, scene, or timelineClip", 400);
  }

  if (typeof body.targetId !== "string" || !body.targetId.trim()) {
    return apiError("BAD_REQUEST", "targetId is required", 400);
  }

  if (body.assetId !== null && typeof body.assetId !== "string") {
    return apiError("BAD_REQUEST", "assetId must be a string or null", 400);
  }

  try {
    const project = linkAssetToProjectRecord({
      projectId: params.projectId,
      targetType: body.targetType,
      targetId: body.targetId,
      assetId: body.assetId,
    });

    if (!project) {
      return apiError("NOT_FOUND", "Project or target record not found", 404);
    }

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof Error && error.message === "Asset not found") {
      return apiError("BAD_REQUEST", "Asset not found", 400);
    }
    if (error instanceof Error && error.message === "Asset type is not compatible") {
      return apiError("BAD_REQUEST", "Asset type is not compatible", 400);
    }
    return apiError("INTERNAL_ERROR", "Asset link update failed", 500);
  }
}
