'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { CloudRepository, type CloudTable } from './cloudRepository';

export type CloudHydrationSnapshot = Partial<Record<CloudTable, Record<string, unknown>[]>>;

const HYDRATABLE_TABLES: CloudTable[] = [
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
  'saving_transactions',
];

/**
 * Reads the authenticated user's live cloud snapshot without mutating
 * Zustand. Tombstones remain in Supabase for conflict detection/history but
 * are intentionally invisible to application hydration.
 */
export async function readCloudHydrationSnapshot(
  supabase: SupabaseClient,
): Promise<{ data: CloudHydrationSnapshot | null; error: string | null }> {
  const repository = new CloudRepository(supabase);
  const user = await repository.getAuthenticatedUser();
  if (!user.data) return { data: null, error: user.error ?? 'You must be signed in.' };

  const entries = await Promise.all(
    HYDRATABLE_TABLES.map(async (table) => {
      const result = await repository.list<Record<string, unknown>>(table);
      return [table, result] as const;
    }),
  );

  const failed = entries.find(([, result]) => result.error);
  if (failed) return { data: null, error: `${failed[0]}: ${failed[1].error}` };

  const snapshot: CloudHydrationSnapshot = {};
  for (const [table, result] of entries) {
    snapshot[table] = (result.data ?? []).filter((row) => !row.deleted_at);
  }

  return { data: snapshot, error: null };
}

export { HYDRATABLE_TABLES };
