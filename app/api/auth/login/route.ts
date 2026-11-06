import { NextRequest } from "next/server";
import { fail, handleRouteError, ok, readJson, zodFail } from "@/lib/api";
import { verifyPassword } from "@/lib/auth";
import { serializeUser } from "@/lib/serializers";
import { AUTH_COOKIE, authCookieOptions, signAuthToken } from "@/lib/token";
import { loginSchema } from "@/lib/validation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/**
 * POST /api/auth/login
 * Body: { "email": "user@example.com", "password": "secret123" }
 * Sets an httpOnly cookie and also returns the token for API clients/Postman..
 */


export async function POST(req: NextRequest) {
  const body = await readJson(req);
  if (body === undefined) return fail("Request body must be valid JSON", 400);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const { email, password } = parsed.data;

  try {
    await connectDB();

    // password has select:false, so ask for it explicitly.
    const user = await User.findOne({ email }).select("+password");
    if (!user?.password) {
      return fail("Invalid email or password", 401);
    }

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
      return fail("Invalid email or password", 401);
    }

    const token = await signAuthToken(String(user._id));
    const response = ok({ user: serializeUser(user), token });
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return response;
  } catch (error) {
    return handleRouteError(error, "Failed to log in");
  }
}
