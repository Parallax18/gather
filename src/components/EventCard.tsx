import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { DateBlock } from "@/components/DateBlock"
import { Badge } from "@/components/ui/badge"
import { formatEventDate, seatsLabel } from "@/lib/format"
import type { Event } from "@/lib/types"

function seatsVariant(event: Event) {
  if (event.seatsRemaining <= 0) return "destructive" as const
  if (event.seatsRemaining <= 3) return "warning" as const
  return "muted" as const
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col rounded-xl border bg-card p-5 transition-all duration-200 hover:border-foreground/20 hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <DateBlock date={event.date} />
        <Badge variant={seatsVariant(event)}>
          {seatsLabel(event.seatsRemaining)}
        </Badge>
      </div>

      <h2 className="mt-4 text-[15px] font-semibold tracking-tight">
        {event.title}
      </h2>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {event.description}
      </p>

      <div className="mt-4 flex items-end justify-between gap-4 border-t pt-3">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{formatEventDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-70" />
      </div>
    </Link>
  )
}
