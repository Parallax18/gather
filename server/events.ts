import { db, type EventRow, type RegistrationRow } from "./db.js"
import { isUniqueConstraintError } from "./sqlite.js"

export interface EventWithSeats extends EventRow {
  registered: number
  seatsRemaining: number
  isPast: boolean
}

export interface EventInput {
  title: string
  description: string
  date: string
  location: string
  capacity: number
}

const selectWithCount = `
  SELECT e.*,
         (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registered
  FROM events e
`

const listAllQuery = db.prepare(`${selectWithCount} ORDER BY e.date ASC`)
const listUpcomingQuery = db.prepare(`${selectWithCount} WHERE e.date >= ? ORDER BY e.date ASC`)
const listByOrganizerQuery = db.prepare(
  `${selectWithCount} WHERE e.organizer_id = ? ORDER BY e.date ASC`,
)
const getByIdQuery = db.prepare(`${selectWithCount} WHERE e.id = ?`)
const getByOrganizerQuery = db.prepare(
  `${selectWithCount} WHERE e.id = ? AND e.organizer_id = ?`,
)
const insertEventQuery = db.prepare(
  "INSERT INTO events (organizer_id, title, description, date, location, capacity) VALUES (?, ?, ?, ?, ?, ?)",
)
const updateEventQuery = db.prepare(
  "UPDATE events SET title = ?, description = ?, date = ?, location = ?, capacity = ? WHERE id = ? AND organizer_id = ?",
)
const deleteEventQuery = db.prepare(
  "DELETE FROM events WHERE id = ? AND organizer_id = ?",
)
const insertRegistrationQuery = db.prepare(
  "INSERT INTO registrations (event_id, name, email) VALUES (?, ?, ?)",
)
const getRegistrationQuery = db.prepare("SELECT * FROM registrations WHERE id = ?")
const listAttendeesQuery = db.prepare(
  "SELECT * FROM registrations WHERE event_id = ? ORDER BY created_at ASC",
)

type EventRowWithCount = EventRow & { registered: number }

function toEvent(row: EventRowWithCount): EventWithSeats {
  return {
    ...row,
    seatsRemaining: Math.max(0, row.capacity - row.registered),
    isPast: Date.parse(row.date) < Date.now(),
  }
}

export function listEvents(options: { includePast?: boolean } = {}): EventWithSeats[] {
  const rows = options.includePast
    ? (listAllQuery.all() as EventRowWithCount[])
    : (listUpcomingQuery.all(new Date().toISOString()) as EventRowWithCount[])
  return rows.map(toEvent)
}

export function listEventsForOrganizer(organizerId: number): EventWithSeats[] {
  return (listByOrganizerQuery.all(organizerId) as EventRowWithCount[]).map(toEvent)
}

export function findEvent(id: number): EventWithSeats | null {
  const row = getByIdQuery.get(id) as EventRowWithCount | undefined
  return row ? toEvent(row) : null
}

export function findEventForOrganizer(
  id: number,
  organizerId: number,
): EventWithSeats | null {
  const row = getByOrganizerQuery.get(id, organizerId) as
    | EventRowWithCount
    | undefined
  return row ? toEvent(row) : null
}

export function createEvent(
  input: EventInput,
  organizerId: number,
): EventWithSeats {
  const info = insertEventQuery.run(
    organizerId,
    input.title,
    input.description,
    input.date,
    input.location,
    input.capacity,
  )
  const event = findEvent(Number(info.lastInsertRowid))
  if (!event) throw new Error("Event was inserted but could not be read back.")
  return event
}

export type UpdateEventResult =
  | { ok: true; event: EventWithSeats }
  | { ok: false; reason: "not_found" | "capacity_below_registrations"; registered?: number }

export function updateEvent(
  id: number,
  organizerId: number,
  input: EventInput,
): UpdateEventResult {
  const existing = findEventForOrganizer(id, organizerId)
  if (!existing) return { ok: false, reason: "not_found" }

  if (input.capacity < existing.registered) {
    return {
      ok: false,
      reason: "capacity_below_registrations",
      registered: existing.registered,
    }
  }

  updateEventQuery.run(
    input.title,
    input.description,
    input.date,
    input.location,
    input.capacity,
    id,
    organizerId,
  )
  const event = findEventForOrganizer(id, organizerId)
  if (!event) throw new Error("Event was updated but could not be read back.")
  return { ok: true, event }
}

export function deleteEvent(id: number, organizerId: number): boolean {
  return deleteEventQuery.run(id, organizerId).changes > 0
}

export type RegisterResult =
  | { ok: true; registration: RegistrationRow; seatsRemaining: number }
  | { ok: false; reason: "not_found" | "event_past" | "full" | "duplicate" }

const registerTransaction = db.transaction(
  (eventId: number, name: string, email: string): RegisterResult => {
    const event = findEvent(eventId)
    if (!event) return { ok: false, reason: "not_found" }
    if (event.isPast) return { ok: false, reason: "event_past" }
    if (event.registered >= event.capacity) return { ok: false, reason: "full" }

    try {
      const info = insertRegistrationQuery.run(eventId, name, email)
      const registration = getRegistrationQuery.get(info.lastInsertRowid) as RegistrationRow
      return {
        ok: true,
        registration,
        seatsRemaining: event.capacity - event.registered - 1,
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return { ok: false, reason: "duplicate" }
      }
      throw error
    }
  },
)

export function registerForEvent(
  eventId: number,
  name: string,
  email: string,
): RegisterResult {
  return registerTransaction.immediate(eventId, name, email)
}

export function listAttendees(eventId: number): RegistrationRow[] {
  return listAttendeesQuery.all(eventId) as RegistrationRow[]
}
