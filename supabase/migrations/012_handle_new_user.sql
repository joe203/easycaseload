-- 012_handle_new_user.sql — signup find-or-link trigger
-- On a new auth user: link to a pre-existing teacher (e.g. created by Savannah from
-- a phone number) when the email matches; otherwise create a fresh teacher.
-- If the email already belongs to a fully-registered teacher, flag merge_pending
-- (do NOT clobber the existing record) — reconcile later with merge_teachers().

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email        text := lower(nullif(new.email, ''));
  v_full_name    text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_teacher_id   uuid;
  v_existing_auth uuid;
begin
  -- Phone-only / no-email signup: just create the teacher.
  if v_email is null then
    insert into public.teachers (auth_user_id, full_name, status, source)
    values (new.id, v_full_name, 'registered', 'app');
    return new;
  end if;

  -- Find an existing teacher by this email (identity table first, then teachers.email).
  select ti.teacher_id into v_teacher_id
  from public.teacher_identities ti
  where ti.kind = 'email' and ti.value = v_email
  limit 1;

  if v_teacher_id is null then
    select t.id into v_teacher_id
    from public.teachers t
    where lower(t.email) = v_email
    limit 1;
  end if;

  if v_teacher_id is not null then
    select auth_user_id into v_existing_auth from public.teachers where id = v_teacher_id;

    if v_existing_auth is null then
      -- Link this login to the pre-existing teacher; attach all prior history.
      update public.teachers
        set auth_user_id = new.id,
            status       = 'registered',
            full_name    = coalesce(nullif(full_name, ''), v_full_name),
            email        = coalesce(email, v_email),
            updated_at   = now()
        where id = v_teacher_id;
    else
      -- Email already tied to a registered login: create a new row flagged for merge.
      insert into public.teachers (auth_user_id, full_name, email, status, source)
      values (new.id, v_full_name, v_email, 'merge_pending', 'app')
      returning id into v_teacher_id;
    end if;
  else
    -- Brand-new teacher.
    insert into public.teachers (auth_user_id, full_name, email, status, source)
    values (new.id, v_full_name, v_email, 'registered', 'app')
    returning id into v_teacher_id;
  end if;

  -- Ensure an email identity exists for this teacher.
  insert into public.teacher_identities (teacher_id, kind, value, verified, is_primary)
  values (v_teacher_id, 'email', v_email, true, true)
  on conflict (kind, value) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
