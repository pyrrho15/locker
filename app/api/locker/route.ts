import { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { serializeLocker } from "@/lib/serializers";
import { connectDB } from "@/lib/db";
import Locker from "@/models/Locker";

/**
 * GET /api/locker
 * Returns the authenticated user's locker and all stored identifiers.
 */
export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return fail("Unauthorized", 401);

  try {
    await connectDB();

    const locker = await Locker.findOne({ userId }).lean();
    if (!locker) return fail("Locker not found", 404);

    return ok({ locker: serializeLocker(locker) });
  } catch (error) {
    return handleRouteError(error, "Failed to load locker");
  }
}
