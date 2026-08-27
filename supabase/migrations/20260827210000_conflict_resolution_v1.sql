-- Conflict Resolution v1
--
-- Adds per-row revisions and tombstones to syncable user-owned entities,
-- plus an append-only mutation feed. This migration does NOT change the
-- application write path by itself; the client must stop issuing hard DELETEs
-- and use tombstone updates in the Phase 4 repository.

begin;

-- ---------------------------------------------------------------------------
-- 1. Per-row sync metadata
-- ---------------------------------------------------------------------------

alter table public.achievements add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.application_documents add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.applications add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.budget_items add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.budget_profiles add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.documents add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.experiment_attempts add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.experiment_reflections add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.experiments add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.journal_entries add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.journey_goals add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.journey_months add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.journey_phases add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.journey_tasks add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.major_decisions add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.majors add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.profiles add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.saving_transactions add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;
alter table public.skills add column if not exists revision bigint not null default 1, add column if not exists deleted_at timestamptz;

-- budget_summary is derived data and is intentionally not a sync entity.

-- ---------------------------------------------------------------------------
-- 2. Append-only change feed
-- ---------------------------------------------------------------------------

create table if not exists public.sync_mutations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  table_name text not null,
  row_key text not null,
  revision bigint not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists sync_mutations_user_created_idx on public.sync_mutations (user_id, created_at, id);
create index if not exists sync_mutations_user_revision_idx on public.sync_mutations (user_id, revision, created_at, id);

-- ---------------------------------------------------------------------------
-- 3. Revision trigger
-- ---------------------------------------------------------------------------

create or replace function public.bump_sync_revision()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.revision := coalesce(new.revision, 1);
    return new;
  end if;

  -- The importer uses upsert. Do not create a new revision for an identical
  -- logical row, otherwise every automatic-sync retry becomes a fake change.
  if (to_jsonb(new) - array['revision', 'updated_at']) is not distinct from
     (to_jsonb(old) - array['revision', 'updated_at']) then
    new.revision := old.revision;
    if to_jsonb(new) ? 'updated_at' then
      new.updated_at := old.updated_at;
    end if;
    return new;
  end if;

  new.revision := old.revision + 1;
  if to_jsonb(new) ? 'updated_at' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Mutation-feed trigger
-- ---------------------------------------------------------------------------

create or replace function public.record_sync_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mutation_user_id uuid;
  mutation_row_key text;
  mutation_revision bigint;
  mutation_operation text;
begin
  -- profiles is keyed by `id`, while all other sync entities use user_id.
  if tg_table_name = 'profiles' then
    mutation_user_id := coalesce(new.id, old.id);
    mutation_row_key := coalesce(new.id, old.id);
  elsif tg_table_name = 'application_documents' then
    mutation_user_id := coalesce(new.user_id, old.user_id);
    mutation_row_key := coalesce(new.application_id, old.application_id)
      || ':' || coalesce(new.document_id, old.document_id);
  else
    mutation_user_id := coalesce(new.user_id, old.user_id);
    mutation_row_key := coalesce(new.id, old.id);
  end if;

  mutation_revision := coalesce(new.revision, old.revision, 1);

  if tg_op = 'INSERT' then
    mutation_operation := 'insert';
  elsif tg_op = 'DELETE' then
    mutation_operation := 'delete';
  elsif new.deleted_at is not null and old.deleted_at is null then
    mutation_operation := 'delete';
  else
    mutation_operation := 'update';
  end if;

  insert into public.sync_mutations (user_id, table_name, row_key, revision, operation)
  values (mutation_user_id, tg_table_name, mutation_row_key, mutation_revision, mutation_operation);

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------------

DO $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'achievements', 'application_documents', 'applications', 'budget_items',
    'budget_profiles', 'documents', 'experiment_attempts',
    'experiment_reflections', 'experiments', 'journal_entries', 'journey_goals',
    'journey_months', 'journey_phases', 'journey_tasks', 'major_decisions',
    'majors', 'profiles', 'saving_transactions', 'skills'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_bump_sync_revision', table_name);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.bump_sync_revision()', table_name || '_bump_sync_revision', table_name);
    execute format('drop trigger if exists %I on public.%I', table_name || '_record_sync_mutation', table_name);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.record_sync_mutation()', table_name || '_record_sync_mutation', table_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Incremental-sync indexes
-- ---------------------------------------------------------------------------

create index if not exists achievements_sync_idx on public.achievements (user_id, revision);
create index if not exists application_documents_sync_idx on public.application_documents (user_id, revision);
create index if not exists applications_sync_idx on public.applications (user_id, revision);
create index if not exists budget_items_sync_idx on public.budget_items (user_id, revision);
create index if not exists budget_profiles_sync_idx on public.budget_profiles (user_id, revision);
create index if not exists documents_sync_idx on public.documents (user_id, revision);
create index if not exists experiment_attempts_sync_idx on public.experiment_attempts (user_id, revision);
create index if not exists experiment_reflections_sync_idx on public.experiment_reflections (user_id, revision);
create index if not exists experiments_sync_idx on public.experiments (user_id, revision);
create index if not exists journal_entries_sync_idx on public.journal_entries (user_id, revision);
create index if not exists journey_goals_sync_idx on public.journey_goals (user_id, revision);
create index if not exists journey_months_sync_idx on public.journey_months (user_id, revision);
create index if not exists journey_phases_sync_idx on public.journey_phases (user_id, revision);
create index if not exists journey_tasks_sync_idx on public.journey_tasks (user_id, revision);
create index if not exists major_decisions_sync_idx on public.major_decisions (user_id, revision);
create index if not exists majors_sync_idx on public.majors (user_id, revision);
create index if not exists profiles_sync_idx on public.profiles (id, revision);
create index if not exists saving_transactions_sync_idx on public.saving_transactions (user_id, revision);
create index if not exists skills_sync_idx on public.skills (user_id, revision);

-- ---------------------------------------------------------------------------
-- 7. Mutation-feed RLS
-- ---------------------------------------------------------------------------

alter table public.sync_mutations enable row level security;
revoke all on public.sync_mutations from anon;
revoke all on public.sync_mutations from authenticated;

drop policy if exists sync_mutations_select_own on public.sync_mutations;
create policy sync_mutations_select_own on public.sync_mutations
  for select to authenticated
  using (user_id = auth.uid());

commit;
