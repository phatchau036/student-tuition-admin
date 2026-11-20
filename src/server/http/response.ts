import { NextResponse } from "next/server";

/**
 * Chuẩn phản hồi API của hệ thống.
 *
 * Mọi route handler nên dùng các helper này để giữ định dạng thống nhất:
 *   { success: true, data?, message? }
 *   { success: false, message }
 */

export interface ApiSuccessOptions<T> {
  data?: T;
  message?: string;
  status?: number;
  headers?: HeadersInit;
}

export function ok<T>(options: ApiSuccessOptions<T> = {}): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(options.data !== undefined ? { data: options.data } : {}),
      ...(options.message ? { message: options.message } : {}),
    },
    {
      status: options.status ?? 200,
      ...(options.headers ? { headers: options.headers } : {}),
    }
  );
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, message }, { status });
}

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;
