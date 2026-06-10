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
