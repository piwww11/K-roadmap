'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export type CloudTable =
  | 'profiles'
  | 'journey_phases'
  | 'journey_months'
  | 'journey_goals'
  | 'journey_tasks'
  | 'majors'
  | 'skills'
  | 'journal_entries'
  | 'documents'
  | 'achievements'
  | 'major_decisions'
  | 'experiments'
  | 'experiment_attempts'
  | 'experiment_reflections'
  | 'applications'
  | 'application_documents'
  | 'budget_profiles'
  | 'budget_items'
  | 'saving_transactions';

export interface CloudRepositoryResult<T> {
  data: T | null;
  error: string | null;
}

export interface RevisionWriteResult<T extends Record<string, unknown>> {
  data: T | null;
  error: string | null;
  conflict: boolean;
}

const PRIMARY_KEYS: Record<CloudTable, readonly string[]> = {
  profiles: ['id'],
  journey_phases: ['id'],
  journey_months: ['id'],
  journey_goals: ['id'],
  journey_tasks: ['id'],
  majors: ['id'],
  skills: ['id'],
  journal_entries: ['id'],
  documents: ['id'],
  achievements: ['id'],
  major_decisions: ['id'],
  experiments: ['id'],
  experiment_attempts: ['id'],
  experiment_reflections: ['id'],
  applications: ['id'],
  application_documents: ['application_id', 'document_id'],
  budget_profiles: ['user_id'],
  budget_items: ['id'],
  saving_transactions: ['id'],
};

function keyMatches(table: CloudTable, row: Record<string, unknown>) {
  return PRIMARY_KEYS[table].every((key) => row[key] !== undefined && row[key] !== null);
}

function withoutServerFields(row: Record<string, unknown>) {
  const result = { ...row };
  delete result.revision;
  delete result.deleted_at;
  return result;
}

/**
 * Cloud boundary for Phase 4.
 *
 * Normal reads remain available for hydration. Revision-aware writes use a
 * compare-and-swap update (`WHERE revision = expectedRevision`) so a stale
 * device can never silently overwrite a newer server version.
 */
export class CloudRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAuthenticatedUser() {
    const { data, error } = await this.supabase.auth.getUser();
    return { data: data.user ?? null, error: error?.message ?? null };
  }

  async list<T extends Record<string, unknown>>(table: CloudTable): Promise<CloudRepositoryResult<T[]>> {
    const { data, error } = await this.supabase.from(table).select('*');
    return { data: (data as T[] | null) ?? null, error: error?.message ?? null };
  }

  async getById<T extends Record<string, unknown>>(table: CloudTable, id: string): Promise<CloudRepositoryResult<T>> {
    const { data, error } = await this.supabase.from(table).select('*').eq('id', id).maybeSingle();
    return { data: (data as T | null) ?? null, error: error?.message ?? null };
  }

  async getByKey<T extends Record<string, unknown>>(
    table: CloudTable,
    row: Record<string, unknown>,
  ): Promise<CloudRepositoryResult<T>> {
    if (!keyMatches(table, row)) return { data: null, error: `Missing primary key for ${table}.` };

    let query = this.supabase.from(table).select('*');
    for (const key of PRIMARY_KEYS[table]) query = query.eq(key, row[key]);
    const { data, error } = await query.maybeSingle();
    return { data: (data as T | null) ?? null, error: error?.message ?? null };
  }

  async listByUser<T extends Record<string, unknown>>(table: CloudTable): Promise<CloudRepositoryResult<T[]>> {
    const user = await this.getAuthenticatedUser();
    if (!user.data) return { data: null, error: user.error ?? 'You must be signed in.' };
    return this.list<T>(table);
  }

  async upsertWithRevision<T extends Record<string, unknown>>(
    table: CloudTable,
    row: T,
    expectedRevision: number | null,
  ): Promise<RevisionWriteResult<T>> {
    if (!keyMatches(table, row)) {
      return { data: null, error: `Missing primary key for ${table}.`, conflict: false };
    }

    const current = await this.getByKey<T>(table, row);
    if (current.error) return { data: null, error: current.error, conflict: false };

    if (!current.data) {
      const insertRow = withoutServerFields(row);
      const { data, error } = await this.supabase.from(table).insert(insertRow).select('*').single();
      return {
        data: (data as T | null) ?? null,
        error: error?.message ?? null,
        conflict: false,
      };
    }

    const currentRevision = typeof current.data.revision === 'number' ? current.data.revision : null;
    if (expectedRevision === null || currentRevision === null) {
      return {
        data: null,
        error: `Missing revision baseline for ${table}.`,
        conflict: true,
      };
    }

    if (currentRevision !== expectedRevision) {
      return { data: current.data, error: null, conflict: true };
    }

    const updateRow = withoutServerFields(row);
    delete updateRow.created_at;
    delete updateRow.updated_at;

    let query = this.supabase.from(table).update(updateRow);
    for (const key of PRIMARY_KEYS[table]) query = query.eq(key, row[key]);
    query = query.eq('revision', expectedRevision);

    const { data, error } = await query.select('*').maybeSingle();
    if (error) return { data: null, error: error.message, conflict: false };
    if (!data) return { data: null, error: null, conflict: true };

    return { data: data as T, error: null, conflict: false };
  }

  async tombstone<T extends Record<string, unknown>>(
    table: CloudTable,
    key: Record<string, unknown>,
    expectedRevision: number,
  ): Promise<RevisionWriteResult<T>> {
    const current = await this.getByKey<T>(table, key);
    if (current.error) return { data: null, error: current.error, conflict: false };
    if (!current.data) return { data: null, error: null, conflict: false };
    if (current.data.deleted_at) return { data: current.data, error: null, conflict: false };

    let query = this.supabase.from(table).update({ deleted_at: new Date().toISOString() });
    for (const column of PRIMARY_KEYS[table]) query = query.eq(column, key[column]);
    query = query.eq('revision', expectedRevision);

    const { data, error } = await query.select('*').maybeSingle();
    if (error) return { data: null, error: error.message, conflict: false };
    if (!data) return { data: null, error: null, conflict: true };
    return { data: data as T, error: null, conflict: false };
  }
}

export function createCloudRepository(supabase: SupabaseClient) {
  return new CloudRepository(supabase);
}
