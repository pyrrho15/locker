import { ok } from "@/lib/api";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/token";

/** POST /api/auth/logout - clears the session cookie. */
export async function POST() {
  const response = ok({ message: "Logged out" });
  response.cookies.set(AUTH_COOKIE, "", {
    ...authCookieOptions(),
    maxAge: 0,
  });
  return response;
}
