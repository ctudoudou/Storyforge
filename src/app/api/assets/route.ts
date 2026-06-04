import { NextResponse } from "next/server";
import { listAssets } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ assets: listAssets() });
}

