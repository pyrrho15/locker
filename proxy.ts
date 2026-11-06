import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, getTokenFromRequest, verifyAuthToken } from "@/lib/token";

const PROTECTED_API_PATHS = [/^\/api\/locker(?:\/|$)/, /^\/api\/auth\/me$/];

function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

function expiredCookie(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

/**
 * Edge-of-the-app auth check for the JSON API. It only verifies the JWT (no DB
 * access) and attaches `x-user-id` for the route handler.
 *
 * The single page at `/` decides between the auth panel and the locker by
 * reading the session itself, so it is intentionally not intercepted here.
 * Route handlers and Server Components verify the session again, so this is an
 * early rejection layer rather than the only line of defence.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtectedApi = PROTECTED_API_PATHS.some((pattern) =>
    pattern.test(pathname)
  );

  if (!isProtectedApi) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(req);

  if (!token) {
    return unauthorized();
  }

  const userId = await verifyAuthToken(token);
  if (!userId) {
    return expiredCookie(unauthorized());
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", userId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/api/locker/:path*", "/api/auth/me"],
};
