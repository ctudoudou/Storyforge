import { NextResponse } from "next/server.js";

import { assetDetailResponse } from "../../../../../lib/asset-detail-response.ts";
import { getAssetDetail } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { assetId: string } }
) {
  const detail = getAssetDetail(params.assetId);
  if (!detail) {
    return apiError("NOT_FOUND", "Asset not found", 404);
  }

  return NextResponse.json({
    detail: assetDetailResponse(detail),
  });
}
