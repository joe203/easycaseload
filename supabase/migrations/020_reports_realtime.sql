-- 020_reports_realtime.sql — Phase C: reports become a live-data surface.
-- The reports page uses the standard useQuery + Realtime pattern, so the table
-- must be in the supabase_realtime publication (017 covered the others).
-- Guarded so re-running is safe even though ALTER PUBLICATION ... ADD TABLE has
-- no IF NOT EXISTS.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end $$;
