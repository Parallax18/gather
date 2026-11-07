import { db } from "./db.js"
import { hashPassword, verifyPassword } from "./passwords.js"
import { isUniqueConstraintError } from "./sqlite.js"

export interface Organizer {
  id: number
  name: string
  email: string
}

interface OrganizerRow extends Organizer {
  password_hash: string
}

export interface SignupInput {
  name: string
  email: string
  password: string
}

export type SignupResult =
  | { ok: true; organizer: Organizer }
  | { ok: false; reason: "email_taken" }

const findByIdQuery = db.prepare(
  "SELECT id, name, email, password_hash FROM organizers WHERE id = ?",
)
const findByEmailQuery = db.prepare(
  "SELECT id, name, email, password_hash FROM organizers WHERE email = ?",
)
const insertOrganizerQuery = db.prepare(
  "INSERT INTO organizers (name, email, password_hash) VALUES (?, ?, ?)",
)

function toOrganizer(row: OrganizerRow): Organizer {
  return { id: row.id, name: row.name, email: row.email }
}

export function findOrganizerById(id: number): Organizer | null {
  const row = findByIdQuery.get(id) as OrganizerRow | undefined
  return row ? toOrganizer(row) : null
}

export function createOrganizer(input: SignupInput): SignupResult {
  try {
    const info = insertOrganizerQuery.run(
      input.name,
      input.email,
      hashPassword(input.password),
    )
    const organizer = findOrganizerById(Number(info.lastInsertRowid))
    if (!organizer) throw new Error("Organizer was inserted but could not be read back.")
    return { ok: true, organizer }
  } catch (error) {
    if (isUniqueConstraintError(error)) return { ok: false, reason: "email_taken" }
    throw error
  }
}

/**
 * Returns the organizer only when the email exists and the password matches.
 * Unknown emails and wrong passwords intentionally share the same result.
 */
export function verifyOrganizerCredentials(
  email: string,
  password: string,
): Organizer | null {
  const row = findByEmailQuery.get(email) as OrganizerRow | undefined
  if (!row) return null
  if (!verifyPassword(password, row.password_hash)) return null
  return toOrganizer(row)
}
