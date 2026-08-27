'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useApplicationTrackerStore } from '@/store/applicationTrackerStore';
import { useExperimentStore } from '@/store/experimentStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { CloudHydrationSnapshot } from './hydration';
import { readCloudHydrationSnapshot } from './hydration';
import { applyCloudHydrationSnapshot } from './applyHydration';
import { CloudRepository, type CloudTable } from './cloudRepository';
import { importMigrationData } from '@/lib/migration/importer';
import { normalizeLocalSnapshot, type NormalizedMigrationData } from '@/lib/migration/normalizer';

const SYNC_DEBOUNCE_MS = 900;

type DeletableTable = Exclude<CloudTable, 'profiles' | 'application_documents' | 'budget_profiles'>;
type ApplicationDocumentKey = `${string}::${string}`;
type SyncedIds = Map<DeletableTable, Set<string>>;

const DELETE_ORDER: DeletableTable[] = [
  'experiment_reflections',
  'experiment_attempts',
  'experiments',
  'applications',
  'budget_items',
  'saving_transactions',
  'major_decisions',
  'documents',
  'achievements',
  'journal_entries',
  'journey_tasks',
  'journey_goals',
  'journey_months',
  'journey_phases',
  'skills',
  'majors',
];

function emptySyncedIds(): SyncedIds {
  return new Map();
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
    return reflectionIds.concat(
      experiment.attempts.filter((attempt) => attempt.reflection).map((attempt) => `${attempt.id}:reflection`),
    );
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
    for (const documentId of requiredIds) {
      if (documentIds.has(documentId)) keys.add(`${application.id}::${documentId}`);
    }
  }
  return keys;
}

function seedSyncedIds(snapshot: CloudHydrationSnapshot | null | undefined): SyncedIds {
  const ids = emptySyncedIds();
  if (!snapshot) return ids;
  for (const table of DELETE_ORDER) {
    ids.set(table, new Set((snapshot[table] ?? []).map((row) => String(row.id)).filter(Boolean)));
  }
  return ids;
}

function seedApplicationDocuments(snapshot: CloudHydrationSnapshot | null | undefined) {
  return new Set<ApplicationDocumentKey>(
    (snapshot?.application_documents ?? []).map(
      (row) => `${String(row.application_id)}::${String(row.document_id)}` as ApplicationDocumentKey,
    ),
  );
}

function findBaselineRow(
  snapshot: CloudHydrationSnapshot,
  table: CloudTable,
  key: Record<string, unknown>,
) {
  const keys = table === 'application_documents'
    ? ['application_id', 'document_id']
    : table === 'budget_profiles'
      ? ['user_id']
      : ['id'];
  return (snapshot[table] ?? []).find((row) => keys.every((column) => row[column] === key[column])) ?? null;
}

