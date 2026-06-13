# EasyCaseload — Authentication Flows

_Last updated: 2026-06-13_
_Read this before touching any auth-related code, email templates, GoTrue config, or n8n SMS nodes._

This document is the single source of truth for how teachers get into EasyCaseload.
Every URL, every step, every file, and the reason each piece was built the way it was.

---

## The Two Entry Paths

Teachers enter EasyCaseload one of two ways:

| Path | Who uses it | Starting point |
|---|---|---|
| **Web signup** | Teacher discovers the app on their own | `easycaseload.com` → clicks "Get Started" |
| **SMS registration** | Savannah/admin texts a teacher, or teacher texts in first | Teacher receives or sends an SMS to `+1-325-203-4927` |

Both paths ultimately produce the same result: a verified `auth.users` row linked to a `teachers` row, with the teacher landed in `/app/onboarding`.

---

## Flow 1 — Web Signup (Magic Link, primary method)

```
Teacher visits easycaseload.com
        │
        ▼
app/(auth)/signup/page.tsx
  Teacher enters: name, email, phone
  (phone stored in auth metadata for later OTP verification)
        │
        ▼
supabase.auth.signInWithOtp({ email, options: { data: { app: 'easycaseload' } } })
  ← app tag is REQUIRED — all auth calls must include it
  ← GoTrue sends the Magic Link email
        │
        ▼
Teacher receives email → clicks link
  Link format: https://easycaseload.com/auth/confirm?token_hash=XXX&type=magiclink&next=/app/onboarding
  ← Link is built by the GoTrue email template (see §Email Templates below)
        │
        ▼
app/auth/confirm/route.ts  ← SERVER-SIDE verification
  supabase.auth.verifyOtp({ type: 'magiclink', token_hash: XXX })
  Works on ANY device — the teacher can open this email on a laptop even if
  they signed up on their phone. No browser cookie or PKCE verifier needed.
        │
        ▼
Redirect → /app/onboarding
  Dashboard layout detects tier=demo, demo_expires_at=null
  → calls seed_demo_workspace() RPC → demo data created
  → DemoBanner shows 7-day countdown
```

**Key files:**
- `app/(auth)/signup/page.tsx` — signup form (name + email + phone)
- `app/auth/confirm/route.ts` — verifies the token, redirects to `next`
- `lib/auth-url.ts` — `publicOrigin()` + `safeNext()` used by confirm route
- `public/email-templates/magic-link.html` — GoTrue fetches this to build the email

---

## Flow 2 — Web Signup (Password, secondary method)

Revealed when the teacher clicks "Sign up with a password instead" on the signup page.

```
Teacher enters: name, email, phone, password
        │
        ▼
supabase.auth.signUp({ email, password, options: { data: { app: 'easycaseload' }, emailRedirectTo: origin+'/auth/callback' } })
  ← GoTrue sends a Confirm Signup email
        │
        ▼
Teacher clicks the confirmation email link
  Link format: https://easycaseload.com/auth/confirm?token_hash=XXX&type=signup&next=/app/onboarding
  ← Same confirm route, different `type` parameter
        │
        ▼
app/auth/confirm/route.ts
  supabase.auth.verifyOtp({ type: 'signup', token_hash: XXX })
        │
        ▼
Redirect → /app/onboarding  (same seed-on-first-load as Flow 1)
```

**Key files:**
- `app/(auth)/signup/page.tsx` — toggles between magic link and password UI
- `app/auth/confirm/route.ts` — handles both `type=signup` and `type=magiclink`
- `public/email-templates/confirm-signup.html` — GoTrue fetches this for password signups

---

## Flow 3 — Returning Teacher Sign-In

```
Teacher visits easycaseload.com/signin
        │
        ├─ Magic link (default) ──────────────────────────────────────────────┐
        │   supabase.auth.signInWithOtp({ email })                            │
        │   Teacher clicks email → same /auth/confirm route                   │
        │   Redirect → /app/dashboard (not onboarding — already set up)       │
        │                                                                      │
        └─ Password (if they set one) ────────────────────────────────────────┘
            supabase.auth.signInWithPassword({ email, password })
            No email step — direct session creation
            app/auth/callback/route.ts is NOT involved here
            Redirect → /app/dashboard
```

