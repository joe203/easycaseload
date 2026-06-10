-- 004_teacher_identities.sql — many emails/phones -> one teacher
-- The matching/recognition layer. Savannah and the resolver look up here.
-- Additional emails are added & verified in-app (not as new logins).

create table if not exists public.teacher_identities (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  kind        text not null,            -- email | phone
  value       text not null,            -- normalized: email lowercased, phone E.164
  verified    boolean not null default false,
  is_primary  boolean not null default false,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kind, value)                   -- an identifier belongs to exactly one teacher
);

create index if not exists teacher_identities_teacher_idx on public.teacher_identities (teacher_id);

drop trigger if exists teacher_identities_updated_at on public.teacher_identities;
create trigger teacher_identities_updated_at before update on public.teacher_identities
  for each row execute function public.set_updated_at();

alter table public.teacher_identities enable row level security;

drop policy if exists "identities_select_own" on public.teacher_identities;
create policy "identities_select_own" on public.teacher_identities
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "identities_insert_own" on public.teacher_identities;
create policy "identities_insert_own" on public.teacher_identities
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "identities_update_own" on public.teacher_identities;
create policy "identities_update_own" on public.teacher_identities
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "identities_delete_own" on public.teacher_identities;
create policy "identities_delete_own" on public.teacher_identities
  for delete using (teacher_id = public.current_teacher_id());
