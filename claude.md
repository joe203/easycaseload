# EasyCaseload — CLAUDE.md

_Inherits from: `C:\Users\joeca\.claude\CLAUDE.md` (FiveSixteen global standards)_
_Do not duplicate global rules here. Only add what is specific to EasyCaseload._

This file is the canonical reference for every Claude Code session working on EasyCaseload.
Read it fully before writing a single line of code. Also read the global `CLAUDE.md` for
FiveSixteen-wide rules (Next.js, TypeScript, Tailwind, Docker, Supabase tenancy, TanStack Query,
n8n policy, design standards). When you learn something not recorded here, add it.

---

## Required Reading — This Session

Read these files before writing any code. Order matters.

| File | What it tells you |
|---|---|
| `C:\Users\joeca\.claude\CLAUDE.md` | Global FiveSixteen standards — tech stack, Docker, Supabase tenancy rules, TanStack Query pattern, n8n policy |
| `PRODUCT_VISION.md` | What EasyCaseload is and is not. Every feature decision goes through this. |
| `INTELLIGENCE_MODEL.md` | The AI pipeline architecture. Informs the data model and every Phase 5+ decision. |
| `IMPLEMENTATION_ALIGNMENT_REVIEW.md` | Current state of the codebase vs. docs. Read before changing anything. |
| `ARCHITECTURE.md` | System topology and infrastructure decisions |
| `DATABASE.md` | Schema design — but see §5 note: the actual migrations supersede DATABASE.md |
| `ROADMAP.md` | Phase sequence and what's in/out of scope now |

---

## Documentation Authority Order

When documents conflict, the higher document in this hierarchy wins. Implementation decisions
must preserve the intent of higher-level documents — never resolve a conflict by downgrading
a product principle to match a technical convenience.

| Priority | Document | Authority |
|---|---|---|
| 1 | `EASYCASELOAD_CORE_PRINCIPLES.md` | Defines what the product is. Overrides everything. |
| 2 | `PRODUCT_VISION.md` | Translates principles into product behavior and user experience. |
| 3 | `INTELLIGENCE_MODEL.md` | AI architecture and pipeline. Constrains every data model decision. |
| 4 | `CLAUDE.md` _(this file)_ | Project-level implementation rules for Claude Code. |
| 5 | `ARCHITECTURE.md` | System topology and technical decisions. |
| 6 | `DATABASE.md` | Schema design — but note: **actual migrations supersede DATABASE.md** where they conflict. |
| 7 | `ROADMAP.md` | Phase sequence and feature scope. |
| 8 | `CURRENT_STATUS.md` | Current state of the codebase and open items. |
| 9 | `PHASE_1_MISSION_PACKAGE.md` | Detailed implementation brief for Phase 1. |
| 10 | `IMPLEMENTATION_ALIGNMENT_REVIEW.md` | Codebase audit findings. Guidance only — not a change order. |

**Practical examples of this hierarchy in use:**

- If DATABASE.md describes a table structure that conflicts with how `INTELLIGENCE_MODEL.md`
  says data should flow (e.g., raw input must be preserved before processing), follow
  INTELLIGENCE_MODEL.md and update DATABASE.md.
- If ROADMAP.md scopes a feature to Phase 3 but PRODUCT_VISION.md establishes it as a core
  product principle (e.g., Store First), the data model must support it from Phase 1 even
  if the UI comes later.
- If IMPLEMENTATION_ALIGNMENT_REVIEW.md flags something as a gap, do not treat it as an
  automatic work order. Check against CLAUDE.md and the roadmap phase before acting.
- If a migration file conflicts with DATABASE.md, the migration is the implementation truth.
  Update DATABASE.md to match.

---

## 1. What EasyCaseload Is

**EasyCaseload is an AI administrative assistant for itinerant teachers — not a database tool.**

The database exists to support the assistant. The assistant is the product. This distinction
changes every design decision.

