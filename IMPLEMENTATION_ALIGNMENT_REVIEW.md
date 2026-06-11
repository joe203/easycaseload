# EasyCaseload — Implementation Alignment Review

_Reviewed against: CLAUDE.md, PRODUCT_VISION.md, INTELLIGENCE_MODEL.md, ARCHITECTURE.md_
_Codebase snapshot: `Easycaseload-com-review/`_
_Date: 2026-06-11_

---

## How to Read This Document

Each area is classified as one of:

- ✅ **Implemented** — working, matches canonical docs
- ⚠️ **Partially Implemented** — exists but has gaps or deviations
- 📋 **Planned** — in roadmap, not yet built
- ❌ **Missing** — expected to exist, does not
- 🔜 **Should Be Deferred** — exists but is premature given current phase

Findings that require action before Phase 1 handoff are marked **[ACTION REQUIRED]**.

---

## 1. Database Schema

### Overall verdict: ✅ Implemented — and significantly ahead of DATABASE.md

The 16 migrations represent a more complete and thoughtful schema than the 8 tables described in DATABASE.md. The implementation should be treated as the source of truth for schema; DATABASE.md needs to be updated to match.

| Area | Status | Notes |
|---|---|---|
| `teachers` table | ✅ | Richer than DATABASE.md: adds `phone`, `phone_verified`, `status`, `role`, `source`, `invite_count`, `preferences`, `merged_into`, `archived_at`. Multi-status lifecycle (`unregistered → invited → registered → merge_pending → merged`) |
| `teacher_identities` table | ✅ | Not in DATABASE.md but correct — maps many emails/phones to one teacher for the Savannah intake model |
| `current_teacher_id()` RLS helper | ✅ | Matches exactly — `security definer`, resolves `auth.uid() → teachers.id` |
| `schools` table | ✅ | Matches DATABASE.md. Uses `schools` not `campuses` — see terminology note below |
| `students` table | ✅ | Richer — adds `name_key` computed column (lowercased full name for resolver matching), `school_id`, `status`. Correct pattern |
| `student_goals` table | ✅ | Not in DATABASE.md — well-designed with `area`, `baseline`, `target`, `status` |
| `student_logs` table | ✅ | Not in DATABASE.md — this is the core value (session logging). Has `notes_raw`, `summary`, `status` (draft/confirmed), `source`, `intake_id` FK. Correct |
| `raw_intake` table | ✅ | Present (migration 009). Matches INTELLIGENCE_MODEL.md Store-First principle. Has `classification jsonb`, `provider`, `direction`, `status` pipeline fields |
| `documents` table | ✅ | Polymorphic — attaches to any entity via `entity_type`/`entity_id`. Correct |
| `reports` table | ✅ | Present (migration 011), correctly deferred to later phase |
| `teacher_subscription` table | ✅ | Present (migration 011), deferred with `status: 'none'` default |
| `merge_teachers()` function | ✅ | Transactional merge across all child tables — correct for multi-identity teacher model |
| RLS on every table | ✅ | All tables have RLS enabled with `teacher_id = current_teacher_id()` pattern. Correct |
| Grants (migration 014) | ✅ | Explicit grants for `authenticated` and `service_role`, future tables covered by default privileges |
| App tag scoping (migration 015) | ✅ | `handle_new_user` correctly gates on `app = 'easycaseload'` — critical for shared Supabase instance |
| Verified-link-only auto-linking (migration 016) | ✅ | Tightened: only links via **verified** email identity. Unverified claims (from SMS intake) cannot hijack a signup. This is more sophisticated than CLAUDE.md §5 describes |
| `alter publication supabase_realtime` | ❌ **[ACTION REQUIRED]** | No migration adds tables to `supabase_realtime` publication. Required by CLAUDE.md §12 for TanStack Query + Realtime pattern |
| Migration for `schedule_events` | ❌ | In DATABASE.md and ROADMAP.md Phase 3 — not yet in migrations. Expected; correct to defer |
| `apply_all.sql` | ⚠️ | File exists but has not been reviewed — should be verified to match all 16 migrations |

