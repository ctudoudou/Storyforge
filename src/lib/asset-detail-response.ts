import { existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";

import { assetDir } from "./db.ts";
import type { AssetDetail } from "./types.ts";

export function assetUrl(relativePath: string) {
  return `/api/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function localAssetFileExists(relativePath: string) {
  const absolutePath = join(assetDir, relativePath);
  const normalizedAssetDir = normalize(assetDir);
  if (!absolutePath.startsWith(normalizedAssetDir + sep)) {
    return false;
  }

  return existsSync(absolutePath) && statSync(absolutePath).isFile();
}

export function assetDetailResponse(detail: Omit<AssetDetail, "assetUrl" | "thumbnailUrl" | "fileExists">): AssetDetail {
  return {
    ...detail,
    assetUrl: assetUrl(detail.asset.relativePath),
    thumbnailUrl: detail.asset.thumbnailPath ? assetUrl(detail.asset.thumbnailPath) : null,
    fileExists: localAssetFileExists(detail.asset.relativePath),
  };
}
