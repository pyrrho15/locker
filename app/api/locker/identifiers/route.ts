import { NextRequest } from "next/server";
import {
  fail,
  handleRouteError,
  ok,
  readJson,
  zodFail,
} from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { serializeIdentifier, serializeLocker } from "@/lib/serializers";
import { connectDB } from "@/lib/db";
import Locker from "@/models/Locker";
import { identifierCreateSchema } from "@/lib/validation";

/** GET /api/locker/identifiers - list the authenticated user's credentials. */
export async function GET(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return fail("Unauthorized", 401);

  try {
    await connectDB();

    // Hydrated documents are required so subdocument getters decrypt the data.
    const locker = await Locker.findOne({ userId }).select(
      "identifiers createdAt updatedAt"
    );
    if (!locker) return fail("Locker not found", 404);

    const { identifiers } = serializeLocker(locker);

    return ok({ count: identifiers.length, identifiers });
  } catch (error) {
    return handleRouteError(error, "Failed to load identifiers");
  }
}

/**
 * POST /api/locker/identifiers
 * Body: { "identifier": "instagram:johndoe", "credential": "hunter2" }
 * Both fields are encrypted at rest by the Locker model.
 */
export async function POST(req: NextRequest) {
  const userId = await requireUserId(req);
  if (!userId) return fail("Unauthorized", 401);

  const body = await readJson(req);
  if (body === undefined) return fail("Request body must be valid JSON", 400);

  const parsed = identifierCreateSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  const { identifier, credential } = parsed.data;

  try {
    await connectDB();

    const locker = await Locker.findOne({ userId });
    if (!locker) return fail("Locker not found", 404);

    // Each locker may hold a given social id only once (case-insensitive).
    const duplicate = locker.identifiers.some(
      (entry) => entry.identifier.toLowerCase() === identifier.toLowerCase()
    );
    if (duplicate) {
      return fail("That identifier already exists in this locker", 409);
    }

    locker.identifiers.push({ identifier, credential });
    await locker.save();

    const created = locker.identifiers[locker.identifiers.length - 1];
    return ok({ identifier: serializeIdentifier(created) }, 201);
  } catch (error) {
    return handleRouteError(error, "Failed to add identifier");
  }
}