async function tombstoneStaleRows(
  repository: CloudRepository,
  userId: string,
  baseline: CloudHydrationSnapshot,
  desired: SyncedIds,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const table of DELETE_ORDER) {
    const rows = baseline[table] ?? [];
    const desiredSet = desired.get(table) ?? new Set<string>();
    const staleRows = rows.filter((row) => {
      const id = String(row.id ?? '');
      return id && !desiredSet.has(id) && row.user_id === userId;
    });

    for (const row of staleRows) {
      const revision = typeof row.revision === 'number' ? row.revision : null;
      if (revision === null) {
        errors.push(`${table}:${String(row.id)}: missing revision baseline.`);
        continue;
      }

      const result = await repository.tombstone(table, { id: row.id, user_id: userId }, revision);
      if (!result.error && !result.conflict) continue;
      if (result.error) {
        errors.push(`${table}:${String(row.id)}: ${result.error}`);
        continue;
      }

      // Delete-vs-update is resolved in v1 by the explicit local deletion.
      const latest = await repository.getByKey<Record<string, unknown>>(table, { id: row.id, user_id: userId });
      const latestRevision = typeof latest.data?.revision === 'number' ? latest.data.revision : null;
      if (latest.error || latestRevision === null) {
        errors.push(`${table}:${String(row.id)}: could not rebase tombstone after conflict.`);
        continue;
      }
      const retry = await repository.tombstone(table, { id: row.id, user_id: userId }, latestRevision);
      if (retry.error || retry.conflict) errors.push(`${table}:${String(row.id)}: tombstone conflict remained.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

async function tombstoneStaleApplicationDocuments(
  repository: CloudRepository,
  userId: string,
  baseline: CloudHydrationSnapshot,
  desired: Set<ApplicationDocumentKey>,
): Promise<string[]> {
  const errors: string[] = [];
  const rows = baseline.application_documents ?? [];

  for (const row of rows) {
    const applicationId = String(row.application_id ?? '');
    const documentId = String(row.document_id ?? '');
    if (!applicationId || !documentId || row.user_id !== userId) continue;
    if (desired.has(`${applicationId}::${documentId}` as ApplicationDocumentKey)) continue;

    const revision = typeof row.revision === 'number' ? row.revision : null;
    if (revision === null) {
      errors.push(`application_documents:${applicationId}:${documentId}: missing revision baseline.`);
      continue;
    }

    const key = { application_id: applicationId, document_id: documentId, user_id: userId };
    const result = await repository.tombstone('application_documents', key, revision);
    if (!result.error && !result.conflict) continue;
    if (result.error) {
      errors.push(`application_documents:${applicationId}:${documentId}: ${result.error}`);
      continue;
    }

    const latest = await repository.getByKey<Record<string, unknown>>('application_documents', key);
    const latestRevision = typeof latest.data?.revision === 'number' ? latest.data.revision : null;
    if (latest.error || latestRevision === null) {
      errors.push(`application_documents:${applicationId}:${documentId}: could not rebase tombstone.`);
      continue;
    }
    const retry = await repository.tombstone('application_documents', key, latestRevision);
    if (retry.error || retry.conflict) errors.push(`application_documents:${applicationId}:${documentId}: tombstone conflict remained.`);
  }

  return errors;
}

export class AutomaticCloudSync {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private syncing = false;
  private queued = false;
  private stopped = false;
  private unsubscribe: Array<() => void> = [];
  private lastSyncedIds: SyncedIds;
  private lastSyncedApplicationDocuments: Set<ApplicationDocumentKey>;
  private baseline: CloudHydrationSnapshot | null;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
    initialCloudSnapshot?: CloudHydrationSnapshot | null,
  ) {
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
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.unsubscribe = [];
  }

  private schedule() {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, SYNC_DEBOUNCE_MS);
  }

  private async ensureBaseline(): Promise<boolean> {
    if (this.baseline) return true;
    const cloud = await readCloudHydrationSnapshot(this.supabase);
    if (cloud.error || !cloud.data) {
      console.error('[K-Roadmap] Could not establish sync baseline:', cloud.error);
      return false;
    }
    this.baseline = cloud.data;
    this.lastSyncedIds = seedSyncedIds(cloud.data);
    this.lastSyncedApplicationDocuments = seedApplicationDocuments(cloud.data);
    return true;
  }

  private async flush() {
    if (this.stopped) return;
    if (this.syncing) {
      this.queued = true;
      return;
    }

    this.syncing = true;
    try {
      const { data: authData, error: authError } = await this.supabase.auth.getUser();
      if (this.stopped) return;
      if (authError || authData.user?.id !== this.userId) return;
      if (!(await this.ensureBaseline()) || !this.baseline) return;

      const snapshot = buildLocalSnapshot();
      const result = await importMigrationData(this.supabase, snapshot, {
        expectedSnapshot: this.baseline,
      });
      if (this.stopped) return;
      if (!result.success) {
        console.error('[K-Roadmap] Automatic cloud sync failed:', result.errors);
        return;
      }

      const desired = desiredIds(snapshot);
      const deletionResult = await tombstoneStaleRows(
        new CloudRepository(this.supabase),
        this.userId,
        this.baseline,
        desired,
      );
      const applicationDocumentErrors = await tombstoneStaleApplicationDocuments(
        new CloudRepository(this.supabase),
        this.userId,
        this.baseline,
        desiredApplicationDocuments(snapshot),
      );

      if (!deletionResult.ok || applicationDocumentErrors.length) {
        console.error('[K-Roadmap] Automatic cloud tombstone cleanup failed:', [
          ...deletionResult.errors,
          ...applicationDocumentErrors,
        ]);
        return;
      }

      const refreshed = await readCloudHydrationSnapshot(this.supabase);
      if (refreshed.error || !refreshed.data) {
        console.error('[K-Roadmap] Automatic cloud sync succeeded but refresh failed:', refreshed.error);
        return;
      }

      this.baseline = refreshed.data;
      this.lastSyncedIds = seedSyncedIds(refreshed.data);
      this.lastSyncedApplicationDocuments = seedApplicationDocuments(refreshed.data);

      // A three-way merge may have preserved fields changed on another device.
      // Re-apply the authoritative merged cloud snapshot so Zustand cannot
      // immediately write the stale pre-merge local version back again.
      applyCloudHydrationSnapshot(refreshed.data, { replaceEmpty: true });
    } finally {
      this.syncing = false;
      if (this.queued && !this.stopped) {
        this.queued = false;
        this.schedule();
      }
    }
  }
}

export function startAutomaticCloudSync(
  supabase: SupabaseClient,
  userId: string,
  initialCloudSnapshot?: CloudHydrationSnapshot | null,
) {
  const sync = new AutomaticCloudSync(supabase, userId, initialCloudSnapshot);
  sync.start();
  return sync;
}
