# EasyCaseload — Phase 1 Mission Package
## Infrastructure, Auth & Deployment

_Prepared by: Joe Cabrera / EasyCaseload PM_
_Date: 2026-06-10_
_For: Claude Code / Fable 5_

---

## Read These First

Before writing a single line of code, read these files in full:

1. `CLAUDE.md` — canonical reference for every session; contains all infrastructure rules, coding standards, auth constraints, and the data freshness standard
2. `ARCHITECTURE.md` — system design, routing structure, component topology
3. `DATABASE.md` — full schema, RLS patterns, migration conventions

If anything in this mission package conflicts with `CLAUDE.md`, `CLAUDE.md` wins. Update this file if you discover infrastructure details worth recording.

---

## 1. The Goal

Deliver a **production-deployed, fully functional authentication layer** for EasyCaseload — the foundation every future feature will build on.

By the end of this phase, a real teacher should be able to:

- Visit `https://easycaseload.com` on their phone
- Create an account with their email address and a password
- Receive a verification email and confirm their address
- Log in and see a dashboard
- Log out
- Reset their password if they forget it

The app must be live at the production domain with HTTPS, running as a Docker container on the FiveSixteen DigitalOcean droplet, and pushed to the GitHub repository. Every piece of infrastructure needed for Phase 2 onward must be in place.

This is not a prototype. It is the real application.

---

## 2. The Application

**EasyCaseload** helps itinerant teachers — educators who travel between multiple school campuses — manage their student caseloads, schedules, documentation, and reporting. The primary user is a teacher working on a phone between campus visits.

**UX principle:** Every screen must be usable one-handed on a 375px-wide mobile screen. Keep interactions simple. This audience is not technical. Avoid jargon.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · Docker · Caddy

---

## 3. Infrastructure

These are confirmed values. Use them exactly.

| Detail | Value |
|---|---|
| Production domain | `https://easycaseload.com` |
| Secondary domain | `https://www.easycaseload.com` |
| GitHub repo | `https://github.com/joe203/easycaseload.git` |
| DigitalOcean droplet | `67.207.83.48` |
| Container name | `easycaseload` |
| Host port | `3010` (maps to internal port `3000`) |
| Docker network | `n8n_default` (non-negotiable — never omit) |
| Supabase location (on droplet) | `/root/supabase/docker` |
| Supabase admin user | `supabase_admin` |
| Auth callback URL | `https://easycaseload.com/auth/callback` |
| Email sender | `EasyCaseload <no-reply@easycaseload.com>` |

---

## 4. Environment Variables

All values live in `.env.local` (gitignored). Ship `.env.example` with placeholder values for every variable the app reads. Confirm `.gitignore` covers `.env*.local` before the first commit.

```
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is server-side only — never expose it to the browser, never put it in a `NEXT_PUBLIC_` variable.

`ANTHROPIC_API_KEY` is not needed in Phase 1 but should be in `.env.example` as a placeholder so the file is complete from the start.

---

## 5. Architecture Requirements

### Next.js App Router Structure

Use route groups to separate auth pages from protected app pages:

```
app/
  (auth)/
    layout.tsx          ← minimal layout: centered card, no nav
    login/
      page.tsx
    signup/
      page.tsx
    verify/
      page.tsx          ← "check your email" confirmation screen
    forgot-password/
      page.tsx
    reset-password/
      page.tsx
  (app)/
    layout.tsx          ← full app layout: nav, mobile header
    dashboard/
      page.tsx
  auth/
    callback/
      route.ts          ← handles Supabase email verification redirect
  layout.tsx            ← root layout: Providers wrapper, fonts
  providers.tsx         ← QueryClientProvider (Client Component)
middleware.ts           ← session validation, route protection
```

### Server vs. Client Components

- Default to Server Components. Only add `'use client'` when the component needs interactivity, browser APIs, or TanStack Query hooks.
- Auth pages are Client Components (they handle form state and submission).
- The dashboard shell can be a Server Component with a Client Component for any interactive elements.
- `providers.tsx` must be a Client Component — it wraps the app in `QueryClientProvider`.

### Supabase Client Instances

Use `@supabase/ssr` for both server and client instances. Do not use the older `@supabase/auth-helpers-nextjs`.

```ts
// lib/supabase/server.ts — for Server Components, Route Handlers, middleware
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// lib/supabase/client.ts — for Client Components
import { createBrowserClient } from '@supabase/ssr'
```

### Middleware

`middleware.ts` must:
1. Refresh the Supabase session on every request (required by `@supabase/ssr`)
2. Redirect unauthenticated users away from `(app)` routes to `/login`
3. Redirect authenticated users away from `(auth)` routes to `/dashboard`
4. Pass through all `/auth/callback` requests without redirect

### TanStack Query

Install: `npm install @tanstack/react-query @supabase/ssr`

Wrap the root layout in a `QueryClientProvider` via `app/providers.tsx`. The Phase 1 dashboard is mostly static (no data queries yet), but the provider must be wired up now so Phase 2 hooks work without a layout change.

Default QueryClient config:
```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})
```

---

## 6. Database: Migration 001

This migration creates the `teachers` table, the RLS helper function, the auth trigger, and enables Realtime on the table. It must be idempotent (`if not exists` everywhere).

**Apply with:**
```bash
docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/migrations/001_init.sql
```

**Full migration:**

```sql
-- supabase/migrations/001_init.sql
-- EasyCaseload — initial schema
-- Idempotent: safe to run multiple times

