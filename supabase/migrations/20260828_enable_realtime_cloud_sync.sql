-- Phase 4 / Conflict Resolution v1: enable Supabase Postgres Changes
-- for the user-scoped tables consumed by AutomaticCloudSync.
--
-- This migration is intentionally idempotent: tables already present in
-- supabase_realtime are left untouched.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'journey_phases',
    'journey_months',
    'journey_goals',
    'journey_tasks',
    'majors',
    'skills',
    'journal_entries',
    'documents',
    'achievements',
    'major_decisions',
    'experiments',
    'experiment_attempts',
    'experiment_reflections',
    'applications',
    'application_documents',
    'budget_profiles',
    'budget_items',
    'saving_transactions'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        table_name
      );
    END IF;
  END LOOP;
END $$;
