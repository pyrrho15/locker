import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const AUTH_COOKIE = "locker_token";
export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Please define AUTH_SECRET in .env.local (use `openssl rand -hex 32`)."
    );
  }
  return new TextEncoder().encode(secret);
}

/** Sign a short-lived JWT whose subject is the user's Mongo _id. */
export async function signAuthToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${AUTH_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** Returns the user id for a valid token, or null for missing/invalid/expired tokens. */
export async function verifyAuthToken(token: string): Promise<string | null> {
  const secret = getSecret();
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Accepts either the httpOnly cookie (browser) or
 * `Authorization: Bearer <token>` (Postman / API clients).
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return req.cookies.get(AUTH_COOKIE)?.value ?? null;
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS,
  };
}
