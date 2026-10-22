import { NextResponse } from "next/server";

/**
 * Consistent API response format for all REST endpoints.
 *
 * Success: { success: true, data: T, meta?: PaginationMeta }
 * Error:   { success: false, error: { code: string, message: string, details?: unknown } }
 */

// ---- Types ----

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---- Helpers ----

/**
 * Return a successful JSON response.
 */
export function apiSuccess<T>(
  data: T,
  meta?: PaginationMeta,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data, meta }, { status });
}

/**
 * Return an error JSON response.
 */
export function apiError(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, data: null, error: { code, message, details } },
    { status }
  );
}

// ---- Common Error Codes ----

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

// ---- Pagination Helper ----

/**
 * Parse pagination query params with safe defaults.
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10))
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
