import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { RegisterForm } from "@/components/RegisterForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api, ApiError } from "@/lib/api"
import { formatFullDate, seatsLabel } from "@/lib/format"
import type { Event } from "@/lib/types"

type Status = "loading" | "ready" | "missing" | "error"

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="h-5 w-20 rounded bg-muted" />
          <div className="mt-4 h-9 w-3/4 rounded bg-muted" />
          <div className="mt-6 h-24 rounded-xl bg-muted/60" />
          <div className="mt-8 h-4 w-full rounded bg-muted" />
          <div className="mt-3 h-4 w-5/6 rounded bg-muted" />
          <div className="mt-3 h-4 w-2/3 rounded bg-muted" />
        </div>
        <div className="h-72 rounded-xl bg-muted/60" />
      </div>
    </div>
  )
}

export function EventDetailPage() {
  const { id } = useParams()
  const eventId = Number(id)
  const [event, setEvent] = useState<Event | null>(null)
  const [status, setStatus] = useState<Status>("loading")

  useEffect(() => {
    if (!Number.isInteger(eventId) || eventId <= 0) {
      setStatus("missing")
      return
    }

    let cancelled = false
    setStatus("loading")

    api
      .getEvent(eventId)
      .then((data) => {
        if (cancelled) return
        setEvent(data.event)
        setStatus("ready")
      })
      .catch((cause) => {
        if (cancelled) return
        setStatus(
          cause instanceof ApiError && cause.status === 404 ? "missing" : "error",
        )
      })

    return () => {
      cancelled = true
    }
  }, [eventId])

  if (status === "loading") return <DetailSkeleton />

  if (status === "error") {
    return (
      <div className="mx-auto max-w-md py-20">
        <Alert variant="destructive">
          <AlertDescription>
            Couldn't load this event. Please refresh and try again.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/events">
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
        </Button>
      </div>
    )
  }

  if (status === "missing" || !event) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Event not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This event may have been removed, or the link is incorrect.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/events">
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
        </Button>
      </div>
    )
  }

  const takenPercent = Math.min(
    100,
    Math.round((event.registered / event.capacity) * 100),
  )

  return (
    <div className="animate-fade-in">
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        All events
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={event.isPast ? "muted" : "default"}>
              {event.isPast ? "Past event" : "Upcoming"}
            </Badge>
            <Badge
              variant={
                event.seatsRemaining <= 0
                  ? "destructive"
                  : event.seatsRemaining <= 3
                    ? "warning"
                    : "muted"
              }
            >
              {seatsLabel(event.seatsRemaining)}
            </Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {event.title}
          </h1>

          <div className="mt-6 grid gap-4 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date & time</p>
                <p className="mt-0.5 font-medium leading-snug">
                  {formatFullDate(event.date)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="mt-0.5 font-medium leading-snug">{event.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Capacity</p>
                <p className="mt-0.5 font-medium leading-snug">
                  {event.capacity} seats
                </p>
              </div>
            </div>
          </div>

          <h2 className="mt-8 text-sm font-medium">About this event</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {event.description}
          </p>
        </div>

        <aside>
          <Card className="lg:sticky lg:top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Reserve your seat</CardTitle>
              <CardDescription>
                {event.registered} of {event.capacity} seats taken
              </CardDescription>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${takenPercent}%` }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <RegisterForm
                event={event}
                onRegistered={(seatsRemaining) =>
                  setEvent((current) =>
                    current
                      ? {
                          ...current,
                          seatsRemaining,
                          registered: current.registered + 1,
                        }
                      : current,
                  )
                }
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
