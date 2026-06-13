-- 019_demo_default.sql — Phase C activation.
-- Migration 018 deliberately left teachers.account_status defaulting to 'active'
-- so nothing changed while Phases B/C were built. Phase C ships the demo
-- experience (seeding + UI gating + expiration), so new signups now start as
-- 'demo'. Existing teachers were backfilled to 'active' by 018's column default
-- at add-time — this migration only changes the default for FUTURE inserts and
-- must NOT re-backfill anyone (that would lock out the founders).
--
-- Idempotent: re-running just re-asserts the same default.

alter table public.teachers
  alter column account_status set default 'demo';

-- Safety net: any teacher row that was created before 018 added the column and
-- somehow has a null status is treated as 'active' (an existing/founder account
-- predating the demo model — never silently demote them into a demo).
update public.teachers
set account_status = 'active'
where account_status is null;
