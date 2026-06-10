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
