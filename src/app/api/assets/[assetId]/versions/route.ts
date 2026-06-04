import { isAbsolute, normalize, sep } from "node:path";
import { NextResponse } from "next/server.js";

import { assetDetailResponse } from "../../../../../lib/asset-detail-response.ts";
import { addAssetVersion } from "../../../../../lib/db.ts";
import { apiError } from "../../../../../lib/next-api-response.ts";
import type { AssetVersionRecord } from "../../../../../lib/types.ts";

export const runtime = "nodejs";

const versionSources = new Set<AssetVersionRecord["source"]>(["import", "regeneration", "manual"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeRelativePath(value: string) {
  const normalized = normalize(value);
  return !isAbsolute(value) && normalized !== ".." && !normalized.startsWith(`..${sep}`);
}

export async function POST(
  request: Request,
  { params }: { params: { assetId: string } }
) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    relativePath?: unknown;
    mimeType?: unknown;
    sizeBytes?: unknown;
    source?: unknown;
    provider?: unknown;
    model?: unknown;
    prompt?: unknown;
    parameters?: unknown;
    parentVersionId?: unknown;
    makeActive?: unknown;
  };

  if (typeof body.name !== "string" || !body.name.trim()) {
    return apiError("BAD_REQUEST", "name is required", 400);
  }

  if (typeof body.relativePath !== "string" || !body.relativePath.trim()) {
    return apiError("BAD_REQUEST", "relativePath is required", 400);
  }
  if (!isSafeRelativePath(body.relativePath.trim())) {
    return apiError("BAD_REQUEST", "relativePath must stay inside the local asset directory", 400);
  }

  if (body.mimeType !== undefined && body.mimeType !== null && typeof body.mimeType !== "string") {
    return apiError("BAD_REQUEST", "mimeType must be a string or null", 400);
  }

  if (body.sizeBytes !== undefined && (typeof body.sizeBytes !== "number" || body.sizeBytes < 0)) {
    return apiError("BAD_REQUEST", "sizeBytes must be a non-negative number", 400);
  }

  if (body.source !== undefined && (!versionSources.has(body.source as AssetVersionRecord["source"]))) {
    return apiError("BAD_REQUEST", "source must be import, regeneration, or manual", 400);
  }

  if (body.parameters !== undefined && body.parameters !== null && !isPlainObject(body.parameters)) {
    return apiError("BAD_REQUEST", "parameters must be an object or null", 400);
  }

  const detail = addAssetVersion({
    assetId: params.assetId,
    name: body.name.trim(),
    relativePath: body.relativePath.trim(),
    mimeType: typeof body.mimeType === "string" ? body.mimeType : null,
    sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : 0,
    source: body.source as AssetVersionRecord["source"] | undefined,
    provider: typeof body.provider === "string" ? body.provider : null,
    model: typeof body.model === "string" ? body.model : null,
    prompt: typeof body.prompt === "string" ? body.prompt : null,
    parameters: isPlainObject(body.parameters) ? body.parameters : null,
    parentVersionId: typeof body.parentVersionId === "string" ? body.parentVersionId : null,
    makeActive: typeof body.makeActive === "boolean" ? body.makeActive : true,
  });

  if (!detail) {
    return apiError("NOT_FOUND", "Asset not found", 404);
  }

  return NextResponse.json({ detail: assetDetailResponse(detail) }, { status: 201 });
}
