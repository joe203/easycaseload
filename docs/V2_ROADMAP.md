# EasyCaseload V2 — Architecture & Implementation Roadmap

_Date: 2026-06-12. Input: "EasyCaseload Demo Environment Concept" + product decisions
(simple verified registration, controlled demo environment, demo→subscription model,
Savannah as guide/assistant rather than registration agent)._

This document is architectural planning within the decided product direction. It does
not reopen product strategy.

---

## 1. Registration Architecture

### Guiding choice: email is the *credential*, phone is a *verified attribute*

GoTrue (Supabase Auth) already handles email signup + verification well, and it's
proven in production. Phone, by contrast, should **not** become a login credential:

- Self-hosted GoTrue's native SMS OTP supports Twilio/MessageBird/Vonage — **not
  Telnyx** — so using it would mean either switching SMS providers or building a
  GoTrue send-SMS hook on the **shared** instance (same multi-tenant config problem
  as SMTP, instance-wide blast radius).
- Nothing in the product requires phone *login*. SMS features require a **verified
  phone on file** — an app-level concern, not an auth-level one.

So: **auth stays exactly as it is (GoTrue, magic link primary / password secondary);
phone verification is app-level** via a small OTP table + Telnyx API called directly
from a Next.js server action (per the n8n policy: a single API call is not orchestration).

### Website registration flow

```
Form: Name + Email + Phone  (one screen)
  → supabase.auth.signUp / signInWithOtp  (app-tagged, as today)
  → email verified by clicking the link (GoTrue, existing flow)
  → land in /app/verify-phone gate: 6-digit code sent via Telnyx → teacher enters it
  → teachers.phone_verified = true, verified phone row in teacher_identities
  → demo workspace seeds + unlocks
```

New piece — `phone_verifications` table:
`id, teacher_id, phone, code_hash, expires_at (10 min), attempts (max 5), verified_at, created_at`
plus rate limits (per phone and per IP) and a resend cooldown (60s). Codes are hashed;
never store the plain code.

The phone gate lives in the dashboard layout: `phone_verified = false` → redirect to
the verify page. One enforcement point, no scattered checks.

### SMS-initiated registration

The existing teacher lifecycle (`unregistered → invited → registered`) was built for
exactly this:

```
Teacher texts the EasyCaseload number
  → n8n inbound workflow writes raw_intake (store-first), finds-or-creates teacher
    (status: unregistered, phone: sender, phone IMPLICITLY VERIFIED — they texted from it)
  → auto-reply: "Welcome! Finish setting up here: https://easycaseload.com/register?t=<token>"
  → token = single-use row tied to the teacher record (NOT email matching)
  → web form pre-fills phone (locked), collects name + email
  → GoTrue signup → email verification → auth_user_id linked to the SAME teacher row
    via the token → status: registered → demo unlocks (phone already verified)
```

Key decision: **link by token, not by email/phone matching.** Matching heuristics are
what the `merge_pending` machinery exists to clean up after — a signed single-use token
makes the link deterministic and avoids merge states entirely for this flow.

Both paths converge on the same end state: a `registered` teacher with verified email
(GoTrue) + verified phone (app-level), demo workspace active.

---

## 2. Demo Environment Architecture

### Per-teacher isolated demo data: endorsed — and it's the only option that fits

The per-teacher copy approach isn't just acceptable, it's structurally correct here:

1. **The entire RLS model is `teacher_id` ownership.** A shared demo dataset would
   require cross-teacher read policies — a second access pattern on a shared-instance
   database whose security story is currently one sentence long ("you see your rows").
   Don't complicate the invariant that protects real student PII.
2. **"Add one practice student" requires writes** — shared data + writes = collisions
   or a copy-on-write layer. Per-teacher copies make writes trivial.
3. **Cleanup is one `DELETE WHERE teacher_id = X AND is_demo`.**
4. Cost is negligible: ~10 rows per demo signup.

### Schema (additive migration, no redesign)

On `teachers`:
- `account_status text default 'demo'` — `demo | demo_expired | active`
  (existing teachers backfilled to `active`)
- `demo_expires_at timestamptz`

On `schools`, `students`, `student_logs`, `reports`:
- `is_demo boolean not null default false`

New: `registration_tokens` (SMS flow), `phone_verifications` (OTP).
Unique index on verified phone (one demo per phone number — see Risks).

### Seeding

`seed_demo_workspace(p_teacher_id)` — a `security definer`, service-role-only SQL
function (same pattern as `merge_teachers`): inserts the two demo schools (Brownwood
ISD (Demo), Regional Cooperative School (Demo)), the three demo students (Maria
Hernandez, Jacob Wilson, Emma Garcia), sample logs/minutes, and sample report rows —
all `is_demo = true`, all owned by the teacher. Idempotent (re-run safe). Called once
when the phone gate passes. Template content lives in the function (versioned in a
migration), so improving the demo data is a migration, not a code deploy.

