# Auth Email Templates — token-hash (cross-device) confirmation

_Date: 2026-06-13. Why: the default Supabase confirmation email uses the PKCE
code flow, which only works in the SAME browser that started signup. Teachers
register on a phone and often read email on another device, so confirmation must
work cross-device. The token-hash flow verifies the OTP server-side at
`/auth/confirm`, independent of any browser cookie._

## App side (already built)

- `app/auth/confirm/route.ts` — verifies `token_hash` + `type` via
  `supabase.auth.verifyOtp(...)`, then redirects to `next`. Works from any device.
- `app/auth/callback/route.ts` — kept for the OAuth PKCE code flow only.
- Both use `lib/auth-url.ts#publicOrigin` so redirects use the real host
  (`easycaseload.com`) behind Caddy, never the container's `0.0.0.0:3000`.

## GoTrue side (you must do this once)

Update the email templates on the shared Supabase instance. EasyCaseload owns
the SMTP/template config today, so this is safe to change. Set the link to point
at `https://easycaseload.com/auth/confirm` with `token_hash` + `type`.

Where: Supabase Studio → **Authentication → Email Templates** (or the self-hosted
GoTrue template env vars). Replace the body of each template below.

### "Confirm signup"  (sent by password signUp — `type=signup`)

```html
<h2>Confirm your email</h2>
<p>Welcome to EasyCaseload! Tap below to confirm your email and finish setting up your account.</p>
<p>
  <a href="https://easycaseload.com/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/app/onboarding">
    Confirm my email
  </a>
</p>
<p>If you didn't request this, you can ignore this email.</p>
```

### "Magic Link"  (sent by signInWithOtp — `type=magiclink`)

```html
<h2>Your EasyCaseload sign-in link</h2>
<p>Tap below to sign in. This link works on any device.</p>
<p>
  <a href="https://easycaseload.com/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/app/onboarding">
    Sign in to EasyCaseload
  </a>
</p>
<p>If you didn't request this, you can ignore this email.</p>
```

### (Optional) "Reset Password" — `type=recovery`

```html
<h2>Reset your EasyCaseload password</h2>
<p><a href="https://easycaseload.com/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/app/dashboard">Reset password</a></p>
```

## Notes

- `{{ .TokenHash }}` is the GoTrue template variable for the hashed OTP — do not
  change its casing.
- The link host is hard-coded to `easycaseload.com` on purpose: it does NOT rely
  on `SITE_URL` (single-valued, owned by the first tenant, and currently
  suspect — it was sending links to `0.0.0.0:3000`).
- No `ADDITIONAL_REDIRECT_URLS` change is needed: `/auth/confirm` is the email
  link target, not a `redirect_to`, so the allow-list isn't involved.
- The client code still passes `emailRedirectTo`; it's now only used for the
  allow-list check and the OAuth path — the template drives email confirmation.
