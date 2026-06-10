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
