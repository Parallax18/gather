export interface Event {
  id: number
  organizer_id: number
  title: string
  description: string
  date: string
  location: string
  capacity: number
  created_at: string
  registered: number
  seatsRemaining: number
  isPast: boolean
}

export interface Attendee {
  id: number
  event_id: number
  name: string
  email: string
  created_at: string
}

export interface Organizer {
  id: number
  name: string
  email: string
}

export interface EventInput {
  title: string
  description: string
  date: string
  location: string
  capacity: number
}

export interface SignupInput {
  name: string
  email: string
  password: string
}

export interface FieldErrors {
  [field: string]: string
}