-- ─────────────────────────────────────────
-- Helper: return the authenticated teacher's id
-- ─────────────────────────────────────────
create or replace function current_teacher_id()
returns uuid
language sql
stable
security definer
as $$
  select id from teachers where user_id = auth.uid();
$$;

-- ─────────────────────────────────────────
-- Table: teachers
-- One row per authenticated user.
-- Created automatically by trigger on first signup.
-- ─────────────────────────────────────────
create table if not exists teachers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  metadata    jsonb not null default '{}'
);

create unique index if not exists teachers_user_id_idx on teachers(user_id);

-- ─────────────────────────────────────────
-- RLS: teachers can only see and edit their own row
-- ─────────────────────────────────────────
alter table teachers enable row level security;

drop policy if exists "teachers_self" on teachers;
create policy "teachers_self" on teachers
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────
-- Updated_at trigger
-- ─────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_teachers_updated_at on teachers;
create trigger set_teachers_updated_at
  before update on teachers
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────
-- Auth trigger: create a teachers row on first signup
-- IMPORTANT: gate on app tag — this Supabase instance is shared
-- across multiple FiveSixteen apps. Without the gate, this trigger
-- fires for every app's signups and creates phantom teacher rows.
-- ─────────────────────────────────────────
create or replace function handle_new_easycaseload_user()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only handle EasyCaseload signups
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'easycaseload' then
    return new;
  end if;

  insert into public.teachers (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_easycaseload_user_created on auth.users;
create trigger on_easycaseload_user_created
  after insert on auth.users
  for each row execute function handle_new_easycaseload_user();

-- ─────────────────────────────────────────
-- Realtime: enable change events on teachers table
-- Required for TanStack Query + Realtime integration (CLAUDE.md §12)
-- ─────────────────────────────────────────
alter publication supabase_realtime add table teachers;
```

Also create `supabase/migrations/apply_all.sql` that sources `001_init.sql`. This file grows with each phase and is used for fresh environment setup.

---

## 7. Authentication Requirements

### Auth Method

Implement **email + password** with email verification. This is v1; magic link can be added in a future phase.

### Required on Every Auth Call

Every `signUp` call must pass the app tag. No exceptions — this is a shared Supabase instance:

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { app: 'easycaseload' },
    emailRedirectTo: 'https://easycaseload.com/auth/callback',
  },
})
```

Every `signInWithOtp` call (if used) must also pass the tag. `emailRedirectTo` must always be explicit — never rely on `SITE_URL`.

### Auth Flows to Implement

**Sign up:**
- Teacher enters email + password
- Client calls `supabase.auth.signUp(...)` with app tag and `emailRedirectTo`
- Show a confirmation screen: "Check your email — we sent a verification link to [email]"
- Do not log the user in yet; they must verify first

**Email verification:**
- `/auth/callback` route handler exchanges the `code` query parameter for a session using `supabase.auth.exchangeCodeForSession(code)`
- On success, redirect to `/dashboard`
- On error, redirect to `/login?error=verification_failed`

**Log in:**
- Teacher enters email + password
- Client calls `supabase.auth.signInWithPassword(...)`
- On success, middleware handles the redirect to `/dashboard`
- Show a user-friendly error on bad credentials — never expose internal error strings

**Password reset:**
- Forgot password form: calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://easycaseload.com/auth/callback?type=recovery' })`
- Show confirmation: "If that email is registered, you'll receive a reset link shortly."
- Reset password form: after the callback, call `supabase.auth.updateUser({ password: newPassword })`

**Log out:**
- Calls `supabase.auth.signOut()`
- Redirects to `/login`

### Session Management

Use `@supabase/ssr` cookie-based sessions with Next.js middleware to refresh the session on every request. This keeps the JWT current and ensures Server Components have access to the authenticated user without additional round trips.

---

## 8. UI & UX Requirements

### Mobile-First, Always

Design every screen for a 375px viewport first. Test at that width before considering larger screens. Most teachers will use this app on an Android or iPhone between campus visits.

### Auth Pages

Keep auth pages clean and minimal. A centered card layout on a neutral background. The FiveSixteen brand is simple and professional — no heavy gradients or animations. Fields need generous touch targets (minimum 44px height).

Implement basic but complete form validation:
- Email: valid format
- Password: minimum 8 characters
- Required field messages should be clear and human-readable ("Please enter your email address", not "email is required")

### Dashboard Shell

Phase 1's dashboard is an empty state — no data yet. It exists to prove the auth layer works and to establish the app's layout and navigation pattern that every future page will inherit.

The dashboard should include:
- A mobile-friendly header with the EasyCaseload name/logo and a menu trigger
- A bottom navigation bar or slide-out menu with placeholders for the sections coming in Phase 2+: Students, Campuses, Schedule, Documents, Reports
- A welcoming empty state in the main content area ("Welcome to EasyCaseload — let's get started")
- A log out option accessible from the nav

Do not build any data-fetching or list views in Phase 1. Navigation items that have no destination yet should be visually present but can show a "Coming soon" state or simply be non-functional placeholders.

### Tailwind

Use Tailwind utility classes only. No custom CSS files unless absolutely necessary. Mobile classes first (`flex`), desktop breakpoints second (`md:flex-row`).

---

## 9. Deployment Requirements

The app must be deployed and accessible at `https://easycaseload.com` before Phase 1 is complete. A working local build is not sufficient.

### Dockerfile

Multi-stage build: `deps` → `builder` → `runner`. The runner stage uses a slim Node image. Next.js `output: 'standalone'` must be set in `next.config.ts` — this produces a self-contained build that doesn't need `node_modules` in the final image.

```dockerfile
# Example structure — implement fully
FROM node:20-alpine AS deps
# install dependencies only

FROM node:20-alpine AS builder
# copy deps, build the app

FROM node:20-alpine AS runner
# copy only the standalone output
# EXPOSE 3000
# CMD ["node", "server.js"]
```

### Deploy Commands (on the droplet)

```bash
# Initial deployment
docker build -t easycaseload .
docker run -d \
  --name easycaseload \
  --network n8n_default \
  -p 3010:3000 \
  --env-file .env.local \
  easycaseload

# Safe rebuild for subsequent deployments
docker build -t easycaseload . \
  && docker stop easycaseload \
  && docker rm easycaseload \
  && docker run -d \
      --name easycaseload \
      --network n8n_default \
      -p 3010:3000 \
      --env-file .env.local \
      easycaseload
```

### Caddy

Add this block to the Caddyfile on the droplet (do not remove or alter other app blocks):

```
easycaseload.com, www.easycaseload.com {
  reverse_proxy easycaseload:3010
}
```

Reload Caddy after adding the block. SSL is automatic.

### DNS

Both `easycaseload.com` and `www.easycaseload.com` A records must point to `67.207.83.48`.

### Supabase Redirect URL Configuration

Before auth emails will work, `ADDITIONAL_REDIRECT_URLS` in the Supabase docker `.env` (at `/root/supabase/docker/.env` on the droplet) must include:

```
https://easycaseload.com/**,https://www.easycaseload.com/**,http://localhost:3000/**
```

After editing the `.env`, restart the auth service:
```bash
cd /root/supabase/docker && docker compose up -d auth
```
Note: must use `up -d`, not `restart`, to reload env changes.

---

## 10. Code Quality Requirements

These are non-negotiable. Phase 1 is not complete until all of these pass.

- `npx tsc --noEmit` exits clean — zero TypeScript errors
- `npm run build` succeeds — no build-time errors
- No `console.log` in any production code path
- No TODO comments or unimplemented stubs in committed code
- No secrets in git — `.env.local` is gitignored, `.env.example` is committed with placeholders
- All auth calls pass the app tag (`{ data: { app: 'easycaseload' } }`) — verify by reading the code, not just running it

---

## 11. Git Requirements

- Remote: `https://github.com/joe203/easycaseload.git`
- Push after every meaningful checkpoint — do not leave the session without pushing
- `.env.example` must be committed; `.env.local` must not be committed (verify with `git status` before pushing)
- Include a brief, informative commit message for each push

---

## 12. Data Freshness Standard (applies now, even in Phase 1)

Install `@tanstack/react-query` and wire up `QueryClientProvider` in `app/providers.tsx` in Phase 1, even though Phase 1 has no data queries yet. This ensures Phase 2 can add `useQuery` hooks without touching the layout.

The full standard is in `CLAUDE.md §12`. The short version for Phase 1:
- `QueryClientProvider` must wrap the app in a Client Component provider
- `staleTime: 60 * 1000`, `refetchOnWindowFocus: true`
- All future data fetching will use `useQuery` — never raw `fetch` calls in components

---

## 13. Success Criteria

Phase 1 is complete when **all** of the following are true:

**Auth:**
- [ ] A new teacher can sign up at `https://easycaseload.com/signup` with email + password
- [ ] The verification email arrives with a working link (correctly tagged with `emailRedirectTo`)
- [ ] Clicking the link creates a `teachers` row in the database and redirects to `/dashboard`
- [ ] A verified teacher can log in at `/login` and reach `/dashboard`
- [ ] Invalid credentials show a user-friendly error; no internal error strings are exposed
- [ ] A logged-in teacher can log out and is redirected to `/login`
- [ ] Password reset sends an email and allows the teacher to set a new password
- [ ] Visiting a protected route without a session redirects to `/login`
- [ ] Visiting `/login` or `/signup` while already authenticated redirects to `/dashboard`

**Database:**
- [ ] `teachers` table exists in the `public` schema with RLS enabled
- [ ] A signup creates exactly one `teachers` row
- [ ] A teacher cannot read another teacher's row (verify by querying with a second account's JWT)
- [ ] The auth trigger is gated on `app: 'easycaseload'` (inspect the trigger function source)

