import { CalendarX2, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { EventCard } from "@/components/EventCard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "@/lib/api"
import type { Event } from "@/lib/types"

function EventCardSkeleton() {
  return <div className="h-[232px] animate-pulse rounded-xl border bg-muted/40" />
}

export function EventsPage() {
  const [events, setEvents] = useState<Event[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    api
      .listEvents()
      .then((data) => {
        if (!cancelled) setEvents(data.events)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Couldn't load events. Please try again.",
          )
          setEvents([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="animate-fade-in">
      <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Events
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Upcoming events
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Find something worth showing up for. Reserve a seat in a few seconds.
          </p>
        </div>
        {events && events.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {events.length} {events.length === 1 ? "event" : "events"}
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {events === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      ) : events.length === 0 && !error ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
          <CalendarX2 className="h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-base font-medium">No upcoming events</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            There's nothing on the calendar right now. Check back soon, or create
            an event if you're an organizer.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/organizer">
              <Plus className="h-4 w-4" />
              Open organizer
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
