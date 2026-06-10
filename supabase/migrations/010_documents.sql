-- 010_documents.sql — polymorphic document store + private storage bucket
-- Attaches to any entity (student/school/teacher/log/...) so new document kinds
-- need no new tables. Files live in the private 'student-documents' bucket;
-- access is via signed URLs only (these are IEPs/evals = student PII).

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,  -- RLS anchor
  entity_type text not null,            -- student | school | teacher | log | ...
  entity_id   uuid,
  title       text,
  doc_type    text,                     -- iep | evaluation | report | other | ... (open)
  description text,
  file_path   text,                     -- storage path, prefixed with {teacher_id}/
  file_name   text,
  mime_type   text,
  size_bytes  bigint,
  metadata    jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_teacher_idx on public.documents (teacher_id);
create index if not exists documents_entity_idx  on public.documents (entity_type, entity_id);

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (teacher_id = public.current_teacher_id()) with check (teacher_id = public.current_teacher_id());

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (teacher_id = public.current_teacher_id());

-- Private bucket (never public).
insert into storage.buckets (id, name, public)
values ('student-documents', 'student-documents', false)
on conflict (id) do nothing;

-- Storage RLS: a teacher may only touch objects under their own {teacher_id}/ prefix.
drop policy if exists "docs_storage_select" on storage.objects;
create policy "docs_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'student-documents'
         and (storage.foldername(name))[1] = public.current_teacher_id()::text);

drop policy if exists "docs_storage_insert" on storage.objects;
create policy "docs_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-documents'
              and (storage.foldername(name))[1] = public.current_teacher_id()::text);

drop policy if exists "docs_storage_update" on storage.objects;
create policy "docs_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'student-documents'
         and (storage.foldername(name))[1] = public.current_teacher_id()::text);

drop policy if exists "docs_storage_delete" on storage.objects;
create policy "docs_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-documents'
         and (storage.foldername(name))[1] = public.current_teacher_id()::text);
