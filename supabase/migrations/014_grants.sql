-- 014_grants.sql — role grants for Supabase API roles.
-- RLS still restricts WHICH rows each role sees; these are table-level privileges.
-- anon (public marketing) gets no access to these tables. service_role bypasses RLS.

grant usage on schema public to anon, authenticated, service_role;

-- Existing tables.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', r.tablename);
    execute format('grant all on public.%I to service_role', r.tablename);
  end loop;
end $$;

-- Future tables created by the migration owner.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;

-- Helper functions callable by the app roles (merge_teachers intentionally excluded).
grant execute on function public.current_teacher_id() to authenticated, service_role;
