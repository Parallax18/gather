const app = document.querySelector("#app")
const state = { organizer: null, loading: true, event: null, message: "", busy: false, editEvent: null, formError: "", attendees: null }

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char])
const formatDate = (value, options = {}) => new Intl.DateTimeFormat(undefined, { weekday: options.full ? "long" : "short", month: options.full ? "long" : "short", day: "numeric", ...(options.full ? { year: "numeric" } : {}), hour: "numeric", minute: "2-digit" }).format(new Date(value))
const formatDay = (value) => new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(new Date(value))
const formatMonth = (value) => new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(value)).toUpperCase()
const seatsLabel = (count) => count <= 0 ? "Fully booked" : count === 1 ? "1 place left" : `${count} places left`
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } })
  } catch {
    throw new Error("Can’t reach Gather right now. Check that the server is running and try again.")
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message ?? "Something went wrong. Please try again.")
    error.fields = data.fields ?? {}
    error.status = response.status
    throw error
  }
  return data
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) })
const link = (to, label, extra = "") => `<a ${extra} href="${to}" data-link>${label}</a>`
const icon = (name, size = 18) => {
  const paths = {
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    up: '<path d="M7 17 17 7M7 7h10v10"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/>',
    logout: '<path d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3ZM19 14l1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>',
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ""}</svg>`
}

function brand() {
  return `${link("/", `<span class="brand-mark" aria-hidden="true"><span></span><i></i></span><span class="brand-name">Gather</span>`, 'class="brand"')}`
}

function shell(content) {
  return `<header class="site-header"><div class="nav-wrap">${brand()}<nav aria-label="Main navigation">
    ${link("/events", "Find an event", `class="nav-link ${location.pathname.startsWith("/events") ? "active" : ""}"`)}
    ${state.loading ? '<span class="nav-placeholder"></span>' : state.organizer
      ? `${link("/organizer", `<span class="avatar">${escapeHtml(initials(state.organizer.name))}</span>Studio`, `class="nav-link studio-link ${location.pathname === "/organizer" ? "active" : ""}"`)}<button class="nav-link nav-signout" data-action="logout" aria-label="Sign out">${icon("logout", 16)}</button>`
      : `${link("/login", "Sign in", `class="nav-link ${location.pathname === "/login" ? "active" : ""}"`)}${link("/signup", "Host an event", 'class="nav-cta"')}`}
  </nav></div></header><main class="page-wrap">${content}</main><footer><div class="footer-wrap"><span><strong>Gather</strong> · Make room for good things.</span><span>Made for people who bring people together.</span></div></footer><div id="toast" class="toast" role="status" aria-live="polite"></div>`
}

function eventCard(event, index = 0) {
  const art = ["art-peach", "art-sage", "art-yellow"][index % 3]
  return `<a class="event-card" data-link href="/events/${event.id}">
    <div class="event-art ${art}"><span class="event-date"><b>${formatDay(event.date)}</b><small>${formatMonth(event.date)}</small></span><span class="art-sun"></span><span class="art-orbit"></span><span class="art-type">A GOOD THING<br>IS HAPPENING</span><span class="art-seats">${escapeHtml(seatsLabel(event.seatsRemaining))}</span></div>
    <div class="event-card-copy"><div class="event-card-kicker">${escapeHtml(formatDate(event.date))}</div><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.description)}</p><div class="event-card-meta"><span>${icon("pin", 14)}${escapeHtml(event.location)}</span><span class="card-arrow">${icon("up", 16)}</span></div></div>
  </a>`
}

async function landing() {
  let events = []
  try { events = (await request("/api/events")).events.slice(0, 3) } catch { /* the hero remains useful offline */ }
  return `<section class="hero">
    <div class="hero-copy"><span class="eyebrow"><i></i> A little more together</span><h1>Make a little<br><em>room for</em><br>good things.</h1>
      <p>The little details that bring people together, all in one place. Put your next gathering on the calendar and let the good part begin.</p>
      <div class="hero-actions">${link("/events", `Find your next thing ${icon("arrow", 17)}`, 'class="button button-primary"')}${link(state.organizer ? "/organizer" : "/signup", state.organizer ? "Open your studio" : "Host something", 'class="button button-light"')}</div>
      <div class="social-proof"><span class="face-stack"><i>M</i><i>J</i><i>A</i></span><span>Small plans. Lovely people. No fuss.</span></div>
    </div>
    <div class="hero-art" aria-label="A creative event invitation illustration"><span class="art-grain"></span><span class="hero-art-label">GATHER / 001</span><span class="hero-orbit orbit-one"></span><span class="hero-orbit orbit-two"></span><span class="hero-disc"></span><div class="hero-seal"><b>♡</b><small>COME AS<br>YOU ARE</small></div><div class="hero-art-title"><small>A GOOD EXCUSE TO GET TOGETHER</small><h2>The best plans<br>start with hello.</h2></div><div class="invite-ticket"><div class="ticket-top"><span class="ticket-icon">${icon("calendar", 20)}</span><span><small>YOUR NEXT GATHERING</small><b>${escapeHtml(events[0]?.title ?? "A table full of good ideas")}</b></span>${icon("up", 17)}</div><div class="ticket-bottom"><span>${icon("pin", 14)}${escapeHtml(events[0]?.location ?? "Somewhere around the corner")}</span><b>${events[0] ? escapeHtml(formatDate(events[0].date)) : "Soon, hopefully"}</b></div></div><span class="hero-spark">${icon("spark", 22)}</span></div>
  </section>
  <section class="manifesto"><span>A softer way to get together</span><span>For the big nights and the just-because ones.</span></section>
  ${events.length ? `<section class="upcoming-section"><div class="section-heading"><div><span class="eyebrow-text">ON THE CALENDAR</span><h2>A few good things<br class="mobile-break"> coming up.</h2></div>${link("/events", `See every event ${icon("arrow", 16)}`, 'class="text-link desktop-only"')}</div><div class="event-grid">${events.map(eventCard).join("")}</div>${link("/events", `See every event ${icon("arrow", 16)}`, 'class="button button-light mobile-only full-button"')}</section>` : ""}
  <section class="feature-grid"><article><span>01</span><h3>Make it happen</h3><p>Give your gathering a time, a place, and a little context. Your page is ready to share.</p></article><article><span>02</span><h3>Save everyone a seat</h3><p>Know how many people are coming. Gather keeps the headcount honest as the list grows.</p></article><article><span>03</span><h3>Be there, together</h3><p>One tidy place for the details and the people. Less admin, more looking forward to it.</p></article></section>
  <section class="host-cta"><div><span class="eyebrow-text">YOUR PEOPLE ARE OUT THERE</span><h2>You bring them together.<br>We’ll mind the details.</h2><p>Create your organizer space and put the first date on the calendar.</p></div>${link(state.organizer ? "/organizer" : "/signup", `Start a gathering ${icon("arrow", 17)}`, 'class="button button-cream"')}</section>`
}

async function eventsPage() {
  let events = []
  let error = ""
  try { events = (await request("/api/events")).events } catch (cause) { error = cause.message }
  return `<section class="page-heading"><div><span class="eyebrow-text">FIND YOUR PEOPLE</span><h1>Out in the world</h1><p>A little inspiration for your calendar. Find a gathering that feels like your kind of thing.</p></div>${events.length ? `<span class="count-pill">${events.length} ${events.length === 1 ? "gathering" : "gatherings"}</span>` : ""}</section>
  ${error ? `<div class="alert alert-error">${escapeHtml(error)}</div>` : events.length ? `<div class="event-grid">${events.map(eventCard).join("")}</div>` : `<div class="empty-state"><span class="empty-icon">${icon("calendar", 25)}</span><h2>A little quiet on the calendar.</h2><p>There aren’t any gatherings listed just yet. Check back soon, or make the first plan yourself.</p>${link(state.organizer ? "/organizer" : "/signup", `${state.organizer ? "Open your studio" : "Host something"} ${icon("arrow", 16)}`, 'class="button button-light"')}</div>`}`
}

function fieldMarkup({ label, name, value = "", type = "text", placeholder = "", required = true, help = "", textarea = false, min, max, step }) {
  const id = `field-${name}`
  const attrs = `${type ? `type="${type}"` : ""} name="${name}" id="${id}" ${required ? "required" : ""} ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ""} ${min ? `min="${min}"` : ""} ${max ? `max="${max}"` : ""} ${step ? `step="${step}"` : ""}`
  return `<label class="form-field" for="${id}"><span>${label}</span>${textarea ? `<textarea ${attrs} rows="4">${escapeHtml(value)}</textarea>` : `<input ${attrs} value="${escapeHtml(value)}" autocomplete="${name === "email" ? "email" : name === "name" ? "name" : name === "password" ? "new-password" : "off"}">`}${help ? `<small>${help}</small>` : ""}<small class="field-error" data-field-error="${name}"></small></label>`
}

function authPage(kind) {
  const signup = kind === "signup"
  return `<section class="auth-layout"><div class="auth-aside"><span class="eyebrow-text">A PLACE FOR YOUR PEOPLE</span><h1>${signup ? "The gathering starts with you." : "Lovely to see you again."}</h1><p>${signup ? "Make the plan, send the invite, and keep all the little details together." : "Your events and the people coming to them are right where you left them."}</p><span class="auth-ornament">${icon("spark", 32)}</span></div><div class="auth-card"><span class="eyebrow-text">${signup ? "START YOUR STUDIO" : "ORGANIZER SIGN IN"}</span><h2>${signup ? "Create your account" : "Welcome back"}</h2><p>${signup ? "A few details and you’re ready to host." : "Sign in to manage your gatherings."}</p><form data-form="${kind}" novalidate>${signup ? fieldMarkup({ label: "Your name", name: "name", placeholder: "Jordan Lee" }) : ""}${fieldMarkup({ label: "Email address", name: "email", type: "email", placeholder: "you@example.com" })}${fieldMarkup({ label: "Password", name: "password", type: "password", placeholder: signup ? "At least 8 characters" : "Your password", help: signup ? "Use 8 or more characters." : "" })}<div class="form-alert" data-form-alert></div><button class="button button-primary full-button" type="submit">${signup ? "Create organizer account" : "Sign in"} ${icon("arrow", 16)}</button></form><p class="auth-switch">${signup ? `Already have an account? ${link("/login", "Sign in")}` : `New to Gather? ${link("/signup", "Create an account")}`}</p></div></section>`
}

function localDateValue(iso) {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function eventForm(event = null) {
  return `<form class="event-form" data-form="event" novalidate>
    ${fieldMarkup({ label: "Event name", name: "title", value: event?.title ?? "", placeholder: "Sunday Table Club" })}
    ${fieldMarkup({ label: "A little about it", name: "description", value: event?.description ?? "", textarea: true, placeholder: "What are you gathering for?" })}
    <div class="form-row">${fieldMarkup({ label: "Date and time", name: "date", value: event ? localDateValue(event.date) : "", type: "datetime-local" })}${fieldMarkup({ label: "Places available", name: "capacity", value: event?.capacity ?? 20, type: "number", min: 1, max: 10000 })}</div>
    ${fieldMarkup({ label: "Where", name: "location", value: event?.location ?? "", placeholder: "A place people can find" })}
    <div class="form-alert" data-form-alert>${state.formError ? `<span class="alert alert-error">${escapeHtml(state.formError)}</span>` : ""}</div>
    <div class="form-actions"><button class="button button-light" type="button" data-action="cancel-event">Cancel</button><button class="button button-primary" type="submit">${event ? "Save changes" : "Publish gathering"} ${icon("arrow", 16)}</button></div>
  </form>`
}

function eventRow(event) {
  return `<article class="manage-row"><span class="manage-date"><b>${formatDay(event.date)}</b><small>${formatMonth(event.date)}</small></span><div class="manage-details"><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(formatDate(event.date))} · ${escapeHtml(event.location)}</p></div><span class="attendee-count">${icon("users", 15)} ${event.registered}/${event.capacity}</span><div class="manage-actions"><button class="icon-button" data-action="attendees" data-id="${event.id}" aria-label="View attendees for ${escapeHtml(event.title)}">${icon("users", 16)}</button><button class="icon-button" data-action="edit-event" data-id="${event.id}" aria-label="Edit ${escapeHtml(event.title)}">${icon("edit", 16)}</button><button class="icon-button danger-icon" data-action="delete-event" data-id="${event.id}" aria-label="Delete ${escapeHtml(event.title)}">${icon("trash", 16)}</button></div></article>`
}

async function organizerPage() {
  if (state.loading) return `<div class="loading-card"></div>`
  if (!state.organizer) {
    history.replaceState({}, "", "/login")
    return authPage("login")
  }
  let events = []
  let error = ""
  try { events = (await request("/api/organizer/events")).events } catch (cause) { error = cause.message }
  const editor = state.editEvent === false ? eventForm() : state.editEvent ? eventForm(state.editEvent) : ""
  return `<section class="studio-heading"><div><span class="eyebrow-text">YOUR ORGANIZER STUDIO</span><h1>Make it a date, ${escapeHtml(state.organizer.name.split(" ")[0])}.</h1><p>All the details and all the lovely people, in one place.</p></div><button class="button button-primary" data-action="new-event">${icon("plus", 17)} New gathering</button></section>
    ${state.message ? `<div class="alert alert-success">${icon("check", 16)}${escapeHtml(state.message)}</div>` : ""}${error ? `<div class="alert alert-error">${escapeHtml(error)}</div>` : ""}
    ${editor ? `<section class="editor-card"><div class="editor-heading"><div><span class="eyebrow-text">${state.editEvent ? "UPDATE THE DETAILS" : "PUT IT ON THE CALENDAR"}</span><h2>${state.editEvent ? "Edit gathering" : "Create a gathering"}</h2></div></div>${editor}</section>` : ""}
    <section class="manage-section"><div class="manage-section-title"><div><h2>Your gatherings</h2><p>${events.length ? `${events.length} ${events.length === 1 ? "event" : "events"} on your calendar` : "Your next good thing starts here."}</p></div></div>
      ${events.length ? `<div class="manage-list">${events.map(eventRow).join("")}</div>` : `<div class="empty-state compact"><span class="empty-icon">${icon("calendar", 24)}</span><h2>Nothing on the calendar yet.</h2><p>Create your first gathering and invite your people.</p><button class="button button-light" data-action="new-event">${icon("plus", 16)} Create an event</button></div>`}
    </section><dialog class="attendee-dialog" id="attendee-dialog"><div id="attendee-content"></div></dialog>`
}

async function eventDetail(id) {
  let event
  try { event = (await request(`/api/events/${encodeURIComponent(id)}`)).event }
  catch (error) { return `<div class="empty-state"><span class="empty-icon">${icon("calendar", 24)}</span><h1>${error.status === 404 ? "We can’t find that gathering." : "That page didn’t load."}</h1><p>${escapeHtml(error.message)}</p>${link("/events", "Back to events", 'class="button button-light"')}</div>` }
  state.event = event
  const closed = event.isPast || event.seatsRemaining <= 0
  return `${link("/events", "← All gatherings", 'class="back-link"')}<section class="detail-layout"><div class="detail-copy"><span class="eyebrow-text">A GATHERING BY GATHER</span><div class="detail-title-row"><h1>${escapeHtml(event.title)}</h1><span class="count-pill ${event.seatsRemaining <= 2 ? "pill-warm" : ""}">${escapeHtml(seatsLabel(event.seatsRemaining))}</span></div><div class="detail-facts"><div>${icon("calendar", 18)}<span><small>WHEN</small><b>${escapeHtml(formatDate(event.date, { full: true }))}</b></span></div><div>${icon("pin", 18)}<span><small>WHERE</small><b>${escapeHtml(event.location)}</b></span></div><div>${icon("users", 18)}<span><small>PLACES</small><b>${event.registered} of ${event.capacity} reserved</b></span></div></div><h2>The little details</h2><p class="description-text">${escapeHtml(event.description)}</p><div class="capacity-track"><span style="width:${Math.min(100, Math.round(event.registered / event.capacity * 100))}%"></span></div></div><aside class="register-card"><span class="eyebrow-text">YOUR PLACE IS WAITING</span><h2>${event.isPast ? "That was a lovely time." : event.seatsRemaining ? "Come along." : "This one’s full."}</h2><p>${event.isPast ? "Registration has closed for this gathering." : event.seatsRemaining ? "Leave your details and we’ll save you a spot." : "Every place has been spoken for. Keep an eye out for the next one."}</p>${closed ? `<div class="alert alert-muted">${event.isPast ? "Registration closed" : "All places are reserved"}</div>` : `<form data-form="register" data-event-id="${event.id}" novalidate>${fieldMarkup({ label: "Your name", name: "name", placeholder: "Jordan Lee" })}${fieldMarkup({ label: "Email address", name: "email", type: "email", placeholder: "you@example.com" })}<div class="form-alert" data-form-alert></div><button class="button button-primary full-button" type="submit">Save me a seat ${icon("arrow", 16)}</button><small class="privacy-note">No account needed. Just bring yourself.</small></form>`}<div class="registration-success" hidden><span>${icon("check", 19)}</span><div><b>You’re on the list.</b><p>Your place is saved. We can’t wait to see you.</p></div></div></aside></section>`
}

async function render() {
  const route = location.pathname
  let content
  if (route === "/") content = await landing()
  else if (route === "/events") content = await eventsPage()
  else if (/^\/events\/\d+$/.test(route)) content = await eventDetail(route.split("/").at(-1))
  else if (route === "/signup") content = authPage("signup")
  else if (route === "/login") content = authPage("login")
  else if (route === "/organizer") content = await organizerPage()
  else content = `<div class="empty-state"><h1>Not found</h1><p>That page wandered off.</p>${link("/", "Back home", 'class="button button-light"')}</div>`
  app.innerHTML = shell(content)
  state.busy = false
}

async function refreshSession() {
  try { state.organizer = (await request("/api/auth/session")).organizer }
  catch { state.organizer = null }
  state.loading = false
}

function showToast(text) {
  const toast = document.querySelector("#toast")
  if (!toast) return
  toast.textContent = text
  toast.classList.add("visible")
  window.setTimeout(() => toast.classList.remove("visible"), 2600)
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries())
}

function clearFormErrors(form) {
  form.querySelectorAll("[data-field-error]").forEach((node) => { node.textContent = "" })
  form.querySelectorAll(".form-field input, .form-field textarea").forEach((node) => node.classList.remove("invalid"))
}

function presentError(form, error) {
  const alert = form.querySelector("[data-form-alert]")
  if (alert) alert.innerHTML = `<span class="alert alert-error">${escapeHtml(error.message)}</span>`
  for (const [name, message] of Object.entries(error.fields ?? {})) {
    const target = form.querySelector(`[data-field-error="${CSS.escape(name)}"]`)
    const input = form.querySelector(`[name="${CSS.escape(name)}"]`)
    if (target) target.textContent = message
    if (input) input.classList.add("invalid")
  }
}

app.addEventListener("click", async (event) => {
  const anchor = event.target.closest("a[data-link]")
  if (anchor && anchor.origin === location.origin && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault()
    history.pushState({}, "", anchor.pathname)
    state.message = ""
    state.editEvent = null
    await render()
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }
  const action = event.target.closest("[data-action]")
  if (!action) return
  if (action.dataset.action === "logout") {
    try { await post("/api/auth/logout", {}) } catch { /* clear the local view either way */ }
    state.organizer = null
    history.pushState({}, "", "/")
    await render()
  }
  if (action.dataset.action === "new-event") {
    state.editEvent = false
    state.formError = ""
    await render()
    document.querySelector(".editor-card")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }
  if (action.dataset.action === "cancel-event") {
    state.editEvent = null
    state.formError = ""
    await render()
  }
  if (action.dataset.action === "edit-event") {
    try {
      const { event: item } = await request(`/api/events/${action.dataset.id}`)
      state.editEvent = item
      state.formError = ""
      await render()
      document.querySelector(".editor-card")?.scrollIntoView({ behavior: "smooth", block: "center" })
    } catch (error) { showToast(error.message) }
  }
  if (action.dataset.action === "delete-event") {
    const eventId = Number(action.dataset.id)
    if (!window.confirm("Delete this gathering and its attendee list? This can’t be undone.")) return
    try {
      await request(`/api/organizer/events/${eventId}`, { method: "DELETE" })
      state.message = "Gathering deleted."
      await render()
    } catch (error) { showToast(error.message) }
  }
  if (action.dataset.action === "attendees") {
    const dialog = document.querySelector("#attendee-dialog")
    const content = document.querySelector("#attendee-content")
    if (!dialog || !content) return
    content.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow-text">THE GUEST LIST</span><h2>Loading people…</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close">${icon("close", 17)}</button></div>`
    dialog.showModal()
    try {
      const data = await request(`/api/organizer/events/${action.dataset.id}/attendees`)
      content.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow-text">THE GUEST LIST</span><h2>${escapeHtml(data.event.title)}</h2><p>${data.attendees.length} ${data.attendees.length === 1 ? "person" : "people"} coming</p></div><button class="icon-button" data-action="close-dialog" aria-label="Close">${icon("close", 17)}</button></div>${data.attendees.length ? `<ul class="attendee-list">${data.attendees.map((guest) => `<li><span class="avatar">${escapeHtml(initials(guest.name))}</span><span><b>${escapeHtml(guest.name)}</b><small>${escapeHtml(guest.email)}</small></span><time>${escapeHtml(new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(guest.created_at)))}</time></li>`).join("")}</ul>` : `<div class="empty-mini">No one has registered yet. Share the event page to invite your people.</div>`}`
    } catch (error) { content.innerHTML = `<div class="dialog-heading"><h2>Guest list</h2><button class="icon-button" data-action="close-dialog">${icon("close", 17)}</button></div><div class="alert alert-error">${escapeHtml(error.message)}</div>` }
  }
  if (action.dataset.action === "close-dialog") document.querySelector("#attendee-dialog")?.close()
})

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]")
  if (!form) return
  event.preventDefault()
  if (state.busy) return
  clearFormErrors(form)
  const submit = form.querySelector('[type="submit"]')
  const previous = submit?.innerHTML
  state.busy = true
  if (submit) { submit.disabled = true; submit.textContent = "One moment…" }
  try {
    const values = formValues(form)
    if (form.dataset.form === "register") {
      await post(`/api/events/${form.dataset.eventId}/registrations`, values)
      form.hidden = true
      const success = document.querySelector(".registration-success")
      if (success) success.hidden = false
      const current = state.event
      if (current) {
        current.registered += 1
        current.seatsRemaining = Math.max(0, current.seatsRemaining - 1)
        const seatBadge = document.querySelector(".detail-title-row .count-pill")
        if (seatBadge) seatBadge.textContent = seatsLabel(current.seatsRemaining)
        const facts = document.querySelectorAll(".detail-facts b")
        if (facts[2]) facts[2].textContent = `${current.registered} of ${current.capacity} reserved`
        const capacityFill = document.querySelector(".capacity-track span")
        if (capacityFill) capacityFill.style.width = `${Math.min(100, Math.round(current.registered / current.capacity * 100))}%`
      }
    }
    if (form.dataset.form === "signup") {
      const result = await post("/api/auth/signup", values)
      state.organizer = result.organizer
      history.pushState({}, "", "/organizer")
      state.message = "Welcome to your studio. Let’s make a plan."
      await render()
    }
    if (form.dataset.form === "login") {
      const result = await post("/api/auth/login", values)
      state.organizer = result.organizer
      history.pushState({}, "", "/organizer")
      state.message = "Welcome back."
      await render()
    }
    if (form.dataset.form === "event") {
      if (!values.date || !Number.isFinite(Date.parse(values.date))) throw Object.assign(new Error("Choose a valid date and time."), { fields: { date: "Choose a valid date and time." } })
      const body = { ...values, capacity: Number(values.capacity), date: new Date(values.date).toISOString() }
      if (!body.title || body.title.trim().length < 3) throw Object.assign(new Error("Add a name with at least 3 characters."), { fields: { title: "Title must be at least 3 characters." } })
      if (!body.description || body.description.trim().length < 10) throw Object.assign(new Error("Add a little more about this gathering."), { fields: { description: "Description must be at least 10 characters." } })
      if (!Number.isInteger(body.capacity) || body.capacity < 1) throw Object.assign(new Error("Choose at least one place."), { fields: { capacity: "Capacity must be a whole number." } })
      const path = state.editEvent && state.editEvent !== false ? `/api/organizer/events/${state.editEvent.id}` : "/api/organizer/events"
      const method = state.editEvent && state.editEvent !== false ? "PUT" : "POST"
      await request(path, { method, body: JSON.stringify(body) })
      state.editEvent = null
      state.formError = ""
      state.message = method === "PUT" ? "Gathering updated." : "Your gathering is on the calendar."
      await render()
    }
  } catch (error) {
    presentError(form, error)
    if (submit) { submit.disabled = false; submit.innerHTML = previous }
  } finally {
    state.busy = false
  }
})

window.addEventListener("popstate", async () => { state.editEvent = null; await render(); window.scrollTo(0, 0) })
window.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelector("#attendee-dialog")?.close() })
await refreshSession()
await render()
