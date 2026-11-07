import {
  CalendarPlus,
  CheckCircle2,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"

import { AttendeesDialog } from "@/components/AttendeesDialog"
import { DateBlock } from "@/components/DateBlock"
import { EventForm } from "@/components/EventForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api, ApiError } from "@/lib/api"
import { formatEventDate } from "@/lib/format"
import { useSession } from "@/lib/session"
import type { Event, EventInput } from "@/lib/types"

function OrganizerSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-16 rounded-xl border bg-muted/40" />
      <div className="h-16 rounded-xl border bg-muted/40" />
      <div className="h-16 rounded-xl border bg-muted/40" />
    </div>
  )
}

export function OrganizerPage() {
  const { organizer, loading: sessionLoading, setOrganizer } = useSession()
  const navigate = useNavigate()

  const [events, setEvents] = useState<Event[] | null>(null)
  const [loadError, setLoadError] = useState("")
  const [notice, setNotice] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)

  const [attendeesOpen, setAttendeesOpen] = useState(false)
  const [attendeesEvent, setAttendeesEvent] = useState<Event | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [deleting, setDeleting] = useState(false)

  async function loadEvents() {
    setLoadError("")
    try {
      const data = await api.organizerEvents()
      setEvents(data.events)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setOrganizer(null)
        return
      }
      setLoadError(
        cause instanceof ApiError
          ? cause.message
          : "Couldn't load events. Please try again.",
      )
      setEvents([])
    }
  }

  useEffect(() => {
    if (organizer) void loadEvents()
  }, [organizer])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(event: Event) {
    setEditing(event)
    setFormOpen(true)
  }

  function openAttendees(event: Event) {
    setAttendeesEvent(event)
    setAttendeesOpen(true)
  }

  function openDelete(event: Event) {
    setDeleteTarget(event)
    setDeleteError("")
    setDeleteOpen(true)
  }

  async function handleSave(input: EventInput) {
    if (editing) {
      await api.updateEvent(editing.id, input)
      setNotice("Event updated.")
    } else {
      await api.createEvent(input)
      setNotice("Event created.")
    }
    setFormOpen(false)
    setEditing(null)
    await loadEvents()
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    setDeleteError("")
    try {
      await api.deleteEvent(deleteTarget.id)
      setDeleteOpen(false)
      setDeleteTarget(null)
      setNotice("Event deleted.")
      await loadEvents()
    } catch (cause) {
      setDeleteError(
        cause instanceof ApiError
          ? cause.message
          : "Couldn't delete the event. Please try again.",
      )
    } finally {
      setDeleting(false)
    }
  }

  async function handleLogout() {
    try {
      await api.logout()
    } finally {
      setOrganizer(null)
      navigate("/")
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!organizer) return <Navigate to="/login" replace />

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Organizer
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {organizer.name} · {organizer.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New event
          </Button>
        </div>
      </div>

      {notice && (
        <Alert variant="success" className="mt-6">
          <CheckCircle2 />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={() => void loadEvents()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6">
        {events === null ? (
          <OrganizerSkeleton />
        ) : events.length === 0 && !loadError ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
            <CalendarPlus className="h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 text-base font-medium">No events yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first event and it will appear on the public events
              page immediately.
            </p>
            <Button className="mt-5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New event
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <DateBlock date={event.date} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold tracking-tight">
                        {event.title}
                      </h2>
                      {event.isPast && <Badge variant="muted">Past</Badge>}
                      {!event.isPast && event.seatsRemaining <= 0 && (
                        <Badge variant="destructive">Full</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatEventDate(event.date)} · {event.location}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((event.registered / event.capacity) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {event.registered}/{event.capacity} registered
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAttendees(event)}
                  >
                    <Users className="h-4 w-4" />
                    Attendees
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${event.title}`}
                    onClick={() => openEdit(event)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${event.title}`}
                    onClick={() => openDelete(event)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the details below. Changes are visible immediately."
                : "Add an event to the public calendar."}
            </DialogDescription>
          </DialogHeader>
          <EventForm
            key={editing?.id ?? "new"}
            initial={editing}
            submitLabel={editing ? "Save changes" : "Create event"}
            onSubmit={handleSave}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AttendeesDialog
        event={attendeesEvent}
        open={attendeesOpen}
        onOpenChange={setAttendeesOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title}" and its ${deleteTarget.registered} ${
                    deleteTarget.registered === 1 ? "registration" : "registrations"
                  } will be permanently removed. This can't be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleting ? "Deleting…" : "Delete event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
