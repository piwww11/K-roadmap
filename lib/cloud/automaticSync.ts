'use client';

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useApplicationTrackerStore } from '@/store/applicationTrackerStore';
import { useExperimentStore } from '@/store/experimentStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { CloudHydrationSnapshot } from './hydration';
import { HYDRATABLE_TABLES, readCloudHydationSnapshot } from './hydration';
import { applyCloudHydrationSnapshot } from './applyHydration';
import { CloudRepository, type CloudTable } from './cloudRepository';
import { importMigrationData } from '@/lib/migration/importer';
import { normalizeLocalSnapshot, type NormalizedMigrationData } from '@/lib/migration/normalizer';

const SYNC_DEBOUNCE_MS = 900;
const REMOTE_HYDRATION_DEBOUNCE_MS = 150;
const CLOUD_REQUEST_TIMEOUT_MS = 10000;
const CLOUD_SYNC_BATCH_TIMEOUT_MS = 60000;

type DeletableTable = Exclude<CloudTable, 'profiles' | 'application_documents' | 'budget_profiles'>;
type ApplicationDocumentKey = `${string}::${string}`;
type SyncedIds = Map<DeletableTable, Set<string>>;

type SyncLifecycle = {
  onSyncStart?: () => void;
  onSyncSuccess?: () => void;
  onSyncFailure?: (error: unknown) => void;
  onCloudConnectionChange?: (connected: boolean) => void;
};

const DELETE_ORDER: DeletableTable[] = [
  'experiment_reflections', 'experiment_attempts', 'experiments', 'applications',
  'budget_items', 'saving_transactions', 'major_decisions', 'documents',
  'achievements', 'journal_entries', 'journey_tasks', 'journey_goals',
  'journey_months', 'journey_phases', 'skills', 'majors',
];

function emptySyncedIds(): SyncedIds { return new Map(); }

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = CLOUD_REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

function buildLocalSnapshot(): NormalizedMigrationData {
  const journey = JSON.parse(useJourneyStore.getState().exportData());
  const experiments = { state: { experiments: useExperimentStore.getState().experiments } };
  const applications = { state: { applications: useApplicationTrackerStore.getState().applications } };
  return normalizeLocalSnapshot({ journey, experiments, applications });
}

function desiredIds(data: NormalizedMigrationData): SyncedIds {
  const ids = emptySyncedIds();
  const add = (table: DeletableTable, values: string[]) => ids.set(table, new Set(values));
  add('journey_phases', data.journey.phases.map((row) => row.id));
  add('journey_months', data.journey.phases.flatMap((phase) => phase.months.map((row) => row.id)));
  add('journey_goals', data.journey.phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.map((row) => row.id))));
  add('journey_tasks', data.journey.phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks.map((row) => row.id)))));
  add('majors', data.journey.majors.map((row) => row.id));
  add('skills', data.journey.skills.map((row) => row.id));
  add('journal_entries', data.journey.journalEntries.map((row) => row.id));
  add('documents', data.journey.documents.map((row) => row.id));
  add('achievements', data.journey.achievements.map((row) => row.id));
  add('major_decisions', data.journey.majorDecisions.map((row, index) => `decision:${row.timestamp}:${index}`));
  add('experiments', data.experiments.experiments.map((row) => row.id));
  add('experiment_attempts', data.experiments.experiments.flatMap((experiment) => experiment.attempts.map((row) => row.id)));
  add('experiment_reflections', data.experiments.experiments.flatMap((experiment) => {
    const reflectionIds = experiment.reflection ? [`${experiment.id}:reflection`] : [];
    return reflectionIds.concat(experiment.attempts.filter((attempt) => attempt.reflection).map((attempt) => `${attempt.id}:reflection`));
  }));
  add('applications', data.applications.applications.map((row) => row.id));
  add('budget_items', data.journey.budget.items.map((row) => row.id));
  add('saving_transactions', data.journey.budget.savingTransactions.map((row) => row.id));
  return ids;
}

