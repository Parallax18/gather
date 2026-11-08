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
      <div className="mb-10 flex flex-col gap-4 border-b border-border/80 pb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#bd6547]">
            Find your people
          </p>
          <h1 className="font-editorial mt-2 text-4xl tracking-tight sm:text-5xl">
            Out in the world
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            A little inspiration for your calendar. Find a gathering that feels like your kind of thing.
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
          <h2 className="font-editorial mt-4 text-2xl">A little quiet on the calendar.</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            There aren’t any gatherings listed just yet. Check back soon, or make the first plan yourself.
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
