import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Field-level encryption for locker data.
 *
 * - AES-256-GCM (confidentiality + integrity).
 * - A fresh random 12-byte IV for every value.
 * - The field name is bound as AAD, so a ciphertext cannot be moved from
 *   `identifier` to `credential` (or vice versa) without failing decryption.
 * - Stored format: `enc:v1:<iv b64>:<auth tag b64>:<ciphertext b64>`
 *
 * The key lives in CREDENTIALS_ENCRYPTION_KEY (64 hex chars = 32 bytes) and
 * must never be committed. Losing the key means losing the encrypted data.
 */

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const PREFIX = `enc:${VERSION}:`;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export type EncryptableField = "identifier" | "credential";

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Please define CREDENTIALS_ENCRYPTION_KEY in .env.local (openssl rand -hex 32)."
    );
  }

  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (key.length !== KEY_BYTES) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters or base64-encoded 32 bytes."
    );
  }

  return key;
}

function getAad(field: EncryptableField): Buffer {
  return Buffer.from(`locker:${VERSION}:${field}`, "utf8");
}

export function isEncrypted(value: string): boolean {
  if (!value.startsWith(PREFIX)) return false;

  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) return false;

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");

  return iv.length === IV_BYTES && authTag.length === AUTH_TAG_BYTES;
}

export function encryptField(
  plaintext: string,
  field: EncryptableField
): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_BYTES,
  });

  cipher.setAAD(getAad(field));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}:${authTag.toString(
    "base64"
  )}:${ciphertext.toString("base64")}`;
}

export function decryptField(
  storedValue: string,
  field: EncryptableField
): string {
  // Backwards compatibility for rows written before encryption was enabled.
  // `npm run migrate:encrypt` rewrites them in place.
  if (!isEncrypted(storedValue)) return storedValue;

  const payload = storedValue.slice(PREFIX.length);
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Stored encrypted value has an invalid format");
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;

  try {
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");

    if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
      throw new Error("Invalid IV or authentication tag");
    }

    const decipher = createDecipheriv(ALGORITHM, getKey(), iv, {
      authTagLength: AUTH_TAG_BYTES,
    });
    decipher.setAAD(getAad(field));
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch {
    // Do not leak key/ciphertext details to callers or logs.
    throw new Error("Unable to decrypt stored locker data");
  }
}
