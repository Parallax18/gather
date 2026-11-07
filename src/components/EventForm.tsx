import { Loader2 } from "lucide-react"
import { useState, type ChangeEvent, type FormEvent } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import { toDateTimeLocal } from "@/lib/format"
import type { Event, EventInput, FieldErrors } from "@/lib/types"

interface EventFormProps {
  initial?: Event | null
  submitLabel: string
  onSubmit: (input: EventInput) => Promise<void>
  onCancel: () => void
}

interface FormValues {
  title: string
  description: string
  date: string
  location: string
  capacity: string
}

const emptyValues: FormValues = {
  title: "",
  description: "",
  date: "",
  location: "",
  capacity: "20",
}

function initialValues(event?: Event | null): FormValues {
  if (!event) return emptyValues
  return {
    title: event.title,
    description: event.description,
    date: toDateTimeLocal(event.date),
    location: event.location,
    capacity: String(event.capacity),
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  )
}

export function EventForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [values, setValues] = useState<FormValues>(() => initialValues(initial))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function bind(field: keyof FormValues) {
    return (changeEvent: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(field, changeEvent.target.value)
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setMessage("")
    setErrors({})

    const clientErrors: FieldErrors = {}
    if (values.title.trim().length < 3) {
      clientErrors.title = "Title must be at least 3 characters."
    }
    if (values.description.trim().length < 10) {
      clientErrors.description = "Description must be at least 10 characters."
    }
    if (!values.date || Number.isNaN(Date.parse(values.date))) {
      clientErrors.date = "Choose a valid date and time."
    }
    if (values.location.trim().length < 2) {
      clientErrors.location = "Enter a location."
    }
    const capacity = Number(values.capacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      clientErrors.capacity = "Capacity must be a whole number of at least 1."
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        date: new Date(values.date).toISOString(),
        location: values.location.trim(),
        capacity,
      })
    } catch (cause) {
      if (cause instanceof ApiError) {
        setMessage(cause.message)
        setErrors(cause.fields)
      } else {
        setMessage("Something went wrong. Please try again.")
      }
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Design Systems Meetup"
          value={values.title}
          onChange={bind("title")}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What is this event about? Who is it for?"
          value={values.description}
          onChange={bind("description")}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date and time</Label>
          <Input
            id="date"
            type="datetime-local"
            value={values.date}
            onChange={bind("date")}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? "date-error" : undefined}
          />
          <FieldError id="date-error" message={errors.date} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            max={10000}
            inputMode="numeric"
            value={values.capacity}
            onChange={bind("capacity")}
            aria-invalid={Boolean(errors.capacity)}
            aria-describedby={errors.capacity ? "capacity-error" : undefined}
          />
          <FieldError id="capacity-error" message={errors.capacity} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="The Foundry, 12 Bridge Street"
          value={values.location}
          onChange={bind("location")}
          aria-invalid={Boolean(errors.location)}
          aria-describedby={errors.location ? "location-error" : undefined}
        />
        <FieldError id="location-error" message={errors.location} />
      </div>

      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
