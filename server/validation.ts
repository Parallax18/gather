import { z } from "zod"

const emailField = z
  .string({ required_error: "Enter your email." })
  .trim()
  .toLowerCase()
  .max(200, "Email must be 200 characters or fewer.")
  .email("Enter a valid email address.")

export const eventSchema = z.object({
  title: z
    .string({ required_error: "Enter a title." })
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(120, "Title must be 120 characters or fewer."),
  description: z
    .string({ required_error: "Enter a description." })
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(2000, "Description must be 2000 characters or fewer."),
  date: z
    .string({ required_error: "Choose a date and time." })
    .trim()
    .refine((value) => Number.isFinite(Date.parse(value)), "Enter a valid date and time."),
  location: z
    .string({ required_error: "Enter a location." })
    .trim()
    .min(2, "Location must be at least 2 characters.")
    .max(160, "Location must be 160 characters or fewer."),
  capacity: z.coerce
    .number({ invalid_type_error: "Enter a capacity." })
    .int("Capacity must be a whole number.")
    .min(1, "Capacity must be at least 1.")
    .max(10000, "Capacity must be 10,000 or fewer."),
})

export const registrationSchema = z.object({
  name: z
    .string({ required_error: "Enter your name." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  email: emailField,
})

export const signupSchema = z.object({
  name: z
    .string({ required_error: "Enter your name." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  email: emailField,
  password: z
    .string({ required_error: "Choose a password." })
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password must be 200 characters or fewer."),
})

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ required_error: "Enter your password." })
    .min(1, "Enter your password."),
})

export type EventInput = z.infer<typeof eventSchema>
export type RegistrationInput = z.infer<typeof registrationSchema>

export type FieldErrors = Record<string, string>

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields: FieldErrors }

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): ParseResult<T> {
  const result = schema.safeParse(body)
  if (result.success) return { ok: true, data: result.data }

  const fields: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !(key in fields)) {
      fields[key] = issue.message
    }
  }

  return { ok: false, message: "Please check the highlighted fields.", fields }
}
