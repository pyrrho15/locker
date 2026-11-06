function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function toId(value: unknown): string {
  return String(value);
}

export function serializeUser(user: {
  _id?: unknown;
  email: string;
  lockerId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}) {
  return {
    id: toId(user._id),
    email: user.email,
    lockerId: user.lockerId == null ? null : toId(user.lockerId),
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
  };
}

export function serializeIdentifier(identifier: {
  _id?: unknown;
  identifier: string;
  credential: string;
}) {
  return {
    id: toId(identifier._id),
    identifier: identifier.identifier,
    credential: identifier.credential,
  };
}

export function serializeLocker(locker: {
  _id?: unknown;
  userId?: unknown;
  identifiers?: Array<{
    _id?: unknown;
    identifier: string;
    credential: string;
  }>;
  createdAt?: unknown;
  updatedAt?: unknown;
}) {
  return {
    id: toId(locker._id),
    userId: locker.userId == null ? null : toId(locker.userId),
    identifiers: (locker.identifiers ?? []).map(serializeIdentifier),
    createdAt: toIso(locker.createdAt),
    updatedAt: toIso(locker.updatedAt),
  };
}

export type SerializedUser = ReturnType<typeof serializeUser>;
export type SerializedIdentifier = ReturnType<typeof serializeIdentifier>;
export type SerializedLocker = ReturnType<typeof serializeLocker>;
