# EasyCaseload — Current Status

_Last updated: 2026-06-13 (V2 Phase C — demo environment)_

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
| 8 | Deploy Phase B | SMS registration end-to-end | Droplet `.env.local` needs `SUPABASE_SECRET_KEY` + `TELNYX_FROM_NUMBER` BEFORE this deploy (registration/OTP actions read them), then `git pull && docker compose --env-file .env.local up -d --build` |
| 9 | Enable the Telnyx reply node in n8n | SMS registration links | Only AFTER Phase B is deployed (`/register` must exist in prod) and a Telnyx credential (not hardcoded) is attached to the node. Mind the shared-number inbound routing caveat in `docs/n8n/inbound-sms-workflow-spec.md` |
| 10 | Telnyx A2P 10DLC registration | Phone-verify gate + all outbound SMS | Days-to-weeks lead time; when it clears, set `PHONE_VERIFICATION_ENABLED=true` on the droplet |
| 11 | Cloudflare Turnstile on signup/OTP forms | Before demo marketing traffic | SMS-pumping mitigation from V2 roadmap §5 — rate limits are in, Turnstile needs a CF account/site key from Joe |
| 12 | Deploy Phase C | Demo environment live | Apply migrations **019** (flip `account_status` default → demo) + **020** (reports Realtime) to the live DB, ensure droplet `.env.local` has `SUPABASE_SECRET_KEY` (seeding RPC) and `ANTHROPIC_API_KEY` (report generation), then redeploy. After 019, all NEW signups become demo + seed on first `/app` load; existing teachers stay `active`. |
| 13 | Nightly demo-expiration n8n job | Demo lifecycle comms + purge | Joe's lane. App already enforces expiry at request time (`getTeacherAccess` + DB triggers); the n8n job only does `demo→demo_expired` flips, the "demo ended" email/SMS, and 30-day purge of `is_demo` rows (never `raw_intake`). |

## 4. Session Log

