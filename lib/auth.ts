import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE,
  getTokenFromRequest,
  verifyAuthToken,
} from "@/lib/token";

const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Defence in depth: the proxy already rejects unauthenticated requests to
 * protected paths, but every handler verifies the token again.
 */
export async function requireUserId(req: NextRequest): Promise<string | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyAuthToken(token);
}

/**
 * Server Component variant: reads the httpOnly cookie from the incoming
 * request. Use this in pages/layouts, never in client components.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}