> Itinerant teachers travel between multiple school campuses serving students with disabilities
> or specialized needs. A single teacher may visit four schools a day, work with 20+ students,
> and be responsible for documentation that directly affects compliance and billing.

**Their problem:** The administrative overhead of logging sessions, writing progress notes,
generating reports, and managing communications grows faster than any teacher can clear it.

**EasyCaseload's job:** Absorb as much of that overhead as possible so the teacher can focus
on students.

**Owner / Operator:** Joe Cabrera / FiveSixteen.ai

**Production domain:** `https://easycaseload.com` (also `https://www.easycaseload.com`)

**GitHub repository:** `https://github.com/joe203/easycaseload.git`

---

## 2. Product Principles That Govern Every Decision

These come from `EASYCASELOAD_CORE_PRINCIPLES.MD`. When implementation choices are unclear,
these principles determine the right direction.

**Principle 1 — The assistant is the product.** The database, UI, and workflows exist to
support the assistant. Features that improve data hygiene but make the assistant less capable
are moving in the wrong direction.

**Principle 2 — Teachers communicate naturally.** The ideal interaction is conversational.
Teachers should not think like software users. Never require structured form input when
natural language would work.

**Principle 3 — Voice-to-text is a first-class workflow.** The primary input method is a
teacher speaking into their phone between sessions. The system receives plain text regardless
of input method. Every input path must handle dictated, unpolished, unpunctuated text.

**Principle 4 — Capture once, reuse many times.** One voice note should produce: a session
log, goal progress updates, a task, a reminder, and a draft communication. Never ask the
teacher to enter information twice.

**Principle 5 — Store first, organize second.** Raw teacher input is persisted before any AI
processing. Processing is asynchronous and can fail. Information must never be lost because
the system could not immediately classify it.

**Principle 7 — Teacher approval is required for external actions.** Internal records (notes,
tasks, reminders) are created automatically. External communications (emails, reports, parent
updates) are drafted and queued — never sent without explicit teacher review and approval.

**Principle 9 — Mobile is primary, not secondary.** Every feature must be evaluated from the
perspective of a teacher using a phone in a school hallway.

**Principle 12 — Build toward the long-term vision.** Short-term implementation decisions must
not foreclose the AI-first future. The destination is a conversational AI assistant that handles
nearly all administrative work through natural dialogue.

---

## 3. Infrastructure

### Server
- **Host:** DigitalOcean droplet at `67.207.83.48`
- **Container name:** `easycaseload`
- **Host port:** `3010` (maps to internal container port 3000)
- **App location on droplet:** `/root/apps/easycaseload` (git clone of the repo)
- **Supabase location:** `/root/supabase/docker` on the droplet
- **Supabase admin user:** `supabase_admin` — use this, not `postgres`, for migrations

### Docker networks on this droplet (verified 2026-06-12)
The global CLAUDE.md `n8n_default` rule does **not** apply here — there is no n8n
container on this droplet (n8n runs on a separate host at `n8nfor516.online`).
- `supabase_default` — the Supabase stack (db, auth, kong, rest, realtime, storage, …)
- `web` — shared app network; FiveSixteen apps (stockdale-church, easycaseload) attach here
- The app reaches Supabase via its public HTTPS URL (`supabase.church516.xyz`), not
  over a Docker network. Caddy runs on the host and proxies `localhost:<host-port>`.

### Deployment commands

```bash
# Deploy / redeploy (on the droplet; .env.local must exist — see docs/DEPLOYMENT_RUNBOOK.md)
cd /root/apps/easycaseload
git pull
docker compose --env-file .env.local up -d --build
```

### Caddy block (add once, never touch again)
Caddy runs on the droplet **host** (systemd, `/etc/caddy/Caddyfile`), not in Docker —
confirmed 2026-06-12. Blocks proxy to `localhost:<host-port>`; `www` redirects to apex
(matches the church516.xyz pattern):
```
easycaseload.com {
    reverse_proxy localhost:3010
}

www.easycaseload.com {
    redir https://easycaseload.com{uri} permanent
}
```
Reload: `caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`