**Application:**
- [ ] Dashboard displays with mobile-friendly layout, navigation, and empty state
- [ ] All auth pages are fully usable on a 375px-wide screen
- [ ] `npx tsc --noEmit` exits clean
- [ ] `npm run build` succeeds
- [ ] No `console.log` in production paths
- [ ] `.env.example` committed; `.env.local` not committed

**Deployment:**
- [ ] App is accessible at `https://easycaseload.com`
- [ ] App is accessible at `https://www.easycaseload.com`
- [ ] HTTPS is working (Caddy SSL)
- [ ] Container is running on `n8n_default` network
- [ ] Container name is `easycaseload`, host port is `3010`
- [ ] Code is pushed to `https://github.com/joe203/easycaseload.git`

---

## 14. Constraints — Non-Negotiable

These rules exist because EasyCaseload runs on shared FiveSixteen infrastructure. Violating them causes problems for other apps on the same server.

1. **Every `signUp` and `signInWithOtp` must pass `{ data: { app: 'easycaseload' } }`** — the auth instance is shared; without this tag, cross-app data contamination is possible.
2. **The auth trigger must gate on the app tag** — without the gate, the trigger fires for signups from other FiveSixteen apps.
3. **Always pass explicit `emailRedirectTo`** — `SITE_URL` belongs to another app; relying on it will send users to the wrong place.
4. **Container must run on `n8n_default` Docker network** — this is how it reaches Supabase and n8n.
5. **RLS must be enabled on every table** — the shared anon key means an unguarded table is readable by any app on the instance.
6. **No secrets in git** — ever.
7. **`typescript.ignoreBuildErrors` must never be set** — TypeScript errors are real errors.
8. **Use `supabase_admin` for all migrations**, not `postgres`.

