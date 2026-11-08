import { createServer } from "node:http"
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { mkdirSync, readFileSync } from "node:fs"
import { dirname, extname, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"

const root = dirname(fileURLToPath(import.meta.url))
const publicRoot = resolve(root, "public")
const dbPath = resolve(process.env.DB_PATH ?? resolve(root, "data/gather.db"))
mkdirSync(dirname(dbPath), { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;")
db.exec(`
  CREATE TABLE IF NOT EXISTS organizers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    organizer_id INTEGER NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (event_id, email)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    organizer_id INTEGER NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
  CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
`)

const sampleOrganizer = db.prepare("SELECT id FROM organizers WHERE email = ?").get("community@gather.local")
let sampleOrganizerId = Number(sampleOrganizer?.id ?? 0)
if (!sampleOrganizerId) {
  sampleOrganizerId = Number(db.prepare("INSERT INTO organizers (name, email, password_hash) VALUES (?, ?, NULL)")
    .run("Gather Community", "community@gather.local").lastInsertRowid)
}
const eventCount = Number(db.prepare("SELECT COUNT(*) AS count FROM events").get().count)
if (eventCount === 0 && process.env.SEED !== "false") {
  const addEvent = db.prepare("INSERT INTO events (organizer_id, title, description, date, location, capacity) VALUES (?, ?, ?, ?, ?, ?)")
  const inDays = (days, hour) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
  }
  withImmediateTransaction(() => {
    addEvent.run(sampleOrganizerId, "Sunday Table Club", "A long lunch for curious people, good food, and the kind of conversation that stays with you. Come solo or bring a friend.", inDays(4, 12), "Palm House, Lagos", 24)
    addEvent.run(sampleOrganizerId, "Make & Mend Workshop", "An easygoing afternoon to learn visible mending, swap ideas, and give a well-loved piece of clothing a second life. Materials included.", inDays(9, 14), "The Workshop, Yaba", 18)
    addEvent.run(sampleOrganizerId, "Small Ideas, Big Energy", "Three local makers share what they are building, what they have learned, and what they want to try next. Questions and cold drinks encouraged.", inDays(16, 17), "Civic Studio, Victoria Island", 40)
  })
}

const SESSION_TTL = 12 * 60 * 60 * 1000
const MAX_BODY_BYTES = 32 * 1024
const authAttempts = new Map()
const COOKIE = "gather_session"

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

const json = (res, status, value, headers = {}) => {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  })
  res.end(body)
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex")
const scryptAsync = (password, salt) => new Promise((resolvePromise, reject) => {
  scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolvePromise(key))
})

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex")
  const key = await scryptAsync(password, salt)
  return `${salt}:${key.toString("hex")}`
}

async function verifyPassword(password, stored) {
  if (!stored) return false
  const [salt, hex] = stored.split(":")
  if (!salt || !hex || !/^[a-f\d]{128}$/i.test(hex)) return false
  const expected = Buffer.from(hex, "hex")
  const actual = await scryptAsync(password, salt)
  return timingSafeEqual(actual, expected)
}

function cookieToken(req) {
  const cookies = Object.fromEntries((req.headers.cookie ?? "").split(";").map((part) => {
    const index = part.indexOf("=")
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), part.slice(index + 1).trim()]
  }))
  return cookies[COOKIE] ?? ""
}

function cookieHeader(token, maxAge) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : ""
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`
}

function currentOrganizer(req) {
  const token = cookieToken(req)
  if (!/^[a-f\d]{64}$/i.test(token)) return null
  const hash = sha256(token)
  const row = db.prepare(`SELECT o.id, o.name, o.email FROM sessions s
    JOIN organizers o ON o.id = s.organizer_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .get(hash, Date.now())
  return row ?? null
}

function requireOrganizer(req) {
  const organizer = currentOrganizer(req)
  if (!organizer) throw new HttpError(401, "Sign in to manage your events.")
  return organizer
}

