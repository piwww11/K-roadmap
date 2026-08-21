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

type PayloadRow = { id: string; payload: unknown };

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function asPayloadRows<T extends { id: string }>(rows: T[]): Array<{ id: string; payload: unknown }> {
  return rows.map((row) => ({ id: row.id, payload: row }));
}

async function verifyPayloadRows(supabase: SupabaseClient, table: string, rows: Array<{ id: string; payload: unknown }>) {
  if (!rows.length) return { count: 0, errors: [] as string[] };
  const { data, error } = await supabase.from(table).select('id, payload').in('id', rows.map((row) => row.id));
  if (error) throw new Error(`${table}: ${error.message}`);
  const cloudRows = new Map((data ?? []).map((row) => [row.id, row] as const));
  const errors: string[] = [];
  for (const row of rows) {
    const cloudRow = cloudRows.get(row.id) as PayloadRow | undefined;
    if (!cloudRow) errors.push(`${table}: missing ${row.id}`);
    else if (!sameValue(cloudRow.payload, row.payload)) errors.push(`${table}: payload mismatch for ${row.id}`);
  }
  return { count: data?.length ?? 0, errors };
}

async function verifySavingTransactions(supabase: SupabaseClient, data: NormalizedMigrationData) {
  const rows = data.journey.budget.savingTransactions;
  if (!rows.length) return { count: 0, errors: [] as string[] };
  const { data: cloudRows, error } = await supabase.from('saving_transactions').select('id, amount, note, occurred_at').in('id', rows.map((row) => row.id));
  if (error) throw new Error(`saving_transactions: ${error.message}`);
  const found = new Map((cloudRows ?? []).map((row) => [row.id, row] as const));
  const errors: string[] = [];
  for (const row of rows) {
    const cloudRow = found.get(row.id);
    if (!cloudRow) errors.push(`saving_transactions: missing ${row.id}`);
    else if (Number(cloudRow.amount) !== row.amount || cloudRow.note !== row.note || new Date(cloudRow.occurred_at).toISOString() !== row.occurredAt) errors.push(`saving_transactions: value mismatch for ${row.id}`);
  }
  return { count: cloudRows?.length ?? 0, errors };
}

async function verifyBudgetProfile(supabase: SupabaseClient, data: NormalizedMigrationData) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error(authError?.message ?? 'You must be signed in to verify migration status.');
  const { data: cloudRow, error } = await supabase.from('budget_profiles').select('target_amount, payload').eq('user_id', authData.user.id).maybeSingle();
  if (error) throw new Error(`budget_profiles: ${error.message}`);
  if (!cloudRow) return { count: 0, errors: ['budget_profiles: missing profile'] };
  const payload = cloudRow.payload as Record<string, unknown> | null;
  const matches = Number(cloudRow.target_amount) === data.journey.budget.targetAmount && payload?.legacyCurrentSavings === data.journey.budget.legacyCurrentSavings;
  return { count: 1, errors: matches ? [] : ['budget_profiles: migration values do not match the local snapshot'] };
}

export async function verifyMigration(supabase: SupabaseClient, data: NormalizedMigrationData): Promise<MigrationVerificationResult> {
  const counts = getMigrationCounts(data);
  const expected: Record<string, number> = { ...counts, budgetProfile: 1 };
  const actual: Record<string, number> = {};
  const errors: string[] = [];
  const payloadTables: Array<[keyof typeof counts, string, Array<{ id: string; payload: unknown }>]> = [
    ['phases', 'journey_phases', asPayloadRows(data.journey.phases)],
    ['months', 'journey_months', asPayloadRows(data.journey.phases.flatMap((phase) => phase.months))],
    ['goals', 'journey_goals', asPayloadRows(data.journey.phases.flatMap((phase) => phase.months.flatMap((month) => month.goals)))],
    ['tasks', 'journey_tasks', asPayloadRows(data.journey.phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks))))],
    ['majors', 'majors', asPayloadRows(data.journey.majors)], ['skills', 'skills', asPayloadRows(data.journey.skills)], ['journalEntries', 'journal_entries', asPayloadRows(data.journey.journalEntries)],
    ['documents', 'documents', asPayloadRows(data.journey.documents)], ['achievements', 'achievements', asPayloadRows(data.journey.achievements)],
    ['majorDecisions', 'major_decisions', data.journey.majorDecisions.map((decision, index) => ({ id: `decision:${decision.timestamp}:${index}`, payload: decision }))],
    ['experiments', 'experiments', asPayloadRows(data.experiments.experiments)],
    ['experimentAttempts', 'experiment_attempts', asPayloadRows(data.experiments.experiments.flatMap((experiment) => experiment.attempts))],
    ['experimentReflections', 'experiment_reflections', data.experiments.experiments.flatMap((experiment) => {
      const reflections: Array<{ id: string; payload: unknown }> = [];
      if (experiment.reflection) reflections.push({ id: `${experiment.id}:reflection`, payload: experiment.reflection });
      experiment.attempts.forEach((attempt) => { if (attempt.reflection) reflections.push({ id: `${attempt.id}:reflection`, payload: attempt.reflection }); });
      return reflections;
    })],
    ['applications', 'applications', asPayloadRows(data.applications.applications)], ['budgetItems', 'budget_items', asPayloadRows(data.journey.budget.items)],
  ];

  for (const [key, table, rows] of payloadTables) {
    try { const result = await verifyPayloadRows(supabase, table, rows); actual[key] = result.count; errors.push(...result.errors); }
    catch (error) { actual[key] = -1; errors.push(error instanceof Error ? error.message : `${table}: verification failed`); }
  }
  try { const result = await verifySavingTransactions(supabase, data); actual.savingTransactions = result.count; errors.push(...result.errors); }
  catch (error) { actual.savingTransactions = -1; errors.push(error instanceof Error ? error.message : 'saving_transactions: verification failed'); }
  try { const result = await verifyBudgetProfile(supabase, data); actual.budgetProfile = result.count; errors.push(...result.errors); }
  catch (error) { actual.budgetProfile = -1; errors.push(error instanceof Error ? error.message : 'budget_profiles: verification failed'); }

  for (const key of Object.keys(expected)) if (actual[key] !== expected[key]) errors.push(`${key}: expected ${expected[key]}, found ${actual[key] ?? 0}`);
  return { verified: errors.length === 0, expected, actual, errors };
}
