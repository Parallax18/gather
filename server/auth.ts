import { randomBytes } from "node:crypto"
import type { Context, MiddlewareHandler } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"

import { findOrganizerById, type Organizer } from "./organizers.js"

const COOKIE_NAME = "gather_session"
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

interface Session {
  organizerId: number
  expiresAt: number
}

const sessions = new Map<string, Session>()

declare module "hono" {
  interface ContextVariableMap {
    organizer: Organizer
  }
}

function removeExpiredSessions(): void {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token)
  }
}

export function currentOrganizer(c: Context): Organizer | null {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) return null

  const session = sessions.get(token)
  if (!session) return null

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token)
    return null
  }

  const organizer = findOrganizerById(session.organizerId)
  if (!organizer) sessions.delete(token)
  return organizer
}

export function startSession(c: Context, organizerId: number): void {
  removeExpiredSessions()

  const token = randomBytes(32).toString("hex")
  sessions.set(token, {
    organizerId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  })

  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    maxAge: SESSION_TTL_MS / 1000,
    secure: process.env.COOKIE_SECURE === "true",
  })
}

export function endSession(c: Context): void {
  const token = getCookie(c, COOKIE_NAME)
  if (token) sessions.delete(token)
  deleteCookie(c, COOKIE_NAME, { path: "/" })
}

export const requireOrganizer: MiddlewareHandler = async (c, next) => {
  const organizer = currentOrganizer(c)
  if (!organizer) {
    return c.json({ message: "Organizer sign-in required." }, 401)
  }

  c.set("organizer", organizer)
  await next()
}