### Capability enforcement — one helper, three layers

**Layer 1 (the source of truth): a single `getTeacherAccess()` helper** in
`lib/supabase/teacher.ts` returning a capability object:

```ts
{ tier: 'demo' | 'demo_expired' | 'active',
  canUploadDocuments, canExportReports, canSendComms,
  maxStudents, maxSchools, demoExpiresAt }
```

Every server action checks capabilities from this one function; every UI lock/badge
renders from it. When subscription flips `account_status` to `active`, **nothing else
changes** — this is the main rework-avoidance decision in V2.

**Layer 2 (hard caps in the DB):** `BEFORE INSERT` triggers on `students`/`schools`
raise if a demo teacher exceeds caps (seeded + 1 practice student; no new schools).
Protects against anyone bypassing the app layer with the anon key + their JWT.

**Layer 3 (storage):** the `student-documents` bucket INSERT policy gains an
`is_active_subscriber()` check (security definer, reads `account_status`) — demo
accounts physically cannot upload, regardless of app code.

Demo restrictions per the concept doc map to: `canUploadDocuments=false`,
`canExportReports=false`, `canSendComms=false`, student cap, school cap, billing
hidden. Demo report "generation" = watermarked output from demo data with a per-demo
generation cap (AI cost control), alongside pre-seeded sample reports.

### Expiration

- `demo_expires_at = activation + 7 days` (configurable; start at 7, tighten later).
- **Enforced server-side at request time**: the dashboard layout/`getTeacherAccess()`
  compares against `now()` — an expired demo is locked even if the nightly job hasn't
  run. The nightly job is for state transitions + comms, not for security.
- **Nightly n8n job**: flip overdue `demo → demo_expired`, send the "your demo ended —
  subscribe" email (and SMS, once 10DLC clears); purge demo data of accounts expired
  > 30 days (raw_intake is never deleted, per Store-First).
- Expired UX: app renders a subscribe screen; demo data read-only or hidden (decide in
  design — recommend read-only for 7 days, then locked).

### Upgrade path

On subscription: `account_status = 'active'`, delete `is_demo` rows for that teacher,
real workspace starts clean. (Archive isn't needed — demo data is synthetic except the
one practice student; raw_intake preserves anything they typed.)

---

## 3. Backend Readiness Assessment

| Component | Required before implementation | Status |
|---|---|---|
| **Supabase — migrations** | 018: `account_status`, `demo_expires_at`, `is_demo` flags, `phone_verifications`, `registration_tokens`, unique verified-phone index, `seed_demo_workspace()`, demo-cap triggers, `is_active_subscriber()` + storage policy update | Not started — first build item |
| **Supabase — service key** | `SUPABASE_SECRET_KEY` must be added to the app's server env (seeding + token flows) and to n8n credentials (inbound SMS writes). Currently in `.env.example` but **not in the deployed `.env.local`** | Gap |
| **Auth (GoTrue)** | No changes. Email verification as-is. Do **not** add GoTrue SMS config | Ready |
| **Registration UI** | Signup form gains name+phone; new `/app/verify-phone` gate; `/register?t=` token page | Not started |
| **Telnyx** | (1) Decide dedicated EasyCaseload number vs reusing +1-325-244-0559 (currently mapped to church tenant — recommend a **dedicated number**); (2) **A2P 10DLC brand + campaign registration — START IMMEDIATELY, it has days-to-weeks of lead time and blocks all US SMS**; (3) messaging profile webhook → new n8n workflow; (4) rotate the API key currently hardcoded in the old workflow | Blocked on 10DLC lead time |
| **n8n workflows** | (1) `easycaseload_inbound_sms` v2 → Supabase `raw_intake` + find-or-create teacher + registration-link reply + STOP/HELP handling; (2) nightly demo-expiration job; (3) retire/repoint the legacy MongoDB-era workflows so nothing dual-writes | Joe's lane, designs in §4 |
| **OTP sending** | Direct Telnyx API call from a Next.js server action (not n8n — single call, no orchestration) | Trivial once 10DLC clears |
| **Database hygiene** | Backups already nightly ✅; run the restore drill before V2 work begins | Mostly ready |
| **Stripe** | Not required until Phase D, but the expired-demo screen needs *somewhere* to send people — Phase D must land before demo marketing pushes traffic | Not started |

---

## 4. Implementation Sequence (rework-minimizing)

**Phase A — Backend foundation** *(everything else depends on it)*
1. Migration 018 (full list above) + backfill existing teachers to `active`
2. `getTeacherAccess()` helper + thread it through existing server actions (no-op for
   `active` teachers — zero behavior change, pure foundation)
3. Add `SUPABASE_SECRET_KEY` to server env + n8n credential
4. **Kick off Telnyx 10DLC registration + dedicated number purchase** (lead time!)
5. Rebuild `easycaseload_inbound_sms` in n8n → `raw_intake` (store-first plumbing —
   shared infrastructure for registration now, voice/AI logging later)

