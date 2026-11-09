# Gather — senior engineering review

Reviewed: 9 November 2026

## Scope and method

I reviewed the whole app: Hono routes, SQLite schema and queries, auth/session code, validation, and the React UI. I ran it against a throwaway database outside the repo, exercised the risky paths with `curl`, and ran `npm audit`. I did not modify any project files, and the review server is stopped. The unrelated untracked files in the working tree (`deckwork/`, the PDF/PPTX) were left untouched.

**Short version:** the core invariants are genuinely enforced — duplicate registrations are blocked by a database constraint, the last seat is safe under concurrent requests in the single-process setup, and organizer/attendee access is properly scoped on the server. The real risks are operational: a known demo password, no rate limiting, unbounded request bodies, retry semantics that confuse users, and destructive edits/deletes with no notification or undo.

---

## How it works

- **Server:** Hono on Node, SQLite via `better-sqlite3`. Sessions live in an in-memory `Map`, referenced by an HttpOnly cookie. Organizer accounts are in SQLite, passwords hashed with scrypt.
- **Trust boundary:** public can read events and register. `/api/organizer/*` requires a session; events are scoped by `organizer_id` in the query itself.
- **Registration:** a synchronous `BEGIN IMMEDIATE` transaction checks capacity, then inserts; email is lowercased and `UNIQUE(event_id, email)` is the final guard.
- **UI:** React 18 + Vite, server-side validation mirrored by client checks, dialog-based organizer CRUD.

---

# Findings by focus area

## 1. Duplicate event registrations

### R1 — Retries turn a successful registration into an error — **Confirmed, low**

**Scenario:** the insert commits, but the response is lost (timeout, dropped connection, user refreshes). The user submits again and sees "This email is already registered for this event." Their registration actually exists, but the UI presents it as a failure.

**Evidence:** `server/db.ts:136` (`UNIQUE (event_id, email)`), `server/events.ts:145-176` (returns `duplicate`), `src/components/RegisterForm.tsx:52-58` (renders the 409 as an error).

**Reproduce:**

```bash
curl -s -X POST localhost:8787/api/events/1/registrations \
  -H 'Content-Type: application/json' \
  -d '{"name":"Review User","email":"review@example.com"}'
# 201
# run the same command again → 409 {"message":"This email is already registered..."}
```

**Fix:** make registration idempotent — either accept a client-generated key, or treat "same event + same email" as a neutral success ("You're already on the list"). **Trade-off:** treating 409 as success hides the case where a different person shares that email; an idempotency key needs a small table.

### R2 — Duplicate protection itself is solid — **Confirmed good**

The database constraint plus app-level lowercasing (`server/validation.ts:3-8`) means case variants cannot register twice. Verified: `Review@Example.com` then `review@example.com` → 201 then 409, with the stored email normalized.

---

## 2. Two people taking the last seat

### R3 — Single-process concurrency is correct — **Confirmed good**

Ten simultaneous requests for a one-seat event produced exactly **1×201, 9×409**, and the attendee list contained one person. The `immediate` transaction (`server/events.ts:145-176`) serializes the count-and-insert, so there is no oversell in the default one-process deployment.

### R4 — Capacity edits are check-then-act, not atomic — **Potential, low–medium**

**Scenario:** in a multi-process deployment (two app instances sharing the SQLite file), a registration can commit between `updateEvent`'s count read and its update. If the organizer sets capacity to exactly the count they just read, the event can end up with more registrations than seats.

**Evidence:** `server/events.ts:111-133` — `findEventForOrganizer` and the `UPDATE` are separate operations, outside a transaction.

**Status:** not reproducible in the current single-process setup because all synchronous DB work in a handler runs to completion before another request is handled. It is a real risk only if the app is scaled horizontally.

**Test if needed:** run two servers on the same `DB_PATH`, hammer registrations and a capacity PUT concurrently, then compare `registered` to `capacity`.