### DNS
Both `easycaseload.com` and `www.easycaseload.com` A records → `67.207.83.48`

---

## 4. EasyCaseload Auth Rules

The global `CLAUDE.md` covers the general auth tagging and trigger gating pattern.
These are the EasyCaseload-specific values.

### App tag — always `'easycaseload'`
```ts
supabase.auth.signUp({ email, password, options: { data: { app: 'easycaseload' } } })
supabase.auth.signInWithOtp({ email, options: { data: { app: 'easycaseload' } } })
// Also required on signInWithOAuth before Google auth is enabled
```

### Redirect URLs
- `ADDITIONAL_REDIRECT_URLS` on the Supabase droplet must include:
  `https://easycaseload.com/**,https://www.easycaseload.com/**,http://localhost:3000/**`
- Standard `emailRedirectTo` for auth callback: `https://easycaseload.com/auth/callback`
- In code: always use `${window.location.origin}/auth/callback` — do not hardcode the domain

### Auth method (confirmed)
- **Primary:** Magic link (email OTP) → `/app/onboarding`
- **Secondary:** Email + password (user reveals this by clicking "Sign up with a password instead")
- Google OAuth: code is present but gated by `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false` — leave disabled

### Trigger gating — exact SQL required
```sql
if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'easycaseload' then
  return new;
end if;
```

### Email — Mailgun
- **Provider:** Mailgun
- **Sender address:** `EasyCaseload <no-reply@easycaseload.com>`
- EasyCaseload currently owns the sole SMTP config on the shared GoTrue instance. When a
  second FiveSixteen app needs auth emails, the GoTrue send-email hook must be implemented
  first — but not as part of EasyCaseload work. Flag it as a prerequisite for the next app.

---

## 5. Database — EasyCaseload Specifics

### Schema ownership
EasyCaseload owns the **`public` schema** — it was the first tenant on the shared instance.
All future FiveSixteen apps must use their own named schemas. This is the only app that uses
`db: { schema: 'public' }` in its Supabase client config.

### Apply migrations
```bash
docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/migrations/apply_all.sql
# Or single file:
docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/migrations/017_realtime.sql
```

### Important: migrations are the source of truth
DATABASE.md is partially outdated. The actual migrations (001–016+) define the real schema.
When DATABASE.md conflicts with a migration file, trust the migration and update DATABASE.md.
Key known differences:
- DATABASE.md uses `campuses` → actual table is **`schools`**
- DATABASE.md uses `session_notes` → actual table is **`student_logs`**
- DATABASE.md does not include `teacher_identities`, `student_goals`, `raw_intake`

### RLS helper function — actual implementation
The actual `current_teacher_id()` in production uses `auth_user_id`, not `user_id`:
```sql
create or replace function public.current_teacher_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.teachers where auth_user_id = auth.uid() limit 1;
$$;
```

### Supabase Realtime — required for all live-data tables
Add tables to the Realtime publication. Migration 017 should cover this:
```sql
-- 017_realtime.sql
alter publication supabase_realtime add table public.teachers;
alter publication supabase_realtime add table public.schools;
alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.student_logs;
alter publication supabase_realtime add table public.documents;
```

---

## 6. Data Model — What Actually Exists (Migrations 001–016)

This is the canonical table list. Use this, not DATABASE.md, for implementation decisions.

