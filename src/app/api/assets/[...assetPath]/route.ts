import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server.js";
import { assetDir } from "../../../../lib/db.ts";
import { apiError } from "../../../../lib/next-api-response.ts";

export const runtime = "nodejs";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
};

function getMimeType(path: string) {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  return mimeTypes[extension] ?? "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: { assetPath: string[] } }
) {
  const relativePath = normalize(params.assetPath.join(sep));
  const absolutePath = join(assetDir, relativePath);
  const normalizedAssetDir = normalize(assetDir);

  if (!absolutePath.startsWith(normalizedAssetDir + sep) || !existsSync(absolutePath)) {
    return apiError("NOT_FOUND", "Asset not found", 404);
  }

  const stats = statSync(absolutePath);
  if (!stats.isFile()) {
    return apiError("NOT_FOUND", "Asset not found", 404);
  }

  const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": getMimeType(absolutePath),
      "Content-Length": String(stats.size),
    },
  });
}