**Fix:** wrap the edit in an immediate transaction and make the update conditional on the current count, or enforce capacity with a trigger. **Trade-off:** more serialization; triggers are harder to debug.

### R5 — Capacity exists only in application code — **Confirmed design gap, low**

There is no database constraint or trigger preventing `registrations > capacity`. Any direct write, migration script, or future code path can oversell. For a demo this is acceptable; for production, a trigger is the durable guard. **Trade-off:** trigger maintenance and a little write overhead.

---

## 3. Unauthorized access to organizer features and attendee data

### R6 — Object-level authorization is correct — **Confirmed good**

Verified:

- Anonymous `GET /api/organizer/events` → **401**; anonymous attendee list → **401**.
- Organizer B sees **0** events and gets **404** for organizer A's attendees, `PUT`, and `DELETE`.
- There is no public attendee endpoint (`/api/events/:id/attendees` → 404).

**Evidence:** `server/index.ts:141` mounts `requireOrganizer` on `/api/organizer/*`; ownership is in the SQL predicates (`server/events.ts:27-45`), not in UI hiding.

### R7 — The demo account is always created with a published password — **Confirmed, medium if exposed**

**Scenario:** anyone who can reach the server can sign in as `organizer@gather.local` / `organizer`, see the seeded events, and read attendee names and emails. The credentials are also printed on the login page.

**Evidence:** `server/db.ts:14-18` and `server/db.ts:212-213` create the account unconditionally, even with `SEED=false`; `src/pages/LoginPage.tsx` displays the credentials.

**Impact:** harmless on `localhost` during a workshop; a full account takeover and PII disclosure if the app is ever reachable on a LAN or the internet.

**Fix:** create the demo account only behind an explicit `DEMO=true` flag, or require a password change on first login; never render demo credentials in production. **Trade-off:** workshop convenience.

### R8 — No rate limiting, and password hashing blocks the event loop — **Confirmed, medium**

**Scenario:** repeated login/signup attempts are unlimited (six wrong passwords → six 401s, no 429). Each attempt runs synchronous scrypt, measured at **40–48 ms**; enough concurrent attempts can stall all other requests.

**Evidence:** no rate-limit middleware anywhere in `server/`; `server/passwords.ts` uses `scryptSync` for both hash and verify.

**Fix:** rate limit auth and signup (per IP + per account), add backoff/lockout, and switch to async `scrypt` so the event loop is not blocked. **Trade-off:** a limiter needs shared state if scaled beyond one process.

### R9 — Account enumeration via signup and login timing — **Confirmed, low**

- Signup returns **409 "An account with this email already exists"**, directly confirming an email is registered.
- Login timing differs sharply: existing email + wrong password ≈ **43 ms**; unknown email ≈ **1 ms**, because unknown users skip scrypt (`server/organizers.ts` returns before hashing).

**Fix:** always run a dummy hash for unknown emails; make signup responses generic and verify ownership by email. **Trade-off:** slightly slower logins and extra email infrastructure.

### R10 — Missing security headers and non-secure cookie default — **Confirmed, low–medium**

No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or HSTS. The session cookie is `HttpOnly; SameSite=Lax` but has no `Secure` flag unless `COOKIE_SECURE=true`.

**Impact:** clickjacking of the organizer UI is possible (delete/edit actions are behind a confirm dialog, but the frame can still be used to trick clicks). If deployed over HTTPS without the env flag, the cookie can travel over plain HTTP.

**Fix:** add a small headers middleware with `frame-ancestors 'none'` and `nosniff`; default `secure` to true when `NODE_ENV=production`. **Trade-off:** CSP needs care with inline styles/assets.

**Positive:** SameSite=Lax plus JSON-only request bodies and no CORS makes classic CSRF low-risk here; all state-changing routes are non-GET.

---

## 4. Invalid input and unexpected failures

### R11 — Request bodies are unbounded — **Confirmed, low–medium**

A 2 MB JSON body was fully read and parsed, then rejected by Zod with a 400. There is no 413 and no body limit. A larger or repeated payload can consume memory/CPU.

