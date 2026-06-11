# EasyCaseload — Roadmap

_Last updated: 2026-06-11_

> **Status note (Session A, 2026-06-11):** implementation is ahead of this roadmap.
> Phase 1 is complete except production deployment (auth ✅ magic-link-primary, dashboard ✅,
> Dockerfile ✅, TanStack Query + Realtime ✅ — verified live). Much of Phase 2 shipped early:
> schools CRUD ✅, students CRUD ✅ (inside school detail; the standalone `/app/students`
> list is still a placeholder), documents upload ✅ (signed URLs). The schema (migrations
> 001–017) already covers Phases 2/4/5 tables — see `DATABASE.md`. Next mission: deploy to
> `easycaseload.com` (container + Caddy + DNS + prod redirect URLs + pg_dump cron).

This roadmap is derived from the project mission and known domain requirements. It is organized
into phases, each of which produces a deployable, testable increment of the application.

Phases are sequenced to deliver foundational infrastructure first, then core user value, then
advanced features. Items marked **[ASSUMPTION]** are inferred from context. Items marked
**[UNKNOWN]** require product decisions before scope can be finalized.

This document should evolve as requirements are confirmed. When a feature is built, mark it ✅.

---

## Mission Recap

> EasyCaseload helps itinerant teachers manage students, campuses, schedules, documentation,
> and AI-assisted reporting. Primary goal: reduce administrative workload.

The product succeeds when a teacher can handle their caseload paperwork faster and with less
friction than their current approach (which is likely a combination of spreadsheets, paper,
Google Drive, and email).

---

## Phase 0 — Foundation (Pre-Development)
_Goal: Project is ready for Claude Code to write its first line of application code._

| Task | Status | Notes |
|---|---|---|
| Project documentation created | ✅ Done | CLAUDE.md, ARCHITECTURE.md, DATABASE.md, etc. |
| GitHub repo confirmed | ✅ Done | `https://github.com/joe203/easycaseload.git` |
| Host port assigned | ✅ Done | Port `3010` |
| Production domain confirmed | ✅ Done | `easycaseload.com` + `www.easycaseload.com` |
| Phase 1 blockers resolved | ✅ Done | Ready to write Phase 1 mission package |

---

## Phase 1 — Infrastructure & Auth
_Goal: A deployed app where a teacher can sign up, log in, and see a dashboard._

| Feature | Priority | Notes |
|---|---|---|
| Next.js app scaffold | P0 | App Router, TypeScript, Tailwind, npm |
| Dockerfile + docker-compose | P0 | Multi-stage, `output: 'standalone'` |
| `.env.example` | P0 | Required before first commit |
| GitHub repo + first push | P0 | Droplet is not a code backup |
| Migration 001: `teachers` table + auth trigger | P0 | Gate trigger on `app: 'easycaseload'` tag |
| Auth flow: sign up + email verification | P0 | Tag all signups |
| Auth flow: login (email/password or magic link) | P0 | **[UNKNOWN]** — confirm preferred method |
| Auth flow: password reset | P1 | |
| Caddy config + DNS + SSL | P0 | Required to deploy |
| Protected route middleware | P0 | Redirect to login if no session |
| Dashboard shell (empty state) | P1 | Navigation skeleton only; no data yet |
| Responsive nav + mobile menu | P1 | Mobile-first; hamburger or bottom nav |

**Phase 1 exit criteria:** Teacher can sign up, verify email, log in, see an empty dashboard, and log out. App is live at the production domain over HTTPS.

---

## Phase 2 — Student & Campus Management
_Goal: Teacher can manage their full caseload list and the schools they visit._

| Feature | Priority | Notes |
|---|---|---|
| Migration 002: `campuses` table + RLS | P0 | |
| Migration 003: `students` table + RLS | P0 | Confirm required fields before writing |
| Migration 004: `student_campuses` junction + RLS | P0 | |
| Campus list: view, add, edit, archive | P0 | |
| Student list: view, add, edit, archive | P0 | Filter by campus, search by name |
| Student–campus assignment | P0 | Assign students to one or more campuses |
| Student detail page | P1 | Overview: campuses, notes, docs, reports |
| CSV import for students | P2 | **[UNKNOWN]** — is there existing data to import? |

**Phase 2 exit criteria:** Teacher can manage their complete caseload and campus list. All data is RLS-protected.

---

## Phase 3 — Schedule
_Goal: Teacher can plan and view their campus visit schedule._

