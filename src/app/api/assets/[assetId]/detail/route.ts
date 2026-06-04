import { NextResponse } from "next/server.js";

import { assetDetailResponse } from "../../../../../lib/asset-detail-response.ts";
import { deleteAsset, getAssetDetail } from "../../../../../lib/db.ts";
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

export async function DELETE(
  _request: Request,
  { params }: { params: { assetId: string } }
) {
  try {
    const result = deleteAsset(params.assetId);
    if (!result) {
      return apiError("NOT_FOUND", "Asset not found", 404);
    }

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof Error && error.message === "Asset is still referenced") {
      return apiError("CONFLICT", "Asset is still referenced by project records", 409);
    }
    return apiError("INTERNAL_ERROR", "Asset deletion failed", 500);
  }
}
