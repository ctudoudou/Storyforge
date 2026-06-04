import { NextResponse } from "next/server";

import { errorBody, type ApiErrorCode } from "./api-response";

export function apiError(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json(errorBody(code, message), { status });
}
