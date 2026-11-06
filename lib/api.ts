import mongoose from "mongoose";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data },
    { status, headers: NO_STORE_HEADERS }
  );
}

export function fail(
  error: string,
  status = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { success: false, error, ...(details === undefined ? {} : { details }) },
    { status, headers: NO_STORE_HEADERS }
  );
}

export function zodFail(error: ZodError): NextResponse {
  return fail(
    "Validation failed",
    422,
    error.issues.map((issue) => ({
      field: issue.path.join(".") || "(body)",
      message: issue.message,
    }))
  );
}

/** Returns undefined when the request body is not valid JSON. */
export async function readJson(req: Request): Promise<unknown | undefined> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export function handleRouteError(error: unknown, fallback: string) {
  if (error instanceof mongoose.Error.ValidationError) {
    return fail(error.message, 400);
  }

  if (error instanceof mongoose.Error.CastError) {
    return fail(`Invalid ${error.path}`, 400);
  }

  if (isDuplicateKeyError(error)) {
    return fail("A record with that value already exists", 409);
  }

  console.error(error);
  return fail(fallback, 500);
}