function parseBody(req) {
  return new Promise((resolvePromise, reject) => {
    const contentType = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase()
    if (contentType !== "application/json") return reject(new HttpError(415, "Send this form as JSON."))
    let size = 0
    const chunks = []
    req.on("data", (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "Request is too large."))
        req.resume()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => {
      if (size > MAX_BODY_BYTES) return
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString("utf8"))
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object")
        resolvePromise(value)
      } catch {
        reject(new HttpError(400, "Send a valid JSON object."))
      }
    })
    req.on("error", () => reject(new HttpError(400, "Could not read the request.")))
  })
}

function field(value, label, min, max) {
  if (typeof value !== "string") throw new HttpError(400, "Please check the highlighted fields.", { [label]: `Enter ${label}.` })
  const result = value.trim()
  if (result.length < min || result.length > max) {
    throw new HttpError(400, "Please check the highlighted fields.", { [label]: `${label[0].toUpperCase()}${label.slice(1)} must be ${min}–${max} characters.` })
  }
  return result
}

function emailField(value) {
  const email = field(value, "email", 3, 200).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "Please check the highlighted fields.", { email: "Enter a valid email address." })
  }
  return email
}

function eventInput(body) {
  const title = field(body.title, "title", 3, 120)
  const description = field(body.description, "description", 10, 2000)
  const location = field(body.location, "location", 2, 160)
  const date = typeof body.date === "string" && Number.isFinite(Date.parse(body.date))
    ? new Date(body.date).toISOString()
    : null
  if (!date) throw new HttpError(400, "Please check the highlighted fields.", { date: "Choose a valid date and time." })
  const capacity = Number(body.capacity)
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 10000) {
    throw new HttpError(400, "Please check the highlighted fields.", { capacity: "Capacity must be a whole number from 1 to 10,000." })
  }
  return { title, description, location, date, capacity }
}

