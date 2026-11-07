import type {
  Attendee,
  Event,
  EventInput,
  FieldErrors,
  Organizer,
  SignupInput,
} from "./types"

export class ApiError extends Error {
  status: number
  fields: FieldErrors

  constructor(message: string, status: number, fields: FieldErrors = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(
      "Can't reach the server. Check that it's running, then try again.",
      0,
    )
  }

  const data = (await response.json().catch(() => null)) as
    | { message?: string; fields?: FieldErrors }
    | null

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? "Something went wrong. Please try again.",
      response.status,
      data?.fields ?? {},
    )
  }

  return data as T
}

export const api = {
  listEvents: () => request<{ events: Event[] }>("/api/events"),

  getEvent: (id: number) => request<{ event: Event }>(`/api/events/${id}`),

  register: (id: number, input: { name: string; email: string }) =>
    request<{ registration: Attendee; seatsRemaining: number }>(
      `/api/events/${id}/registrations`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  session: () =>
    request<{ authenticated: boolean; organizer: Organizer | null }>(
      "/api/auth/session",
    ),

  signup: (input: SignupInput) =>
    request<{ authenticated: boolean; organizer: Organizer }>(
      "/api/auth/signup",
      { method: "POST", body: JSON.stringify(input) },
    ),

  login: (input: { email: string; password: string }) =>
    request<{ authenticated: boolean; organizer: Organizer }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(input) },
    ),

  logout: () =>
    request<{ authenticated: boolean }>("/api/auth/logout", { method: "POST" }),

  organizerEvents: () =>
    request<{ events: Event[] }>("/api/organizer/events"),

  createEvent: (input: EventInput) =>
    request<{ event: Event }>("/api/organizer/events", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateEvent: (id: number, input: EventInput) =>
    request<{ event: Event }>(`/api/organizer/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  deleteEvent: (id: number) =>
    request<{ deleted: boolean }>(`/api/organizer/events/${id}`, {
      method: "DELETE",
    }),

  attendees: (id: number) =>
    request<{ event: Event; attendees: Attendee[] }>(
      `/api/organizer/events/${id}/attendees`,
    ),
}
