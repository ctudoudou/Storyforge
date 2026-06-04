import { NextResponse } from "next/server.js";

import { assetDetailResponse } from "../../../../../../lib/asset-detail-response.ts";
import { activateAssetVersion } from "../../../../../../lib/db.ts";
import { apiError } from "../../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  { params }: { params: { assetId: string; versionId: string } }
) {
  const detail = activateAssetVersion(params.assetId, params.versionId);
  if (!detail) {
    return apiError("NOT_FOUND", "Asset version not found", 404);
  }

  return NextResponse.json({ detail: assetDetailResponse(detail) });
}
