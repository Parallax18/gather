# Gather

Gather is a small event management app for communities and organizers. Browse local gatherings, save a place with your name and email, and manage your own events from an organizer studio.

## Run locally

Requires Node.js 22.13 or newer. The app uses Node's built-in SQLite module and has no third-party runtime dependencies.

```bash
npm run dev
```

Open [http://localhost:8787](http://localhost:8787). You can also run it directly with `node server.mjs`.

The first run creates `data/gather.db` and adds three example events. Create your own organizer account from **Host an event**. There is no shared demo organizer password.

## Features

- Public landing page and upcoming event list
- Event detail pages with registration, available seats, date, and location
- Organizer signup and sign-in
- Organizer-only event creation, editing, deletion, and attendee lists
- SQLite persistence, duplicate-registration protection, and serialized capacity checks
- Input validation, bounded request bodies, secure password hashing, and session cookies
- Responsive interface with no remote assets or install-time dependencies

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | Local HTTP port |
| `DB_PATH` | `data/gather.db` | SQLite file path |
| `SEED` | `true` | Set to `false` to skip sample events |
| `COOKIE_SECURE` | `false` | Set to `true` when serving over HTTPS |

The server listens on `127.0.0.1` by default for local use. Sessions are persisted in SQLite and expire after 12 hours.

## Project layout

- `server.mjs` — Node HTTP server, SQLite schema, API, authentication, and validation
- `public/index.html` — app shell
- `public/app.js` — browser routes, forms, and API interactions
- `public/styles.css` — responsive visual system and page layouts
- `data/gather.db` — created automatically at runtime (ignored by Git)

## API overview

- `GET /api/events`, `GET /api/events/:id`
- `POST /api/events/:id/registrations`
- `GET /api/auth/session`, `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/organizer/events`, `POST /api/organizer/events`
- `PUT /api/organizer/events/:id`, `DELETE /api/organizer/events/:id`
- `GET /api/organizer/events/:id/attendees`

Organizer endpoints check the session and event ownership on the server. Registration and capacity checks run inside an immediate SQLite transaction, and the database enforces one registration per email per event.