**Terminology note:** The codebase uses `schools` throughout. CLAUDE.md and ARCHITECTURE.md use `campuses`. This is an intentional product decision (not a conflict) — "schools" is clearer for the target user. **DATABASE.md and ARCHITECTURE.md should be updated to align with `schools`**; no code changes required.

---

## 2. Auth

### Overall verdict: ✅ Implemented — matches CLAUDE.md §5

| Area | Status | Notes |
|---|---|---|
| `@supabase/ssr` | ✅ | `^0.6.1` — correct package |
| Browser client (`createBrowserClient`) | ✅ | Supports both `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback) |
| Server client (`createServerClient`) | ✅ | Correct cookie handling for App Router |
| Middleware session refresh | ✅ | `updateSession` in `lib/supabase/middleware.ts` — correct pattern, only runs on `/app/*` and `/signin`, `/signup` to avoid Supabase overhead on public routes |
| App tag on `signUp` | ✅ | `data: { app: "easycaseload" }` present in both signup flows |
| App tag on `signInWithOtp` | ✅ | Present on magic link (signin + signup) |
| `emailRedirectTo` explicit | ✅ | Both signin and signup set explicit `emailRedirectTo` using `window.location.origin`. Does **not** hardcode the production domain, which is correct for dev/prod flexibility |
| `auth/callback/route.ts` | ✅ | Exchanges code for session, redirects to `/app/dashboard` or the `redirect` query param |
| Auth trigger gating (migration 015/016) | ✅ | Correctly implemented — see §1 above |
| Email/password signup | ✅ | Implemented as secondary path — user must click "Sign up with a password instead" |
| Magic link signup (primary) | ✅ | Primary flow — email → magic link → `/app/onboarding`. Resolves the open item in CLAUDE.md §14 (auth method = magic link primary, password secondary) |
| Google OAuth | ⚠️ | Code exists, guarded by `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false`. Safe — disabled by default. No action needed |
| Google OAuth app tag | ❌ | `signInWithOAuth` does not pass `data: { app: 'easycaseload' }`. Not a current concern (Google is disabled) but **must be added before Google OAuth is enabled** |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | ⚠️ | Used in password signup as `emailRedirectTo` fallback — dev-only env var. This is fine but should be removed from the production path; password signup in prod should use `window.location.origin` like magic link does |

---

## 3. Application Architecture (Next.js)

### Overall verdict: ⚠️ Partially Implemented — structure is correct, key library missing

| Area | Status | Notes |
|---|---|---|
| Next.js App Router | ✅ | Correct |
| Route groups: `(auth)/`, `(dashboard)/`, `(public)/` | ✅ | Correct structure |
| `middleware.ts` at root | ✅ | Delegates to `lib/supabase/middleware.ts` — clean |
| `app/layout.tsx` root layout | ✅ | Mounts `<ChatWidget />` globally and `<Analytics />` |
| Dashboard layout (server-side auth check) | ✅ | Fetches user + teacher in Server Component, redirects unauthenticated |
| `getCurrentTeacher()` / `getCurrentTeacherId()` | ✅ | Clean helper — resolves auth user → teacher row |
| `providers.tsx` with `QueryClientProvider` | ❌ **[ACTION REQUIRED]** | Does not exist. No `@tanstack/react-query` installed. Required by CLAUDE.md §12. Client mutations (`dashboard-content.tsx`) currently fire-and-forget with no cache invalidation |
| TanStack Query (`@tanstack/react-query`) | ❌ **[ACTION REQUIRED]** | Not installed. Required by CLAUDE.md §12. This is the single most significant gap |
| Supabase Realtime subscriptions | ❌ **[ACTION REQUIRED]** | No subscription code anywhere. Required by CLAUDE.md §12 for data that changes |
| TypeScript strict mode | ✅ | `typescript.ignoreBuildErrors` not set |
| Tailwind CSS | ✅ | Correct |
| shadcn/ui component library | ✅ | Full library present in `components/ui/` |
| `@vercel/analytics` | ⚠️ | Installed and active in `app/layout.tsx`. This implies Vercel deployment history. **No direct conflict with CLAUDE.md** — the analytics package works on any host. However, the project should migrate to a self-hosted or DO-based analytics solution before launch if Vercel-specific features would be needed. For now: no action required, leave in place |

---

## 4. Server Actions & Data Layer

### Overall verdict: ⚠️ Partially Implemented — correct pattern, wrong update mechanism

| Area | Status | Notes |
|---|---|---|
| Server Actions (`'use server'`) | ✅ | `lib/actions/students.ts`, `schools.ts`, `documents.ts` all use Server Actions correctly |
| Teacher-scoped queries | ✅ | All actions call `getCurrentTeacherId()` and filter by `teacher_id`. Double-protection with RLS |
| `revalidatePath` after mutations | ⚠️ | Used consistently in actions — this is the **wrong update mechanism** per CLAUDE.md §12. Anti-pattern: triggers a full server round-trip. Should be replaced with TanStack Query `invalidateQueries` once library is installed |
| `console.error` in server actions | ❌ | `schools.ts` has `console.error` in production code paths (violates CLAUDE.md §7). Should be replaced with proper error handling |
| Fire-and-forget mutations in client components | ❌ | `dashboard-content.tsx` and `minutes/page.tsx` call Supabase directly without any cache invalidation. Violates CLAUDE.md §12 anti-pattern |
| `lib/actions/documents.ts` | ⚠️ | Not reviewed in full — assumed consistent with students/schools pattern |

---

## 5. AI / Chat

### Overall verdict: ⚠️ Partially Implemented — foundation present but wrong model and wrong scope

| Area | Status | Notes |
|---|---|---|
| `api/chat/route.ts` | ⚠️ | Uses **Vercel AI SDK** (`ai`, `@ai-sdk/react`) with `streamText`. INTELLIGENCE_MODEL.md specifies direct Anthropic API. This is a deviation but **not a blocker** — the Vercel AI SDK can target Anthropic models |
| Model in `api/chat/route.ts` | ❌ **[ACTION REQUIRED]** | Uses `"openai/gpt-5-mini"` — not Anthropic. Violates the stack in CLAUDE.md §3 (`ANTHROPIC_API_KEY`). Must be changed to an Anthropic model (e.g., `"anthropic/claude-haiku-4-5"`) |
| Chat system prompt | ⚠️ | Describes EasyCaseload as a "caseload management tool" for "independent professionals." Misses the AI-assistant identity from PRODUCT_VISION.md. Not production-critical yet but should be updated |
| `<ChatWidget />` | ✅ | Clean UI, correct streaming integration, mounted globally |
| Chat scope | 🔜 **Should be deferred** | Current chat is a generic FAQ widget, not the natural language input pipeline described in INTELLIGENCE_MODEL.md. That pipeline is Phase 6+. The current widget is fine as a placeholder — but should not be expanded until the intelligence architecture is ready |
| `raw_intake` for chat messages | ❌ | Chat messages are not written to `raw_intake`. Per INTELLIGENCE_MODEL.md §1 (Store-First), every inbound message should be persisted before processing. Not a Phase 1 blocker but required before the intake pipeline is wired |
| Intent classification | 📋 | Planned — Phase 6+ per INTELLIGENCE_MODEL.md |
| Entity extraction | 📋 | Planned — Phase 6+ |
| Action derivation | 📋 | Planned — Phase 6+ |
| `draft_queue` table | ❌ | Not in migrations. Required by INTELLIGENCE_MODEL.md §4 for the teacher approval gate. Correct to defer — needed at Phase 6+ |
| `teacher_memory` table | ❌ | Not in migrations. Required by INTELLIGENCE_MODEL.md §7. Correct to defer — Phase 8+ |

---

## 6. Feature Pages

### Overall verdict: ✅ Implemented (CRUD features) / 🔜 Deferred (advanced features)

| Feature | Status | Notes |
|---|---|---|
| Students CRUD (`/app/students`, `/app/students/[id]`) | ✅ | Full list/detail/create/edit/delete |
| Schools CRUD (`/app/schools`, `/app/schools/[id]`) | ✅ | Full list/detail/create/edit/delete |
| Dashboard (`/app/dashboard`) | ⚠️ | Shell is correct. Summary cards show `--` placeholders — no live data queries yet. Needs TanStack Query integration |
| Onboarding (`/app/onboarding`) | ✅ | Placeholder correctly introduces "Savannah" concept and directs to manual setup. Well-written |
| Minutes Tracking (`/app/minutes`) | 🔜 | Stores session data in `teachers.preferences` JSONB rather than `student_logs`. This is a Phase 1 prototype workaround — acceptable now, but data must be migrated to `student_logs` before the AI pipeline processes it. Flag for Phase 2 |
| Reports (`/app/reports`) | 📋 | Page exists (navigation link) but content not reviewed — assumed placeholder |
| Billing (`/app/billing`) | 🔜 | "Coming soon" placeholder — `teacher_subscription` table exists. Correct to leave deferred |
| Session notes | 📋 | No dedicated UI for session logging yet. `student_logs` table exists. Phase 2 work |
| Schedule/calendar | 📋 | Not in code. Phase 3 work |

---

## 7. Document Upload

### Overall verdict: ⚠️ Partially Implemented

| Area | Status | Notes |
|---|---|---|
| `documents` table + `student-documents` bucket | ✅ | Schema and storage bucket defined in migration 010. Storage RLS policies correct |
| `document-upload-dialog.tsx` | ✅ | Component exists |
| `lib/actions/documents.ts` | ✅ | Server action exists |
| Signed URLs (no public URLs) | Not verified | Should be confirmed — CLAUDE.md §2 requires signed URLs only |

---

## 8. Public Pages

### Overall verdict: ✅ Implemented (appropriate for current phase)

| Page | Status | Notes |
|---|---|---|
| Landing page (`/`) | ✅ | Exists under `(public)/` route group |
| Early access / survey | ✅ | `/early-access`, `/survey`, `/survey-list` API routes + pages exist |
| Email templates | ✅ | 4 HTML templates in `public/emails/` |
| Contact page | ✅ | Exists |
| Privacy / Terms | ✅ | Exist |
| Download email | ✅ | Exists |

---

## 9. Infrastructure & Deployment

### Overall verdict: ❌ Missing — critical gap for production readiness

| Area | Status | Notes |
|---|---|---|
| `Dockerfile` | ❌ **[ACTION REQUIRED]** | Does not exist. Cannot deploy to DigitalOcean without it. CLAUDE.md §8 specifies multi-stage build with `output: 'standalone'` |
| `docker-compose.yml` | Not verified | Check if present |
| `next.config.ts` `output: 'standalone'` | Not verified | Required for Docker deployment |
| Caddy configuration | Not applicable | Lives on the droplet, not in the repo |
| `n8n_default` network | Not applicable | Runtime configuration |
| `ADDITIONAL_REDIRECT_URLS` | ❌ | Open item from CLAUDE.md §14 — not yet updated on droplet |
| `.env.example` | ✅ | Present, comprehensive — includes Telnyx, Mailgun, n8n webhook URL, Anthropic, dev redirect URL |
| `.gitignore` covers `.env*.local` | Not verified | Should be confirmed |

---

## 10. Code Quality

### Overall verdict: ⚠️ Minor issues

| Area | Status | Notes |
|---|---|---|
| TypeScript strict | ✅ | `typescript.ignoreBuildErrors` not found |
| `console.log` in production paths | ❌ | `schools.ts` uses `console.error` — violates CLAUDE.md §7. Search for other instances |
| Mobile-first design | ✅ | Tailwind classes use responsive prefixes; layouts are appropriately narrow-first |
| `generator: "v0.app"` in metadata | ⚠️ | `app/layout.tsx` metadata includes `generator: "v0.app"` — suggests some pages were scaffolded with v0. Not harmful but should be cleaned up before production |
| No `console.log` found in reviewed files | ✅ | No debug logs visible in reviewed code |

---

## 11. Items Not in Project Docs That Should Be Recorded

The codebase contains several capabilities more advanced than what the current project documentation describes. These should be added to CLAUDE.md and/or DATABASE.md:

1. **Teacher lifecycle model** — `unregistered → invited → in_progress → registered → merge_pending → merged` with `merge_teachers()` function. This is a pre-auth Savannah onboarding model not documented anywhere.
2. **`teacher_identities` table** — many-to-one mapping of emails/phones to teachers. Supports the Savannah intake flow.
3. **Verified-link-only auto-linking** (migration 016) — a security tightening beyond what CLAUDE.md §5 describes. Should be documented.
4. **`raw_intake` multi-source fields** — `provider`, `direction`, `identity_key`, `classification jsonb` — more complete than INTELLIGENCE_MODEL.md §1 describes.
5. **`student_logs` table** — the actual session logging implementation. DATABASE.md describes `session_notes` instead. Update DATABASE.md.
6. **"Savannah" persona** — referenced in onboarding page and signup flow (magic link redirects to `/app/onboarding`). Not defined anywhere in project docs. Should be documented.

---

## 12. Consolidated Action List

### Before Phase 1 Handoff to Claude Code

These are blocking gaps that should be resolved or explicitly deferred:

| Priority | Item | Why |
|---|---|---|
| P0 | **Install `@tanstack/react-query`** | Required by CLAUDE.md §12. All client data currently has no cache management |
| P0 | **Add `providers.tsx` with `QueryClientProvider`** | Required by CLAUDE.md §12 |
| P0 | **Add `Dockerfile`** | Cannot deploy to DigitalOcean without it. See CLAUDE.md §8 for spec |
| P0 | **Fix AI model in `api/chat/route.ts`** | Uses `openai/gpt-5-mini`. Must be Anthropic (CLAUDE.md §3) |
| P1 | **Add `supabase_realtime` publications** | Add a migration: `alter publication supabase_realtime add table teachers, schools, students, student_logs, documents` |
| P1 | **Replace `revalidatePath` with `invalidateQueries`** | Anti-pattern per CLAUDE.md §12. Do after TanStack Query is installed |
| P1 | **Remove `console.error` from `schools.ts`** | Violates CLAUDE.md §7 |
| P1 | **Update DATABASE.md** | Add `teacher_identities`, `student_goals`, `student_logs`, `raw_intake`. Rename `campuses` → `schools`. Add trigger gating detail |
| P2 | **Fix Google OAuth app tag** | Add `data: { app: 'easycaseload' }` to `signInWithOAuth` before enabling Google auth |
| P2 | **Fix `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` in password signup** | Should use `window.location.origin` like magic link does |
| P2 | **Clean up `generator: "v0.app"` in metadata** | Minor — production polish |
| P2 | **Verify `output: 'standalone'` in `next.config.ts`** | Required for Docker build |
| P2 | **Verify `.gitignore` covers `.env*.local`** | Required per CLAUDE.md §7 |
| P2 | **Confirm `apply_all.sql` matches all 16 migrations** | Required before any session that touches production data |
| P3 | **Document Savannah persona** | Referenced in code, undefined in project docs |
| P3 | **Document teacher lifecycle model** | In database, not in docs |
| P3 | **Update chat system prompt** | Doesn't reflect AI-assistant identity |

### Correctly Deferred (do not action now)

- Minutes Tracking data migration to `student_logs` — Phase 2
- `draft_queue` table — Phase 6+
- `teacher_memory` table — Phase 8+
- Chat → `raw_intake` pipeline — Phase 6+
- Session notes UI — Phase 2
- Schedule/calendar — Phase 3
- AI intent classification / entity extraction — Phase 6+
- Billing Stripe integration — Phase 3D
- Vercel Analytics replacement — pre-launch

---

## 13. Summary Assessment

The codebase is **substantially further along than the project documents suggest**. The foundation (auth, schema, CRUD, deployment structure) is largely correct and well-constructed. The most significant gaps are:

1. **TanStack Query is missing** — the most impactful gap relative to CLAUDE.md §12. Client-side data has no cache management and mutations are fire-and-forget.
2. **No Dockerfile** — deployment to DigitalOcean is blocked.
3. **Wrong AI model** — the chat route calls an OpenAI model, not Anthropic.

Everything else is either correctly deferred, minor polish, or documentation that needs to catch up to the implementation.

The schema in particular is notably better than DATABASE.md: the teacher lifecycle, identity system, verified-link-only linking, and `student_logs` implementation represent real product sophistication. DATABASE.md needs to be rewritten against the actual migrations rather than the other way around.

---

_This document should be reviewed and updated before each phase handoff._
