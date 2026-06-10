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
