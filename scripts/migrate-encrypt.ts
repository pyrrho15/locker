import mongoose from "mongoose";
import { connectDB } from "../lib/db.ts";
import {
  encryptField,
  isEncrypted,
  type EncryptableField,
} from "../lib/crypto.ts";

const FIELDS: EncryptableField[] = ["identifier", "credential"];

/**
 * One-off migration for rows created before field-level encryption existed.
 * Safe to run multiple times: already-encrypted values are left untouched.
 *
 * Usage:
 *   npm run migrate:encrypt
 */
async function main() {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  const lockers = db.collection("lockers");

  let scanned = 0;
  let updated = 0;
  let encryptedFields = 0;
  let skippedFields = 0;

  for await (const locker of lockers.find({})) {
    scanned += 1;

    const identifiers = Array.isArray(locker.identifiers)
      ? (locker.identifiers as Record<string, unknown>[])
      : [];

    let changed = false;

    const nextIdentifiers = identifiers.map((entry: Record<string, unknown>) => {
      const next = { ...entry };

      for (const field of FIELDS) {
        const value = next[field];

        if (typeof value !== "string") {
          skippedFields += 1;
          continue;
        }

        if (isEncrypted(value)) continue;

        next[field] = encryptField(value, field);
        changed = true;
        encryptedFields += 1;
      }

      return next;
    });

    if (changed) {
      await lockers.updateOne(
        { _id: locker._id },
        { $set: { identifiers: nextIdentifiers } }
      );
      updated += 1;
    }
  }

  console.log(
    `Scanned ${scanned} locker(s); encrypted ${encryptedFields} field(s) in ${updated} locker(s).` +
      (skippedFields > 0 ? ` Skipped ${skippedFields} non-string field(s).` : "")
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
