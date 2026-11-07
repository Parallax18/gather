import { Loader2, Users } from "lucide-react"
import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api, ApiError } from "@/lib/api"
import { formatShortDate, initials } from "@/lib/format"
import type { Attendee, Event } from "@/lib/types"

interface AttendeesDialogProps {
  event: Event | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttendeesDialog({
  event,
  open,
  onOpenChange,
}: AttendeesDialogProps) {
  const [attendees, setAttendees] = useState<Attendee[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || !event) return

    let cancelled = false
    setAttendees(null)
    setError("")

    api
      .attendees(event.id)
      .then((data) => {
        if (!cancelled) setAttendees(data.attendees)
      })
      .catch((cause) => {
        if (cancelled) return
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Couldn't load attendees. Please try again.",
        )
      })

    return () => {
      cancelled = true
    }
  }, [open, event])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendees</DialogTitle>
          <DialogDescription>
            {event ? event.title : "Registrations for this event"}
            {attendees && ` — ${attendees.length} registered`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {attendees === null && !error ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : attendees && attendees.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed py-10 text-center">
            <Users className="h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No registrations yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Attendees will appear here as they sign up.
            </p>
          </div>
        ) : (
          <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
            {attendees?.map((attendee) => (
              <li key={attendee.id} className="flex items-center gap-3 px-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(attendee.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{attendee.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {attendee.email}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(attendee.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
