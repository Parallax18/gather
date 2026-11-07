import { Loader2 } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"

import { AuthShell } from "@/components/AuthShell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, ApiError } from "@/lib/api"
import { useSession } from "@/lib/session"
import type { FieldErrors } from "@/lib/types"

export function LoginPage() {
  const { organizer, setOrganizer } = useSession()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fields, setFields] = useState<FieldErrors>({})
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (organizer) return <Navigate to="/organizer" replace />

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setMessage("")
    setFields({})

    const clientErrors: FieldErrors = {}
    if (!email.trim()) clientErrors.email = "Enter your email."
    if (!password) clientErrors.password = "Enter your password."
    if (Object.keys(clientErrors).length > 0) {
      setFields(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      const data = await api.login({ email: email.trim(), password })
      setOrganizer(data.organizer)
      navigate("/organizer", { replace: true })
    } catch (cause) {
      if (cause instanceof ApiError) {
        setMessage(cause.message)
        setFields(cause.fields)
      } else {
        setMessage("Something went wrong. Please try again.")
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your events and attendees."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-medium text-foreground hover:underline">
            Create an organizer account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(inputEvent) => setEmail(inputEvent.target.value)}
            aria-invalid={Boolean(fields.email)}
          />
          {fields.email && (
            <p className="text-xs text-destructive">{fields.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(inputEvent) => setPassword(inputEvent.target.value)}
            aria-invalid={Boolean(fields.password)}
          />
          {fields.password && (
            <p className="text-xs text-destructive">{fields.password}</p>
          )}
        </div>

        {message && (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
        Demo account:{" "}
        <code className="rounded bg-muted px-1 py-0.5">organizer@gather.local</code>{" "}
        / <code className="rounded bg-muted px-1 py-0.5">organizer</code>
      </p>
    </AuthShell>
  )
}
