import { cn } from "@/lib/utils"
import { dayOfMonth, monthShort } from "@/lib/format"

export function DateBlock({
  date,
  className,
}: {
  date: string
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/40",
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {monthShort(date)}
      </span>
      <span className="text-lg font-semibold leading-none tracking-tight">
        {dayOfMonth(date)}
      </span>
    </div>
  )
}