**Key files:**
- `app/(auth)/signin/page.tsx`

---

## Flow 4 — SMS Registration (n8n path)

This is the path for teachers who are recruited by SMS or who text in first.

```
OPTION A — Admin/Savannah texts teacher first:
  n8n creates a teacher row (status: 'unregistered') from the phone number alone
  Sends SMS: "Here's your link: https://easycaseload.com/register?t=<token>"

OPTION B — Teacher texts in first (+1-325-203-4927):
  Telnyx receives message → n8n webhook (easycaseload_inbound_sms_v2, id: YG4QNXaYY8Dh7aQ6)
  n8n: find-or-create teacher by phone → write to raw_intake → classify
  If teacher is unregistered/invited → generate registration token → reply with /register link
  If teacher is already registered → reply "You're already set up — sign in at easycaseload.com/signin"
        │
        ▼ (both options converge here)
Teacher clicks SMS link → https://easycaseload.com/register?t=<token>
        │
        ▼
app/(auth)/register/page.tsx  +  components/register-form.tsx
  lib/actions/registration.ts: redeemRegistrationToken(token, name, email)
    Validates token (single-use, 24hr expiry, from registration_tokens table)
    Writes name + email onto the existing teachers row
    Marks phone as verified (teacher proved ownership by texting from it)
    Sends magic link to their email via supabase.auth.signInWithOtp()
        │
        ▼
Teacher receives magic link email → clicks it
  Same /auth/confirm route (type=magiclink)
  migration 016 trigger: links the new auth.users row to the EXISTING teachers row
  (verified email match only — unverified claims cannot claim another teacher's data)
        │
        ▼
Redirect → /app/onboarding
```

**Key files:**
- `app/(auth)/register/page.tsx` + `components/register-form.tsx` — token redemption UI
- `lib/actions/registration.ts` — server action: validate token, write name/email, send magic link
- `supabase/migrations/018_v2_foundation.sql` — `registration_tokens` table + seed function
- n8n workflow `easycaseload_inbound_sms_v2` (id: `YG4QNXaYY8Dh7aQ6`) on `n8nfor516.online`

---

## Flow 5 — OAuth / Google (DISABLED)

Google auth code exists but is feature-flagged off (`NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false`).

