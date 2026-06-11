# EasyCaseload — Claude Code Handoff

_Prepared by: Project Manager (Cowork session)_
_Date: 2026-06-11_
_For: Claude Code / Fable 5_

---

## How to Use This Document

This is a mission-scoped handoff, not an automatic change order. Every item in the action list below represents a finding from a review; it does not mean all items must be executed immediately or in order. Read the context, understand the codebase, apply judgment. When an item says "fix," it means the finding is a real gap. When it says "defer," it means the code may exist but should not be changed now.

If a finding conflicts with what you observe in the code, trust what you observe — then flag the discrepancy rather than acting on a stale recommendation.

---

## 1. Current Project Status

EasyCaseload is an **AI administrative assistant for itinerant teachers** — not a database tool. The assistant is the product. Read `PRODUCT_VISION.md` before writing a line of code.

**Phase 0 (infrastructure):** Complete. All confirmed: DigitalOcean droplet, Caddy, Supabase, container name, port, domain, GitHub repo.

**Phase 1 (auth + foundation):** In progress. The codebase in the working directory is a real, partially deployed application — not a scaffold. Auth works. CRUD for students and schools works. The gaps identified in this handoff are the delta between "working prototype" and "production-ready Phase 1."

**Codebase location:** The application lives in the repository at `https://github.com/joe203/easycaseload.git`. The working directory for all code changes is the project repo root — not a separate review folder.

---

## 2. Files to Read Before Writing Any Code

Read these in order. Do not skip.

| File | Why |
|---|---|
| `CLAUDE.md` | Canonical project reference — infrastructure, auth rules, coding standards, deployment, shared-tenancy constraints, data freshness requirements. This file governs everything. |
| `PRODUCT_VISION.md` | Defines what EasyCaseload is. Every feature decision must be evaluated against this. |
| `INTELLIGENCE_MODEL.md` | The AI architecture and long-term input pipeline. Informs what the data model must eventually support. |
| `IMPLEMENTATION_ALIGNMENT_REVIEW.md` | Full review of the codebase against project docs. Contains the classified action list. |
| `PHASE_1_MISSION_PACKAGE.md` | The original Phase 1 brief — desired outcomes, success criteria, architecture requirements. Use alongside this document. |
| `supabase/migrations/001–016` | The actual schema. DATABASE.md is partially outdated — the migrations are the source of truth. |

---

## 3. Summary of the Implementation Alignment Review

The codebase is **substantially more complete than the project documentation suggests.** The schema is sophisticated and well-constructed. Auth is correctly implemented, including app-tag gating for the shared Supabase instance. Full CRUD exists for students and schools. A chat widget with AI streaming is present. An onboarding flow, billing placeholder, and minutes-tracking prototype are in place.

The three gaps that block production readiness:

1. **TanStack Query (`@tanstack/react-query`) is not installed.** Client-side data has no cache management. Mutations are fire-and-forget. This is the single most impactful missing piece relative to `CLAUDE.md §12`.
2. **No Dockerfile.** Deployment to DigitalOcean is blocked.
3. **Wrong AI model.** `app/api/chat/route.ts` calls `openai/gpt-5-mini`. Must be an Anthropic model.

Everything else is either minor polish, documentation lag, or correctly deferred future work.

---

## 4. The Review Is Guidance, Not a Change Order

`IMPLEMENTATION_ALIGNMENT_REVIEW.md` classifies every major area of the codebase. It is a starting point for judgment, not a script.

**What this means in practice:**

- Do not refactor working code unless you can articulate a specific conflict with `CLAUDE.md`, `PRODUCT_VISION.md`, `INTELLIGENCE_MODEL.md`, or `ARCHITECTURE.md`.
- The `minutes/page.tsx` stores session data in `teachers.preferences` JSONB. This is a known workaround. Do not migrate it now — flag it for Phase 2.
- The `@vercel/analytics` package is installed. It works on any host. Leave it in place.
- `revalidatePath` is used in server actions. It is an anti-pattern per `CLAUDE.md §12`, but replacing it requires TanStack Query to be installed first. Fix the root cause; the symptoms will follow.
- The schema in the migrations is more advanced than `DATABASE.md` describes. Accept the schema as-is. Update `DATABASE.md` to match — do not change the migrations to match `DATABASE.md`.

---

## 5. Immediate Action Items

### P0 — Blocking Production

These must be resolved before the application can be called production-ready.

---

**P0-1: Install `@tanstack/react-query` and add `providers.tsx`**

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

Create `app/providers.tsx` with a `QueryClientProvider` exactly as specified in `CLAUDE.md §12`. Wrap the root layout. This is the foundation for all subsequent data freshness work.

Once installed, replace all direct `supabase.from(...).update(...)` calls in client components that have no cache invalidation (specifically `dashboard-content.tsx` and `minutes/page.tsx`) with proper mutation hooks that invalidate relevant queries.

