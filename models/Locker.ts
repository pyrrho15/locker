import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

/**
 * One social login entry inside a locker. The sub-document keeps its own _id
 * so single credentials can be updated/deleted via /api/locker/identifiers/:id.
 * Credentials are intentionally stored unencrypted in phase one.
 */
const identifierSchema = new Schema(
  {
    identifier: {
      type: String,
      required: [true, "Identifier is required"],
      trim: true,
      maxlength: 200,
    },
    credential: {
      type: String,
      required: [true, "Credential is required"],
    },
  },
  { _id: true, versionKey: false }
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
  { timestamps: true }
);

export type IdentifierType = InferSchemaType<typeof identifierSchema>;
export type IdentifierDocument = HydratedDocument<IdentifierType>;
export type LockerType = InferSchemaType<typeof lockerSchema>;
export type LockerDocument = HydratedDocument<LockerType>;

const Locker =
  (mongoose.models.Locker as Model<LockerType>) ||
  mongoose.model<LockerType>("Locker", lockerSchema);

export default Locker;
