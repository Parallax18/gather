import type { ReactNode } from "react"
import { Link, NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { initials } from "@/lib/format"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex h-6 w-6 items-center justify-center rounded-[7px] bg-gradient-to-br from-[#6d78e8] to-[#4b44b4] shadow-sm",
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-white/95" />
      <span className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-white/60" />
    </span>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { organizer, loading } = useSession()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-tight">Gather</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/events"
              className={({ isActive }) =>
                cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              Events
            </NavLink>

            {loading ? (
              <span
                aria-hidden="true"
                className="ml-1 h-8 w-20 animate-pulse rounded-md bg-muted"
              />
            ) : organizer ? (
              <NavLink
                to="/organizer"
                className={({ isActive }) =>
                  cn(
                    "ml-1 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-foreground/20 bg-secondary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )
                }
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {initials(organizer.name)}
                </span>
                Dashboard
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  Sign in
                </NavLink>
                <Button asChild size="sm" className="ml-1">
                  <Link to="/signup">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Gather — a small events demo.</span>
          <span>Hono · React · SQLite</span>
        </div>
      </footer>
    </div>
  )
}
