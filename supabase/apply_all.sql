-- EasyCaseload - all migrations, combined in order. Generated 2026-06-12T13:51:32.3576814-05:00.


-- ============================================================
-- 001_init.sql
-- ============================================================
-- 001_init.sql — extensions + shared helpers
-- EasyCaseload unified schema (self-hosted Supabase / Postgres)
-- Idempotent and additive. Safe to re-run.

create extension if not exists pgcrypto;

-- Auto-maintain updated_at on any table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- 002_teachers.sql
-- ============================================================
-- 002_teachers.sql — the anchor entity (one human = one teacher row)
-- Can exist BEFORE auth (created by Savannah from a phone number);
-- auth_user_id is linked later at signup.

create table if not exists public.teachers (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  full_name       text,
  email           text,            -- stored lowercased; the primary login email
  phone           text,            -- E.164
  phone_verified  boolean not null default false,
  status          text not null default 'unregistered',
                   -- unregistered | invited | in_progress | registered | merge_pending | merged
  role            text not null default 'teacher',   -- teacher | admin
  source          text,            -- sms | email | voice | app | chat
  invite_count    integer not null default 0,
  last_invited_at timestamptz,
  preferences     jsonb not null default '{}'::jsonb,  -- user settings, reporting calendar
  metadata        jsonb not null default '{}'::jsonb,  -- extension escape hatch
  merged_into     uuid references public.teachers(id) on delete set null,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One email / one phone per teacher (only enforced when present).
create unique index if not exists teachers_email_key on public.teachers (lower(email)) where email is not null;
create unique index if not exists teachers_phone_key on public.teachers (phone) where phone is not null;

drop trigger if exists teachers_updated_at on public.teachers;
create trigger teachers_updated_at before update on public.teachers
  for each row execute function public.set_updated_at();

alter table public.teachers enable row level security;

-- A teacher can read/update only their own linked row.
drop policy if exists "teachers_select_own" on public.teachers;
create policy "teachers_select_own" on public.teachers
  for select using (auth_user_id = auth.uid());

drop policy if exists "teachers_update_own" on public.teachers;
create policy "teachers_update_own" on public.teachers
  for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- Inserts happen via the signup trigger (012) or the service_role (RLS bypassed).


-- ============================================================
-- 003_current_teacher.sql
-- ============================================================
-- 003_current_teacher.sql — map auth.uid() -> teachers.id for RLS policies
-- security definer so it reliably resolves regardless of the caller's RLS.

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.teachers where auth_user_id = auth.uid() limit 1;
$$;


-- ============================================================
-- 004_teacher_identities.sql
-- ============================================================
-- 004_teacher_identities.sql — many emails/phones -> one teacher
-- The matching/recognition layer. Savannah and the resolver look up here.
-- Additional emails are added & verified in-app (not as new logins).

create table if not exists public.teacher_identities (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  kind        text not null,            -- email | phone
  value       text not null,            -- normalized: email lowercased, phone E.164
  verified    boolean not null default false,
  is_primary  boolean not null default false,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kind, value)                   -- an identifier belongs to exactly one teacher
);

create index if not exists teacher_identities_teacher_idx on public.teacher_identities (teacher_id);

drop trigger if exists teacher_identities_updated_at on public.teacher_identities;
create trigger teacher_identities_updated_at before update on public.teacher_identities
  for each row execute function public.set_updated_at();

alter table public.teacher_identities enable row level security;

drop policy if exists "identities_select_own" on public.teacher_identities;
create policy "identities_select_own" on public.teacher_identities
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "identities_insert_own" on public.teacher_identities;
create policy "identities_insert_own" on public.teacher_identities
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "identities_update_own" on public.teacher_identities;
create policy "identities_update_own" on public.teacher_identities
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "identities_delete_own" on public.teacher_identities;
create policy "identities_delete_own" on public.teacher_identities
  for delete using (teacher_id = public.current_teacher_id());


-- ============================================================
-- 005_schools.sql
-- ============================================================
-- 005_schools.sql — campuses a teacher serves (attribute of the teacher, not a parent)