| Date | Summary |
|---|---|
| 2026-06-13 | **V2 Phase C — demo environment built (not yet deployed):** (1) **Migration 019** flips `teachers.account_status` default → `demo` (existing teachers stay `active`; safety `update` only touches nulls — founders never demoted). (2) **Seed-on-first-load**: dashboard layout calls the idempotent service-role `seed_demo_workspace()` RPC when tier is `demo` and `demo_expires_at` is null, then refreshes access so the banner shows the countdown. Decoupled from the phone gate (works whether `PHONE_VERIFICATION_ENABLED` is on or off). (3) **Capability UI** from `getTeacherAccess()` — added `canGenerateReports` + `isReadOnly`; `components/demo-banner.tsx` shows day-countdown (demo) and read-only/“view plans” (demo_expired) in the dashboard layout. (4) **Sample subscription page** replaces the billing placeholder (2 placeholder plans, CTA → `/contact` since Stripe is Phase D — expired demos are routed here, never dead-ended). (5) **Reports**: page now renders real reports via `useReports` (TanStack + Realtime, **migration 020** adds `reports` to the publication); demo sees the 2 seeded watermarked samples with locked Export; active can generate + export (text download). (6) **Multi-source report backend** (`lib/reports/` + `lib/types/report.ts` + `lib/actions/reports.ts`): `assembleReportContext()` gathers sessions + goals + documents + a forward-compatible `ImpairmentProfile` extension point; `generateReportContent()` synthesizes across the WHOLE context via Anthropic Sonnet (counts computed from rows, not the model); generation gated to active tier. Architected to add sources without rewriting the generator — see `docs/report-architecture.md`. `npx tsc --noEmit` clean; `npm run build` green (all routes). **Not yet applied to live DB / not deployed — see Open Item #12.** |
| 2026-06-12 | **V2 Phase B — registration UI built (not yet deployed):** (1) signup form now collects name + email + phone on one screen (both magic-link and password paths; phone stored in auth metadata, verified later); (2) `/app/verify-phone` OTP gate — `app/(gate)/` route group outside the dashboard layout (no redirect loop), Telnyx OTP via direct server action (`lib/actions/phone-verification.ts`: HMAC-hashed codes, 60s resend cooldown, 5 codes/hr per teacher and per phone, 5 attempts, 10-min expiry, merge_teachers absorption when the verified phone belongs to an SMS-created unregistered teacher); (3) `/register?t=` token redemption page (`lib/actions/registration.ts`): claims the SMS-created teacher row by writing name+email onto it — the migration-016 trigger then links the new login to that exact row at magic-link signup (deterministic, no merge heuristics); phone marked verified (they texted from it), token single-use. New: `lib/supabase/admin.ts` (service-role client), `lib/telnyx.ts`, `lib/phone.ts`. Gate is feature-flagged: `PHONE_VERIFICATION_ENABLED=false` until Telnyx 10DLC clears. Migration 018 applied to live DB + unknown-sender SMS path verified green this session. `npx tsc --noEmit` clean; flows verified in preview. |
| 2026-06-10 | Project foundation documents created (PM/Cowork session) |
| 2026-06-09/10 | App adapted from v0 export onto new teacher-anchored schema; migrations 001–016 applied + verified live; Mailgun SMTP wired + verified; trigger app-tag scoping + verified-link-only linking tested both ways; homepage redesigned to talk-to-register funnel; git repo initialized |
| 2026-06-12 | **V2 Phase A — SMS plumbing LIVE:** `easycaseload_inbound_sms_v2` built in n8n (id `YG4QNXaYY8Dh7aQ6`, active) and verified end-to-end with a real SMS: Telnyx (+1-325-203-4927) → webhook → `raw_intake` store-first insert → teacher find-or-create by phone → intake linked. Known-teacher path proven green. Supabase auth via Custom Auth credential (`SERVICE_ROLE_KEY`, both `apikey` + `Authorization: Bearer` headers). Telnyx reply node disabled until Phase B `/register` page. Remaining: apply migration 018 (unblocks `registration_tokens` + unknown-sender path test), rotate old hardcoded Telnyx key, deactivate legacy MongoDB-era SMS workflows. Importable workflow JSON versioned at `docs/n8n/easycaseload_inbound_sms_v2.json`. |
| 2026-06-12 | **V2 Phase A (backend foundation):** V2 direction approved (docs/V2_ROADMAP.md); migration 018 written (account_status + demo_expires_at, is_demo flags, phone_verifications, registration_tokens, is_active_subscriber(), demo-cap triggers, seed_demo_workspace(), storage upload gate) — **not yet applied to live DB**; `getTeacherAccess()` capability helper created + threaded into create actions (zero behavior change for active accounts; fails open if column missing); apply_all.sql regenerated (18 migrations); TELNYX_FROM_NUMBER added to .env.example; n8n inbound-SMS build sheet at docs/n8n/inbound-sms-workflow-spec.md. **Deploy order: apply 018 BEFORE deploying this app code is recommended (code is safe either way).** |
| 2026-06-12 | **Deploy mission:** password-signup redirect fixed (`/auth/callback`); DNS repointed from old Vercel deployment; prod redirect URLs added to GoTrue; container deployed to `/root/apps/easycaseload` (network `web` — n8n_default doesn't exist on the droplet; docs corrected); Caddy block added (host systemd, localhost:3010, www→apex redirect); nightly pg_dump cron installed + first run verified; apex live with SSL (HTTP 200, 308 http→https). Deployment runbook added at `docs/DEPLOYMENT_RUNBOOK.md` |
| 2026-06-11 | **Session A (alignment mission):** repo pushed to GitHub; TanStack Query + providers + `useStudents`/`useSchools`; migration 017 (Realtime publications) applied + verified live (DB change → UI, no refresh); `revalidatePath` removed; fire-and-forget writes converted to optimistic mutations; dashboard live counts; chat migrated to Anthropic Haiku + verified streaming; Dockerfile/compose/standalone + image smoke-tested (HTTP 200); console.error swept; OAuth tagging via callback + documented enablement gap; DATABASE.md + CURRENT_STATUS.md rewritten to implementation truth |
