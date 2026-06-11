-- 017_realtime.sql — enable Realtime change events on live-data tables.
-- Required by CLAUDE.md §12: TanStack Query subscriptions invalidate on these
-- events so the UI updates without a refresh. Idempotent: each table is only
-- added if it is not already in the publication.

do $$
declare
  t text;
begin
  foreach t in array array['teachers','schools','students','student_logs','documents']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
