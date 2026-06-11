# EasyCaseload — Architecture

_Last updated: 2026-06-10_

This document describes the intended system architecture for EasyCaseload. It is written from
known constraints and design decisions. Sections marked **[ASSUMPTION]** reflect reasonable
inferences from the tech stack and mission; sections marked **[UNKNOWN]** require answers
before Claude Code can implement that area.

---

## 1. System Overview

EasyCaseload is a **server-side-rendered, mobile-first web application** deployed as a single
Docker container behind a Caddy reverse proxy on a shared DigitalOcean droplet.

```
User (browser/phone)
        │
        ▼
  Caddy (reverse proxy + SSL)   ← 67.207.83.48
        │
        ▼
  easycaseload container         ← Next.js App Router (port 3000 internal)
        │
        ├──── Supabase REST API  ← PostgREST, public schema
        ├──── Supabase Auth      ← GoTrue (shared instance)
        ├──── Supabase Storage   ← student-documents bucket
        └──── n8n (selective)    ← SMS, email workflows, AI pipelines
```

All containers — the Next.js app, Supabase services, and n8n — run on the `n8n_default`
Docker network. Inter-container communication uses service names, not localhost.

---

## 2. Frontend

| Concern | Decision | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Server Components by default; Client Components only when interactivity requires it |
| Language | TypeScript (strict) | `typescript.ignoreBuildErrors` is never set |
| Styling | Tailwind CSS | Mobile-first utility classes; expand up from narrow viewports |
| Package manager | npm | Never pnpm or yarn |
| Target device | Mobile primary | Itinerant teachers work on phones between campuses |
| UX tone | Simple, educator-friendly | No jargon; minimize clicks for frequent tasks |

### Routing structure (as implemented)

```
app/
  (auth)/                 ← signin, signup, signup/success, auth/error
  (dashboard)/app/        ← dashboard, schools/[id], students/[id], minutes,
                            onboarding, reports, billing (protected)
  (public)/               ← landing, contact, privacy, terms, survey (unlinked)
  api/                    ← chat (Anthropic), contact, early-access, survey
  auth/callback/route.ts  ← code-for-session exchange + app-tag backfill
  providers.tsx           ← QueryClientProvider (TanStack Query)
middleware.ts             ← session refresh + protection, /app/* and auth routes only
hooks/                    ← useStudents, useSchools (Query + Realtime)
```

Note: protected routes live under `(dashboard)/app/`, auth pages are `/signin` and
`/signup` (not `/login`). The product term is **schools**, not "campuses."

---

## 3. Backend / Data Layer

EasyCaseload connects **directly to Supabase** for all standard data operations. n8n is
reserved for workflows that provide value beyond what a direct Supabase call can offer.

### Supabase services used

| Service | Purpose |
|---|---|
| **PostgreSQL (`public` schema)** | All application data |
| **Supabase Auth (GoTrue)** | Teacher authentication (email/password + magic link) |
| **Supabase Storage** | Student documents (`student-documents` bucket) |
| **PostgREST** | REST API auto-generated from schema (used by JS client) |
| **Realtime** | ✅ Resolved — publications on teachers/schools/students/student_logs/documents (migration 017); client pattern is TanStack Query + channel invalidation (CLAUDE.md §12) |

### n8n workflows (approved use cases only)

| Workflow | Trigger | Purpose |
|---|---|---|
| **[UNKNOWN]** | — | To be defined in ROADMAP.md as features are scoped |

Direct Supabase access is always preferred. n8n is added only when the workflow complexity
justifies it (e.g., multi-step automations, third-party API chains, SMS via Telnyx).

---

## 4. Authentication Flow

1. Teacher visits the app → redirected to `/login` if no active session
2. Signs in via **email + password** or **magic link (OTP)** **[ASSUMPTION — confirm preferred method]**
3. Supabase Auth validates credentials and issues a JWT
4. Every signup/OTP call tags the user: `options: { data: { app: 'easycaseload' } }`
5. On first signup, a DB trigger creates a `teachers` row for the new user (gated on the `app` tag)
6. The JWT is stored in an HttpOnly cookie (Next.js middleware validates it on each request)
7. Server Components fetch data using the Supabase server client with the user's JWT — RLS enforces row ownership automatically

---

## 5. Data Architecture

**Tenant model:** One teacher = one tenant. Every table has a `teacher_id` column.
The RLS function `current_teacher_id()` returns the authenticated teacher's ID.
No row is ever visible to a teacher who does not own it.

**Schema ownership:** EasyCaseload owns `public`. No other app may create tables in `public`.

### Core domain entities **[ASSUMPTION — refine in DATABASE.md]**

```
teachers          ← one per authenticated user; top-level tenant
students          ← belong to a teacher; may be associated with multiple campuses
campuses          ← schools the teacher visits; belong to a teacher
student_campuses  ← junction: which students are at which campus
schedules         ← teacher's calendar of campus visits
documents         ← file metadata; binary in student-documents storage bucket
notes / sessions  ← session logs, progress notes per student
reports           ← generated report content (AI-assisted)
```

