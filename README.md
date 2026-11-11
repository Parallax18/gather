# Gather

A small, clean event management app. Browse upcoming events, reserve a seat with
just your name and email, and manage everything from an organizer dashboard.

Built with **Hono**, **React**, **Tailwind CSS**, **shadcn/ui**, and **SQLite**.

## Features

- Landing page with a product intro, upcoming events, and calls to action
- Public list of upcoming events with seats remaining
- Event detail page with date, location, capacity, and registration form
- Organizer signup and sign-in with email and password
- Each organizer manages only their own events
- Organizer dashboard for creating, editing, and deleting events
- Attendee list per event
- Server-side validation with clear success and error messages
- Responsive UI with a minimal, Linear-inspired look
- SQLite storage with a unique constraint per event and email

## Requirements

- Node.js 20 or newer
- npm

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.

The API runs on port `8787` and the Vite dev server proxies `/api` requests to
it. On first run, three sample events are added so the app is not empty.

## Organizer access

Create an account at **http://localhost:5173/signup**, or use the seeded demo
account:

```
Email:    organizer@gather.local
Password: organizer
```

The demo account owns the sample events. New accounts start with an empty
dashboard and manage only the events they create.

## Production build

```bash
npm run build
npm start
```

The Hono server serves the built frontend and the API together at
**http://localhost:8787**.

## Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Run the API and Vite dev server together          |
| `npm run build`     | Build the frontend into `dist/`                   |
| `npm start`         | Serve the built app and API (port 8787)           |
| `npm run typecheck` | Type-check the whole project                      |
| `npm run db:reset`  | Delete the local database; it is reseeded on next start |

## Configuration

All settings are optional. Copy `.env.example` to `.env` to use them.

| Variable        | Default          | Purpose                                        |
| --------------- | ---------------- | ---------------------------------------------- |
| `PORT`          | `8787`           | API / production server port                   |
| `SEED`          | `true`           | Set to `false` to start with no sample events  |
| `DB_PATH`       | `data/gather.db` | SQLite file location                           |
| `COOKIE_SECURE` | `false`          | Set to `true` when serving over HTTPS          |

## Project structure

```
server/
  index.ts        Hono app, routes, static file serving
  db.ts           SQLite connection, schema, sample data
  events.ts       Event and registration queries
  organizers.ts   Organizer accounts
  auth.ts         Organizer sessions and route protection
  passwords.ts    Password hashing and verification
  validation.ts   Zod schemas for request bodies
src/
  pages/          Landing, events, event detail, login, signup, organizer, 404
  components/     Event cards, forms, dialogs, auth shell, shadcn/ui primitives
  lib/            API client, session context, types, formatting helpers
data/             SQLite database (created at runtime, git-ignored)
```

## Notes

- The database is created automatically at `data/gather.db`.
- Passwords are hashed with scrypt and a per-account salt.
- Sessions are kept in memory, so restarting the server signs organizers out.
- This is a local demo app. Before using it for anything real, review the
  authentication, input handling, and concurrency behaviour for your needs.
