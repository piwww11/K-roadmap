'use client';

import type { CloudHydrationSnapshot } from './hydration';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useExperimentStore } from '@/store/experimentStore';
import { useApplicationTrackerStore } from '@/store/applicationTrackerStore';
import type { Budget, BudgetItem, Experiment } from '@/types';
import type { ApplicationTarget } from '@/types/application';

function payload<T>(row: Record<string, unknown>): T | null {
  return row.payload && typeof row.payload === 'object' ? (row.payload as T) : null;
}

function rows<T>(snapshot: CloudHydrationSnapshot, table: keyof CloudHydrationSnapshot): T[] {
  return (snapshot[table] ?? []) as T[];
}

function sumSavings(snapshot: CloudHydrationSnapshot): number {
  return rows<Record<string, unknown>>(snapshot, 'saving_transactions').reduce((total, row) => {
    const amount = Number(row.amount);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

function normalizeBudgetItems(snapshot: CloudHydrationSnapshot, fallback: BudgetItem[]): BudgetItem[] {
  const hydrated = rows<Record<string, unknown>>(snapshot, 'budget_items')
    .map((row) => payload<Record<string, unknown>>(row))
    .filter((value): value is Record<string, unknown> => value !== null)
    .map((item, index): BudgetItem | null => {
      const id = typeof item.id === 'string' && item.id.trim() ? item.id : `cloud-budget-${index}`;
      const name = typeof item.name === 'string' ? item.name : null;
      const amount = Number(item.amount);
      const category = item.category;

      if (!name || !Number.isFinite(amount) || typeof category !== 'string') return null;
      return { id, name, amount, category } as BudgetItem;
    })
    .filter((value): value is BudgetItem => value !== null);

  return hydrated.length ? hydrated : fallback;
}

export function applyCloudHydrationSnapshot(snapshot: CloudHydrationSnapshot): {
  applied: boolean;
  records: number;
} {
  const phaseRows = rows<Record<string, unknown>>(snapshot, 'journey_phases');
  const majorRows = rows<Record<string, unknown>>(snapshot, 'majors');
  const phases = phaseRows.map((row) => payload<Record<string, unknown>>(row)).filter(Boolean);
  const majors = majorRows.map((row) => payload<Record<string, unknown>>(row)).filter(Boolean);
  const state = useJourneyStore.getState();
  let records = 0;

  // Journey data is hydrated independently per collection. An empty cloud
  // collection must not block unrelated cloud data from being applied.
  const cloudExport = {
    myWhy: state.myWhy,
    phases: phases.length ? phases : state.phases,
    majors: majors.length ? majors : state.majors,
    skills: rows<Record<string, unknown>>(snapshot, 'skills').map((row) => payload<Record<string, unknown>>(row)).filter(Boolean),
    journalEntries: rows<Record<string, unknown>>(snapshot, 'journal_entries').map((row) => payload<Record<string, unknown>>(row)).filter(Boolean),
    budget: {
      items: normalizeBudgetItems(snapshot, state.budget.items),
      targetAmount: Number((snapshot.budget_profiles?.[0] as Record<string, unknown> | undefined)?.target_amount ?? state.budget.targetAmount),
      currentSavings: sumSavings(snapshot),
    } satisfies Budget,
    documents: rows<Record<string, unknown>>(snapshot, 'documents').map((row) => payload<Record<string, unknown>>(row)).filter(Boolean),
    achievements: rows<Record<string, unknown>>(snapshot, 'achievements').map((row) => payload<Record<string, unknown>>(row)).filter(Boolean),
    majorDecisions: rows<Record<string, unknown>>(snapshot, 'major_decisions').map((row) => payload<Record<string, unknown>>(row)).filter(Boolean),
  };

  const hasJourneyData =
    phases.length > 0 ||
    majors.length > 0 ||
    cloudExport.skills.length > 0 ||
    cloudExport.journalEntries.length > 0 ||
    cloudExport.budget.items.length > 0 ||
    cloudExport.documents.length > 0 ||
    cloudExport.achievements.length > 0 ||
    cloudExport.majorDecisions.length > 0 ||
    snapshot.budget_profiles?.length > 0 ||
    snapshot.saving_transactions?.length > 0;

  if (hasJourneyData && state.importData(JSON.stringify(cloudExport))) {
    records += phases.length + majors.length;
    records += cloudExport.skills.length + cloudExport.journalEntries.length;
    records += cloudExport.budget.items.length + cloudExport.documents.length;
    records += cloudExport.achievements.length + cloudExport.majorDecisions.length;
  }

  const experiments = rows<Record<string, unknown>>(snapshot, 'experiments')
    .map((row) => payload<Experiment>(row))
    .filter((value): value is Experiment => value !== null);
  if (experiments.length) {
    useExperimentStore.setState({ experiments });
    records += experiments.length;
  }

  const applications = rows<Record<string, unknown>>(snapshot, 'applications')
    .map((row) => payload<ApplicationTarget>(row))
    .filter((value): value is ApplicationTarget => value !== null);
  if (applications.length) {
    useApplicationTrackerStore.setState({ applications });
    records += applications.length;
  }

  return { applied: records > 0, records };
}
