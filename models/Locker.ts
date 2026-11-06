import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import {
  decryptField,
  encryptField,
  isEncrypted,
  type EncryptableField,
} from "../lib/crypto";

/**
 * Setters normally only run on assignment, never on hydration, but guarding
 * here keeps re-assigning an already-encrypted value from producing `enc:`
 * nested inside `enc:`.
 */
function encryptOnce(value: string, field: EncryptableField): string {
  return isEncrypted(value) ? value : encryptField(value, field);
}

/**
 * One social login entry inside a locker. The sub-document keeps its own _id
 * so single entries can be updated/deleted via /api/locker/identifiers/:id.
 *
 * Both fields are encrypted with AES-256-GCM at rest. The getters decrypt on
 * read and the setters encrypt on write, so route handlers always deal with
 * plaintext while MongoDB only ever stores ciphertext.
 *
 * Note: plaintext length checks live in the Zod schemas (lib/validation.ts),
 * because schema validators would otherwise see the longer ciphertext.
 */
const identifierSchema = new Schema(
  {
    identifier: {
      type: String,
      required: [true, "Identifier is required"],
      set: (value: string) => encryptOnce(value, "identifier"),
      get: (value: string) => decryptField(value, "identifier"),
    },
    credential: {
      type: String,
      required: [true, "Credential is required"],
      set: (value: string) => encryptOnce(value, "credential"),
      get: (value: string) => decryptField(value, "credential"),
    },
  },
  {
    _id: true,
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const lockerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User id is required"],
      unique: true,
    },
    identifiers: {
      type: [identifierSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

export type IdentifierType = InferSchemaType<typeof identifierSchema>;
export type IdentifierDocument = HydratedDocument<IdentifierType>;
export type LockerType = InferSchemaType<typeof lockerSchema>;
export type LockerDocument = HydratedDocument<LockerType>;

const Locker =
  (mongoose.models.Locker as Model<LockerType>) ||
  mongoose.model<LockerType>("Locker", lockerSchema);

export default Locker;
