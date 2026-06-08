import { NextResponse } from "next/server.js";

import { apiError } from "../../../lib/next-api-response.ts";
import {
  readRuntimeProviderConfigState,
  saveRuntimeProviderConfig,
  type ProviderConfigState,
} from "../../../lib/provider-config.ts";
import type { RuntimeProviderConfig } from "../../../agents/provider-runtime.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(readRuntimeProviderConfigState());
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Provider config is invalid",
      400
    );
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { config?: RuntimeProviderConfig } | null;
  if (!body?.config || typeof body.config !== "object") {
    return apiError("BAD_REQUEST", "config must be an object", 400);
  }

  try {
    const state: ProviderConfigState = saveRuntimeProviderConfig(body.config);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider config save failed";
    const status = message.includes("STORYFORGE_PROVIDER_CONFIG is active") ? 409 : 400;
    return apiError(status === 409 ? "CONFLICT" : "BAD_REQUEST", message, status);
  }
}
