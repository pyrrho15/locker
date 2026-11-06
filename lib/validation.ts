import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Invalid email address");

export const registerSchema = z
  .object({
    // bcrypt only uses the first 72 bytes of a password.
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required").max(72),
  })
  .strict();

export const identifierCreateSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, "Identifier is required")
      .max(200, "Identifier is too long"),
    // Preserve whitespace exactly; the model encrypts the value on write.
    credential: z
      .string()
      .min(1, "Credential is required")
      .max(1024, "Credential is too long"),
  })
  .strict();

export const identifierUpdateSchema = identifierCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type IdentifierCreateInput = z.infer<typeof identifierCreateSchema>;
export type IdentifierUpdateInput = z.infer<typeof identifierUpdateSchema>;
