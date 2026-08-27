'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useApplicationTrackerStore } from '@/store/applicationTrackerStore';
import { useExperimentStore } from '@/store/experimentStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import type { CloudHydrationSnapshot } from './hydration';
import { importMigrationData } from '@/lib/migration/importer';
import { normalizeLocalSnapshot, type NormalizedMigrationData } from '@/lib/migration/normalizer';

const SYNC_DEBOUNCE_MS = 900;
const DELETE_BATCH_SIZE = 50;

// Children must be removed before their parent rows. This keeps local
// deletions safe against the foreign keys used by the cloud schema.
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

type DeletableTable =
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
  | 'budget_items'
  | 'saving_transactions';

type ApplicationDocumentKey = `${string}::${string}`;

type SyncedIds = Map<DeletableTable, Set<string>>;

function emptySyncedIds(): SyncedIds {
  return new Map();
}

function buildLocalSnapshot(): NormalizedMigrationData {
  const journey = JSON.parse(useJourneyStore.getState().exportData());
  const experiments = { state: { experiments: useExperimentStore.getState().experiments } };
  const applications = { state: { applications: useApplicationTrackerStore.getState().applications } };

  return normalizeLocalSnapshot({
    journey,
    experiments,
    applications,
  });
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

  const seed = (table: DeletableTable) => {
    const values = snapshot[table] ?? [];
    ids.set(table, new Set(values.map((row) => String(row.id)).filter(Boolean)));
  };

  seed('journey_phases');
  seed('journey_months');
  seed('journey_goals');
  seed('journey_tasks');
  seed('majors');
  seed('skills');
  seed('journal_entries');
  seed('documents');
  seed('achievements');
  seed('major_decisions');
  seed('experiments');
  seed('experiment_attempts');
  seed('experiment_reflections');
  seed('applications');
  seed('budget_items');
  seed('saving_transactions');

  return ids;
}

async function deleteStaleRows(
  supabase: SupabaseClient,
  userId: string,
  previous: SyncedIds,
  desired: SyncedIds,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const table of DELETE_ORDER) {
    const previousIds = previous.get(table);
    if (!previousIds) continue;

    const desiredSet = desired.get(table) ?? new Set<string>();
    const staleIds = [...previousIds].filter((id) => !desiredSet.has(id));

    for (let index = 0; index < staleIds.length; index += DELETE_BATCH_SIZE) {
      const batch = staleIds.slice(index, index + DELETE_BATCH_SIZE);
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId)
        .in('id', batch);
      if (error) errors.push(`${table}: ${error.message}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

async function deleteStaleApplicationDocuments(
  supabase: SupabaseClient,
  userId: string,
  previous: Set<ApplicationDocumentKey>,
  desired: Set<ApplicationDocumentKey>,
): Promise<string[]> {
  const errors: string[] = [];
  const stale = [...previous].filter((key) => !desired.has(key));

  for (const key of stale) {
    const [applicationId, documentId] = key.split('::');
    if (!applicationId || !documentId) continue;

    const { error } = await supabase
      .from('application_documents')
      .delete()
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('document_id', documentId);
    if (error) errors.push(`application_documents: ${error.message}`);
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

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
    initialCloudSnapshot?: CloudHydrationSnapshot | null,
  ) {
    this.lastSyncedIds = seedSyncedIds(initialCloudSnapshot);
    this.lastSyncedApplicationDocuments = new Set(
      (initialCloudSnapshot?.application_documents ?? []).map(
        (row) => `${String(row.application_id)}::${String(row.document_id)}` as ApplicationDocumentKey,
      ),
    );
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

      const snapshot = buildLocalSnapshot();
      const result = await importMigrationData(this.supabase, snapshot);
      if (this.stopped) return;
      if (!result.success) {
        console.error('[K-Roadmap] Automatic cloud sync failed:', result.errors);
        return;
      }

      const desired = desiredIds(snapshot);
      const deletionResult = await deleteStaleRows(
        this.supabase,
        this.userId,
        this.lastSyncedIds,
        desired,
      );
      const applicationDocumentErrors = await deleteStaleApplicationDocuments(
        this.supabase,
        this.userId,
        this.lastSyncedApplicationDocuments,
        desiredApplicationDocuments(snapshot),
      );

      if (!deletionResult.ok || applicationDocumentErrors.length) {
        console.error('[K-Roadmap] Automatic cloud cleanup failed:', [
          ...deletionResult.errors,
          ...applicationDocumentErrors,
        ]);
        return;
      }

      this.lastSyncedIds = desired;
      this.lastSyncedApplicationDocuments = desiredApplicationDocuments(snapshot);
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