function parseId(raw) {
  if (!/^\d+$/.test(raw ?? "")) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function eventRecord(row) {
  const registered = Number(row.registered)
  return {
    id: Number(row.id), title: row.title, description: row.description,
    date: row.date, location: row.location, capacity: Number(row.capacity),
    registered, seatsRemaining: Math.max(0, Number(row.capacity) - registered),
    isPast: Date.parse(row.date) < Date.now(),
  }
}

const eventSelect = `SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registered FROM events e`
function findEvent(id) {
  const row = db.prepare(`${eventSelect} WHERE e.id = ?`).get(id)
  return row ? eventRecord(row) : null
}
function findOwnedEvent(id, organizerId) {
  const row = db.prepare(`${eventSelect} WHERE e.id = ? AND e.organizer_id = ?`).get(id, organizerId)
  return row ? eventRecord(row) : null
}

function withImmediateTransaction(run) {
  db.exec("BEGIN IMMEDIATE")
  try {
    const result = run()
    db.exec("COMMIT")
    return result
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

function hitAuthLimit(req) {
  const ip = req.socket.remoteAddress ?? "local"
  const now = Date.now()
  const recent = (authAttempts.get(ip) ?? []).filter((time) => now - time < 60_000)
  if (recent.length >= 12) throw new HttpError(429, "Too many attempts. Wait a minute and try again.")
  recent.push(now)
  authAttempts.set(ip, recent)
  if (authAttempts.size > 1000) {
    for (const [key, times] of authAttempts) if (!times.some((time) => now - time < 60_000)) authAttempts.delete(key)
  }
}

async function handleApi(req, res, url) {
  const method = req.method ?? "GET"
  const path = url.pathname
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method)
  if (mutating && req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) throw new Error("Origin mismatch")
    } catch {
      throw new HttpError(403, "This request was blocked. Reload the page and try again.")
    }
  }

  if (method === "GET" && path === "/api/health") return json(res, 200, { ok: true })
  if (method === "GET" && path === "/api/events") {
    const rows = db.prepare(`${eventSelect} WHERE e.date >= ? ORDER BY e.date`).all(new Date().toISOString())
    return json(res, 200, { events: rows.map(eventRecord) })
  }
  const detailMatch = path.match(/^\/api\/events\/([^/]+)$/)
  if (method === "GET" && detailMatch) {
    const event = findEvent(parseId(detailMatch[1]))
    if (!event) throw new HttpError(404, "Event not found.")
    return json(res, 200, { event })
  }
  const registrationMatch = path.match(/^\/api\/events\/([^/]+)\/registrations$/)
  if (method === "POST" && registrationMatch) {
    const id = parseId(registrationMatch[1])
    if (!id) throw new HttpError(404, "Event not found.")
    const body = await parseBody(req)
    const name = field(body.name, "name", 2, 80)
    const email = emailField(body.email)
    const result = withImmediateTransaction(() => {
      const event = findEvent(id)
      if (!event) throw new HttpError(404, "Event not found.")
      if (event.isPast) throw new HttpError(409, "Registration is closed for this event.")
      if (event.registered >= event.capacity) throw new HttpError(409, "This event is full.")
      try {
        const info = db.prepare("INSERT INTO registrations (event_id, name, email) VALUES (?, ?, ?)").run(id, name, email)
        const registration = db.prepare("SELECT id, name, email, created_at FROM registrations WHERE id = ?").get(Number(info.lastInsertRowid))
        return { registration, seatsRemaining: event.capacity - event.registered - 1 }
      } catch (error) {
        if (String(error?.message).includes("UNIQUE constraint failed")) throw new HttpError(409, "This email is already registered for this event.")
        throw error
      }
    })
    return json(res, 201, result)
  }
  if (method === "GET" && path === "/api/auth/session") {
    const organizer = currentOrganizer(req)
    return json(res, 200, { authenticated: Boolean(organizer), organizer })
  }
  if (method === "POST" && path === "/api/auth/signup") {
    hitAuthLimit(req)
    const body = await parseBody(req)
    const name = field(body.name, "name", 2, 80)
    const email = emailField(body.email)
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 200) {
      throw new HttpError(400, "Please check the highlighted fields.", { password: "Use a password between 8 and 200 characters." })
    }
    const passwordHash = await hashPassword(body.password)
    let organizer
    try {
      const info = db.prepare("INSERT INTO organizers (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, passwordHash)
      organizer = { id: Number(info.lastInsertRowid), name, email }
    } catch (error) {
      if (String(error?.message).includes("UNIQUE constraint failed")) throw new HttpError(409, "An account with this email already exists.")
      throw error
    }
    const token = randomBytes(32).toString("hex")
    db.prepare("INSERT INTO sessions (token_hash, organizer_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), organizer.id, Date.now() + SESSION_TTL)
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now())
    return json(res, 201, { authenticated: true, organizer }, { "Set-Cookie": cookieHeader(token, SESSION_TTL / 1000) })
  }
  if (method === "POST" && path === "/api/auth/login") {
    hitAuthLimit(req)
    const body = await parseBody(req)
    const email = emailField(body.email)
    if (typeof body.password !== "string" || body.password.length > 200) throw new HttpError(400, "Enter your password.")
    const row = db.prepare("SELECT id, name, email, password_hash FROM organizers WHERE email = ?").get(email)
    const valid = await verifyPassword(body.password, row?.password_hash)
    if (!valid) throw new HttpError(401, "Email or password is not correct.")
    const organizer = { id: Number(row.id), name: row.name, email: row.email }
    const token = randomBytes(32).toString("hex")
    db.prepare("INSERT INTO sessions (token_hash, organizer_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), organizer.id, Date.now() + SESSION_TTL)
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now())
    return json(res, 200, { authenticated: true, organizer }, { "Set-Cookie": cookieHeader(token, SESSION_TTL / 1000) })
  }
  if (method === "POST" && path === "/api/auth/logout") {
    const token = cookieToken(req)
    if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token))
    return json(res, 200, { authenticated: false }, { "Set-Cookie": cookieHeader("", 0) })
  }

  const organizer = path.startsWith("/api/organizer/") ? requireOrganizer(req) : null
  if (method === "GET" && path === "/api/organizer/events") {
    const rows = db.prepare(`${eventSelect} WHERE e.organizer_id = ? ORDER BY e.date`).all(organizer.id)
    return json(res, 200, { events: rows.map(eventRecord) })
  }
  if (method === "POST" && path === "/api/organizer/events") {
    const input = eventInput(await parseBody(req))
    const info = db.prepare("INSERT INTO events (organizer_id, title, description, date, location, capacity) VALUES (?, ?, ?, ?, ?, ?)")
      .run(organizer.id, input.title, input.description, input.date, input.location, input.capacity)
    return json(res, 201, { event: findEvent(Number(info.lastInsertRowid)) })
  }
  const ownedMatch = path.match(/^\/api\/organizer\/events\/([^/]+)$/)
  if (ownedMatch && ["PUT", "DELETE"].includes(method)) {
    const id = parseId(ownedMatch[1])
    if (!id) throw new HttpError(404, "Event not found.")
    if (method === "DELETE") {
      const result = db.prepare("DELETE FROM events WHERE id = ? AND organizer_id = ?").run(id, organizer.id)
      if (!result.changes) throw new HttpError(404, "Event not found.")
      return json(res, 200, { deleted: true })
    }
    const input = eventInput(await parseBody(req))
    const result = withImmediateTransaction(() => {
      const event = findOwnedEvent(id, organizer.id)
      if (!event) throw new HttpError(404, "Event not found.")
      if (input.capacity < event.registered) throw new HttpError(409, `Capacity can't be lower than the ${event.registered} people already registered.`)
      db.prepare("UPDATE events SET title = ?, description = ?, date = ?, location = ?, capacity = ? WHERE id = ? AND organizer_id = ?")
        .run(input.title, input.description, input.date, input.location, input.capacity, id, organizer.id)
      return findOwnedEvent(id, organizer.id)
    })
    return json(res, 200, { event: result })
  }
  const attendeesMatch = path.match(/^\/api\/organizer\/events\/([^/]+)\/attendees$/)
  if (method === "GET" && attendeesMatch) {
    const id = parseId(attendeesMatch[1])
    const event = id ? findOwnedEvent(id, organizer.id) : null
    if (!event) throw new HttpError(404, "Event not found.")
    const attendees = db.prepare("SELECT id, name, email, created_at FROM registrations WHERE event_id = ? ORDER BY created_at").all(id)
    return json(res, 200, { event, attendees })
  }

  throw new HttpError(404, "Not found.")
}

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" }
const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? "localhost"
    const url = new URL(req.url ?? "/", `http://${host}`)
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url)

    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname)
    const file = resolve(publicRoot, `.${requested}`)
    if (!file.startsWith(publicRoot + sep) && file !== resolve(publicRoot, "index.html")) throw new HttpError(404, "Not found.")
    try {
      const content = readFileSync(file)
      res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": extname(file) === ".html" ? "no-cache" : "public, max-age=3600" })
      res.end(content)
    } catch {
      if (extname(requested)) throw new HttpError(404, "Not found.")
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache" })
      res.end(readFileSync(resolve(publicRoot, "index.html")))
    }
  } catch (error) {
    if (res.headersSent) return res.destroy()
    if (error instanceof HttpError) return json(res, error.status, { message: error.message, ...(error.fields ? { fields: error.fields } : {}) })
    console.error("[gather] request failed:", error)
    return json(res, 500, { message: "Something went wrong on our end. Please try again." })
  }
})

const port = Number(process.env.PORT ?? 8787)
server.listen(port, "127.0.0.1", () => {
  console.log(`Gather is ready at http://localhost:${port}`)
})

function close() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}
process.on("SIGINT", close)
process.on("SIGTERM", close)
