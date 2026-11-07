import { Check, Loader2, MailX, TicketX } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, ApiError } from "@/lib/api"
import type { Event, FieldErrors } from "@/lib/types"

interface RegisterFormProps {
  event: Event
  onRegistered: (seatsRemaining: number) => void
}

export function RegisterForm({ event, onRegistered }: RegisterFormProps) {
  const [values, setValues] = useState({ name: "", email: "" })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState<{ name: string; email: string } | null>(
    null,
  )

  function update(field: "name" | "email", value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(reactEvent: React.FormEvent<HTMLFormElement>) {
    reactEvent.preventDefault()
    setMessage("")
    setErrors({})

    const clientErrors: FieldErrors = {}
    if (values.name.trim().length < 2) {
      clientErrors.name = "Enter your name."
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      clientErrors.email = "Enter a valid email address."
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      const result = await api.register(event.id, {
        name: values.name.trim(),
        email: values.email.trim(),
      })
      onRegistered(result.seatsRemaining)
      setConfirmed({ name: values.name.trim(), email: values.email.trim() })
      setValues({ name: "", email: "" })
    } catch (cause) {
      if (cause instanceof ApiError) {
        setMessage(cause.message)
        setErrors(cause.fields)
      } else {
        setMessage("Something went wrong. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (event.isPast) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <MailX className="h-7 w-7 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Registration closed</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This event has already taken place.
        </p>
      </div>
    )
  }

  if (event.seatsRemaining <= 0 && !confirmed) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <TicketX className="h-7 w-7 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">This event is sold out</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Every seat is taken. Check back in case a spot opens up.
        </p>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
          <Check className="h-5 w-5 text-success" />
        </div>
        <h3 className="mt-4 text-base font-semibold tracking-tight">
          You're registered
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Your seat is saved for <span className="text-foreground">{confirmed.name}</span>{" "}
          (<span className="text-foreground">{confirmed.email}</span>).
        </p>
        <Button
          variant="outline"
          className="mt-5 w-full"
          onClick={() => setConfirmed(null)}
        >
          Register another person
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Jordan Lee"
          value={values.name}
          onChange={(inputEvent) => update("name", inputEvent.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={
            errors.name
              ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25"
              : undefined
          }
        />
        {errors.name && (
          <p id="name-error" className="text-xs text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jordan@example.com"
          value={values.email}
          onChange={(inputEvent) => update("email", inputEvent.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={
            errors.email
              ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25"
              : undefined
          }
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Reserving…" : "Reserve a seat"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        No account needed — just your name and email.
      </p>
    </form>
  )
}