**Evidence:** `server/index.ts:46-52` (`readJson`), no `bodyLimit` middleware.

**Fix:** add Hono's body-limit middleware (e.g. 64 KB); legitimate event descriptions are capped at 2,000 chars. **Trade-off:** pick a limit that leaves room for future fields.

### R12 — Date validation is syntactic only — **Confirmed, low**

`date: "0"` passes the refine check and is stored as `1999-12-31T23:00:00.000Z`; the event is immediately "past." Past dates are also accepted on create and edit.

**Evidence:** `server/validation.ts:24-27` (`Date.parse` only); `server/events.ts:56` decides past/future at read time.

**Impact:** malformed or surprising dates create invisible events; a moved-to-past event silently disappears from the public list.

**Fix:** require strict ISO 8601 with a timezone, reject or explicitly confirm past dates at creation, and warn when editing an event into the past. **Trade-off:** stricter API for non-browser clients.

### R13 — Input handling and failure responses are otherwise sound — **Confirmed good**

- Prepared statements everywhere; no string-built SQL.
- Zod whitelists fields and strips unknown keys, including `organizer_id`.
- React escapes all user text; no `dangerouslySetInnerHTML`.
- Malformed JSON becomes field errors (400), not a stack trace.
- Unhandled errors return a generic 500 while logging server-side (`server/index.ts:227`); no internal details leak.
- `parseId` rejects non-numeric and oversized IDs.

### R14 — No request IDs or structured logging — **Low**

`hono/logger` prints method, path, status, and duration. There is no correlation ID, so tracing a failed registration across logs is manual. **Fix:** request ID middleware and JSON logs. **Trade-off:** small amount of plumbing.

---

## 5. Repeated requests and retries

### R15 — Event creation is not idempotent — **Confirmed, medium**

Posting the same create request twice produced **two events** (IDs 6 and 7, identical title). A timeout-then-retry by the organizer silently duplicates the event.

**Evidence:** `POST /api/organizer/events` (`server/index.ts:146-165`) has no idempotency key or natural-key check.

**Reproduce:** send the same event JSON twice and list the organizer's events.

**Fix:** client-generated idempotency key stored with the event, or a draft/duplicate warning. **Trade-off:** schema change; a title+date uniqueness rule would wrongly block legitimate repeats.

### R16 — Delete retry reports failure after success — **Confirmed, low**

Deleting the same event twice gives 200 then **404**, and the UI shows "Event not found" even though the intended end state (deleted) is true.

**Evidence:** `server/index.ts:198-206`; `src/pages/OrganizerPage.tsx:119-135`.

**Fix:** treat a 404 on delete as success in the client, or make the endpoint idempotent. **Trade-off:** this can mask a genuinely missing event; acceptable for delete.

### R17 — Signup retry leads to a dead end — **Confirmed, low**

If the account was created but the response was lost, retrying signup says "An account with this email already exists" without pointing the user to sign in. **Fix:** when signup returns 409, offer a direct "Sign in instead" link with the email prefilled. **Trade-off:** none significant.

### R18 — In-flight double-submit is blocked — **Confirmed good**

All forms disable their submit button while pending (`RegisterForm`, `EventForm`, login, signup), so accidental double-clicks in one tab do not create duplicates. Network-level retries remain a server concern (R1, R15).

---

## 6. Events edited or deleted after registrations exist

### R19 — Deletion silently destroys registrations — **Confirmed, medium**

Deleting an event with two registrations removed both rows immediately (`before=2`, `after=0`) and there is no undo, soft delete, audit record, or attendee notification. Attendees have no way to know the event is gone.

**Evidence:** `server/db.ts` uses `ON DELETE CASCADE`; `server/events.ts:39-40`; UI confirmation at `src/pages/OrganizerPage.tsx:323-359` says it cannot be undone, but that is the only safeguard.

**Fix:** soft delete/archive with a grace period, plus an email or in-app notice to registrants. **Trade-off:** more schema and a scheduled cleanup job.

