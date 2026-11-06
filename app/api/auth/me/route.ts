import { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { serializeUser } from "@/lib/serializers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/** GET /api/auth/me - returns the authenticated user (no password hash). */
export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return fail("Unauthorized", 401);

  try {
    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) return fail("User not found", 404);

    return ok({ user: serializeUser(user) });
  } catch (error) {
    return handleRouteError(error, "Failed to load user");
  }
}
