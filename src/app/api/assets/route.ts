import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { NextResponse } from "next/server.js";
import { assetDir, listAssets, registerAsset } from "../../../lib/db.ts";
import { apiError } from "../../../lib/next-api-response.ts";
import type { AssetRecord } from "../../../lib/types.ts";

export const runtime = "nodejs";

const maxUploadBytes = 50 * 1024 * 1024;

const allowedMimeTypes = new Map<string, AssetRecord["type"]>([
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["image/gif", "image"],
  ["audio/mpeg", "audio"],
  ["audio/wav", "audio"],
  ["audio/x-wav", "audio"],
  ["video/mp4", "video"],
  ["video/webm", "video"],
]);

const allowedExtensions = new Map<string, AssetRecord["type"]>([
  [".jpg", "image"],
  [".jpeg", "image"],
  [".png", "image"],
  [".webp", "image"],
  [".gif", "image"],
  [".mp3", "audio"],
  [".wav", "audio"],
  [".mp4", "video"],
  [".webm", "video"],
]);

function safeFileName(name: string) {
  const cleaned = basename(name).replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
  return cleaned || "asset";
}

function detectAssetType(file: File) {
  const extension = extname(file.name).toLowerCase();
  const typeFromMime = allowedMimeTypes.get(file.type);
  const typeFromExtension = allowedExtensions.get(extension);
  return typeFromMime ?? typeFromExtension ?? null;
}

export async function GET() {
  return NextResponse.json({ assets: listAssets() });
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return apiError("BAD_REQUEST", "file is required", 400);
  }

  const assetType = detectAssetType(file);
  if (!assetType) {
    return apiError("BAD_REQUEST", "unsupported file type", 400);
  }

  if (file.size <= 0) {
    return apiError("BAD_REQUEST", "file cannot be empty", 400);
  }

  if (file.size > maxUploadBytes) {
    return apiError("BAD_REQUEST", "file exceeds 50MB limit", 400);
  }

  const importsDir = join(assetDir, "imports");
  await mkdir(importsDir, { recursive: true });

  const originalName = safeFileName(file.name);
  const extension = extname(originalName);
  const stem = extension ? originalName.slice(0, -extension.length) : originalName;
  const storedName = `${Date.now()}-${randomUUID().replaceAll("-", "")}-${stem}${extension}`;
  const relativePath = `imports/${storedName}`;
  const absolutePath = join(importsDir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  const asset = registerAsset({
    type: assetType,
    name: originalName,
    relativePath,
    mimeType: file.type || null,
    sizeBytes: file.size,
  });

  return NextResponse.json({ asset }, { status: 201 });
}