---

**P0-2: Add Dockerfile**

Create a multi-stage Dockerfile as specified in `CLAUDE.md §8`:
- Stage 1: `deps` — install dependencies
- Stage 2: `build` — build the Next.js app
- Stage 3: slim runner — `output: 'standalone'` artifacts only

Verify `next.config.ts` has `output: 'standalone'`. The build must produce a container deployable with:

```bash
docker build -t easycaseload . \
  && docker run -d --name easycaseload --network n8n_default -p 3010:3000 easycaseload
```

Also verify `docker-compose.yml` exists and is consistent.

---

**P0-3: Fix AI model in `app/api/chat/route.ts`**

The route currently calls `"openai/gpt-5-mini"`. Change this to an Anthropic model. The Vercel AI SDK (`ai` package) supports Anthropic — use the `@ai-sdk/anthropic` provider or the model string `"anthropic/claude-haiku-4-5-20251001"` depending on the SDK version installed.

The `ANTHROPIC_API_KEY` environment variable is already defined in `.env.example` and referenced in `CLAUDE.md §10`. This is a one-line change in the route plus the correct SDK provider import.

Do not redesign the chat route or replace the Vercel AI SDK. Fix the model. Everything else in the chat implementation is acceptable for now.

---

### P1 — Should Be Done This Session

These are not deployment blockers but are required for a correct Phase 1 implementation.

---

**P1-1: Add Supabase Realtime publications**

Add a new migration file `017_realtime.sql`:

```sql
-- 017_realtime.sql — enable Realtime for tables that need live updates
alter publication supabase_realtime add table public.teachers;
alter publication supabase_realtime add table public.schools;
alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.student_logs;
alter publication supabase_realtime add table public.documents;
```

This is required by `CLAUDE.md §12`. Without it, Supabase Realtime subscriptions cannot receive change events even if the subscription code is correct.

---

**P1-2: Add Realtime subscription hooks**

Once TanStack Query is installed and Realtime publications are in place, create the core data hooks following the pattern in `CLAUDE.md §12`:

- `hooks/useStudents.ts` — `useQuery` + channel subscription → `invalidateQueries`
- `hooks/useSchools.ts` — same pattern

The `useStudents` hook should match the pattern in `CLAUDE.md §12` exactly (query key, `queryFn` from Supabase, `useEffect` with channel subscription, cleanup on unmount).

---

**P1-3: Replace `revalidatePath` in server actions with `invalidateQueries`**

After TanStack Query is installed, `revalidatePath` in `lib/actions/students.ts` and `lib/actions/schools.ts` should be replaced. Server Actions should return the mutated data; the client-side mutation hook calls `invalidateQueries` on settle.

Do not remove `revalidatePath` until the TanStack mutation hooks exist. Remove them together.

---

**P1-4: Remove `console.error` from production code paths**

`lib/actions/schools.ts` has `console.error` calls on error paths. Per `CLAUDE.md §7`, no `console.log` or `console.error` in production paths. Replace with proper error propagation — the action already returns `{ error: error.message }`, so the `console.error` adds nothing.

Grep for any other `console.log` / `console.error` in `lib/` and `app/` and remove them.

---

**P1-5: Verify `.gitignore` covers `.env*.local`**

Per `CLAUDE.md §7`. Confirm before any commit that contains environment-related changes.

---

**P1-6: Verify `output: 'standalone'` in `next.config.ts`**

Required for the Docker build. If not present, the multi-stage Dockerfile will not produce a deployable standalone image.

---

## 6. Documentation-Only Items

These findings from the alignment review require documentation updates, not code changes. Update the relevant files but do not touch the implementation.

| Finding | Action |
|---|---|
| `DATABASE.md` uses `campuses` throughout | Update to `schools` to match the codebase. Do not rename any database tables or columns. |
| `DATABASE.md` is missing `teacher_identities`, `student_goals`, `student_logs`, `raw_intake` | Add these tables to `DATABASE.md` based on migrations 004, 007, 008, 009. |
| `DATABASE.md` references `session_notes` | Replace with `student_logs` — that is the actual implementation. |
| Trigger gating in `CLAUDE.md §5` is underspecified | Update to reflect migration 016's verified-link-only auto-linking behavior. |
| Teacher lifecycle model undocumented | Add a section to `DATABASE.md` or `ARCHITECTURE.md` documenting `unregistered → invited → in_progress → registered → merge_pending → merged` and the `merge_teachers()` function. |
| "Savannah" persona referenced in code but undefined in docs | Add a brief entry to `ARCHITECTURE.md` or a new `docs/savannah-persona.md` noting: Savannah is the planned AI onboarding assistant. The `/app/onboarding` page is her landing zone. Not yet implemented. |
| `CLAUDE.md §14` open item: auth method | Mark resolved: magic link is primary, email/password is secondary. |
| `apply_all.sql` should be verified | Note in `CURRENT_STATUS.md` as an open item to verify before production. |