| Table | Purpose | Notes |
|---|---|---|
| `teachers` | Top-level tenant. One per authenticated user. | Has lifecycle: `unregistered → registered → merge_pending → merged`. `auth_user_id` FK to `auth.users`. |
| `teacher_identities` | Many emails/phones → one teacher. | Enables pre-auth teacher creation (Savannah model). `verified` boolean is critical — see §7. |
| `schools` | Schools the teacher visits. | Called `schools` in code, `campuses` in older docs. Use `schools`. |
| `students` | The caseload. | Has computed `name_key` column (lowercased full name) for resolver matching. |
| `student_goals` | IEP goals per student. | `area`, `baseline`, `target`, `status` fields. |
| `student_logs` | Session logs — the core value. | `notes_raw` (original text), `summary`, `status` (draft/confirmed), `source` (sms/voice/chat/app), `intake_id` FK. |
| `raw_intake` | Store-first audit trail of all inbound messages. | Written before processing. `classification jsonb` holds AI results. Never delete. |
| `documents` | File metadata (polymorphic). | Attaches to any entity via `entity_type`/`entity_id`. Binary in `student-documents` bucket. |
| `reports` | AI-generated report drafts. | Status: `draft → ready → sent`. Deferred — Phase 5. |
| `teacher_subscription` | Billing / Stripe. | Deferred — Phase 3D. |

### Storage
- **Bucket:** `student-documents` (private — never public)
- **Path convention:** `{teacher_id}/...` — every object path must be prefixed with the owning teacher's ID
- **Access:** signed URLs only. Never direct public URLs. Student documents are PII.

---

## 7. Teacher Lifecycle and Identity Model

This model is implemented in migrations 002, 004, 012, 013, 015, and 016. It is not fully
documented in ARCHITECTURE.md or DATABASE.md — use this section as the reference.

### Teacher status lifecycle
```
unregistered  ← teacher created by Savannah from a phone number (no auth yet)
invited       ← teacher has been sent a link but hasn't registered
in_progress   ← (future state)
registered    ← teacher has completed auth signup and linked to their record
merge_pending ← email already tied to a registered login; needs reconciliation
merged        ← duplicate absorbed into canonical teacher via merge_teachers()
```

The `auth_user_id` column on `teachers` is null until the teacher completes signup. Savannah
can create a teacher record from a phone number alone; the record is linked to an auth user
when they sign up.

### Verified-link-only auto-linking (migration 016)
When a new auth user signs up:
1. The trigger looks for a **verified** `teacher_identities` email match only.
2. An unverified claim (e.g., "an email Savannah heard over SMS") does not grant access to a
   pre-existing teacher's data.
3. If no verified match: create a fresh teacher row.
4. Proven ownership (completing email verification) upgrades an unverified claim to verified.

This protects against a bad actor signing up with an email that someone else mentioned in an SMS.

### `merge_teachers(p_canonical, p_duplicate)`
Transactional function that reassigns all child rows (schools, students, goals, logs, documents,
reports, raw_intake, identities) from the duplicate to the canonical teacher, then archives
the duplicate. Service-role only — not callable by authenticated users.

---

## 8. The Intelligence Pipeline

This is the AI architecture that all early phases must be designed to support. The pipeline
is not built until Phase 6+ but must not be foreclosed by earlier decisions.

```
Teacher speaks or types
        │
        ▼
  raw_intake row written immediately   ← Store-First (Principle 5)
        │
        ▼
  Intent classification                ← What is the teacher trying to do?
        │
        ▼
  Entity extraction                    ← Who, what, when, how long, which goals?
        │
        ▼
  Action derivation
        ├── Internal actions → auto-create (session_logs, student_goals, tasks, reminders)
        └── External actions → queue for teacher approval (emails, reports, comms)
```

### The Approval Gate
Internal records are created automatically. External communications are **drafted and queued
in the `draft_queue` table** — never sent without explicit teacher review and approval.
This is non-negotiable. Teachers are legally responsible for student communications.

### Capture Once, Reuse Many
A single voice note should produce every useful output it supports:
> "Finished with Maria. 45 minutes on fluency goals. She's improved a lot this month."
→ session log + goal progress update + proactive suggestion ("want a monthly summary?") + draft progress note

### Savannah
Savannah is the planned AI onboarding assistant. The `/app/onboarding` page is her landing zone.
When a new teacher signs up, Savannah is intended to walk them through caseload setup via
conversation — no forms. Savannah is **not yet implemented** (Phase 6+). The onboarding page
currently shows a placeholder. Do not implement Savannah capabilities ahead of schedule;
do not remove the placeholder.