function desiredApplicationDocuments(data: NormalizedMigrationData): Set<ApplicationDocumentKey> {
  const documentIds = new Set(data.journey.documents.map((document) => document.id));
  const keys = new Set<ApplicationDocumentKey>();
  for (const application of data.applications.applications) {
    const requiredIds = Array.isArray(application.requiredDocumentIds) ? application.requiredDocumentIds : [];
    for (const documentId of requiredIds) if (documentIds.has(documentId)) keys.add(`${application.id}::${documentId}`);
  }
  return keys;
}

function seedSyncedIds(snapshot: CloudHydrationSnapshot | null | undefined): SyncedIds {
  const ids = emptySyncedIds();
  if (!snapshot) return ids;
  for (const table of DELETE_ORDER) ids.set(table, new Set((snapshot[table] ?? []).map((row) => String(row.id)).filter(Boolean)));
  return ids;
}

function seedApplicationDocuments(snapshot: CloudHydrationSnapshot | null | undefined) {
  return new Set<ApplicationDocumentKey>((snapshot?.application_documents ?? []).map((row) => `${String(row.application_id)}::${String(row.document_id)}` as ApplicationDocumentKey));
}

async function tombstoneStaleRows(repository: CloudRepository, userId: string, baseline: CloudHydrationSnapshot, desired: SyncedIds): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  for (const table of DELETE_ORDER) {
    const rows = baseline[table] ?? [];
    const desiredSet = desired.get(table) ?? new Set<string>();
    const staleRows = rows.filter((row) => { const id = String(row.id ?? ''); return id && !desiredSet.has(id) && row.user_id === userId; });
    for (const row of staleRows) {
      const revision = typeof row.revision === 'number' ? row.revision : null;
      if (revision === null) { errors.push(`${table}:${String(row.id)}: missing revision baseline.`); continue; }
      const result = await repository.tombstone(table, { id: row.id, user_id: userId }, revision);
      if (!result.error && !result.conflict) continue;
      if (result.error) { errors.push(`${table}:${String(row.id)}: ${result.error}`); continue; }
      const latest = await repository.getByKey<Record<string, unknown>>(table, { id: row.id, user_id: userId });
      const latestRevision = typeof latest.data?.revision === 'number' ? latest.data.revision : null;
      if (latest.error || latestRevision === null) { errors.push(`${table}:${String(row.id)}: could not rebase tombstone after conflict.`); continue; }
      const retry = await repository.tombstone(table, { id: row.id, user_id: userId }, latestRevision);
      if (retry.error || retry.conflict) errors.push(`${table}:${String(row.id)}: tombstone conflict remained.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

async function tombstoneStaleApplicationDocuments(repository: CloudRepository, userId: string, baseline: CloudHydrationSnapshot, desired: Set<ApplicationDocumentKey>): Promise<string[]> {
  const errors: string[] = [];
  for (const row of baseline.application_documents ?? []) {
    const applicationId = String(row.application_id ?? ''), documentId = String(row.document_id ?? '');
    if (!applicationId || !documentId || row.user_id !== userId || desired.has(`${applicationId}::${documentId}`)) continue;
    const revision = typeof row.revision === 'number' ? row.revision : null;
    if (revision === null) { errors.push(`application_documents:${applicationId}:${documentId}: missing revision baseline.`); continue; }
    const key = { application_id: applicationId, document_id: documentId, user_id: userId };
    const result = await repository.tombstone('application_documents', key, revision);
    if (!result.error && !result.conflict) continue;
    if (result.error) { errors.push(`application_documents:${applicationId}:${documentId}: ${result.error}`); continue; }
    const latest = await repository.getByKey<Record<string, unknown>>('application_documents', key);
    const latestRevision = typeof latest.data?.revision === 'number' ? latest.data.revision : null;
    if (latest.error || latestRevision === null) { errors.push(`application_documents:${applicationId}:${documentId}: could not rebase tombstone.`); continue; }
    const retry = await repository.tombstone('application_documents', key, latestRevision);
    if (retry.error || retry.conflict) errors.push(`application_documents:${applicationId}:${documentId}: tombstone conflict remained.`);
  }
  return errors;
}

export class AutomaticCloudSync {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private remoteTimer: ReturnType<typeof setTimeout> | null = null;
  private syncing = false;
  private queued = false;
  private remoteQueued = false;
  private stopped = false;
  private applyingRemote = false;
  private realtimeChannel: RealtimeChannel | null = null;
  private unsubscribe: Array<() => void> = [];
  private lastSyncedIds: SyncedIds;
  private lastSyncedApplicationDocuments: Set<ApplicationDocumentKey>;
  private baseline: CloudHydrationSnapshot | null;

  constructor(private readonly supabase: SupabaseClient, private readonly userId: string, initialCloudSnapshot?: CloudHydrationSnapshot | null, private readonly lifecycle: SyncLifecycle = {}) {
    this.baseline = initialCloudSnapshot ?? null;
    this.lastSyncedIds = seedSyncedIds(initialCloudSnapshot);
    this.lastSyncedApplicationDocuments = seedApplicationDocuments(initialCloudSnapshot);
  }

  start() {
    if (this.stopped) return;
    const schedule = () => this.schedule();
    this.unsubscribe.push(useJourneyStore.subscribe(schedule));
    this.unsubscribe.push(useExperimentStore.subscribe(schedule));
    this.unsubscribe.push(useApplicationTrackerStore.subscribe(schedule));
    this.startRealtimeListener();
  }

  requestSync() { this.schedule(); }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.remoteTimer) clearTimeout(this.remoteTimer);
    this.timer = null; this.remoteTimer = null;
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.unsubscribe = [];
    if (this.realtimeChannel) { void this.supabase.removeChannel(this.realtimeChannel); this.realtimeChannel = null; }
  }

  private startRealtimeListener() {
    if (this.stopped || this.realtimeChannel) return;
    let channel = this.supabase.channel(`cloud-sync:${this.userId}`);
    for (const table of HYDRATABLE_TABLES) channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${this.userId}` }, () => this.scheduleRemoteHydration());
    this.realtimeChannel = channel;
    void channel.subscribe((status, error) => {
      if (this.stopped) return;
      if (status === 'SUBSCRIBED') { this.lifecycle.onCloudConnectionChange?.(true); return; }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error('[K-Roadmap] Cloud realtime channel status:', status, error);
        this.lifecycle.onCloudConnectionChange?.(false);
      }
    });
  }

  private scheduleRemoteHydration() {
    if (this.stopped) return;
    if (this.syncing || this.timer) { this.remoteQueued = true; return; }
    if (this.remoteTimer) clearTimeout(this.remoteTimer);
    this.remoteTimer = setTimeout(() => { this.remoteTimer = null; void this.hydrateFromRemote(); }, REMOTE_HYDRATION_DEBOUNCE_MS);
  }

  private async hydrateFromRemote() {
    if (this.stopped) return;
    if (this.syncing || this.timer) { this.remoteQueued = true; return; }
    try {
      const cloud = await withTimeout(readCloudHydrationSnapshot(this.supabase), 'Realtime cloud hydration');
      if (this.stopped) return;
      if (cloud.error || !cloud.data) { console.error('[K-Roadmap] Cloud realtime hydration failed:', cloud.error); return; }
      this.baseline = cloud.data;
      this.lastSyncedIds = seedSyncedIds(cloud.data);
      this.lastSyncedApplicationDocuments = seedApplicationDocuments(cloud.data);
      this.applyingRemote = true;
      try { applyCloudHydrationSnapshot(cloud.data, { replaceEmpty: true }); } finally { this.applyingRemote = false; }
    } catch (error) { console.error('[K-Roadmap] Cloud realtime hydration request failed:', error); }
  }

  private schedule() {
    if (this.stopped || this.applyingRemote) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, SYNC_DEBOUNCE_MS);
  }

  private async ensureBaseline(): Promise<boolean> {
    if (this.baseline) return true;
    try {
      const cloud = await withTimeout(readCloudHydrationSnapshot(this.supabase), 'Cloud sync baseline request');
      if (cloud.error || !cloud.data) { console.error('[K-Roadmap] Could not establish sync baseline:', cloud.error); return false; }
      this.baseline = cloud.data;
      this.lastSyncedIds = seedSyncedIds(cloud.data);
      this.lastSyncedApplicationDocuments = seedApplicationDocuments(cloud.data);
      return true;
    } catch (error) { console.error('[K-Roadmap] Cloud sync baseline request failed:', error); return false; }
  }

  private async flush() {
    if (this.stopped) return;
    if (this.syncing) { this.queued = true; return; }
    this.syncing = true;
    this.lifecycle.onSyncStart?.();
    try {
      const { data: authData, error: authError } = await withTimeout(this.supabase.auth.getUser(), 'Cloud sync authentication request');
      if (this.stopped) return;
      if (authError || authData.user?.id !== this.userId) {
        const error = authError ?? new Error('Authenticated user does not match sync account.');
        console.error('[K-Roadmap] Automatic cloud sync auth check failed:', error);
        this.lifecycle.onSyncFailure?.(error); return;
      }
      if (!(await this.ensureBaseline()) || !this.baseline) { const error = new Error('Could not establish cloud sync baseline.'); this.lifecycle.onSyncFailure?.(error); return; }
      const snapshot = buildLocalSnapshot();
      const result = await withTimeout(importMigrationData(this.supabase, snapshot, { expectedSnapshot: this.baseline }), 'Cloud sync write request', CLOUD_SYNC_BATCH_TIMEOUT_MS);
      if (this.stopped) return;
      if (!result.success) { console.error('[K-Roadmap] Automatic cloud sync failed:', result.errors); this.lifecycle.onSyncFailure?.(result.errors); return; }
      const desired = desiredIds(snapshot);
      const repository = new CloudRepository(this.supabase);
      const deletionResult = await withTimeout(tombstoneStaleRows(repository, this.userId, this.baseline, desired), 'Cloud sync tombstone cleanup', CLOUD_SYNC_BATCH_TIMEOUT_MS);
      const applicationDocumentErrors = await withTimeout(tombstoneStaleApplicationDocuments(repository, this.userId, this.baseline, desiredApplicationDocuments(snapshot)), 'Cloud sync application-document cleanup', CLOUD_SYNC_BATCH_TIMEOUT_MS);
      if (!deletionResult.ok || applicationDocumentErrors.length) {
        const errors = [...deletionResult.errors, ...applicationDocumentErrors];
        console.error('[K-Roadmap] Automatic cloud tombstone cleanup failed:', errors);
        this.lifecycle.onSyncFailure?.(errors); return;
      }
      const refreshed = await withTimeout(readCloudHydrationSnapshot(this.supabase), 'Cloud sync authoritative refresh');
      if (refreshed.error || !refreshed.data) {
        const error = refreshed.error ?? new Error('Cloud sync succeeded but authoritative refresh failed.');
        console.error('[K-Roadmap] Automatic cloud sync succeeded but refresh failed:', error);
        this.lifecycle.onSyncFailure?.(error); return;
      }
      this.baseline = refreshed.data;
      this.lastSyncedIds = seedSyncedIds(refreshed.data);
      this.lastSyncedApplicationDocuments = seedApplicationDocuments(refreshed.data);
      this.applyingRemote = true;
      try { applyCloudHydrationSnapshot(refreshed.data, { replaceEmpty: true }); } finally { this.applyingRemote = false; }
      this.lifecycle.onSyncSuccess?.();
    } catch (error) {
      console.error('[K-Roadmap] Automatic cloud sync exception:', error);
      this.lifecycle.onSyncFailure?.(error);
    } finally {
      this.syncing = false;
      if (this.queued && !this.stopped) { this.queued = false; this.schedule(); }
      if (this.remoteQueued && !this.stopped) { this.remoteQueued = false; this.scheduleRemoteHydration(); }
    }
  }
}

export function startAutomaticCloudSync(supabase: SupabaseClient, userId: string, initialCloudSnapshot?: CloudHydrationSnapshot | null, lifecycle: SyncLifecycle = {}) {
  const sync = new AutomaticCloudSync(supabase, userId, initialCloudSnapshot, lifecycle);
  sync.start();
  return sync;
}
