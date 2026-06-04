import { NextResponse } from "next/server.js";
import { listAssets } from "../../../lib/db.ts";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ assets: listAssets() });
}
