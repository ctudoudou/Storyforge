import { existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { NextResponse } from "next/server.js";

import { assetDir, getAssetDetail } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

function assetUrl(relativePath: string) {
  return `/api/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function localAssetFileExists(relativePath: string) {
  const absolutePath = join(assetDir, relativePath);
  const normalizedAssetDir = normalize(assetDir);
  if (!absolutePath.startsWith(normalizedAssetDir + sep)) {
    return false;
  }

  return existsSync(absolutePath) && statSync(absolutePath).isFile();
}

export async function GET(
  _request: Request,
  { params }: { params: { assetId: string } }
) {
  const detail = getAssetDetail(params.assetId);
  if (!detail) {
    return apiError("NOT_FOUND", "Asset not found", 404);
  }

  return NextResponse.json({
    detail: {
      ...detail,
      assetUrl: assetUrl(detail.asset.relativePath),
      fileExists: localAssetFileExists(detail.asset.relativePath),
    },
  });
}
