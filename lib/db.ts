import mongoose from "mongoose";

declare global {
  // Reuse a single connection across Next.js hot reloads / serverless invocations.
  var mongooseCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cached = (global.mongooseCache ??= { conn: null, promise: null });

/**
 * The URI may or may not include a database name. If it does not (common with
 * Atlas URIs that end in `mongodb.net/?retryWrites=true...`), fall back to
 * MONGODB_DB or "locker" instead of silently writing to the `test` database.
 */
function resolveDbName(uri: string): string | undefined {
  try {
    const path = new URL(uri).pathname.replace(/^\//, "");
    if (path) return undefined;
  } catch {
    // Let the driver surface malformed URI errors.
  }
  return process.env.MONGODB_DB || "locker";
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please define MONGODB_URI in .env (a MongoDB connection string)."
    );
  }

  const dbName = resolveDbName(uri);

  cached.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
    ...(dbName ? { dbName } : {}),
  });

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Allow a later request to retry instead of caching a rejected promise.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
