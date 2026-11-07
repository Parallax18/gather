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

interface SignupValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export function SignupPage() {
  const { organizer, setOrganizer } = useSession()
  const navigate = useNavigate()

  const [values, setValues] = useState<SignupValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [fields, setFields] = useState<FieldErrors>({})
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (organizer) return <Navigate to="/organizer" replace />

  function update(field: keyof SignupValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setMessage("")
    setFields({})

    const clientErrors: FieldErrors = {}
    if (values.name.trim().length < 2) {
      clientErrors.name = "Enter your name."
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      clientErrors.email = "Enter a valid email address."
    }
    if (values.password.length < 8) {
      clientErrors.password = "Password must be at least 8 characters."
    }
    if (values.confirmPassword !== values.password) {
      clientErrors.confirmPassword = "Passwords don't match."
    }
    if (Object.keys(clientErrors).length > 0) {
      setFields(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      const data = await api.signup({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
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
      title="Create an organizer account"
      subtitle="Publish your first event in a couple of minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Jordan Lee"
            value={values.name}
            onChange={(inputEvent) => update("name", inputEvent.target.value)}
            aria-invalid={Boolean(fields.name)}
          />
          {fields.name && <p className="text-xs text-destructive">{fields.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={(inputEvent) => update("email", inputEvent.target.value)}
            aria-invalid={Boolean(fields.email)}
          />
          {fields.email && <p className="text-xs text-destructive">{fields.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(inputEvent) => update("password", inputEvent.target.value)}
            aria-invalid={Boolean(fields.password)}
          />
          {fields.password ? (
            <p className="text-xs text-destructive">{fields.password}</p>
          ) : (
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(inputEvent) =>
              update("confirmPassword", inputEvent.target.value)
            }
            aria-invalid={Boolean(fields.confirmPassword)}
          />
          {fields.confirmPassword && (
            <p className="text-xs text-destructive">{fields.confirmPassword}</p>
          )}
        </div>

        {message && (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  )
}
