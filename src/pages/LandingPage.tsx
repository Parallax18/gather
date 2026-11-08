import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  MapPin,
  MoveUpRight,
  Sparkles,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { EventCard } from "@/components/EventCard"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { formatEventDate } from "@/lib/format"
import { useSession } from "@/lib/session"
import type { Event } from "@/lib/types"

const features = [
  {
    number: "01",
    icon: CalendarPlus,
    title: "Make it happen",
    body: "Give your gathering a time, a place, and a little context. Your page is ready to share.",
  },
  {
    number: "02",
    icon: Users,
    title: "Save everyone a seat",
    body: "Know how many people are coming. We’ll keep the headcount honest as the list grows.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Be there, together",
    body: "One tidy place for the details and the people. Less admin, more looking forward to it.",
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

  const spotlight = events?.[0]

  return (
    <div className="animate-fade-in">
      <section className="grid items-center gap-10 pb-16 pt-3 sm:pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pt-8">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d96d4c]" />
            Good things are better together
          </div>

          <h1 className="font-editorial mt-7 max-w-2xl text-[3.4rem] leading-[0.98] sm:text-7xl lg:text-[5.5rem]">
            Make a little
            <br />
            <span className="relative inline-block text-[#c65d40]">
              room for
              <svg
                aria-hidden="true"
                className="absolute -bottom-2 left-0 h-3 w-full text-[#d98b69]"
                viewBox="0 0 260 12"
                fill="none"
              >
                <path d="M3 8.5C69 2 175 1.5 257 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
            <br />
            good things.
          </h1>

          <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            The little details that bring people together, all in one place. Put
            your next gathering on the calendar and let the good part begin.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-6 shadow-[0_8px_20px_-10px_rgba(35,43,35,0.6)]">
              <Link to="/events">
                Find your next thing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-border bg-card/70 px-6">
              <Link to={organizer ? "/organizer" : "/signup"}>
                {organizer ? "Open your studio" : "Host something"}
              </Link>
            </Button>
          </div>

          <div className="mt-9 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex -space-x-2" aria-hidden="true">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-[#e6b09a] text-[9px] font-semibold text-[#54352a]">M</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-[#a7b49b] text-[9px] font-semibold text-[#2d4234]">J</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-[#e7d18d] text-[9px] font-semibold text-[#554821]">A</span>
            </div>
            <span>Small plans. Lovely people. No fuss.</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-[#e5ded0]/70 blur-2xl" />
          <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-[#d77857] p-5 shadow-[0_30px_80px_-40px_rgba(115,58,40,0.6)] sm:min-h-[500px] sm:p-7">
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(#fff6e9 0.8px, transparent 0.8px)", backgroundSize: "15px 15px" }} />
            <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[1px] border-[#fff3df]/40 sm:h-96 sm:w-96" />
            <div className="absolute -right-4 -top-8 h-60 w-60 rounded-full border-[1px] border-[#fff3df]/30 sm:h-80 sm:w-80" />
            <div className="absolute -right-5 top-6 h-48 w-48 rounded-full bg-[#e9aa79] sm:right-4 sm:top-10 sm:h-60 sm:w-60" />
            <div className="absolute right-12 top-16 flex h-32 w-32 rotate-[-12deg] items-center justify-center rounded-full border border-[#f8dfbd]/70 text-center text-[#613c31] sm:right-24 sm:top-24 sm:h-40 sm:w-40">
              <div>
                <span className="font-editorial block text-4xl sm:text-5xl">♡</span>
                <span className="mt-1 block text-[9px] uppercase tracking-[0.2em]">come as you are</span>
              </div>
            </div>

            <div className="absolute left-7 top-7 z-10 text-[10px] font-medium uppercase tracking-[0.2em] text-[#fff4e4]/85 sm:left-9 sm:top-9">
              Gather / 001
            </div>
            <div className="absolute bottom-32 left-8 z-10 max-w-[260px] text-[#fff5e7] sm:bottom-36 sm:left-10">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#ffe0c7]/90">A good excuse to get together</p>
              <p className="font-editorial mt-3 text-4xl leading-[0.98] sm:text-5xl">The best plans start with hello.</p>
            </div>

            <div className="absolute bottom-5 left-5 right-5 z-20 rotate-[-2deg] rounded-2xl border border-white/60 bg-[#fbf7ed] p-4 shadow-[0_20px_35px_-20px_rgba(60,34,25,0.55)] sm:bottom-7 sm:left-8 sm:right-8 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8e4d8] text-[#324238]">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b4654a]">Your next gathering</p>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold tracking-tight text-[#29372e]">
                      {spotlight?.title ?? "A table full of good ideas"}
                    </p>
                  </div>
                </div>
                <MoveUpRight className="mt-1 h-4 w-4 shrink-0 text-[#6e7d70]" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#e6e1d6] pt-3 text-[11px] text-[#70796e]">
                <span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" />{spotlight?.location ?? "Somewhere around the corner"}</span>
                <span className="ml-3 shrink-0 font-medium text-[#34473a]">{spotlight ? formatEventDate(spotlight.date) : "Soon, hopefully"}</span>
              </div>
            </div>

            <div className="absolute right-7 top-[46%] z-10 flex h-12 w-12 rotate-12 items-center justify-center rounded-full bg-[#384f41] text-[#f8e9cf] shadow-lg sm:right-10">
              <ArrowDownRight className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute -bottom-5 -left-2 -z-10 h-24 w-24 rounded-full bg-[#aab5a0]/70 blur-2xl" />
        </div>
      </section>

      <section className="border-t border-border/80 py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">A softer way to get together</p>
          <p className="text-xs text-muted-foreground">For the big nights and the just-because ones.</p>
        </div>
      </section>

      {events && events.length > 0 && (
        <section className="pb-14 pt-8 sm:pb-20">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#bd6547]">On the calendar</p>
              <h2 className="font-editorial mt-2 text-3xl sm:text-4xl">A few good things coming up.</h2>
            </div>
            <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
              <Link to="/events">See every event <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
          <Button asChild variant="outline" className="mt-5 w-full rounded-full sm:hidden">
            <Link to="/events">See every event <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </section>
      )}

      <section className="grid gap-4 border-t border-border/80 py-12 sm:grid-cols-3 sm:gap-7 sm:py-16">
        {features.map(({ number, icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-border/75 bg-card/65 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="font-editorial text-2xl text-[#c66a4c]">{number}</span>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="mt-7 text-base font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#344a3b] px-6 py-9 text-[#f9f4e9] sm:flex sm:items-center sm:justify-between sm:px-10 sm:py-11">
        <div className="absolute -right-12 -top-32 h-72 w-72 rounded-full border border-[#d8dfc8]/15 sm:right-24" />
        <div className="relative max-w-lg">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#d7cba9]">Your people are out there</p>
          <h2 className="font-editorial mt-3 text-3xl leading-tight sm:text-4xl">You bring them together. We’ll mind the details.</h2>
          <p className="mt-3 text-sm leading-6 text-[#d7dfd4]/75">Create your organizer space and put the first date on the calendar.</p>
        </div>
        <Button asChild size="lg" variant="secondary" className="relative mt-6 h-12 rounded-full bg-[#f5e9d5] px-6 text-[#344a3b] hover:bg-white sm:mt-0">
          <Link to={organizer ? "/organizer" : "/signup"}>
            {organizer ? "Open your studio" : "Start a gathering"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  )
}
