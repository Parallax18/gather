import { ArrowRight, CalendarPlus, ClipboardList, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { EventCard } from "@/components/EventCard"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useSession } from "@/lib/session"
import type { Event } from "@/lib/types"

const features = [
  {
    icon: CalendarPlus,
    title: "Publish in seconds",
    body: "Add a title, date, place, and seat count. Your event is live on the public page immediately.",
  },
  {
    icon: Users,
    title: "Seats, handled",
    body: "Every signup updates the count, and the last seat is reserved once — even when two people click at the same time.",
  },
  {
    icon: ClipboardList,
    title: "Know who's coming",
    body: "Open the attendee list for any event and see names and emails in one place.",
  },
]

export function LandingPage() {
  const { organizer } = useSession()
  const [events, setEvents] = useState<Event[] | null>(null)

  useEffect(() => {
    let cancelled = false

    api
      .listEvents()
      .then((data) => {
        if (!cancelled) setEvents(data.events.slice(0, 3))
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="animate-fade-in">
      <section className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -mx-5 bg-[radial-gradient(ellipse_at_top,rgba(94,106,210,0.16),transparent_65%)] sm:-mx-10"
        />
        <div className="relative mx-auto max-w-3xl pb-16 pt-6 text-center sm:pb-24 sm:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Now taking registrations
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">
            Events, without the busywork.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Gather gives small teams one clean place to publish events, reserve
            seats, and see who's coming. No spreadsheets, no chasing replies.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/events">
                Browse events
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to={organizer ? "/organizer" : "/signup"}>
                {organizer ? "Open your dashboard" : "Become an organizer"}
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free to use. Takes about a minute to set up.
          </p>
        </div>
      </section>

      {events && events.length > 0 && (
        <section className="border-t pt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Happening soon</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A few seats are still open.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/events">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-14 grid gap-8 border-t pt-12 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/40">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="mt-3 text-sm font-medium">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-14 flex flex-col items-start justify-between gap-5 rounded-2xl border bg-muted/30 p-7 sm:flex-row sm:items-center sm:p-9">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Hosting something soon?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an organizer account and publish your first event today.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to={organizer ? "/organizer" : "/signup"}>
            {organizer ? "Open your dashboard" : "Become an organizer"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  )
}