**Do not enable without resolving this gap first:**
The `signInWithOAuth` SDK call has no `data` option, so the `app: 'easycaseload'` tag
cannot be passed at call time. The `/auth/callback` route tags the user post-exchange,
but this happens AFTER the `auth.users` INSERT — so the trigger that creates the `teachers`
row has already fired (and skipped, because the tag wasn't there yet).

Enabling Google requires a find-or-create-teacher step in `app/auth/callback/route.ts`
before the redirect. Tracked in `CURRENT_STATUS.md` Open Item #4.

---

## Why Two Routes: /auth/confirm vs /auth/callback

| Route | Flow type | Device requirement | When used |
|---|---|---|---|
| `/auth/confirm` | Token-hash (OTP) | Any device | All email confirmation links |
| `/auth/callback` | PKCE code | Same device that started signup | OAuth only (Google, when enabled) |

**Why we switched email links to /auth/confirm:**
The PKCE code flow stores a cryptographic verifier in the browser that initiated signup.
If the teacher opens the confirmation email on a different device (very common — phone signup,
laptop email), the verifier is missing and auth fails with `auth_callback_failed`.

The token-hash flow verifies the OTP entirely server-side. No browser cookie needed.
Any device, any browser, any time within the token's expiry window.

---

## GoTrue Email Templates

GoTrue (Supabase Auth) sends emails using HTML templates it fetches from a URL.

**Why templates are not edited in Supabase Studio:**
This is a self-hosted instance. The Studio version deployed here predates the
Email Templates UI. Templates are configured via GoTrue environment variables instead.

**Template files (in the Next.js app, served as static assets):**

| Template | File | GoTrue env var |
|---|---|---|
| Confirm signup (password path) | `public/email-templates/confirm-signup.html` | `GOTRUE_MAILER_TEMPLATES_CONFIRMATION` |
| Magic Link | `public/email-templates/magic-link.html` | `GOTRUE_MAILER_TEMPLATES_MAGIC_LINK` |

**GoTrue config location on the droplet:**
`/root/supabase/docker/.env`

**Env vars to add (one-time setup):**
```
GOTRUE_MAILER_TEMPLATES_CONFIRMATION=https://easycaseload.com/email-templates/confirm-signup.html
GOTRUE_MAILER_TEMPLATES_MAGIC_LINK=https://easycaseload.com/email-templates/magic-link.html
```

**After changing `.env`, restart the auth container:**
```bash
cd /root/supabase/docker && docker compose restart auth
```

**Template variable:** `{{ .TokenHash }}` is the GoTrue variable for the hashed OTP.
Do not change its casing or format. GoTrue substitutes it at send time.

---

## The publicOrigin() Problem (and Fix)

**The problem:**
Behind Caddy, the Next.js container binds to `0.0.0.0:3000` (set via `HOSTNAME` in
the Dockerfile). `new URL(request.url).origin` returns `http://0.0.0.0:3000` — an
internal address that is unreachable from outside the container. Any redirect built from
this sends the browser to an invalid URL (`ERR_ADDRESS_INVALID`).

**The fix:**
`lib/auth-url.ts` → `publicOrigin(request)`:
```ts
const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
const proto = request.headers.get("x-forwarded-proto") ?? "https"
return host ? `${proto}://${host}` : new URL(request.url).origin
```
Caddy sets `x-forwarded-host` and `x-forwarded-proto` on every proxied request,
so this always resolves to `https://easycaseload.com` in production.

**Used in:** `app/auth/confirm/route.ts` and `app/auth/callback/route.ts`
**Do not** build redirect URLs from `request.url` directly in any auth route.

---

## Auth Tagging Rule

Every Supabase auth call in this app must include the app tag:
```ts
options: { data: { app: 'easycaseload' } }
```

**Why:** EasyCaseload shares a Supabase instance with other FiveSixteen apps.
Every trigger on `auth.users` must exit immediately for non-EasyCaseload users.
Without the tag, every signup on any app fires EasyCaseload's teacher-creation trigger.
See `supabase/migrations/002_teachers.sql` for the trigger gate.

---

## Teacher Lifecycle (auth perspective)

```
unregistered  ← created by n8n from a phone number; no auth.users row yet
invited       ← registration token sent; waiting for teacher to click /register link
registered    ← auth.users row exists and is linked to teachers row (auth_user_id set)
merge_pending ← edge case: email already tied to a different registered teacher
merged        ← absorbed into canonical teacher via merge_teachers() (service role only)
```

The migration 016 trigger handles the link: when a new `auth.users` row is created,
it looks for a **verified** `teacher_identities` row matching that email and links them.
Unverified claims (e.g., an email someone mentioned over SMS but hasn't proved ownership of)
do not grant access to a pre-existing teacher's data.

---

## ADDITIONAL_REDIRECT_URLS

Set in `/root/supabase/docker/.env` on the droplet. Must include every domain this
app uses for auth redirects.

Current value:
```
http://localhost:3000/**,https://easycaseload.com/**,https://www.easycaseload.com/**
```

The `emailRedirectTo` in client code is validated against this list. If a domain is
missing here, auth calls with that `emailRedirectTo` will be rejected by GoTrue.

After changing this value, restart GoTrue:
```bash
cd /root/supabase/docker && docker compose restart auth
```

---

## What NOT to Change Without Reading This First

- **GoTrue email templates** — any change affects every auth email sent by the app.
- **`/auth/confirm/route.ts`** — this is the cross-device confirmation gate. Replacing
  `verifyOtp` with `exchangeCodeForSession` breaks confirmation on a second device.
- **`lib/auth-url.ts#publicOrigin`** — do not use `new URL(request.url).origin` in
  auth routes. It returns the container's internal bind address behind Caddy.
- **Auth app tag** — never remove `data: { app: 'easycaseload' }` from any auth call.
  Other tenants on the shared Supabase instance will be affected.
- **Registration token flow** — `lib/actions/registration.ts` links a teacher's SMS-created
  row to their auth account. Changes here affect the SMS path end-to-end.
