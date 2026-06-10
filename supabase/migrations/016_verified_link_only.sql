-- 016_verified_link_only.sql
-- Tighten signup auto-linking: a new login may only auto-link to an existing
-- teacher via a VERIFIED email identity. A claimed-but-unverified email (e.g.
-- one a teacher mentioned over SMS) must never hand its history to whoever
-- signs up with that address — instead, the confirmed signup PROVES ownership,
-- so the identity is reassigned to the new account and the claimant keeps
-- their own record (merge_teachers can unify them later if they're the same
-- person, e.g. matched by phone).
--
-- CONVENTION (enforced by the future intake engine, documented here):
--   * Claimed emails captured from SMS/voice go in teacher_identities with
--     verified = false. They must NOT be written to teachers.email.
--   * teachers.email is only ever set by this trigger / the app, so a match
--     there is trustworthy.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email         text := lower(nullif(new.email, ''));
  v_full_name     text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_teacher_id    uuid;
  v_existing_auth uuid;
begin
  -- Scope: only act on EasyCaseload signups (shared auth instance).
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'easycaseload' then
    return new;
  end if;

  -- Phone-only / no-email signup: just create the teacher.
  if v_email is null then
    insert into public.teachers (auth_user_id, full_name, status, source)
    values (new.id, v_full_name, 'registered', 'app');
    return new;
  end if;

  -- Auto-link ONLY via a VERIFIED email identity…
  select ti.teacher_id into v_teacher_id
  from public.teacher_identities ti
  where ti.kind = 'email' and ti.value = v_email and ti.verified = true
  limit 1;

  -- …or via teachers.email, which by convention only trusted writers set.
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
      -- Email already tied to a registered login: flag for merge, don't clobber.
      insert into public.teachers (auth_user_id, full_name, email, status, source)
      values (new.id, v_full_name, v_email, 'merge_pending', 'app')
      returning id into v_teacher_id;
    end if;
  else
    -- No verified match: brand-new teacher (even if someone has merely
    -- *claimed* this email — confirmed signup outranks an unverified claim).
    insert into public.teachers (auth_user_id, full_name, email, status, source)
    values (new.id, v_full_name, v_email, 'registered', 'app')
    returning id into v_teacher_id;
  end if;

  -- Record the email identity. If an UNVERIFIED claim on this address exists,
  -- ownership transfers to the account that just proved it.
  insert into public.teacher_identities (teacher_id, kind, value, verified, is_primary)
  values (v_teacher_id, 'email', v_email, true, true)
  on conflict (kind, value) do update
    set teacher_id = excluded.teacher_id,
        verified   = true,
        updated_at = now()
    where public.teacher_identities.verified = false;

  return new;
end;
$$;

-- Trigger unchanged (created in 012); re-assert for idempotency.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
