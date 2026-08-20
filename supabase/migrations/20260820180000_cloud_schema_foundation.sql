-- K-Roadmap cloud persistence foundation
--
-- IMPORTANT:
-- 1. This migration is schema-only. It is intentionally NOT wired into the app.
-- 2. Existing browser localStorage remains untouched until a later migration phase.
-- 3. Intelligence outputs (evidence, comparison, readiness, adaptive journey,
--    weekly review, progress analytics) are derived and are therefore not stored here.
-- 4. `payload` JSONB columns preserve the exact client shape during the first
--    cloud migration where nested TypeScript fields are not independently
--    queryable yet. Normalized columns below are the stable sync/query surface.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profile / account anchor
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Journey hierarchy
-- JourneyState currently persists phases -> months -> goals -> tasks.
-- Stable normalized IDs + parent foreign keys are provided here; payload keeps
-- any client-only fields intact during migration.
-- -----------------------------------------------------------------------------

create table if not exists public.journey_phases (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_number integer,
  title text,
  subtitle text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journey_months (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_id text not null references public.journey_phases(id) on delete cascade,
  month_number integer,
  title text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journey_goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id text not null references public.journey_months(id) on delete cascade,
  title text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journey_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null references public.journey_goals(id) on delete cascade,
  status text not null default 'Not Started'
    check (status in ('Not Started', 'In Progress', 'Completed')),
  major_reward jsonb,
  exploration_major_ids text[] not null default '{}',
  unlocks_skill_ids text[] not null default '{}',
  depends_on_task_ids text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Majors / skills / decision inputs
-- -----------------------------------------------------------------------------

create table if not exists public.majors (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  university text,
  interest_score numeric,
  confidence_score numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  major_id text references public.majors(id) on delete set null,
  name text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.major_decisions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  major_id text not null references public.majors(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Journal / documents / achievements
-- -----------------------------------------------------------------------------

create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date,
  title text,
  content text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Experiments / attempts / reflections
-- Exact client persistence currently has experiments with attempts and
-- per-attempt reflections. Reflection is normalized separately so history is
-- never collapsed into the latest experiment snapshot.
-- -----------------------------------------------------------------------------

create table if not exists public.experiments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  major_id text references public.majors(id) on delete set null,
  title text,
  custom_title text,
  description text,
  estimated_minutes integer,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiment_attempts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id text not null references public.experiments(id) on delete cascade,
  experiment_name text,
  duration_minutes integer,
  started_at timestamptz,
  completed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiment_reflections (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_id text not null references public.experiments(id) on delete cascade,
  attempt_id text references public.experiment_attempts(id) on delete cascade,
  interest smallint check (interest between 1 and 5),
  energy smallint check (energy between 1 and 5),
  difficulty smallint check (difficulty between 1 and 5),
  would_do_again boolean,
  notes text,
  reflected_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Applications / required documents
-- -----------------------------------------------------------------------------

create table if not exists public.applications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('university', 'scholarship')),
  name text not null,
  organization text not null,
  country text not null,
  program text,
  major_id text references public.majors(id) on delete set null,
  major_label text,
  status text not null check (status in (
    'researching', 'eligible', 'preparing', 'submitted',
    'interview', 'accepted', 'rejected', 'withdrawn'
  )),
  priority text not null check (priority in ('high', 'medium', 'low')),
  deadline timestamptz,
  eligibility text check (eligibility in ('unknown', 'checking', 'eligible', 'not-eligible')),
  application_url text,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_documents (
  application_id text not null references public.applications(id) on delete cascade,
  document_id text not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (application_id, document_id)
);

-- -----------------------------------------------------------------------------
-- Budget / savings
-- Budget itself currently contains targetAmount, currentSavings and items[].
-- currentSavings is intentionally NOT authoritative in cloud; transactions are.
-- -----------------------------------------------------------------------------

create table if not exists public.budget_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_amount numeric(14,2) not null default 0 check (target_amount >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  category text,
  due_date date,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saving_transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Updated-at triggers
-- -----------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'journey_phases', 'journey_months', 'journey_goals', 'journey_tasks',
    'majors', 'skills', 'major_decisions', 'journal_entries', 'documents',
    'achievements', 'experiments', 'experiment_attempts', 'experiment_reflections',
    'applications', 'budget_profiles', 'budget_items', 'saving_transactions'
  ] loop
    execute format(
      'drop trigger if exists %I_set_updated_at on public.%I',
      table_name, table_name
    );
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists journey_phases_user_idx on public.journey_phases(user_id);
create index if not exists journey_months_user_phase_idx on public.journey_months(user_id, phase_id);
create index if not exists journey_goals_user_month_idx on public.journey_goals(user_id, month_id);
create index if not exists journey_tasks_user_goal_idx on public.journey_tasks(user_id, goal_id);
create index if not exists journey_tasks_user_status_idx on public.journey_tasks(user_id, status);

create index if not exists majors_user_idx on public.majors(user_id);
create index if not exists skills_user_major_idx on public.skills(user_id, major_id);
create index if not exists decisions_user_major_idx on public.major_decisions(user_id, major_id);
create index if not exists journal_user_date_idx on public.journal_entries(user_id, entry_date desc);
create index if not exists documents_user_idx on public.documents(user_id);
create index if not exists achievements_user_idx on public.achievements(user_id);

create index if not exists experiments_user_major_idx on public.experiments(user_id, major_id);
create index if not exists experiments_user_updated_idx on public.experiments(user_id, updated_at desc);
create index if not exists attempts_user_experiment_idx on public.experiment_attempts(user_id, experiment_id);
create index if not exists reflections_user_experiment_idx on public.experiment_reflections(user_id, experiment_id);
create index if not exists reflections_user_attempt_idx on public.experiment_reflections(user_id, attempt_id);

create index if not exists applications_user_deadline_idx on public.applications(user_id, deadline);
create index if not exists applications_user_status_idx on public.applications(user_id, status);
create index if not exists applications_user_major_idx on public.applications(user_id, major_id);
create index if not exists application_documents_user_idx on public.application_documents(user_id);

create index if not exists budget_items_user_idx on public.budget_items(user_id);
create index if not exists savings_user_occurred_idx on public.saving_transactions(user_id, occurred_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Every user-owned row is readable/writable only by its auth.uid().
-- -----------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'journey_phases', 'journey_months', 'journey_goals', 'journey_tasks',
    'majors', 'skills', 'major_decisions', 'journal_entries', 'documents',
    'achievements', 'experiments', 'experiment_attempts', 'experiment_reflections',
    'applications', 'application_documents', 'budget_profiles', 'budget_items',
    'saving_transactions'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I_select_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_own on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_own on public.%I', table_name, table_name);

    execute format(
      'create policy %I_select_own on public.%I for select using (user_id = auth.uid())',
      table_name, table_name
    );
    execute format(
      'create policy %I_insert_own on public.%I for insert with check (user_id = auth.uid())',
      table_name, table_name
    );
    execute format(
      'create policy %I_update_own on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name, table_name
    );
    execute format(
      'create policy %I_delete_own on public.%I for delete using (user_id = auth.uid())',
      table_name, table_name
    );
  end loop;
end $$;

-- Application documents additionally inherit application/document ownership
-- through their user_id. The direct user_id policy keeps queries simple and
-- avoids exposing cross-user join paths.

-- -----------------------------------------------------------------------------
-- Derived savings helper
-- -----------------------------------------------------------------------------

create or replace view public.budget_summary
with (security_invoker = true)
as
select
  bp.user_id,
  bp.target_amount,
  coalesce(sum(st.amount), 0)::numeric(14,2) as current_savings,
  case
    when bp.target_amount > 0 then
      round((coalesce(sum(st.amount), 0) / bp.target_amount) * 100, 1)
    else 0
  end as savings_percent
from public.budget_profiles bp
left join public.saving_transactions st on st.user_id = bp.user_id
group by bp.user_id, bp.target_amount;

-- End of schema-only foundation migration.