**Phase B — Registration**
1. Web: new signup form (name/email/phone) → phone-verify gate → OTP server action
2. SMS-initiated: registration token issue/redeem + pre-filled register page +
   auto-reply in the inbound workflow
3. Anti-abuse hardening (Turnstile, rate limits, +1-only) — built WITH registration,
   not bolted on after

**Phase C — Demo environment**
1. `seed_demo_workspace()` wired to registration completion
2. Capability gating via `getTeacherAccess()` across actions/UI + DB triggers + storage policy
3. Demo report samples + capped watermarked generation
4. Nightly expiration job + expired-demo screen + comms

**Phase D — Subscription activation**
1. Stripe checkout + webhook → `teacher_subscription` (table already exists) →
   `account_status = 'active'` + demo-data cleanup
2. Billing page replaces placeholder
3. Demo-expired screen points at live checkout

**Phase E — Savannah as demo guide**
1. Chat widget becomes teacher-aware inside the demo (auth-required when in /app),
   system prompt scoped to guiding the demo workspace
2. Chat messages start writing to `raw_intake` (the Phase 6+ pipeline's front door)
3. Support-tier routing (FAQ → Savannah → SMS → human) layered on after

Why this order: A unblocks everything and changes no current behavior; B before C
because demo activation is registration's last step; C before D because subscription
semantics are "demo gates lifted" — D is small if C centralized gating correctly;
E last because Savannah-as-guide needs a demo to guide. The 10DLC clock starts in A
because it's the only external dependency with real lead time.

What this sequence deliberately avoids rebuilding later: gating logic (one helper),
SMS plumbing (store-first from day one, reused by every future SMS/voice feature),
identity linking (token-based, no merge heuristics), and GoTrue config (untouched).

---

## 5. Technical Risks & Required Mitigations

1. **A2P 10DLC compliance (HIGH, schedule risk).** US carriers block/filter
   application SMS from unregistered senders. Brand + campaign registration through
   Telnyx takes days-to-weeks and OTP traffic requires it. Start in Phase A. Until it
   clears: website registration can ship with email-verification-only behind a flag,
   but one-demo-per-phone (anti-abuse) depends on phone verification — don't run
   demo marketing before SMS is live.
2. **SMS pumping / OTP toll fraud (HIGH, cost risk).** Bots submit premium-rate
   numbers to OTP forms and profit per message. Mitigations (all of them): Cloudflare
   Turnstile on the form, +1 numbers only at launch, per-phone and per-IP rate limits,
   60s resend cooldown, max 5 attempts per code, daily SMS spend alert in Telnyx.
3. **Demo farming (MEDIUM).** Disposable emails are free; phone verification is the
   real gate. Enforce **one demo per verified phone** (unique index) and treat a reused
   phone as a returning expired user, not a fresh demo.
4. **`/api/chat` is public with no rate limiting (MEDIUM now, HIGH in Phase E).**
   Becomes Savannah with bigger prompts. Require auth for in-app chat, add per-user
   rate limits, and cap demo-tier usage via `getTeacherAccess()`.
5. **App-layer-only demo limits are bypassable (MEDIUM).** A demo user's JWT passes
   RLS; they can call PostgREST directly and skip UI checks. Hence the DB triggers
   (caps) and storage policy (uploads) in Phase C — defense in depth is required,
   not optional.
6. **Legacy surface area (LOW-MEDIUM).** `/api/early-access`, `/api/survey*` are still
   publicly callable with no UI; legacy n8n workflows still active against retired
   MongoDB; a Telnyx API key sits in plain text in an old workflow. Clean all three up
   in Phase A (remove/disable + rotate the key).
7. **Stripe sequencing (MEDIUM, product risk).** Demo expiry that dead-ends ("subscribe"
   with no checkout) burns the exact teachers the demo convinced. Phase D before any
   demo-traffic marketing.
8. **Shared-instance blast radius (LOW).** Demo signups create real rows in the shared
   DB. Caps + 30-day purge keep it bounded; the nightly backup covers all tenants.
9. **Practice-student PII (LOW, policy).** A teacher may type a real student's name
   into their one practice student. Purge expired demo data on schedule (30 days) and
   say so in the demo terms.
10. **Existing-teacher backfill (LOW, correctness).** Migration 018 must set current
    teachers to `active` — defaulting everyone to `demo` would lock the founders out
    of their own app.

---

## Relationship to V1 documents

- `ROADMAP.md` / `PRODUCT_VISION.md`: voice-based registration de-prioritized per the
  V2 decisions; Savannah's role updated (demo guide / assistant, not registrar). Those
  documents need a revision pass once this roadmap is approved.
- The Phase 1 foundation (auth, RLS, CRUD, documents, deploy) is the substrate V2
  builds on — the testing plan in `docs/testing/TESTING_READINESS_ASSESSMENT.md`
  should still be executed first; V2 construction on an unverified foundation
  compounds risk.
