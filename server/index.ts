import "dotenv/config"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { logger } from "hono/logger"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  currentOrganizer,
  endSession,
  requireOrganizer,
  startSession,
} from "./auth.js"
import {
  createEvent,
  deleteEvent,
  findEvent,
  findEventForOrganizer,
  listAttendees,
  listEvents,
  listEventsForOrganizer,
  registerForEvent,
  updateEvent,
  type UpdateEventResult,
} from "./events.js"
import { createOrganizer, verifyOrganizerCredentials } from "./organizers.js"
import {
  eventSchema,
  loginSchema,
  parseBody,
  registrationSchema,
  signupSchema,
} from "./validation.js"

const app = new Hono()

app.use(logger())

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

app.get("/api/health", (c) => c.json({ ok: true }))

app.get("/api/events", (c) => {
  return c.json({ events: listEvents() })
})

app.get("/api/events/:id", (c) => {
  const id = parseId(c.req.param("id"))
  const event = id === null ? null : findEvent(id)
  if (!event) return c.json({ message: "Event not found." }, 404)
  return c.json({ event })
})

const registrationErrors = {
  not_found: { status: 404, message: "Event not found." },
  event_past: { status: 409, message: "Registration is closed for this event." },
  full: { status: 409, message: "This event is full." },
  duplicate: {
    status: 409,
    message: "This email is already registered for this event.",
  },
} as const

app.post("/api/events/:id/registrations", async (c) => {
  const id = parseId(c.req.param("id"))
  if (id === null) return c.json({ message: "Event not found." }, 404)

  const parsed = parseBody(registrationSchema, await readJson(c))
  if (!parsed.ok) {
    return c.json({ message: parsed.message, fields: parsed.fields }, 400)
  }

  const result = registerForEvent(id, parsed.data.name, parsed.data.email)
  if (!result.ok) {
    const failure = registrationErrors[result.reason]
    return c.json({ message: failure.message }, failure.status)
  }

  return c.json(
    { registration: result.registration, seatsRemaining: result.seatsRemaining },
    201,
  )
})

app.get("/api/auth/session", (c) => {
  const organizer = currentOrganizer(c)
  return c.json({ authenticated: Boolean(organizer), organizer })
})

app.post("/api/auth/signup", async (c) => {
  const parsed = parseBody(signupSchema, await readJson(c))
  if (!parsed.ok) {
    return c.json({ message: parsed.message, fields: parsed.fields }, 400)
  }

  const result = createOrganizer(parsed.data)
  if (!result.ok) {
    return c.json({ message: "An account with this email already exists." }, 409)
  }

  startSession(c, result.organizer.id)
  return c.json({ authenticated: true, organizer: result.organizer }, 201)
})

app.post("/api/auth/login", async (c) => {
  const parsed = parseBody(loginSchema, await readJson(c))
  if (!parsed.ok) {
    return c.json({ message: parsed.message, fields: parsed.fields }, 400)
  }

  const organizer = verifyOrganizerCredentials(
    parsed.data.email,
    parsed.data.password,
  )
  if (!organizer) {
    return c.json({ message: "Email or password is not correct." }, 401)
  }

  startSession(c, organizer.id)
  return c.json({ authenticated: true, organizer })
})

app.post("/api/auth/logout", (c) => {
  endSession(c)
  return c.json({ authenticated: false })
})

app.use("/api/organizer/*", requireOrganizer)

app.get("/api/organizer/events", (c) => {
  const organizer = c.get("organizer")
  return c.json({ events: listEventsForOrganizer(organizer.id) })
})

app.post("/api/organizer/events", async (c) => {
  const parsed = parseBody(eventSchema, await readJson(c))
  if (!parsed.ok) {
    return c.json({ message: parsed.message, fields: parsed.fields }, 400)
  }

  const event = createEvent(
    {
      ...parsed.data,
      date: new Date(parsed.data.date).toISOString(),
    },
    c.get("organizer").id,
  )
  return c.json({ event }, 201)
})

function updateFailure(
  result: Extract<UpdateEventResult, { ok: false }>,
): { status: 404 | 409; message: string } {
  if (result.reason === "not_found") {
    return { status: 404, message: "Event not found." }
  }
  return {
    status: 409,
    message: `Capacity can't be lower than the ${result.registered} ${result.registered === 1 ? "person" : "people"} already registered.`,
  }
}

app.put("/api/organizer/events/:id", async (c) => {
  const id = parseId(c.req.param("id"))
  if (id === null) return c.json({ message: "Event not found." }, 404)

  const parsed = parseBody(eventSchema, await readJson(c))
  if (!parsed.ok) {
    return c.json({ message: parsed.message, fields: parsed.fields }, 400)
  }

  const result = updateEvent(id, c.get("organizer").id, {
    ...parsed.data,
    date: new Date(parsed.data.date).toISOString(),
  })
  if (!result.ok) {
    const failure = updateFailure(result)
    return c.json({ message: failure.message }, failure.status)
  }

  return c.json({ event: result.event })
})

app.delete("/api/organizer/events/:id", (c) => {
  const id = parseId(c.req.param("id"))
  if (id === null) return c.json({ message: "Event not found." }, 404)

  if (!deleteEvent(id, c.get("organizer").id)) {
    return c.json({ message: "Event not found." }, 404)
  }
  return c.json({ deleted: true })
})

app.get("/api/organizer/events/:id/attendees", (c) => {
  const id = parseId(c.req.param("id"))
  if (id === null) return c.json({ message: "Event not found." }, 404)

  const event = findEventForOrganizer(id, c.get("organizer").id)
  if (!event) return c.json({ message: "Event not found." }, 404)

  return c.json({ event, attendees: listAttendees(id) })
})

app.all("/api/*", (c) => c.json({ message: "Not found." }, 404))

const distDirectory = resolve(process.cwd(), "dist")
const hasBuiltFrontend = existsSync(resolve(distDirectory, "index.html"))

if (hasBuiltFrontend) {
  app.use("/*", serveStatic({ root: "./dist" }))
  app.get("*", (c) => c.html(readFileSync(resolve(distDirectory, "index.html"), "utf8")))
}

app.onError((error, c) => {
  console.error("[gather] unhandled error:", error)
  return c.json(
    { message: "Something went wrong on our end. Please try again." },
    500,
  )
})

const port = Number(process.env.PORT ?? 8787)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Gather API listening on http://localhost:${info.port}`)
  if (!hasBuiltFrontend) {
    console.log("Run the UI in dev mode with `npm run dev` (Vite on http://localhost:5173).")
  }
})