| Feature | Priority | Notes |
|---|---|---|
| Migration 005: `schedule_events` table + RLS | P0 | |
| Weekly calendar view | P0 | Mobile-friendly; show campus visits |
| Add / edit / delete visit | P0 | |
| Recurring visits | P1 | **[UNKNOWN]** — confirm if needed in v1 |
| View students due for service on a given visit | P1 | Join students → student_campuses → campus |
| Daily agenda view | P1 | Simpler alternative to calendar for mobile |

**Phase 3 exit criteria:** Teacher can see their week at a glance and know which students they're seeing at each campus.

---

## Phase 4 — Session Notes & Documentation
_Goal: Teacher can document what happened with each student and attach files._

| Feature | Priority | Notes |
|---|---|---|
| Migration 006: `session_notes` table + RLS | P0 | |
| Migration 007: `documents` table + RLS | P0 | |
| Storage bucket: `student-documents` | P0 | Private; path `{teacher_id}/{student_id}/...` |
| Add session note (quick, mobile-friendly) | P0 | Should take < 30 seconds on a phone |
| View session notes by student | P0 | Reverse-chronological |
| File upload: attach document to student | P1 | PDF, images **[UNKNOWN — confirm types]** |
| File download: view/download via signed URL | P1 | Short-expiry signed URLs |
| Delete document | P1 | Remove from storage + metadata row |
| Note search / filter by date range | P2 | |

**Phase 4 exit criteria:** Teacher can quickly log a session note from their phone and attach files to a student record.

---

## Phase 5 — AI-Assisted Reporting
_Goal: Teacher can generate a draft report for any student from their session notes._

| Feature | Priority | Notes |
|---|---|---|
| Migration 008: `reports` table + RLS | P0 | |
| Report generation: select student + date range | P0 | Fetch session notes → send to Anthropic API |
| AI draft display + in-place editing | P0 | Teacher reviews and edits before finalizing |
| Finalize + save report | P0 | Mark status = 'final' |
| Report history per student | P1 | |
| Export report as PDF | P1 | **[ASSUMPTION]** — for sharing with school/admin |
| Multiple report types (progress, IEP, annual review) | P2 | **[UNKNOWN]** — confirm types needed |
| AI prompt tuning per report type | P2 | System prompt variations per type |

**Phase 5 exit criteria:** Teacher can generate a draft progress report for any student using their session notes, edit it, and save it.

---

## Phase 6 — Polish & Launch
_Goal: App is ready for real use by real teachers._

| Feature | Priority | Notes |
|---|---|---|
| Empty states on all list views | P0 | Helpful guidance when caseload is new |
| Loading states + optimistic UI | P0 | Mobile connections can be slow |
| Error handling + toast notifications | P0 | No silent failures |
| Form validation (client + server) | P0 | |
| Accessibility audit (WCAG AA) | P1 | |
| Performance audit (Core Web Vitals) | P1 | |
| PWA / add to home screen | P2 | **[ASSUMPTION]** — teachers want app-like install |
| Onboarding flow for new teachers | P2 | Walk through adding first campus + student |
| Help / FAQ page | P3 | |

**Phase 6 exit criteria:** App is stable, polished, and usable by a non-technical teacher without guidance.

---

## Future / Post-Launch Considerations

_These are not committed. Capture here to avoid scope creep in Phases 1–6._

- Push notifications (visit reminders, note reminders)
- Shared access / admin view (e.g., supervisor sees all teachers)
- District-level accounts (multi-teacher organization)
- Integration with IEP management systems
- Offline mode (service worker + local cache)
- Mobile app (React Native or PWA promotion)
- Billing / subscription (if EasyCaseload becomes a commercial SaaS)

---

## Questions / Missing Information

| # | Question | Affects |
|---|---|---|
| 1 | What student fields are required? (IEP dates, disability category, service minutes/week?) | Phase 2 migration |
| 2 | Recurring visits: must-have in v1 or Phase 2 deferrable? | Phase 3 scope |
| 3 | What report types are needed at launch? | Phase 5 scope + AI prompt design |
| 4 | Are there existing teachers/students to migrate from another system? | Phase 2 import feature |
| 5 | Is PDF export of reports required at launch? | Phase 5 or Phase 6 |
| 6 | Should the app support offline use (unreliable campus WiFi)? | Major architecture decision |
| 7 | Is this solo-use or could a teacher add a paraeducator or supervisor to their account? | Auth + data model |
| 8 | What is the target launch date? | Phase prioritization |
