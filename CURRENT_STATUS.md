# EasyCaseload — Current Status

_Last updated: 2026-06-12 (deploy mission)_

This document is a snapshot of where the project stands. Update it at the start or end of
every Claude Code session. If information here conflicts with the codebase or server,
trust what you observe and update this file.

---

## 1. Overall State

**Phase:** Phase 1 (foundation) — implementation complete. **Deployed to production
2026-06-12**: live at `https://easycaseload.com` (container `easycaseload` on the droplet,
Caddy + SSL, nightly pg_dump cron installed). Next: structured testing (teacher persona
scripts), then the fix cycle.

The application is a real, working app — not a scaffold:
- Auth works end to end (magic link primary, email/password secondary, verified live)
- Schools + students CRUD works under RLS (ahead of the original Phase 2 schedule)
- TanStack Query + Supabase Realtime are wired and verified (DB change → UI update, no refresh)
- The chat widget streams from Anthropic (`claude-haiku-4-5`)
- The Docker image builds and serves (verified locally with a real HTTP 200)

## 2. What Exists

### Application (verified working)
| Component | Status | Notes |
|---|---|---|
| Next.js app (App Router, TS, Tailwind, npm) | ✅ | Adapted from the v0 export; `v0_files/` kept as reference |
| Auth: magic link (primary) + password (secondary) | ✅ | App-tagged signups; verified-link-only auto-linking |
| Public site (home, contact, privacy, terms) | ✅ | Homepage funnels to signup ("Get Started — Just Talk"); early-access & survey removed from UI (files kept) |
| Dashboard with live counts | ✅ | Active students + schools via TanStack Query + Realtime |
| Schools CRUD | ✅ | `useSchools` hook + invalidation |
| Students CRUD (within school detail) | ✅ | `/app/students` list page is still a placeholder |
| Documents upload (private bucket, signed URLs) | ✅ | Polymorphic `documents` table |
| Minutes tracking prototype | ✅ | Stores in `teachers.preferences` JSONB — known Phase 2 workaround |
| Chat widget (Anthropic Haiku, FAQ scope) | ✅ | Full assistant identity deferred to the intelligence pipeline |
| `app/providers.tsx` + hooks (`useStudents`, `useSchools`) | ✅ | CLAUDE.md §12 pattern |
| Dockerfile + docker-compose + standalone output | ✅ | Image verified runnable locally |
| GitHub | ✅ | Pushed to `https://github.com/joe203/easycaseload.git` (origin/main) |

### Database (live on droplet, migrations 001–017 applied)
All 10 tables + RLS + functions + private bucket + Realtime publications. See `DATABASE.md`
(rewritten 2026-06-11 from the actual migrations).

### Infrastructure (on droplet)
| Component | Status | Notes |
|---|---|---|
| Supabase (shared) | ✅ Live | `supabase.church516.xyz`; new key system (`sb_publishable_…`/`sb_secret_…`) |
| Mailgun SMTP → GoTrue | ✅ Verified | Auth emails deliver (sender `EasyCaseload <no-reply@easycaseload.com>`) |
| `ADDITIONAL_REDIRECT_URLS` | ✅ Done | localhost + `https://easycaseload.com/**` + `https://www.easycaseload.com/**`; GoTrue restarted 2026-06-12 |
| EasyCaseload container | ✅ Deployed | `/root/apps/easycaseload`, network `web` (NOT n8n_default — doesn't exist on this droplet), host port 3010 |
| Caddy block + DNS for easycaseload.com | ✅ Done | DNS repointed from old Vercel deploy → 67.207.83.48; Caddy (host systemd) proxies localhost:3010; www redirects to apex |
| Backups | ✅ Done | Nightly 03:00 `pg_dump` cron (`/root/backups/pg_backup.sh`), gzipped, 14-day retention; first run verified |

## 3. Open Items

| # | Item | Blocks | Notes |
|---|---|---|---|
| 1 | ~~Deploy to droplet~~ | — | ✅ Done 2026-06-12. Live at `https://easycaseload.com`. Redeploy: `cd /root/apps/easycaseload && git pull && docker compose --env-file .env.local up -d --build` |
| 2 | ~~Nightly `pg_dump` cron~~ | — | ✅ Done 2026-06-12 (03:00 nightly, 14-day retention) |
| 3 | ~~Remove `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` from password-signup path~~ | — | ✅ Done 2026-06-12: password signup now routes through `/auth/callback` like magic link; var removed from `.env.example` |
| 4 | Google OAuth enablement gap | Only if Google auth is enabled | `signInWithOAuth` cannot carry the app tag (SDK has no `data` option); the auth callback now tags untagged users post-exchange, but the tag lands AFTER the `auth.users` INSERT, so the teacher-creation trigger skips OAuth signups. Enabling Google requires a find-or-create-teacher step in the callback. |
| 5 | Savannah / intake engine timing decision | Product direction | Docs say Phase 6+; the homepage promises "Talk. Savannah sets everything up," and a full engine design (trust-and-audit write policy, tool-driven agent) was approved in-session 2026-06-10. Decide: pull forward or soften homepage copy. |
| 6 | `/app/students` standalone list page | UX completeness | Placeholder; student CRUD currently lives in school detail. `useStudents` hook is ready for it. |
| 7 | Send-email GoTrue hook | Before the SECOND app enables Supabase auth emails | Per `docs/shared-supabase-tenancy.md` |

## 4. Session Log

| Date | Summary |
|---|---|
| 2026-06-10 | Project foundation documents created (PM/Cowork session) |
| 2026-06-09/10 | App adapted from v0 export onto new teacher-anchored schema; migrations 001–016 applied + verified live; Mailgun SMTP wired + verified; trigger app-tag scoping + verified-link-only linking tested both ways; homepage redesigned to talk-to-register funnel; git repo initialized |
| 2026-06-12 | **Deploy mission:** password-signup redirect fixed (`/auth/callback`); DNS repointed from old Vercel deployment; prod redirect URLs added to GoTrue; container deployed to `/root/apps/easycaseload` (network `web` — n8n_default doesn't exist on the droplet; docs corrected); Caddy block added (host systemd, localhost:3010, www→apex redirect); nightly pg_dump cron installed + first run verified; apex live with SSL (HTTP 200, 308 http→https). Deployment runbook added at `docs/DEPLOYMENT_RUNBOOK.md` |
| 2026-06-11 | **Session A (alignment mission):** repo pushed to GitHub; TanStack Query + providers + `useStudents`/`useSchools`; migration 017 (Realtime publications) applied + verified live (DB change → UI, no refresh); `revalidatePath` removed; fire-and-forget writes converted to optimistic mutations; dashboard live counts; chat migrated to Anthropic Haiku + verified streaming; Dockerfile/compose/standalone + image smoke-tested (HTTP 200); console.error swept; OAuth tagging via callback + documented enablement gap; DATABASE.md + CURRENT_STATUS.md rewritten to implementation truth |