---

## 9. EasyCaseload Tech Stack

Global rules cover Next.js, TypeScript, Tailwind, npm, Supabase, TanStack Query, and Docker.
These are the EasyCaseload-specific additions:

| Layer | Choice | Notes |
|---|---|---|
| Database schema | `public` | EasyCaseload owns this schema (first tenant) |
| AI provider | Anthropic | `ANTHROPIC_API_KEY`. Server-side only. |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) | Already installed. Use Anthropic models, not OpenAI. |
| SMS | Telnyx | Via n8n workflow. `TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`. |
| Email (transactional) | Mailgun | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_SIGNING_KEY`. |
| Automation | n8n at `https://n8nfor516.online` | `N8N_WEBHOOK_BASE_URL`. Reserved for AI pipelines, SMS, scheduled jobs. |
| UI components | shadcn/ui | Full library in `components/ui/`. Use these; do not re-implement. |

### AI model — required
The chat route must use an Anthropic model. The Vercel AI SDK supports this:
```ts
import { anthropic } from '@ai-sdk/anthropic'
// model: anthropic('claude-haiku-4-5-20251001')  ← fast, low cost, good for chat
// model: anthropic('claude-sonnet-4-6')           ← for report generation, complex processing
```
Never use OpenAI models. The `ANTHROPIC_API_KEY` is the only AI key in `.env.example`.

---