### R20 — Silent edits change what people signed up for — **Confirmed, medium**

A capacity reduction below the registered count is correctly blocked (**409**, verified). But the date can be moved into the past (**200**, verified), which hides the event from the public list and closes registration while keeping the registrations. Title, description, and location can also change with no notice.

**Evidence:** `server/events.ts:111-133` only guards capacity; `listEvents` filters `date >= now` (`server/events.ts:59-66`).

**Fix:** warn/confirm on past dates, notify registrants of material changes, keep an edit history. **Trade-off:** notifications require email infrastructure, which the app deliberately lacks.

### R21 — Delete/registration races are safe — **Confirmed good**

Registrations and deletes are serialized by SQLite and the foreign key cascade. A registration either succeeds and is then removed with the event, or fails with "Event not found." No orphan registrations were observed.

---

## 7. UI pitfalls

### R22 — Stale seat count after a rejected registration — **Confirmed by code, low**

If the event fills up while the form is open, submitting shows "This event is full" but the card still displays the old seat count; there is no refetch. The user has to reload to see "Sold out."

**Evidence:** `src/components/RegisterForm.tsx:52-61` only surfaces the message; `src/pages/EventDetailPage.tsx` updates state only on success.

**Fix:** on 409, refetch the event (or apply `seatsRemaining: 0`). **Trade-off:** one extra request.

### R23 — Dialogs discard unsaved work — **Confirmed by code, low**

The event form lives inside a Radix dialog with default behavior: clicking outside or pressing Escape closes it and loses entered fields.

**Evidence:** `src/pages/OrganizerPage.tsx:293-315`; no `onInteractOutside`/`onEscapeKeyDown` guard.

**Fix:** confirm before closing a dirty form. **Trade-off:** slightly more friction.

### R24 — Attendee dialog can show stale data — **Confirmed by code, low**

It fetches once when opened and keeps the `event` prop passed in; if the event is renamed or registrations change while the dialog is open, the title/count do not update.

### R25 — No pagination or live refresh — **Confirmed, low at demo scale**

All upcoming events and all attendees are returned in one response and rendered; there is no polling or refresh. Fine for a workshop, a problem at hundreds of events/attendees.

### R26 — Error states are inconsistent — **Low**

`EventsPage` shows an alert but no retry button; the landing page silently hides "Happening soon" on failure; the organizer page does offer Retry. **Fix:** a shared retry pattern.

### R27 — Possible mobile nav overflow at very narrow widths — **Potential, low**

The header fits "Events / Sign in / Get started" plus the brand; at ~320 px it is close to the available width. I did not visually verify this in a browser, so treat it as a layout risk to check, not a confirmed bug.

### R28 — Minor accessibility gaps — **Low**

Some auth-form error messages are not linked to their inputs with `aria-describedby`; the register and event forms do this better. Labels, dialog titles, and focus rings are present.

---

## 8. Dependencies, secrets, and maintainability

### R29 — Four audit advisories — **Confirmed versions, low practical exploitability here**

`npm audit` reports:

- **zod (high)** — memory exhaustion with oversized unconstrained array schemas. Gather uses only flat object schemas, so this specific vector is not reachable.
- **react-router / react-router-dom (moderate)** — open redirect via backslash and an SSR hydration issue. All navigation targets are static and there is no SSR, so not exploitable here.
- **@hono/node-server (moderate)** — `serveStatic` double-decodes paths and can bypass middleware on a static prefix. The advisory explicitly says apps serving only public files are unaffected; Gather's static files are public and the auth middleware is on `/api`, not the static prefix. Traversal attempts returned the SPA fallback, not files outside `dist`.

**Fix:** upgrade all three; each fix is a major version, so regression-test first. **Trade-off:** breaking-change risk versus staying on flagged versions.

### R30 — Database file is world-readable — **Confirmed, low**

