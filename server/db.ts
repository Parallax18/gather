import Database from "better-sqlite3"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

import { hashPassword } from "./passwords.js"

const dbPath = process.env.DB_PATH ?? resolve(process.cwd(), "data/gather.db")
mkdirSync(dirname(dbPath), { recursive: true })

export const db = new Database(dbPath)
db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

const DEMO_ORGANIZER = {
  name: "Demo Organizer",
  email: "organizer@gather.local",
  password: "organizer",
}

export interface EventRow {
  id: number
  organizer_id: number
  title: string
  description: string
  date: string
  location: string
  capacity: number
  created_at: string
}

export interface RegistrationRow {
  id: number
  event_id: number
  name: string
  email: string
  created_at: string
}

db.exec(`
  CREATE TABLE IF NOT EXISTS organizers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`)

function tableExists(name: string): boolean {
  return Boolean(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name),
  )
}

function eventsTableHasOwner(): boolean {
  const columns = db.pragma("table_info(events)") as { name: string }[]
  return columns.some((column) => column.name === "organizer_id")
}

function ensureDemoOrganizer(): number {
  const existing = db
    .prepare("SELECT id FROM organizers WHERE email = ?")
    .get(DEMO_ORGANIZER.email) as { id: number } | undefined
  if (existing) return existing.id

  const info = db
    .prepare("INSERT INTO organizers (name, email, password_hash) VALUES (?, ?, ?)")
    .run(
      DEMO_ORGANIZER.name,
      DEMO_ORGANIZER.email,
      hashPassword(DEMO_ORGANIZER.password),
    )
  return Number(info.lastInsertRowid)
}

/**
 * Databases created before organizer accounts existed get their events
 * reassigned to the demo organizer. Registrations are preserved.
 */
function migrateEventsToOrganizers(): void {
  const organizerId = ensureDemoOrganizer()

  db.pragma("foreign_keys = OFF")
  try {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE events_new (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          organizer_id INTEGER NOT NULL REFERENCES organizers (id) ON DELETE CASCADE,
          title        TEXT    NOT NULL,
          description  TEXT    NOT NULL,
          date         TEXT    NOT NULL,
          location     TEXT    NOT NULL,
          capacity     INTEGER NOT NULL CHECK (capacity > 0),
          created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
      `)

      db.prepare(`
        INSERT INTO events_new (id, organizer_id, title, description, date, location, capacity, created_at)
        SELECT id, ?, title, description, date, location, capacity, created_at FROM events
      `).run(organizerId)

      db.exec("DROP TABLE events")
      db.exec("ALTER TABLE events_new RENAME TO events")
    })()
  } finally {
    db.pragma("foreign_keys = ON")
  }
}

if (tableExists("events") && !eventsTableHasOwner()) {
  migrateEventsToOrganizers()
}

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    organizer_id INTEGER NOT NULL REFERENCES organizers (id) ON DELETE CASCADE,
    title        TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    date         TEXT    NOT NULL,
    location     TEXT    NOT NULL,
    capacity     INTEGER NOT NULL CHECK (capacity > 0),
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id   INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (event_id, email)
  );

  CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations (event_id);
  CREATE INDEX IF NOT EXISTS idx_events_organizer ON events (organizer_id);
`)

function daysFromNow(days: number, hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function seed(organizerId: number): void {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM events").get() as {
    count: number
  }
  if (count > 0) return

  const insertEvent = db.prepare(
    "INSERT INTO events (organizer_id, title, description, date, location, capacity) VALUES (?, ?, ?, ?, ?, ?)",
  )
  const insertRegistration = db.prepare(
    "INSERT INTO registrations (event_id, name, email) VALUES (?, ?, ?)",
  )

  const events = [
    {
      title: "Design Systems Meetup",
      description:
        "An evening of short talks on design tokens, component libraries, and keeping a product visually consistent as it grows. Drinks and snacks included.",
      date: daysFromNow(4, 18),
      location: "The Foundry, 12 Bridge Street",
      capacity: 40,
    },
    {
      title: "Intro to TypeScript Workshop",
      description:
        "A hands-on session covering types, generics, and practical patterns you can use the next day at work. Bring a laptop with Node installed.",
      date: daysFromNow(11, 10),
      location: "Community Hub, Room 2",
      capacity: 25,
    },
    {
      title: "Founders Coffee Morning",
      description:
        "Informal coffee and conversation for early-stage founders. No pitches, no slides — just useful people and good coffee.",
      date: daysFromNow(19, 9),
      location: "Cafe Nord, 4 Market Lane",
      capacity: 12,
    },
  ]

  const seedAll = db.transaction(() => {
    const ids = events.map((event) =>
      Number(
        insertEvent.run(
          organizerId,
          event.title,
          event.description,
          event.date,
          event.location,
          event.capacity,
        ).lastInsertRowid,
      ),
    )

    insertRegistration.run(ids[0], "Maya Chen", "maya@example.com")
    insertRegistration.run(ids[0], "Tom Alvarez", "tom@example.com")
    insertRegistration.run(ids[1], "Priya Nair", "priya@example.com")
  })

  seedAll()
}

const demoOrganizerId = ensureDemoOrganizer()
if (process.env.SEED !== "false") seed(demoOrganizerId)
