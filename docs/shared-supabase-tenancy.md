# One Supabase, Many Apps — Tenancy Rules

Joe runs ONE self-hosted Supabase stack (droplet `67.207.83.48`, `/root/supabase/docker`)
for all FiveSixteen.ai client organizations. Spinning up a stack per app is not
sustainable, so isolation is enforced *inside* the shared stack with four rules.
EasyCaseload is the first Postgres tenant and the reference implementation.

## The four rules

### 1. Auth: shared `auth.users`, app-tagged, gated triggers
GoTrue (logins) is instance-wide, so every app tags its signups:

```ts
supabase.auth.signUp({ email, password, options: { data: { app: "easycaseload" } } })
// same for signInWithOtp
```

Any trigger on `auth.users` MUST gate on its own tag:

```sql
if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'easycaseload' then
  return new;
end if;
```

A user who signs up in app A simply has no profile rows in app B — apps ignore
each other's users. (Verified live 2026-06-09: untagged signups create no
EasyCaseload teacher rows.)

### 2. Tables: one Postgres schema per app
- **EasyCaseload owns `public`** (it was here first; moving it later is possible
  but not worth the churn now).
- **Every future app gets its own schema** (`stockdale.*`, `church516.*`, …):
  create the schema, put all tables + RLS there, and add it to
  `PGRST_DB_SCHEMAS` in the docker `.env` so the API can reach it. The app's
  client then sets `db: { schema: "stockdale" }`.
- RLS on every table, always. Schema separation is for *organization*; RLS is
  the actual *security* boundary (all apps share one anon key + JWT secret, so
  an unguarded table is reachable from any app).

### 3. Storage (files): one private bucket per app, owner-scoped paths
- Bucket name = app name (`student-documents` is EasyCaseload's; future apps
  add their own, e.g. `stockdale-media`).
- Buckets are **private**; access via signed URLs only.
- Object paths start with the owning entity's id (`{teacher_id}/...`) and
  `storage.objects` policies allow access only under your own prefix.
- This is the answer to "each organization has access to files based on
  organization": bucket = app, path prefix + RLS = per-user/org scoping.

### 4. Email/SMS sending: shared GoTrue sender (for now)
GoTrue has ONE SMTP config per instance — currently Mailgun with sender
`EasyCaseload <no-reply@easycaseload.com>`. The church apps use MongoDB (not
Supabase auth), so this is harmless today. If a second app ever needs Supabase
auth emails with its own branding, the fix is GoTrue's **send-email auth hook**
(route emails through our own endpoint and pick template/sender by the user's
`app` tag). Same approach later for per-app SMS via the send-sms hook (Telnyx).

## Org-level scoping *within* an app
That's a per-app concern, not an instance concern. In EasyCaseload the tenant
is the **teacher** (`teacher_id` on every row + `current_teacher_id()` RLS).
An app with true org accounts would add an `organizations` table + `org_id`
columns + membership-based RLS — same pattern, one level up.

## Shared-fate caveats (accepted, all apps are ours)
- One JWT secret + anon/service keys instance-wide → RLS is the real wall.
- One Postgres → upgrades/restores affect every app; weekly DO snapshot is the
  instance-wide backup (add nightly `pg_dump` before real pilot data).
- `SITE_URL` is single-valued (currently church516.xyz); each app adds its own
  URLs to `ADDITIONAL_REDIRECT_URLS` and passes explicit `emailRedirectTo`.
