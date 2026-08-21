'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedMigrationData } from './normalizer';
import { getMigrationCounts } from './normalizer';

export interface MigrationVerificationResult {
  verified: boolean;
  expected: Record<string, number>;
  actual: Record<string, number>;
  errors: string[];
}

const tableMap = {
  phases: 'journey_phases',
  goals: 'journey_goals',
  tasks: 'journey_tasks',
  majors: 'majors',
  skills: 'skills',
  journalEntries: 'journal_entries',
  documents: 'documents',
  achievements: 'achievements',
  majorDecisions: 'major_decisions',
  experiments: 'experiments',
  experimentAttempts: 'experiment_attempts',
  experimentReflections: 'experiment_reflections',
  applications: 'applications',
  budgetItems: 'budget_items',
} as const;

async function countOwnRows(supabase: SupabaseClient, table: string) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

export async function verifyMigration(
  supabase: SupabaseClient,
  data: NormalizedMigrationData,
): Promise<MigrationVerificationResult> {
  const counts = getMigrationCounts(data);
  const expected: Record<string, number> = {
    phases: counts.phases,
    goals: counts.goals,
    tasks: counts.tasks,
    majors: counts.majors,
    skills: counts.skills,
    journalEntries: counts.journalEntries,
    documents: counts.documents,
    achievements: counts.achievements,
    majorDecisions: counts.majorDecisions,
    experiments: counts.experiments,
    experimentAttempts: counts.experimentAttempts,
    experimentReflections: counts.experimentReflections,
    applications: counts.applications,
    budgetItems: counts.budgetItems,
  };

  const actual: Record<string, number> = {};
  const errors: string[] = [];

  for (const [key, table] of Object.entries(tableMap)) {
    try {
      actual[key] = await countOwnRows(supabase, table);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${table}: verification failed`);
      actual[key] = -1;
    }
  }

  for (const key of Object.keys(expected)) {
    if (actual[key] !== expected[key]) {
      errors.push(`${key}: expected ${expected[key]}, found ${actual[key]}`);
    }
  }

  return { verified: errors.length === 0, expected, actual, errors };
}
