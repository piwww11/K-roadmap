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

/**
 * Read-only cloud boundary for Phase 2.
 *
 * This intentionally exposes reads only. Automatic local -> cloud writes are
 * not wired into Zustand yet; migration remains the explicit write path.
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

  async listByUser<T extends Record<string, unknown>>(table: CloudTable): Promise<CloudRepositoryResult<T[]>> {
    const user = await this.getAuthenticatedUser();
    if (!user.data) return { data: null, error: user.error ?? 'You must be signed in.' };

    return this.list<T>(table);
  }
}

export function createCloudRepository(supabase: SupabaseClient) {
  return new CloudRepository(supabase);
}
