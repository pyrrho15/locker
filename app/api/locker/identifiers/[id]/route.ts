import mongoose from "mongoose";
import { NextRequest } from "next/server";
import {
  fail,
  handleRouteError,
  ok,
  readJson,
  zodFail,
} from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { serializeIdentifier } from "@/lib/serializers";
import { connectDB } from "@/lib/db";
import Locker from "@/models/Locker";
import { identifierUpdateSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/locker/identifiers/:id - fetch a single identifier. */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const userId = await requireUserId(req);
  if (!userId) return fail("Unauthorized", 401);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return fail("Invalid identifier id", 400);
  }

  try {
    await connectDB();

    // Hydrated documents are required so subdocument getters decrypt the data.
    const locker = await Locker.findOne({ userId }).select("identifiers");
    const identifier = locker?.identifiers.find(
      (entry) => String(entry._id) === id
    );
    if (!identifier) return fail("Identifier not found", 404);

    return ok({ identifier: serializeIdentifier(identifier) });
  } catch (error) {
    return handleRouteError(error, "Failed to load identifier");
  }
}

/**
 * PATCH /api/locker/identifiers/:id
 * Body: { "identifier"?: "...", "credential"?: "..." } (at least one field)
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const userId = await requireUserId(req);
  if (!userId) return fail("Unauthorized", 401);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return fail("Invalid identifier id", 400);
  }

  const body = await readJson(req);
  if (body === undefined) return fail("Request body must be valid JSON", 400);

  const parsed = identifierUpdateSchema.safeParse(body);
  if (!parsed.success) return zodFail(parsed.error);

  try {
    await connectDB();

    const locker = await Locker.findOne({ userId });
    if (!locker) return fail("Locker not found", 404);

    const entry = locker.identifiers.id(id);
    if (!entry) return fail("Identifier not found", 404);

    if (parsed.data.identifier !== undefined) {
      const nextIdentifier = parsed.data.identifier;
      const duplicate = locker.identifiers.some(
        (other) =>
          String(other._id) !== id &&
          other.identifier.toLowerCase() === nextIdentifier.toLowerCase()
      );
      if (duplicate) {
        return fail("That identifier already exists in this locker", 409);
      }
      entry.identifier = nextIdentifier;
    }

    if (parsed.data.credential !== undefined) {
      entry.credential = parsed.data.credential;
    }

    await locker.save();
    return ok({ identifier: serializeIdentifier(entry) });
  } catch (error) {
    return handleRouteError(error, "Failed to update identifier");
  }
}

/** DELETE /api/locker/identifiers/:id - remove a single identifier. */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const userId = await requireUserId(req);
  if (!userId) return fail("Unauthorized", 401);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return fail("Invalid identifier id", 400);
  }

  try {
    await connectDB();

    const result = await Locker.updateOne(
      { userId, "identifiers._id": id },
      { $pull: { identifiers: { _id: id } } }
    );

    if (result.matchedCount === 0) {
      return fail("Identifier not found", 404);
    }

    return ok({ message: "Identifier deleted", id });
  } catch (error) {
    return handleRouteError(error, "Failed to delete identifier");
  }
}
