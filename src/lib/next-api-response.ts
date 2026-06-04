import { NextResponse } from "next/server.js";

import { errorBody, type ApiErrorCode } from "./api-response.ts";

export function apiError(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json(errorBody(code, message), { status });
}
