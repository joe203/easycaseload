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