---

## 6. File Storage

- **Bucket:** `student-documents` (private)
- **Path pattern:** `{teacher_id}/{student_id}/{filename}`
- **Access:** always via signed URLs with short expiry (never public URLs)
- **Upload flow:** client → Next.js API route → Supabase Storage (service role) → return signed URL
- **[ASSUMPTION]:** All documents are uploaded by the teacher who owns them. No student-facing portal exists in v1.

---

## 7. Infrastructure & Deployment

| Component | Detail |
|---|---|
| Host | DigitalOcean droplet, `67.207.83.48` |
| Reverse proxy | Caddy (auto SSL, single Caddyfile for all FiveSixteen apps) |
| Container network | `n8n_default` (all containers) |
| Container name | `easycaseload` |
| Host port | `3010` (maps to internal port 3000) |
| Production domain | `easycaseload.com` + `www.easycaseload.com` |
| GitHub repo | `https://github.com/joe203/easycaseload.git` |
| Base image | Node 20 Alpine (multi-stage build) |
| Next.js output | `standalone` (small image, self-contained) |
| Supabase location | `/root/supabase/docker` on the droplet |

### Dockerfile pattern (required)
Multi-stage: `deps` → `builder` → `runner` (slim).
Next.js `output: 'standalone'` is set in `next.config.ts`.

---

## 8. AI Features

EasyCaseload includes AI-assisted reporting. Anticipated approach:

| Concern | Decision |
|---|---|
| Provider | Anthropic (Claude) via `ANTHROPIC_API_KEY` |
| Integration point | **[UNKNOWN]** — direct API call from Next.js, or n8n pipeline |
| Input | Session notes, student data, teacher-provided context |
| Output | Draft report text for teacher review and edit |
| Cost control | **[UNKNOWN]** — per-request or cached; needs definition |

**[ASSUMPTION]:** AI features call the Anthropic API server-side from Next.js API routes or
Server Actions, keeping the API key off the client. n8n may be used if the pipeline involves
multiple steps (e.g., fetch notes → summarize → format → email draft).

---

## 8b. Savannah (planned AI persona)

**Savannah** is the planned conversational onboarding/intake assistant — the user-facing
persona of the intelligence pipeline in `INTELLIGENCE_MODEL.md`. The `/app/onboarding`
page is her landing zone ("Savannah will meet you right here"), and the data model already
supports her: pre-auth teachers (`auth_user_id` nullable), `teacher_identities` for
phone/email matching, `raw_intake` for store-first capture, and `student_logs.status`
(draft → confirmed). **She is not yet implemented** — the engine design (tool-driven agent
over guarded functions; trust-and-audit write policy) was approved 2026-06-10 and is
recorded in project memory/docs, deferred pending the phase decision in
`CURRENT_STATUS.md` open item #5.

---

## 9. Key Architectural Constraints

These are non-negotiable and come from the shared FiveSixteen infrastructure:

1. **RLS on every table.** One unguarded table exposes data across all apps on the shared instance.
2. **`n8n_default` network.** Containers off this network cannot reach Supabase or n8n.
3. **App tagging on auth.** Every `signUp` / `signInWithOtp` must pass `{ data: { app: 'easycaseload' } }`. Every `auth.users` trigger must gate on this tag.
4. **No `SITE_URL` reliance.** Always pass explicit `emailRedirectTo` — `SITE_URL` belongs to whichever app claimed it first.
5. **`public` schema is EasyCaseload-only.** Never create tables in `public` for any other app.
6. **No secrets in git.** Real values in `.env.local` only; `.env.example` ships with placeholders.

---

## 10. Questions / Missing Information

| # | Question | Needed for |
|---|---|---|
| 1 | ~~Container name and host port~~ | ✅ Resolved: `easycaseload`, port `3010` |
| 2 | ~~Production domain~~ | ✅ Resolved: `easycaseload.com` + `www.easycaseload.com` |
| 3 | ~~Email + password only, or magic link also supported?~~ | ✅ Resolved: magic link primary, password secondary |
| 4 | ~~Real-time features planned?~~ | ✅ Resolved: yes — migration 017 + TanStack Query pattern, verified live |
| 5 | ~~AI calls direct or via n8n?~~ | ✅ Resolved: direct from Next.js for single-step calls (chat uses `@ai-sdk/anthropic`); n8n reserved for multi-step pipelines per `INTELLIGENCE_MODEL.md §9` |
| 6 | Is there a student-facing portal in scope, or teacher-only in v1? | Data model, storage access — assumed teacher-only |
| 7 | What document types are supported? (PDFs, images, Word docs?) | Upload dialog currently accepts pdf/doc/docx/images/txt |
| 8 | Is multi-device session sync required, or single-session is fine? | Auth cookie strategy — Supabase cookies support multi-device by default |
