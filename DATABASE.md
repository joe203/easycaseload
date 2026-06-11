# EasyCaseload — Database

_Last updated: 2026-06-11 (rewritten from the actual migrations — Session A)_

This document describes the **implemented** Postgres schema for EasyCaseload on the shared
FiveSixteen Supabase instance. It is generated from migrations `001`–`017`, which are the
source of truth. If this document and a migration ever disagree, the migration wins — update
this file, never the other way around.

---

## 1. Schema Ownership

EasyCaseload **owns the `public` schema** (first tenant on the shared instance). All future
FiveSixteen apps use their own named schemas — see `docs/shared-supabase-tenancy.md`.

- Apply migrations: `docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/migrations/<file>.sql`
- Use `supabase_admin`, not `postgres` — `postgres` is not the superuser on this instance and
  does not own the trigger functions.
- `supabase/apply_all.sql` is the combined, regenerate-on-change script (currently 17 migrations).

## 2. Migration Conventions

- Numbered, idempotent files in `supabase/migrations/` (`001_init.sql` … `017_realtime.sql`)
- Additive only — new columns nullable or defaulted; never destructive in place
- Every significant table carries `metadata jsonb default '{}'` as an extensibility escape hatch
- All migrations 001–017 are **applied to the live instance** (verified 2026-06-09/11)

## 3. Tenancy Model

**Tenant = teacher.** Every application table carries `teacher_id` referencing `teachers.id`.

### RLS helper (actual implementation — note `auth_user_id`, not `user_id`)

```sql
create or replace function public.current_teacher_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.teachers where auth_user_id = auth.uid() limit 1;
$$;
```

Every teacher-owned table has four policies (`select/insert/update/delete`) gated on
`teacher_id = public.current_teacher_id()`. The `teachers` table itself is gated on
`auth_user_id = auth.uid()`. The `service_role` (intake pipeline, admin jobs) bypasses RLS.
**There are no exceptions to RLS.**

## 4. Tables (as implemented)

| Table | Migration | Purpose |
|---|---|---|
| `teachers` | 002 | The anchor/tenant. **Pre-auth capable:** `auth_user_id` is nullable — a teacher can exist (created from a phone number by the future intake pipeline) before they ever sign up. Lifecycle `status`: `unregistered → invited → in_progress → registered → merge_pending → merged`. Also: `email`, `phone`, `phone_verified`, `role` (teacher/admin), `source`, `invite_count`, `last_invited_at`, `preferences jsonb`, `merged_into`, `archived_at`. |
| `teacher_identities` | 004 | Many identifiers → one teacher. `kind` (email/phone) + normalized `value`, `verified`, `is_primary`. `UNIQUE(kind, value)`. This is the matching layer for the future Savannah intake. |
| `schools` | 005 | Campuses the teacher serves (attribute of the teacher, not a parent entity). Includes `supervisor_name`, `supervisor_email`. _Terminology: the product uses **schools**, not "campuses"._ |
| `students` | 006 | The caseload. `teacher_id` anchor + nullable `school_id`. Generated `name_key` column (lowercased full name) for future resolver matching. `status`: open text (active/inactive/archived/…). |
| `student_goals` | 007 | IEP/goal tracking: `goal_text`, `area`, `baseline`, `target`, `status` (active/met/discontinued). |
| `student_logs` | 008 | **Session logging — the core value.** `notes_raw` (original text preserved), `summary`, `performance_summary`, `participation`, `duration_minutes`, `service_type`, `session_date`, `source` (sms/email/voice/app/chat), `intake_id` → `raw_intake`, and `status` (`draft`/`confirmed`) — captured input lands as draft and is confirmed in-app. |
| `raw_intake` | 009 | **Store-First safety net** (Core Principle 5). Every inbound message persisted before processing: `identity_key`, `source`, `direction`, `from/to_address`, `content`, `media jsonb`, `provider` (telnyx/mailgun/vapi), `classification jsonb` (future AI results), `status` (`stored_unlinked/processed/resolved/error`), `processed`, `resolved`. `teacher_id` nullable until resolved. |
| `documents` | 010 | **Polymorphic** file metadata: attaches to any entity via `entity_type` + `entity_id` (student/school/teacher/log/…). `doc_type` is open text. Binary lives in the private `student-documents` bucket. |
| `reports` | 011 | AI-generated report drafts (`period`, `status` draft/ready/sent, `content jsonb`). **Reserved — Phase 5.** |
| `teacher_subscription` | 011 | Billing hooks (`status`, `plan`, Stripe ids). **Reserved — Phase 3D.** Teacher-readable, service-role-writable only. |

## 5. Functions & Triggers

| Object | Migration | Behavior |
|---|---|---|
| `set_updated_at()` | 001 | `updated_at` maintenance trigger on every table |
| `current_teacher_id()` | 003 | RLS helper (see §3) |
| `handle_new_user()` | 012/015/016 | `AFTER INSERT ON auth.users`. **Gated on `raw_user_meta_data->>'app' = 'easycaseload'`** (shared instance — verified live both ways). Find-or-link: auto-links the new login **only via a VERIFIED email identity** (or `teachers.email`, which only trusted writers set); a claimed-but-unverified email never hands its history to whoever signs up with it — instead the confirmed signup takes ownership of the identity. Email already on a registered login → new row flagged `merge_pending`. |
| `merge_teachers(p_canonical, p_duplicate)` | 013 | Transactional merge: reassigns schools, students, goals, logs, documents, reports, raw_intake, identities; archives the duplicate (`status='merged'`, `merged_into` set). **Service-role/admin only** — not granted to `authenticated`. |

**Identity convention (enforced by the future intake engine):** claimed emails captured from
SMS/voice go in `teacher_identities` with `verified = false` and are never written to
`teachers.email`.

## 6. Grants (migration 014)

`authenticated` gets table-level `select/insert/update/delete` (rows still gated by RLS);
`service_role` gets all; `anon` gets **nothing** on application tables. Default privileges
cover future tables. `merge_teachers()` is deliberately not executable by `authenticated`.

## 7. Storage

- Bucket: **`student-documents`** — private, created in migration 010
- Object paths must start with the owning teacher's id: `{teacher_id}/...`
  (storage RLS allows access only under your own prefix)
- Access is **signed URLs only** (1-hour expiry); student documents are PII — never public URLs

## 8. Realtime (migration 017)

Tables in the `supabase_realtime` publication: `teachers`, `schools`, `students`,
`student_logs`, `documents`. The client pattern (CLAUDE.md §12): `useQuery` + a Realtime
channel that calls `invalidateQueries` on any postgres change. Verified live 2026-06-11 —
a direct DB insert/delete updated the dashboard with no refresh.

## 9. Designed but Not Yet Migrated (future phases)

From `INTELLIGENCE_MODEL.md` — do **not** create these yet:

| Table | Phase |
|---|---|
| `tasks` | 6+ |
| `draft_queue` (approval gate) | 6+ |
| `daily_briefings` | 7 |
| `teacher_memory` | 8+ |
| `schedule_events` | 3 |

`raw_intake` (the docs' `raw_inputs`) and `student_goals`/`student_logs` (the docs'
`goals`/`session_notes`) already exist under the names above.
