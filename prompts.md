# Gather — Workshop Prompts

Repo: https://github.com/Parallax18/gather.git

---

## Prompt 1 — Build Gather

Build Gather, a simple event management web application.

Features:
- A polished landing page that introduces the product, shows upcoming events, and links to the events list and organizer signup.
- Display a list of upcoming events.
- Show event details, including title, description, date, location, and available seats.
- Allow users to register for an event using their name and email.
- Organizer accounts: sign up with name, email, and password, then sign in to manage events.
- Provide an organizer interface to create, edit, and delete events. Organizers only manage their own events.
- Show the list of attendees for each event.

Tech stack:
- Hono and React.
- Tailwind CSS and shadcn/ui for the interface.
- SQLite for persistent storage.

Make the UI clean, modern, responsive, and inspired by **Linear's** minimalist design.

Set up the application so it can run locally. Include basic form validation and clear success and error messages. Create a README with setup instructions.

---

## Prompt 2 — Investigate the system

Act as a senior software engineer reviewing this application.

Investigate the existing codebase to determine how it works and identify correctness, reliability, security, and maintainability risks.

Pay particular attention to:
1. Duplicate event registrations.
2. Two people registering for the last available seat simultaneously.
3. Unauthorized access to organizer functionality and attendee data.
4. Invalid input and unexpected failures.
5. Repeated requests, including retries.
6. Events being edited or deleted after registrations exist.
7. UI pitfalls

For each finding:
- Explain the scenario and its potential impact.
- Identify the relevant files and code.
- Distinguish confirmed issues from potential risks that need further verification.
- Describe how to reproduce the issue or test whether it exists.
- Recommend a solution and explain the trade-offs.

Do not modify any files. Do not assume a feature is secure merely because the UI hides it. Inspect the server-side implementation and database constraints where relevant.

End with a prioritized list of findings.

---

## Engineering challenges

- [ ] Prevent duplicate registrations.
- [ ] Enforce event capacity correctly.
- [ ] Protect organizer operations on the server.
- [ ] Validate untrusted input.
- [ ] Handle failures without exposing sensitive information.
- [ ] Test retries and repeated requests.
- [ ] Review dependencies, secrets and unsafe agent actions.

---

## The workflow

1. **Define** — Eg: Should an attendee be able to edit an event or register for one event twice?
2. **Investigate** — Eg: Where is this rule currently enforced, if at all?
3. **Plan** — Eg: Ask the agent to propose the smallest reliable solution.
4. **Challenge** — Eg: Is application-level validation sufficient? What if two requests arrive simultaneously?
5. **Implement** — Eg: Approve the plan and let the agent make the changes.
6. **Verify** — Eg: Run tests, inspect the diff and try the relevant failure scenarios.