create table if not exists public.schools (
  id               uuid primary key default gen_random_uuid(),
  teacher_id       uuid not null references public.teachers(id) on delete cascade,
  school_name      text not null,
  district_name    text,
  campus_name      text,
  address          text,
  city             text,
  state            text,
  zip              text,
  supervisor_name  text,
  supervisor_email text,
  notes            text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists schools_teacher_idx on public.schools (teacher_id);

drop trigger if exists schools_updated_at on public.schools;
create trigger schools_updated_at before update on public.schools
  for each row execute function public.set_updated_at();

alter table public.schools enable row level security;

drop policy if exists "schools_select_own" on public.schools;
create policy "schools_select_own" on public.schools
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "schools_insert_own" on public.schools;
create policy "schools_insert_own" on public.schools
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "schools_update_own" on public.schools;
create policy "schools_update_own" on public.schools
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "schools_delete_own" on public.schools;
create policy "schools_delete_own" on public.schools
  for delete using (teacher_id = public.current_teacher_id());


-- ============================================================
-- 006_students.sql
-- ============================================================
-- 006_students.sql — the caseload (anchored to teacher, optionally linked to a school)

create table if not exists public.students (
  id                uuid primary key default gen_random_uuid(),
  teacher_id        uuid not null references public.teachers(id) on delete cascade,
  school_id         uuid references public.schools(id) on delete set null,
  first_name        text,
  last_name         text,
  -- normalized key for resolver matching (name + teacher_id)
  name_key          text generated always as (
                      lower(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')))
                    ) stored,
  grade             text,
  student_id_number text,
  case_manager      text,
  status            text not null default 'active',   -- active | inactive | archived
  notes             text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists students_teacher_idx on public.students (teacher_id);
create index if not exists students_match_idx   on public.students (teacher_id, name_key);

drop trigger if exists students_updated_at on public.students;
create trigger students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

alter table public.students enable row level security;

drop policy if exists "students_select_own" on public.students;
create policy "students_select_own" on public.students
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "students_insert_own" on public.students;
create policy "students_insert_own" on public.students
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "students_update_own" on public.students;
create policy "students_update_own" on public.students
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "students_delete_own" on public.students;
create policy "students_delete_own" on public.students
  for delete using (teacher_id = public.current_teacher_id());


-- ============================================================
-- 007_student_goals.sql
-- ============================================================
-- 007_student_goals.sql — IEP / goal tracking

create table if not exists public.student_goals (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,  -- denormalized for RLS
  student_id  uuid not null references public.students(id) on delete cascade,
  goal_text   text not null,
  area        text,                              -- e.g. articulation, language, fine-motor
  baseline    text,
  target      text,
  status      text not null default 'active',    -- active | met | discontinued
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists student_goals_student_idx on public.student_goals (student_id);
create index if not exists student_goals_teacher_idx on public.student_goals (teacher_id);

drop trigger if exists student_goals_updated_at on public.student_goals;
create trigger student_goals_updated_at before update on public.student_goals
  for each row execute function public.set_updated_at();

alter table public.student_goals enable row level security;

drop policy if exists "goals_select_own" on public.student_goals;
create policy "goals_select_own" on public.student_goals
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "goals_insert_own" on public.student_goals;
create policy "goals_insert_own" on public.student_goals
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "goals_update_own" on public.student_goals;
create policy "goals_update_own" on public.student_goals
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "goals_delete_own" on public.student_goals;
create policy "goals_delete_own" on public.student_goals
  for delete using (teacher_id = public.current_teacher_id());


-- ============================================================
-- 008_student_logs.sql
-- ============================================================
-- 008_student_logs.sql — session logs (the core value)
-- Captured via SMS/voice/email land as status='draft' and are confirmed in-app.
-- intake_id FK is added in 009 (after raw_intake exists).

create table if not exists public.student_logs (
  id                  uuid primary key default gen_random_uuid(),
  teacher_id          uuid not null references public.teachers(id) on delete cascade,
  student_id          uuid references public.students(id) on delete set null,
  school_id           uuid references public.schools(id) on delete set null,
  intake_id           uuid,                              -- FK -> raw_intake added in 009
  session_date        timestamptz,
  notes_raw           text,                              -- original text preserved
  summary             text,                              -- structured / AI summary
  performance_summary text,                              -- excellent|good|fair|poor|not_specified
  participation       text,                              -- attended|absent|unknown
  duration_minutes    integer,
  service_type        text,
  status              text not null default 'draft',     -- draft | confirmed
  source              text,                              -- sms|email|voice|app|chat
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists student_logs_teacher_idx on public.student_logs (teacher_id);
create index if not exists student_logs_student_idx on public.student_logs (student_id);
create index if not exists student_logs_status_idx  on public.student_logs (status);

drop trigger if exists student_logs_updated_at on public.student_logs;
create trigger student_logs_updated_at before update on public.student_logs
  for each row execute function public.set_updated_at();

alter table public.student_logs enable row level security;

drop policy if exists "logs_select_own" on public.student_logs;
create policy "logs_select_own" on public.student_logs
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "logs_insert_own" on public.student_logs;
create policy "logs_insert_own" on public.student_logs
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "logs_update_own" on public.student_logs;
create policy "logs_update_own" on public.student_logs
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "logs_delete_own" on public.student_logs;
create policy "logs_delete_own" on public.student_logs
  for delete using (teacher_id = public.current_teacher_id());


-- ============================================================
-- 009_raw_intake.sql
-- ============================================================
-- 009_raw_intake.sql — store-first audit trail of every inbound message
-- Written by the intake pipeline (service_role, RLS bypassed) or in-app chat (authenticated, own rows).
-- teacher_id is null until resolved/linked. Never lose data.

create table if not exists public.raw_intake (
  id                  uuid primary key default gen_random_uuid(),
  teacher_id          uuid references public.teachers(id) on delete set null,
  identity_key        text,                                  -- email:.. | phone:.. derived
  source              text,                                  -- sms | email | voice | chat
  direction           text not null default 'inbound',       -- inbound | outbound
  from_address        text,
  to_address          text,
  content             text not null,
  media               jsonb not null default '[]'::jsonb,    -- attachments
  provider            text,                                  -- telnyx | mailgun | vapi
  provider_message_id text,
  classification      jsonb not null default '{}'::jsonb,    -- AI intent / extracted entities
  status              text not null default 'stored_unlinked', -- stored_unlinked|processed|resolved|error
  processed           boolean not null default false,
  resolved            boolean not null default false,
  resolved_at         timestamptz,
  error               text,
  metadata            jsonb not null default '{}'::jsonb,
  received_at         timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists raw_intake_identity_idx on public.raw_intake (identity_key);
create index if not exists raw_intake_status_idx   on public.raw_intake (status);
create index if not exists raw_intake_teacher_idx  on public.raw_intake (teacher_id);

-- Link student_logs.intake_id now that raw_intake exists (idempotent).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_logs_intake_fk') then
    alter table public.student_logs
      add constraint student_logs_intake_fk
      foreign key (intake_id) references public.raw_intake(id) on delete set null;
  end if;
end $$;

alter table public.raw_intake enable row level security;

-- Teachers may read their own (resolved) intake history.
drop policy if exists "intake_select_own" on public.raw_intake;
create policy "intake_select_own" on public.raw_intake
  for select using (teacher_id = public.current_teacher_id());

-- In-app chat (authenticated) may log its own intake; external channels use service_role.
drop policy if exists "intake_insert_own" on public.raw_intake;
create policy "intake_insert_own" on public.raw_intake
  for insert with check (teacher_id = public.current_teacher_id());

-- Updates/deletes are service_role only (no authenticated policy).


-- ============================================================
-- 010_documents.sql
-- ============================================================
-- 010_documents.sql — polymorphic document store + private storage bucket
-- Attaches to any entity (student/school/teacher/log/...) so new document kinds
-- need no new tables. Files live in the private 'student-documents' bucket;
-- access is via signed URLs only (these are IEPs/evals = student PII).

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,  -- RLS anchor
  entity_type text not null,            -- student | school | teacher | log | ...
  entity_id   uuid,
  title       text,
  doc_type    text,                     -- iep | evaluation | report | other | ... (open)
  description text,
  file_path   text,                     -- storage path, prefixed with {teacher_id}/
  file_name   text,
  mime_type   text,
  size_bytes  bigint,
  metadata    jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_teacher_idx on public.documents (teacher_id);
create index if not exists documents_entity_idx  on public.documents (entity_type, entity_id);

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (teacher_id = public.current_teacher_id());

-- Private bucket (never public).
insert into storage.buckets (id, name, public)
values ('student-documents', 'student-documents', false)
on conflict (id) do nothing;

-- Storage RLS: a teacher may only touch objects under their own {teacher_id}/ prefix.
drop policy if exists "docs_storage_select" on storage.objects;
create policy "docs_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'student-documents'
         and (storage.foldername(name))[1] = public.current_teacher_id()::text);

drop policy if exists "docs_storage_insert" on storage.objects;
create policy "docs_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-documents'
              and (storage.foldername(name))[1] = public.current_teacher_id()::text);

drop policy if exists "docs_storage_update" on storage.objects;
create policy "docs_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'student-documents'
         and (storage.foldername(name))[1] = public.current_teacher_id()::text);

drop policy if exists "docs_storage_delete" on storage.objects;
create policy "docs_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-documents'
         and (storage.foldername(name))[1] = public.current_teacher_id()::text);


-- ============================================================
-- 011_reserved.sql
-- ============================================================
-- 011_reserved.sql — tables created now, activated in later phases.
-- reports = Phase 4 (calendar-driven outputs). teacher_subscription = Phase 3D (billing).

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.teachers(id) on delete cascade,
  student_id    uuid references public.students(id) on delete set null,
  period        text,                              -- 6wk | 9wk | semester | ...
  period_start  date,
  period_end    date,
  status        text not null default 'draft',     -- draft | ready | sent
  content       jsonb not null default '{}'::jsonb,
  generated_at  timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists reports_teacher_idx on public.reports (teacher_id);

drop trigger if exists reports_updated_at on public.reports;
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own" on public.reports
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own" on public.reports
  for delete using (teacher_id = public.current_teacher_id());

create table if not exists public.teacher_subscription (
  id                     uuid primary key default gen_random_uuid(),
  teacher_id             uuid not null unique references public.teachers(id) on delete cascade,
  status                 text not null default 'none',  -- none|trialing|active|past_due|canceled
  plan                   text,
  payment_method         text,
  renewal_date           timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

drop trigger if exists teacher_subscription_updated_at on public.teacher_subscription;
create trigger teacher_subscription_updated_at before update on public.teacher_subscription
  for each row execute function public.set_updated_at();

alter table public.teacher_subscription enable row level security;

-- Teachers read their own subscription; writes come from billing webhooks (service_role).
drop policy if exists "subscription_select_own" on public.teacher_subscription;
create policy "subscription_select_own" on public.teacher_subscription
  for select using (teacher_id = public.current_teacher_id());


-- ============================================================
-- 012_handle_new_user.sql
-- ============================================================
-- 012_handle_new_user.sql — signup find-or-link trigger
-- On a new auth user: link to a pre-existing teacher (e.g. created by Savannah from
-- a phone number) when the email matches; otherwise create a fresh teacher.
-- If the email already belongs to a fully-registered teacher, flag merge_pending
-- (do NOT clobber the existing record) — reconcile later with merge_teachers().

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email        text := lower(nullif(new.email, ''));
  v_full_name    text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_teacher_id   uuid;
  v_existing_auth uuid;
begin
  -- Phone-only / no-email signup: just create the teacher.
  if v_email is null then
    insert into public.teachers (auth_user_id, full_name, status, source)
    values (new.id, v_full_name, 'registered', 'app');
    return new;
  end if;

  -- Find an existing teacher by this email (identity table first, then teachers.email).
  select ti.teacher_id into v_teacher_id
  from public.teacher_identities ti
  where ti.kind = 'email' and ti.value = v_email
  limit 1;

  if v_teacher_id is null then
    select t.id into v_teacher_id
    from public.teachers t
    where lower(t.email) = v_email
    limit 1;
  end if;

  if v_teacher_id is not null then
    select auth_user_id into v_existing_auth from public.teachers where id = v_teacher_id;

    if v_existing_auth is null then
      -- Link this login to the pre-existing teacher; attach all prior history.
      update public.teachers
        set auth_user_id = new.id,
            status       = 'registered',
            full_name    = coalesce(nullif(full_name, ''), v_full_name),
            email        = coalesce(email, v_email),
            updated_at   = now()
        where id = v_teacher_id;
    else
      -- Email already tied to a registered login: create a new row flagged for merge.
      insert into public.teachers (auth_user_id, full_name, email, status, source)
      values (new.id, v_full_name, v_email, 'merge_pending', 'app')
      returning id into v_teacher_id;
    end if;
  else
    -- Brand-new teacher.
    insert into public.teachers (auth_user_id, full_name, email, status, source)
    values (new.id, v_full_name, v_email, 'registered', 'app')
    returning id into v_teacher_id;
  end if;

  -- Ensure an email identity exists for this teacher.
  insert into public.teacher_identities (teacher_id, kind, value, verified, is_primary)
  values (v_teacher_id, 'email', v_email, true, true)
  on conflict (kind, value) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 013_merge_teachers.sql
-- ============================================================
-- 013_merge_teachers.sql — first-class, transactional teacher merge.
-- Reassigns all child rows from the duplicate onto the canonical teacher,
-- moves non-colliding identities, then archives the duplicate.
-- Intended to be run by an admin / service_role (not granted to authenticated).

create or replace function public.merge_teachers(p_canonical uuid, p_duplicate uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_canonical is null or p_duplicate is null or p_canonical = p_duplicate then
    return;
  end if;

  update public.schools       set teacher_id = p_canonical where teacher_id = p_duplicate;
  update public.students      set teacher_id = p_canonical where teacher_id = p_duplicate;
  update public.student_goals set teacher_id = p_canonical where teacher_id = p_duplicate;
  update public.student_logs  set teacher_id = p_canonical where teacher_id = p_duplicate;
  update public.documents     set teacher_id = p_canonical where teacher_id = p_duplicate;
  update public.reports       set teacher_id = p_canonical where teacher_id = p_duplicate;
  update public.raw_intake    set teacher_id = p_canonical where teacher_id = p_duplicate;

  -- Move identities that don't collide with the canonical teacher's; drop the rest.
  update public.teacher_identities ti
    set teacher_id = p_canonical
    where ti.teacher_id = p_duplicate
      and not exists (
        select 1 from public.teacher_identities c
        where c.teacher_id = p_canonical and c.kind = ti.kind and c.value = ti.value
      );
  delete from public.teacher_identities where teacher_id = p_duplicate;

  -- Drop the duplicate's (empty/unused) subscription row to avoid the unique conflict.
  delete from public.teacher_subscription where teacher_id = p_duplicate;

  -- Archive the duplicate and release its auth link.
  update public.teachers
    set status       = 'merged',
        merged_into  = p_canonical,
        archived_at  = now(),
        auth_user_id = null,
        updated_at   = now()
    where id = p_duplicate;
end;
$$;


-- ============================================================
-- 014_grants.sql
-- ============================================================
-- 014_grants.sql — role grants for Supabase API roles.
-- RLS still restricts WHICH rows each role sees; these are table-level privileges.
-- anon (public marketing) gets no access to these tables. service_role bypasses RLS.

grant usage on schema public to anon, authenticated, service_role;

-- Existing tables.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', r.tablename);
    execute format('grant all on public.%I to service_role', r.tablename);
  end loop;
end $$;

-- Future tables created by the migration owner.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;

-- Helper functions callable by the app roles (merge_teachers intentionally excluded).
grant execute on function public.current_teacher_id() to authenticated, service_role;


-- ============================================================
-- 015_scope_signup_trigger.sql
-- ============================================================
-- 015_scope_signup_trigger.sql
-- This Supabase instance is shared with other apps, so auth.users is shared.
-- Only create a teacher when the signup is tagged as coming from EasyCaseload
-- (the app sets options.data.app = 'easycaseload'). Otherwise do nothing, so
-- signups on the other apps don't create stray easycaseload teacher rows.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email         text := lower(nullif(new.email, ''));
  v_full_name     text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_teacher_id    uuid;
  v_existing_auth uuid;
begin
  -- Scope: only act on EasyCaseload signups.
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'easycaseload' then
    return new;
  end if;

  -- Phone-only / no-email signup: just create the teacher.
  if v_email is null then
    insert into public.teachers (auth_user_id, full_name, status, source)
    values (new.id, v_full_name, 'registered', 'app');
    return new;
  end if;

  -- Find an existing teacher by this email (identity table first, then teachers.email).
  select ti.teacher_id into v_teacher_id
  from public.teacher_identities ti
  where ti.kind = 'email' and ti.value = v_email
  limit 1;

  if v_teacher_id is null then
    select t.id into v_teacher_id
    from public.teachers t
    where lower(t.email) = v_email
    limit 1;
  end if;

  if v_teacher_id is not null then
    select auth_user_id into v_existing_auth from public.teachers where id = v_teacher_id;

    if v_existing_auth is null then
      -- Link this login to the pre-existing teacher; attach all prior history.
      update public.teachers
        set auth_user_id = new.id,
            status       = 'registered',
            full_name    = coalesce(nullif(full_name, ''), v_full_name),
            email        = coalesce(email, v_email),
            updated_at   = now()
        where id = v_teacher_id;
    else
      -- Email already tied to a registered login: create a new row flagged for merge.
      insert into public.teachers (auth_user_id, full_name, email, status, source)
      values (new.id, v_full_name, v_email, 'merge_pending', 'app')
      returning id into v_teacher_id;
    end if;
  else
    -- Brand-new teacher.
    insert into public.teachers (auth_user_id, full_name, email, status, source)
    values (new.id, v_full_name, v_email, 'registered', 'app')
    returning id into v_teacher_id;
  end if;

  -- Ensure an email identity exists for this teacher.
  insert into public.teacher_identities (teacher_id, kind, value, verified, is_primary)
  values (v_teacher_id, 'email', v_email, true, true)
  on conflict (kind, value) do nothing;

  return new;
end;
$$;

-- Trigger itself is unchanged (created in 012); re-assert for idempotency.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 016_verified_link_only.sql
-- ============================================================
-- 016_verified_link_only.sql
-- Tighten signup auto-linking: a new login may only auto-link to an existing
-- teacher via a VERIFIED email identity. A claimed-but-unverified email (e.g.
-- one a teacher mentioned over SMS) must never hand its history to whoever
-- signs up with that address — instead, the confirmed signup PROVES ownership,
-- so the identity is reassigned to the new account and the claimant keeps
-- their own record (merge_teachers can unify them later if they're the same
-- person, e.g. matched by phone).
--
-- CONVENTION (enforced by the future intake engine, documented here):
--   * Claimed emails captured from SMS/voice go in teacher_identities with
--     verified = false. They must NOT be written to teachers.email.
--   * teachers.email is only ever set by this trigger / the app, so a match
--     there is trustworthy.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email         text := lower(nullif(new.email, ''));
  v_full_name     text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_teacher_id    uuid;
  v_existing_auth uuid;
begin
  -- Scope: only act on EasyCaseload signups (shared auth instance).
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'easycaseload' then
    return new;
  end if;

  -- Phone-only / no-email signup: just create the teacher.
  if v_email is null then
    insert into public.teachers (auth_user_id, full_name, status, source)
    values (new.id, v_full_name, 'registered', 'app');
    return new;
  end if;

  -- Auto-link ONLY via a VERIFIED email identity…
  select ti.teacher_id into v_teacher_id
  from public.teacher_identities ti
  where ti.kind = 'email' and ti.value = v_email and ti.verified = true
  limit 1;

  -- …or via teachers.email, which by convention only trusted writers set.
  if v_teacher_id is null then
    select t.id into v_teacher_id
    from public.teachers t
    where lower(t.email) = v_email
    limit 1;
  end if;

  if v_teacher_id is not null then
    select auth_user_id into v_existing_auth from public.teachers where id = v_teacher_id;

    if v_existing_auth is null then
      -- Link this login to the pre-existing teacher; attach all prior history.
      update public.teachers
        set auth_user_id = new.id,
            status       = 'registered',
            full_name    = coalesce(nullif(full_name, ''), v_full_name),
            email        = coalesce(email, v_email),
            updated_at   = now()
        where id = v_teacher_id;
    else
      -- Email already tied to a registered login: flag for merge, don't clobber.
      insert into public.teachers (auth_user_id, full_name, email, status, source)
      values (new.id, v_full_name, v_email, 'merge_pending', 'app')
      returning id into v_teacher_id;
    end if;
  else
    -- No verified match: brand-new teacher (even if someone has merely
    -- *claimed* this email — confirmed signup outranks an unverified claim).
    insert into public.teachers (auth_user_id, full_name, email, status, source)
    values (new.id, v_full_name, v_email, 'registered', 'app')
    returning id into v_teacher_id;
  end if;

  -- Record the email identity. If an UNVERIFIED claim on this address exists,
  -- ownership transfers to the account that just proved it.
  insert into public.teacher_identities (teacher_id, kind, value, verified, is_primary)
  values (v_teacher_id, 'email', v_email, true, true)
  on conflict (kind, value) do update
    set teacher_id = excluded.teacher_id,
        verified   = true,
        updated_at = now()
    where public.teacher_identities.verified = false;

  return new;
end;
$$;

-- Trigger unchanged (created in 012); re-assert for idempotency.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 017_realtime.sql
-- ============================================================
-- 017_realtime.sql — enable Realtime change events on live-data tables.
-- Required by CLAUDE.md §12: TanStack Query subscriptions invalidate on these
-- events so the UI updates without a refresh. Idempotent: each table is only
-- added if it is not already in the publication.

do $$
declare
  t text;
begin
  foreach t in array array['teachers','schools','students','student_logs','documents']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ============================================================
-- 018_v2_foundation.sql
-- ============================================================
-- 018_v2_foundation.sql — V2 backend foundation (Phase A)
-- Demo-environment data model, capability enforcement, phone verification,
-- and SMS-registration tokens. Idempotent and additive.
--
-- IMPORTANT SEQUENCING NOTE: account_status defaults to 'active' in THIS
-- migration so nothing changes for current signups while Phases B/C are built.
-- The Phase C migration flips the default to 'demo' when the demo workspace
-- (seeding + UI gating) actually ships. Do not flip it early — that would put
-- restrictions on signups with no demo experience behind them.

-- ── teachers: account tier + demo expiry ─────────────────────────────────
alter table public.teachers
  add column if not exists account_status text not null default 'active',
  add column if not exists demo_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'teachers_account_status_check'
  ) then
    alter table public.teachers
      add constraint teachers_account_status_check
      check (account_status in ('demo', 'demo_expired', 'active'));
  end if;
end $$;

-- ── is_demo flags on demo-seedable tables ────────────────────────────────
-- Demo-created rows are tagged so upgrade cleanup is a single targeted delete.
alter table public.schools      add column if not exists is_demo boolean not null default false;
alter table public.students     add column if not exists is_demo boolean not null default false;
alter table public.student_logs add column if not exists is_demo boolean not null default false;
alter table public.reports      add column if not exists is_demo boolean not null default false;

-- ── phone_verifications — app-level OTP (phone is an attribute, not a credential)
-- Codes are sent via Telnyx from a server action. Hashed, never plaintext.
-- Server-side only: RLS enabled with NO policies = invisible to authenticated
-- users; the service role (server actions / n8n) bypasses RLS.
create table if not exists public.phone_verifications (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  phone       text not null,                       -- E.164
  code_hash   text not null,                       -- sha256(code + server salt)
  attempts    integer not null default 0,          -- max 5, enforced app-side
  expires_at  timestamptz not null,                -- now() + 10 minutes at creation
  verified_at timestamptz,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists phone_verifications_teacher_idx
  on public.phone_verifications (teacher_id, created_at desc);
create index if not exists phone_verifications_phone_idx
  on public.phone_verifications (phone, created_at desc);   -- per-phone rate limiting

alter table public.phone_verifications enable row level security;
-- no policies: deny-all for anon/authenticated; service_role bypasses.

-- ── registration_tokens — SMS-initiated registration links ──────────────
-- A teacher who texts in gets a single-use link; redeeming it deterministically
-- links the new auth user to the pre-existing teacher row (no email matching,
-- no merge_pending heuristics).
create table if not exists public.registration_tokens (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  token_hash  text not null unique,                -- sha256(token); raw token only in the SMS
  expires_at  timestamptz not null,                -- now() + 7 days at creation
  used_at     timestamptz,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.registration_tokens enable row level security;
-- no policies: server-side only, same as phone_verifications.

-- ── is_active_subscriber() — capability check usable inside policies ─────
create or replace function public.is_active_subscriber()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teachers
    where auth_user_id = auth.uid()
      and account_status = 'active'
  );
$$;

-- ── Demo insert enforcement (defense in depth) ───────────────────────────
-- App-layer checks (getTeacherAccess) give friendly errors; these triggers make
-- the caps real even for direct PostgREST calls with a valid demo JWT.
-- TG_ARGV[0] = row cap for the table. Also: anything a demo teacher inserts is
-- force-tagged is_demo so upgrade cleanup catches it.
create or replace function public.enforce_demo_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_status  text;
  v_expires timestamptz;
  v_cap     integer := tg_argv[0]::integer;
  v_count   integer;
begin
  select account_status, demo_expires_at into v_status, v_expires
  from public.teachers where id = new.teacher_id;

  -- Treat an overdue demo as expired even if the nightly job hasn't flipped it.
  if v_status = 'demo_expired'
     or (v_status = 'demo' and v_expires is not null and v_expires < now()) then
    raise exception 'DEMO_EXPIRED: your demo has ended — subscribe to continue';
  end if;

  if v_status = 'demo' then
    execute format('select count(*) from public.%I where teacher_id = $1', tg_table_name)
      into v_count using new.teacher_id;
    if v_count >= v_cap then
      raise exception 'DEMO_LIMIT: demo accounts are limited to % rows in %', v_cap, tg_table_name;
    end if;
    new.is_demo := true;
  end if;

  return new;
end $$;

-- Caps: 2 schools + 4 students (3 seeded + 1 practice) per the demo concept;
-- generous caps on logs/reports so practice activity works but farming doesn't.
drop trigger if exists schools_demo_cap on public.schools;
create trigger schools_demo_cap before insert on public.schools
  for each row execute function public.enforce_demo_insert('2');

drop trigger if exists students_demo_cap on public.students;
create trigger students_demo_cap before insert on public.students
  for each row execute function public.enforce_demo_insert('4');

drop trigger if exists student_logs_demo_cap on public.student_logs;
create trigger student_logs_demo_cap before insert on public.student_logs
  for each row execute function public.enforce_demo_insert('50');

drop trigger if exists reports_demo_cap on public.reports;
create trigger reports_demo_cap before insert on public.reports
  for each row execute function public.enforce_demo_insert('10');

-- ── seed_demo_workspace(teacher_id) — per-teacher isolated demo data ─────
-- Service-role only (like merge_teachers). Idempotent: returns early if the
-- teacher already has demo schools. Sets demo_expires_at on first seed.
create or replace function public.seed_demo_workspace(p_teacher_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_school1 uuid;
  v_school2 uuid;
  v_maria   uuid;
  v_jacob   uuid;
  v_emma    uuid;
begin
  if exists (select 1 from public.schools where teacher_id = p_teacher_id and is_demo) then
    return;  -- already seeded
  end if;

  update public.teachers
  set demo_expires_at = coalesce(demo_expires_at, now() + interval '7 days')
  where id = p_teacher_id;

  insert into public.schools (teacher_id, school_name, district_name, city, state, supervisor_name, notes, is_demo)
  values (p_teacher_id, 'Brownwood ISD (Demo)', 'Brownwood ISD', 'Brownwood', 'TX',
          'Dr. Patricia Lane', 'Demo school — explore freely. This data disappears when you subscribe.', true)
  returning id into v_school1;

  insert into public.schools (teacher_id, school_name, district_name, city, state, supervisor_name, notes, is_demo)
  values (p_teacher_id, 'Regional Cooperative School (Demo)', 'Regional SSA', 'Early', 'TX',
          'Mr. David Okafor', 'Demo school — a second campus, the itinerant reality.', true)
  returning id into v_school2;

  insert into public.students (teacher_id, school_id, first_name, last_name, grade, status, notes, is_demo)
  values (p_teacher_id, v_school1, 'Maria', 'Hernandez', '3', 'active',
          'Demo student. Working on reading fluency goals.', true)
  returning id into v_maria;

  insert into public.students (teacher_id, school_id, first_name, last_name, grade, status, notes, is_demo)
  values (p_teacher_id, v_school1, 'Jacob', 'Wilson', '5', 'active',
          'Demo student. Orientation & mobility services, twice weekly.', true)
  returning id into v_jacob;

  insert into public.students (teacher_id, school_id, first_name, last_name, grade, status, notes, is_demo)
  values (p_teacher_id, v_school2, 'Emma', 'Garcia', '1', 'active',
          'Demo student. New referral — evaluation in progress.', true)
  returning id into v_emma;

  insert into public.student_logs
    (teacher_id, student_id, school_id, session_date, notes_raw, summary,
     performance_summary, participation, duration_minutes, service_type, status, source, is_demo)
  values
    (p_teacher_id, v_maria, v_school1, now() - interval '2 days',
     'Worked with Maria on fluency passage, she read 82 wpm up from 74 last month, really proud of her',
     'Fluency practice: 82 WPM (up from 74). Strong month-over-month progress.',
     'good', 'attended', 30, 'Reading Intervention', 'confirmed', 'app', true),
    (p_teacher_id, v_jacob, v_school1, now() - interval '3 days',
     'Jacob practiced cane travel from classroom to cafeteria, needed two verbal prompts at the stairwell',
     'O&M: independent route practice, classroom → cafeteria. Two verbal prompts at stairwell.',
     'fair', 'attended', 45, 'Orientation & Mobility', 'confirmed', 'app', true),
    (p_teacher_id, v_emma, v_school2, now() - interval '5 days',
     'Initial observation for Emma, classroom setting, teacher reports difficulty tracking on the board',
     'Initial evaluation observation. Classroom teacher reports board-tracking difficulty.',
     'not_specified', 'attended', 60, 'Evaluation', 'confirmed', 'app', true),
    (p_teacher_id, v_maria, v_school1, now() - interval '9 days',
     'Maria fluency session, 74 wpm baseline check, frustrated at first but finished strong',
     'Fluency baseline check: 74 WPM. Initial frustration, finished strong.',
     'good', 'attended', 30, 'Reading Intervention', 'confirmed', 'app', true);

  insert into public.reports
    (teacher_id, student_id, period, period_start, period_end, status, content, generated_at, is_demo)
  values
    (p_teacher_id, v_maria, '6wk',
     (now() - interval '6 weeks')::date, now()::date, 'ready',
     jsonb_build_object(
       'title', 'Six-Week Progress Report — Maria Hernandez (Demo)',
       'summary', 'Maria has shown consistent growth in reading fluency, improving from 74 to 82 words per minute across the reporting period. She attended all scheduled sessions.',
       'service_minutes', 120,
       'sessions_held', 4,
       'demo_watermark', true),
     now(), true),
    (p_teacher_id, v_jacob, '6wk',
     (now() - interval '6 weeks')::date, now()::date, 'ready',
     jsonb_build_object(
       'title', 'Six-Week Service Summary — Jacob Wilson (Demo)',
       'summary', 'Jacob is progressing toward independent campus travel. He now completes the classroom-to-cafeteria route with minimal prompting.',
       'service_minutes', 180,
       'sessions_held', 4,
       'demo_watermark', true),
     now(), true);
end $$;

-- Service-role only — never callable by app users.
revoke all on function public.seed_demo_workspace(uuid) from public, anon, authenticated;

-- ── Storage: demo accounts cannot upload (physical enforcement) ──────────
-- Recreate the insert policy with the subscriber check. Select/update/delete
-- stay prefix-scoped as before (demo accounts have no objects anyway).
drop policy if exists "docs_storage_insert" on storage.objects;
create policy "docs_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-documents'
              and (storage.foldername(name))[1] = public.current_teacher_id()::text
              and public.is_active_subscriber());

-- ===========================================================================
-- 019_demo_default.sql — Phase C activation: new signups start in the demo tier.
-- ===========================================================================
alter table public.teachers
  alter column account_status set default 'demo';

update public.teachers
set account_status = 'active'
where account_status is null;

-- ===========================================================================
-- 020_reports_realtime.sql — reports table joins the Realtime publication.
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end $$;