---

## 15. Decisions You Can Make

These are not specified. Use your best judgment, consistent with the tech stack and UX principles:

- Visual design of auth pages and dashboard (colors, typography, spacing) — keep it clean, professional, mobile-friendly
- Whether to use a bottom nav bar or slide-out drawer for mobile navigation
- Exact Tailwind component structure and class choices
- Error message copy (as long as it's user-friendly and doesn't expose internals)
- Whether to co-locate hooks with their pages or in a top-level `/hooks` directory
- Whether to add a `lib/supabase/` directory or inline client creation — consistency matters more than the choice itself

If you make a non-obvious architectural decision not covered by `CLAUDE.md` or this document, add a dated note to `docs/` explaining the decision and the reasoning.

---

## 16. On Completion

When Phase 1 is done:

1. Update `CURRENT_STATUS.md`:
   - Mark Phase 1 as complete in the session log
   - Update the application code table (auth flow ✅, dashboard ✅, etc.)
   - Confirm which open items in §4 are now resolved
2. Update `ROADMAP.md`: mark all Phase 1 features with ✅
3. Update `CLAUDE.md §14` (Open Items): close any gaps that were resolved (e.g., `ADDITIONAL_REDIRECT_URLS` configured, pg_dump confirmed, container deployed)
4. Push everything to GitHub

---

_End of Phase 1 Mission Package._