## 10. Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (new format) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy format — client.ts accepts either |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — server-side only, never browser |
| `ANTHROPIC_API_KEY` | Anthropic API — server-side only |
| `TELNYX_API_KEY` | SMS via Telnyx |
| `TELNYX_PUBLIC_KEY` | Telnyx public key |
| `MAILGUN_API_KEY` | Transactional email |
| `MAILGUN_DOMAIN` | Mailgun sender domain |
| `MAILGUN_SIGNING_KEY` | Webhook verification |
| `N8N_WEBHOOK_BASE_URL` | n8n instance at `https://n8nfor516.online` |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` | Set to `false` — Google auth is disabled |
| `TELNYX_FROM_NUMBER` | Sending number for OTP/SMS (E.164). Swapping to the dedicated number is config-only |
| `PHONE_VERIFICATION_ENABLED` | `/app/verify-phone` gate. Keep `false` until Telnyx 10DLC clears |

---

## 11. Application Structure (Current — as of 2026-06-12)

```
app/
  (auth)/                ← signin, signup, signup/success, auth/error, register (SMS token redemption)
  (dashboard)/app/       ← dashboard, students, schools, minutes, reports, billing, onboarding
  (gate)/app/            ← verify-phone (OTP gate; outside the dashboard layout so its redirect can't loop)
  (public)/              ← landing, contact, privacy, terms, survey, download-email
  api/                   ← chat, contact, early-access, survey
  auth/callback/route.ts ← exchanges code for session
layout.tsx               ← mounts <ChatWidget /> globally
providers.tsx            ← QueryClientProvider

components/
  app-sidebar.tsx
  chat-widget.tsx        ← AI chat bubble, mounted in root layout
  dashboard-content.tsx
  document-upload-dialog.tsx
  register-form.tsx      ← SMS registration: claim teacher row + send magic link
  verify-phone-form.tsx  ← OTP entry (send code / verify / resend with cooldown)
  schools/*, students/*
  ui/                    ← full shadcn/ui library

lib/
  supabase/
    client.ts            ← createBrowserClient (supports both key formats)
    server.ts            ← createServerClient with cookie handling
    middleware.ts        ← updateSession (only runs on /app/* and auth routes)
    teacher.ts           ← getCurrentTeacher(), getCurrentTeacherId()
    admin.ts             ← service-role client (deny-all tables; server only)
    access.ts            ← getTeacherAccess() capability model (V2)
  actions/               ← Server Actions: students.ts, schools.ts, documents.ts,
                           phone-verification.ts (OTP), registration.ts (token redemption)
  telnyx.ts              ← direct SMS send (single API call — not n8n's job)
  phone.ts               ← US E.164 normalize/mask helpers
  types/                 ← student.ts, school.ts, teacher.ts, document.ts

hooks/
  useStudents.ts         ← useQuery + Realtime subscription
  useSchools.ts          ← useQuery + Realtime subscription
```

### Route group notes
- `(auth)/` — signin, signup, register. Middleware redirects authenticated users away from signin/signup only; `/register` is public.
- `(dashboard)/app/` — all protected routes. Layout validates auth server-side and (when `PHONE_VERIFICATION_ENABLED=true`) redirects unverified-phone teachers to `/app/verify-phone`.
- `(gate)/app/` — focused gate screens; auth-checked in the page, deliberately outside the dashboard layout.
- `(public)/` — marketing/landing pages. No auth required.
- Middleware runs `updateSession` only on `/app/*` and `/signin`, `/signup` — public routes skip it entirely.

---

## 12. TanStack Query — EasyCaseload Implementation

The global `CLAUDE.md` covers the pattern. These are the EasyCaseload-specific hook shapes.

### Install (if missing)
```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

### `app/providers.tsx` (create if missing)
```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, refetchOnWindowFocus: true, retry: 1 } },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

Wire into `app/layout.tsx`: `<Providers>{children}</Providers>`

### `hooks/useStudents.ts`
```tsx
'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function useStudents() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students').select('*').order('last_name')
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    const channel = supabase.channel('students-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' },
        () => queryClient.invalidateQueries({ queryKey: ['students'] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient, supabase])

  return query
}
```

Create `useSchools.ts` with the same pattern substituting `schools` for `students`.

### Replacing `revalidatePath`
After TanStack Query is installed, replace `revalidatePath` calls in server actions.
Server Actions should return the mutated data. Client mutation hooks call `invalidateQueries`
on `onSettled`. Remove `revalidatePath` once the hooks exist — do not keep both.

---

## 13. Known Workarounds (Do Not "Fix" Without Instruction)

These are intentional temporary implementations that will be replaced in a future phase.

| Workaround | Location | Correct Future State | Phase |
|---|---|---|---|
| Session data stored in `teachers.preferences` JSONB | `minutes/page.tsx` | Migrate to `student_logs` | Phase 2 |
| ~~`revalidatePath` in server actions~~ | — | ✅ Done (Session A): removed; clients invalidate via TanStack Query | Done |
| Chat system prompt is FAQ-scoped | `api/chat/route.ts` | Replace with full assistant identity when intelligence pipeline is wired (model is already Anthropic Haiku) | Phase 6+ |
| ~~No Realtime publications~~ | — | ✅ Done (Session A): `017_realtime.sql` applied + verified live | Done |
| Report "Export" is a plain-text download | `components/reports/reports-view.tsx` | Formatted PDF export | Phase 5 |
| Reports use only session/goal/document **metadata** (no doc text, no impairment model) | `lib/reports/report-context.ts` | Add document-text extraction + structured impairment profile — **extend `ReportContext`, do not rewrite the generator.** See `docs/report-architecture.md` | Later |

---

## 14. What Is Deferred — Do Not Build Now

| Item | Reason | Phase |
|---|---|---|
| Savannah AI onboarding | Not yet implemented; onboarding page is a placeholder | Phase 6+ |
| `draft_queue` table | Approval gate for external communications | Phase 6+ |
| `teacher_memory` table | Long-term memory / institutional knowledge | Phase 8+ |
| Chat → `raw_intake` pipeline | Chat messages not yet stored in `raw_intake` | Phase 6+ |
| Intent classification / entity extraction | Core AI pipeline | Phase 6+ |
| Session notes UI | `student_logs` table exists; UI comes after Phase 1 | Phase 2 |
| `schedule_events` table | Not in migrations yet | Phase 3 |
| Google OAuth | Code exists, feature flag off; add app tag before enabling | Pre-enablement |
| Billing / Stripe integration | `teacher_subscription` table exists; page is placeholder | Phase 3D |

---

## 15. Session Checklist — Every Claude Code Session

Before writing code:
- [ ] Read this file and the global `CLAUDE.md`
- [ ] Read `IMPLEMENTATION_ALIGNMENT_REVIEW.md` before touching the codebase
- [ ] Check `docs/` for prior architectural decisions relevant to your work
- [ ] Confirm migration files before any schema-dependent application code

Before declaring done:
- [ ] `npx tsc --noEmit` exits clean
- [ ] No `console.log` or `console.error` in production code paths
- [ ] No secrets in code; `.env.example` updated if new variables were added
- [ ] `docs/` updated with any non-obvious architectural decision made this session
- [ ] This file updated if infrastructure details changed
- [ ] `CURRENT_STATUS.md` updated with what was completed and any new open items

---

## 16. Open Items

| Status | Item |
|---|---|
| ✅ Resolved (Session A) | TanStack Query installed; `providers.tsx` + `useStudents`/`useSchools` hooks wired |
| ✅ Resolved (Session A) | `Dockerfile` + `docker-compose.yml` exist; image build verified (HTTP 200 smoke test) |
| ✅ Resolved (Session A) | `api/chat/route.ts` uses Anthropic (`claude-haiku-4-5-20251001`), verified streaming |
| ✅ Resolved (Session A) | Migration 017 (`supabase_realtime` publications) written + applied + verified live |
| ✅ Resolved (Session A) | `console.error` removed from all production code paths |
| ✅ Resolved | `ADDITIONAL_REDIRECT_URLS`: localhost + production URLs added; GoTrue restarted (2026-06-12) |
| ✅ Resolved | `apply_all.sql` verified and regenerated (17 migrations); schema applied live 2026-06-09/11 |
| ✅ Resolved | Nightly `pg_dump` cron installed on droplet (2026-06-12): 03:00, gzipped, 14-day retention |
| ✅ Resolved | Production deployment (2026-06-12): live at `https://easycaseload.com` — see `docs/DEPLOYMENT_RUNBOOK.md` |
| ❌ Open | Google OAuth enablement gap: `signInWithOAuth` cannot carry the app tag (SDK has no `data` option); callback now tags post-exchange, but OAuth signups skip the teacher-creation trigger — needs find-or-create-teacher in the callback before enabling Google |
| ✅ Resolved | Auth method confirmed — magic link primary, password secondary |
| ✅ Resolved | `.env.example` exists |
| ✅ Resolved | Container name: `easycaseload`, port: `3010`, domain confirmed |
| ✅ Resolved | GitHub repo: `https://github.com/joe203/easycaseload.git` |
| 📋 Pre-launch | Google OAuth app tag — add before enabling |
| ✅ Resolved | `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` removed from password signup path (2026-06-12); routes through `/auth/callback` |
| ✅ Resolved | `generator: "v0.app"` — already absent from `app/layout.tsx` (verified 2026-06-12) |
| 📋 DATABASE.md | Needs rewrite to match actual migrations: rename campuses→schools, session_notes→student_logs, add missing tables |
| 🟡 Phase C built, not deployed | Demo environment (seed-on-first-load, capability UI, sample subscription page, multi-source report backend). **To activate:** apply migrations **019** (default→demo) + **020** (reports Realtime) to live DB; droplet `.env.local` needs `SUPABASE_SECRET_KEY` + `ANTHROPIC_API_KEY`; redeploy. After 019, new signups = demo; existing teachers stay `active`. |
| 📋 Report data model | Report generation is multi-source by design (`docs/report-architecture.md`). Still to model: document-text extraction + structured impairment profile. Extend `ReportContext` — never single-source the generator. |
