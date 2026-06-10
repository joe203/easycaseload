# New App Onboarding Playbook — FiveSixteen Self-Hosted Server

Follow this start-to-finish whenever you transition a website (church, school,
org, product) onto the DigitalOcean droplet. Work the phases in order and don't
skip the checklists — every item here exists because skipping it costs rework.

Companion doc: `shared-supabase-tenancy.md` (the database isolation rules —
referenced from Phase 3, read it before your first migration).

---

## Phase 0 — Before touching any code

- [ ] **Inventory the existing site.** List: pages, forms (where do submissions
      go?), logins/accounts (does anyone sign in?), uploaded/stored files,
      emails it sends, third-party integrations (payment, calendar, chat),
      and any data that must survive the move (members, posts, submissions).
- [ ] **Decide what NOT to rebuild.** Fewer pages done well beats many
      mediocre ones. Confirm scope with the client before building.
- [ ] **Create the project folder + git repo on day one:**
      `git init` → first commit before any changes. Push to a private GitHub
      repo as soon as it exists. No project lives outside version control.
- [ ] **Collect brand assets** (logo, colors, fonts, real photos) into
      `brand_assets/` before designing. Placeholders are fine to start, but
      flag them.

## Phase 1 — Build standards (every app, no exceptions)

- [ ] **Stack:** Next.js (App Router) + Tailwind CSS + TypeScript. npm, not pnpm.
- [ ] **Secrets:** real values only in `.env.local` (gitignored). Ship a
      `.env.example` with placeholder values for every variable the app reads.
      Confirm `.gitignore` covers `.env*.local` BEFORE the first commit.
- [ ] **Types enforced:** never set `typescript.ignoreBuildErrors`. Run
      `npx tsc --noEmit` clean before calling anything done.
- [ ] **Project files in repo root:** `Dockerfile`, `docker-compose.yml`,
      project `CLAUDE.md`, `docs/` for decisions. Write decisions down when
      you make them — future-you is the audience.

## Phase 2 — Database & files (the shared Supabase)

One Supabase stack serves all apps (droplet `/root/supabase/docker`). Full
rules live in `shared-supabase-tenancy.md`. The short version:

- [ ] **Own schema per app** — never put a new app's tables in `public`
      (that's EasyCaseload's). Create `<appname>` schema, add it to
      `PGRST_DB_SCHEMAS` in the docker `.env`, restart `rest`. The app's
      Supabase client must set `db: { schema: '<appname>' }`.
- [ ] **RLS on every table from the first migration.** Schema separation is
      organization; RLS is security. One unguarded table is reachable from
      every app on the instance.
- [ ] **Migrations as numbered, idempotent SQL files** in
      `supabase/migrations/` (`001_…`, `002_…`), additive-only (new columns
      nullable/defaulted, never destructive in place). Keep a combined
      `apply_all.sql`. Apply on the droplet:
      `docker exec -i supabase-db psql -U supabase_admin -d postgres` —
      note `supabase_admin`, not `postgres`, owns everything.
- [ ] **Files: one PRIVATE bucket per app** (`<appname>-media`), object paths
      starting with the owning entity's id, storage policies scoped to that
      prefix, access via signed URLs only. Never a public bucket for anything
      sensitive.
- [ ] **Extensibility escape hatch:** give main tables a
      `metadata jsonb default '{}'` column so new fields don't need
      migrations.
- [ ] **Migrating old data** (MongoDB or otherwise): export → transform →
      insert via SQL/script → verify counts match → keep the export until the
      client signs off.

## Phase 3 — Auth (only if the app has logins)

- [ ] **Tag every signup** with the app's name:
      `signUp({ options: { data: { app: '<appname>' } } })` — and the same in
      `signInWithOtp`. The auth system is shared; the tag is how apps ignore
      each other's users.
- [ ] **Gate any `auth.users` trigger** on that tag
      (`raw_user_meta_data->>'app' = '<appname>'`), or it will fire for every
      app's signups.
- [ ] **Add the app's URLs to `ADDITIONAL_REDIRECT_URLS`** in the docker
      `.env` (comma-separated; include `http://localhost:3000/**` for dev and
      the production domain) and restart auth:
      `docker compose up -d auth` (must be `up -d`, not `restart`, to reload env).
- [ ] **Always pass explicit `emailRedirectTo`** in auth calls — `SITE_URL`
      is single-valued and belongs to whichever app claimed it first.
- [ ] **⚠️ Second auth-using app rule:** the instance has ONE email sender.
      Before the SECOND app enables Supabase auth emails, implement the
      GoTrue send-email hook (per-app sender/template by `app` tag) or its
      users get emails branded as the first app.
- [ ] **Identity hygiene** (if the app links pre-existing records to new
      signups): only auto-link on VERIFIED identities. Claimed-but-unverified
      identifiers must never hand their data to whoever signs up with them.

## Phase 4 — Deploy to the droplet

- [ ] **Multi-stage Dockerfile** (deps → build → slim runner), Next.js
      `output: 'standalone'` for small images.
- [ ] **Run on the `n8n_default` Docker network — always.**
      `docker run -d --name <app> --network n8n_default -p <port>:3000 <app>`
      Never `--network bridge`, never omit the flag; it breaks inter-container
      communication (Supabase, n8n, etc.).
- [ ] **Pick an unused host port** and write it down in the project CLAUDE.md.
- [ ] **Caddy:** add a block to the Caddyfile —
      `<domain> { reverse_proxy <app>:<port> }` — then reload Caddy. SSL is
      automatic. **Never expose database or internal ports publicly**; only
      Caddy faces the internet.
- [ ] **DNS:** point the domain's A record at the droplet (67.207.83.48)
      before flipping the client over; verify with the temporary subdomain
      first if downtime matters.
- [ ] **Safe rebuild pattern** for updates:
      `docker build -t <app> . && docker stop <app> && docker rm <app> && docker run -d --name <app> --network n8n_default -p <port>:3000 <app>`

## Phase 5 — Before calling it done

- [ ] **Push to GitHub** (private repo) — the droplet is not a backup of
      your code; GitHub is.
- [ ] **Backups:** weekly DO snapshots cover the droplet. If this app writes
      data users would cry about losing, confirm the nightly `pg_dump` cron
      exists (one cron covers the whole shared Postgres).
- [ ] **Run the launch checklist** from the global CLAUDE.md (service times /
      contact / CTA above the fold for churches, mobile nav, real photos,
      footer info).
- [ ] **Document the handoff:** in the project CLAUDE.md record the domain,
      container name, host port, schema name, bucket name, env vars, and
      anything weird. The next session (or the next you) starts from zero.

---

## The five mistakes this playbook exists to prevent

1. Tables in `public` / no RLS → another app can read your client's data.
2. Untagged signups or ungated triggers → apps contaminate each other's users.
3. Containers off `n8n_default` → "can't reach the database" mysteries.
4. Secrets committed because `.gitignore` wasn't checked first → key rotation
   fire drill.
5. No git/GitHub until "later" → one laptop failure erases a week of work.
