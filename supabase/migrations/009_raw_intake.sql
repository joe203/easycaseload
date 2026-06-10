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
