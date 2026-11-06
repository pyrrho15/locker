import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Never selected by default; login explicitly asks for it.
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    // Circular by design: USER.lockerID <-> LOCKER.userId.
    lockerId: {
      type: Schema.Types.ObjectId,
      ref: "Locker",
      required: [true, "Locker id is required"],
      unique: true,
    },
  },
  { timestamps: true }
);

// Belt and braces: even if a document is serialized directly, drop the hash.
userSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.password;
    return ret;
  },
});

export type UserType = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserType>;

const User =
  (mongoose.models.User as Model<UserType>) ||
  mongoose.model<UserType>("User", userSchema);

export default User;
