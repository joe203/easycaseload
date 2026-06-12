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