---

## 7. Deferred Items

Do not implement these now. They are correct future work that would be premature at Phase 1.

| Item | Phase | Why deferred |
|---|---|---|
| `draft_queue` table | Phase 6+ | Approval gate for external communications. Requires the AI pipeline first. |
| `teacher_memory` table | Phase 8+ | Long-term memory system. Requires the intelligence layer. |
| Chat → `raw_intake` pipeline | Phase 6+ | Chat messages should eventually be stored in `raw_intake` before processing. Not needed until the intake pipeline is wired. |
| Intent classification / entity extraction | Phase 6+ | Core AI pipeline. Defined in `INTELLIGENCE_MODEL.md §2–§3`. |
| Session notes UI | Phase 2 | `student_logs` table exists and is ready. The UI comes after Phase 1 foundation is stable. |
| Schedule/calendar (`schedule_events` table) | Phase 3 | In `ROADMAP.md`. Do not create the migration yet. |
| Minutes Tracking data migration to `student_logs` | Phase 2 | Current `minutes/page.tsx` stores data in `teachers.preferences` JSONB. This is a known workaround. Do not migrate now. |
| Billing Stripe integration | Phase 3D | `teacher_subscription` table exists, billing page is a placeholder. Correct. |
| Google OAuth app tag | Pre-enablement | Add `data: { app: 'easycaseload' }` to `signInWithOAuth` before enabling Google auth. Do not enable Google auth now. |
| Chat system prompt rewrite | Phase 5+ | Current prompt describes a FAQ bot. The real assistant identity comes when the AI pipeline is built. |
| `@vercel/analytics` replacement | Pre-launch | Works on DO; no action needed now. |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` cleanup | Pre-launch | Dev-only env var in password signup path. Low risk. Fix before production launch. |

---

## 8. The Final Prompt for Claude Code / Fable 5

---

You are working on **EasyCaseload** — an AI administrative assistant for itinerant teachers. Read `CLAUDE.md` fully before writing a single line of code. Then read `PRODUCT_VISION.md`. These two documents govern every decision in this session.

**What EasyCaseload is:** The database, the UI, and the workflows exist to support an AI assistant. The assistant is the product. Every feature decision should be evaluated against whether it reduces the teacher's administrative workload. Do not treat this as a database project with reporting features added.

**Codebase state:** The application is a real, working prototype — not a scaffold. Auth works. CRUD for students and schools works. A chat widget with AI streaming is present. The codebase is more complete than the project documentation suggests. Do not rebuild working code. Read `IMPLEMENTATION_ALIGNMENT_REVIEW.md` before deciding what to change.

**Your mission for this session:**

Bring the working prototype to production-ready Phase 1 quality by resolving the three P0 blockers and the P1 items listed in `CLAUDE_CODE_HANDOFF.md`:

1. Install `@tanstack/react-query`, add `app/providers.tsx`, and wire it into the root layout per `CLAUDE.md §12`.
2. Add a `Dockerfile` for multi-stage Docker build with `output: 'standalone'` per `CLAUDE.md §8`.
3. Fix the AI model in `app/api/chat/route.ts` — change from `openai/gpt-5-mini` to an Anthropic model using the Vercel AI SDK's Anthropic provider.
4. Add migration `017_realtime.sql` to enable Supabase Realtime publications on the core tables.
5. Create `hooks/useStudents.ts` and `hooks/useSchools.ts` following the TanStack Query + Realtime pattern in `CLAUDE.md §12`.
6. Replace `revalidatePath` in server actions with `invalidateQueries` once the hooks exist.
7. Remove `console.error` from `lib/actions/schools.ts` and any other production code paths.
8. Update `DATABASE.md` to match the actual schema (add `teacher_identities`, `student_goals`, `student_logs`, `raw_intake`; rename `campuses` → `schools`; mark auth open item resolved).

**Constraints that are never negotiable:**

- Every auth `signUp` and `signInWithOtp` must include `data: { app: 'easycaseload' }`. Do not remove or omit this.
- Every `auth.users` trigger must gate on `app = 'easycaseload'`. Migration 015/016 implements this correctly — do not alter it.
- RLS must be enabled on every table. No unguarded table is acceptable.
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in client-side code.
- All Docker runs must use `--network n8n_default`. Never omit it.
- Run `npx tsc --noEmit` before declaring work done. It must exit clean.
- No `console.log` or `console.error` in production code paths.

**What to defer:** See `CLAUDE_CODE_HANDOFF.md §7`. Do not implement the draft queue, teacher memory, session notes UI, schedule tables, or intake pipeline. Those are future phases.

**When you finish:** Run the TypeScript check. Verify the Docker build produces a runnable image. Update `CURRENT_STATUS.md` with what was completed and any new open items you discovered.

---

_End of handoff document._
