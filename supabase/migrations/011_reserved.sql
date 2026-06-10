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
