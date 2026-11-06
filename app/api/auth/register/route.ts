import mongoose from "mongoose";
import { NextRequest } from "next/server";
import {
  fail,
  handleRouteError,
  isDuplicateKeyError,
  ok,
  readJson,
  zodFail,
} from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { serializeUser } from "@/lib/serializers";
import { AUTH_COOKIE, authCookieOptions, signAuthToken } from "@/lib/token";
import { registerSchema } from "@/lib/validation";
import { connectDB } from "@/lib/db";
import Locker from "@/models/Locker";
import User from "@/models/User";

/**
 * POST /api/auth/register
 * Body: { "email": "user@example.com", "password": "secret123" }
 *
 * Creates the USER and its LOCKER. The user _id is generated up-front so both
 * documents can reference each other immediately (no second update needed).
 */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  if (body === undefined) return fail("Request body must be valid JSON", 400);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const { email, password } = parsed.data;

  try {
    await connectDB();

    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) return fail("Email is already registered", 409);

    const passwordHash = await hashPassword(password);
    const userId = new mongoose.Types.ObjectId();

    const locker = await Locker.create({ userId });

    // Roll the locker back if the user insert fails (e.g. duplicate email race).
    const user = await User.create({
      _id: userId,
      email,
      password: passwordHash,
      lockerId: locker._id,
    }).catch(async (error: unknown) => {
      await Locker.deleteOne({ _id: locker._id }).catch(() => undefined);
      throw error;
    });

    const token = await signAuthToken(String(user._id));
    const response = ok({ user: serializeUser(user), token }, 201);
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return response;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return fail("Email is already registered", 409);
    }
    return handleRouteError(error, "Failed to register user");
  }
}
