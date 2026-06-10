-- 001_init.sql — extensions + shared helpers
-- EasyCaseload unified schema (self-hosted Supabase / Postgres)
-- Idempotent and additive. Safe to re-run.

create extension if not exists pgcrypto;

-- Auto-maintain updated_at on any table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
