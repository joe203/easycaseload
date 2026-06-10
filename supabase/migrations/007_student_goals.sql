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
