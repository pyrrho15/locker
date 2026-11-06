import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, getTokenFromRequest, verifyAuthToken } from "@/lib/token";

const PROTECTED_API_PATHS = [/^\/api\/locker(?:\/|$)/, /^\/api\/auth\/me$/];
const PROTECTED_PAGE_PATHS = [/^\/dashboard(?:\/|$)/];
const GUEST_ONLY_PAGES = [/^\/login$/, /^\/register$/];

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
 * Edge-of-the-app auth check. It only verifies the JWT (no DB access):
 * - API routes get a 401.
 * - Pages get redirected to /login.
 * - Signed-in users are kept away from /login and /register.
 *
 * Route handlers and Server Components verify the session again, so this is an
 * early rejection layer rather than the only line of defence.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDashboard = PROTECTED_PAGE_PATHS.some((pattern) =>
    pattern.test(pathname)
  );
  const isGuestPage = GUEST_ONLY_PAGES.some((pattern) => pattern.test(pathname));
  const isProtectedApi = PROTECTED_API_PATHS.some((pattern) =>
    pattern.test(pathname)
  );

  if (!isDashboard && !isGuestPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(req);

  if (isGuestPage) {
    if (!token) return NextResponse.next();
    const userId = await verifyAuthToken(token);
    if (userId) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return isDashboard
      ? NextResponse.redirect(new URL("/login", req.url))
      : unauthorized();
  }

  const userId = await verifyAuthToken(token);
  if (!userId) {
    return isDashboard
      ? expiredCookie(NextResponse.redirect(new URL("/login", req.url)))
      : expiredCookie(unauthorized());
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", userId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/api/locker/:path*",
    "/api/auth/me",
  ],
};
