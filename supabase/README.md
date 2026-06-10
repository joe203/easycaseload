# EasyCaseload — Database (self-hosted Supabase)

Unified source of truth. The app connects **directly** to Supabase; n8n is thin
(outbound sends + scheduled reminders) and uses the `service_role` key when it writes.

## Migrations (run in order)

| File | Creates |
|------|---------|
| `001_init.sql` | pgcrypto + `set_updated_at()` |
| `002_teachers.sql` | `teachers` (the anchor; pre-auth identity) + RLS |
| `003_current_teacher.sql` | `current_teacher_id()` helper used by all RLS |
| `004_teacher_identities.sql` | many emails/phones → one teacher |
| `005_schools.sql` | `schools` |
| `006_students.sql` | `students` (+ generated `name_key`) |
| `007_student_goals.sql` | `student_goals` |
| `008_student_logs.sql` | `student_logs` (draft → confirmed) |
| `009_raw_intake.sql` | `raw_intake` audit trail + links `student_logs.intake_id` |
| `010_documents.sql` | polymorphic `documents` + private `student-documents` bucket |
| `011_reserved.sql` | `reports` (Phase 4), `teacher_subscription` (Phase 3D) |
| `012_handle_new_user.sql` | signup find-or-link trigger |
| `013_merge_teachers.sql` | `merge_teachers()` reconciliation function |
| `014_grants.sql` | role grants (anon excluded from these tables) |

All files are idempotent and additive — safe to re-run.

### Apply

```bash
# via Supabase CLI (preferred)
supabase db push

# or directly with psql, in order
for f in migrations/0*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

### Access model
- **Website (user session)** → anon/`authenticated` role → RLS enforced via `current_teacher_id()`.
- **Intake pipeline / n8n** → `service_role` key → bypasses RLS (so it can store unlinked `raw_intake` before a teacher exists).
- In-app Savannah mutations run under the **user's** session, never `service_role`.

## Required GoTrue (Auth) configuration — self-hosted
These don't come for free like Supabase Cloud:

- **SMTP** → wire to **Mailgun** so confirmation / magic-link / reset emails actually send.
- **Phone OTP** → GoTrue's *send-SMS auth hook* pointed at **Telnyx** (Telnyx is not a built-in GoTrue SMS provider).
- **Site URL + redirect allowlist** → include the app origin + `/auth/callback`.
- Generate the instance's **JWT secret** and **anon / service_role** keys.
- Google OAuth stays disabled for now.

## Notes
- `documents` is polymorphic (`entity_type` + `entity_id`) so new document kinds need no new tables.
- Vocab columns (`status`, `doc_type`, `performance_summary`, …) are open text validated in the app — no rigid DB enums, so the schema extends without migrations.
- `merge_teachers(canonical, duplicate)` is admin/`service_role` only (not granted to `authenticated`).
