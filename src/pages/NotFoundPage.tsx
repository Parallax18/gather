import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        This page doesn't exist
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link may be broken, or the event may have been removed.
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
