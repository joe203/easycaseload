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