`data/gather.db` is created with mode `644`; it contains attendee names/emails and password hashes. On a shared machine, other local users can read it. **Fix:** create the directory `0700` and the file `0600`, run under a dedicated OS user. **Trade-off:** deployment-specific.

### R31 — No automated tests — **Confirmed, medium for maintainability**

There is no test suite or CI. The concurrency and authorization properties I verified were manual. These are exactly the behaviors that regress silently. **Fix:** integration tests against a temp database covering duplicate registration, last-seat races, ownership 404s, capacity shrink, and delete cascade. **Trade-off:** test harness setup time.

### R32 — Duplicated rules and types across client/server — **Low**

Email/date/field rules exist twice (`server/validation.ts`, `src/components/EventForm.tsx`, `src/pages/SignupPage.tsx`), and `Event` is declared separately on both sides. Drift is likely. **Fix:** shared validation module or generated types. **Trade-off:** build complexity.

### R33 — Sessions and migrations are demo-grade — **Low**

Sessions are in memory (restart signs everyone out) and expired entries are only swept when a new session starts (`server/auth.ts`), so they accumulate until the next login. The schema migration is ad hoc at startup (`server/db.ts`); two processes starting against an old database could race. `seed()` re-adds sample events whenever the events table is empty, so deleting all events and restarting brings the demo data back.

**Fix:** a real session store if multi-instance, a migration tool/version table, and an explicit seed-complete flag. **Trade-off:** operational dependencies versus demo simplicity.

### R34 — No account recovery, email verification, or registration removal — **Product gaps**

There is no password reset, email verification, attendee cancellation, or no-show removal. These are reasonable omissions for a workshop app, but they matter before real use.

---

## What held up well

| Property | Result |
| --- | --- |
| Duplicate registrations (case variants) | Blocked by DB constraint |
| Last-seat race, single process | 1 winner, 9 rejections, no oversell |
| Anonymous organizer access | 401 |
| Cross-organizer attendee/edit/delete | 404 |
| Public attendee endpoint | Does not exist |
| Capacity shrink below registrations | 409 |
| Delete cascade | Registrations removed with event |
| SQL injection | Parameterized queries throughout |
| Stored XSS | React escaping; no raw HTML |
| Error leakage | Generic 500; validation details only |
| Password storage | scrypt with per-account salt |
| Session cookie | HttpOnly, SameSite=Lax, 256-bit token |

---

## Prioritized list

### P1 — fix before the app is reachable beyond localhost

1. **R7** Known demo credentials always active and displayed.
2. **R8** No rate limiting + blocking scrypt (brute force / event-loop DoS).
3. **R11** Unbounded request bodies.
4. **R10** Missing security headers; `Secure` cookie off by default.

### P2 — correctness, data safety, and confusing behavior

5. **R19/R20** Destructive delete with no undo/notice; silent past-date and material edits.
6. **R1** Registration retry reports success as an error.
7. **R15** Event creation retry creates duplicates.
8. **R4/R5** Capacity edit race under multiple processes; no DB-level capacity guard.
9. **R9** Email enumeration via signup and login timing.
10. **R29** Dependency advisories (upgrade with regression tests).
11. **R31** No automated tests for the safety-critical paths.

### P3 — hardening and polish

12. **R12** Loose date validation; past dates accepted.
13. **R22/R24** Stale seat counts and attendee data in the UI.
14. **R23** Dialog closes and loses unsaved input.
15. **R30** Database file permissions.
16. **R25/R26** No pagination; inconsistent error/retry states.
17. **R27/R28** Narrow-screen nav risk; minor accessibility gaps.
18. **R32/R33** Duplicated rules/types; demo-grade sessions, migrations, and seeding.

---

## Limits of this review

- I did not run a browser session, so visual/mobile findings (R27) are code-level, not observed.
- The multi-process capacity-edit race (R4) is reasoned from the code and SQLite locking semantics; I did not reproduce it with two server processes.
- No email, payment, or external integration exists, so those surfaces were not reviewed.
- The dependency advisories were assessed against this specific usage, not just the audit labels.
