import type { NormalizedMigrationData, NormalizationIssue } from './normalizer';
import { getMigrationCounts } from './normalizer';

export interface MigrationValidationResult {
  valid: boolean;
  counts: ReturnType<typeof getMigrationCounts>;
  errors: NormalizationIssue[];
  warnings: NormalizationIssue[];
}

function addDuplicateIssues(values: string[], path: string, issues: NormalizationIssue[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  for (const id of duplicates) {
    issues.push({ severity: 'error', path, message: `Duplicate ID detected: ${id}` });
  }
}

export function validateMigrationData(data: NormalizedMigrationData): MigrationValidationResult {
  const issues: NormalizationIssue[] = [...data.issues];

  addDuplicateIssues(data.journey.phases.map((phase) => phase.id), 'phases.id', issues);
  addDuplicateIssues(data.journey.majors.map((major) => major.id), 'majors.id', issues);
  addDuplicateIssues(data.journey.skills.map((skill) => skill.id), 'skills.id', issues);
  addDuplicateIssues(data.journey.journalEntries.map((entry) => entry.id), 'journalEntries.id', issues);
  addDuplicateIssues(data.journey.documents.map((document) => document.id), 'documents.id', issues);
  addDuplicateIssues(data.journey.achievements.map((achievement) => achievement.id), 'achievements.id', issues);
  addDuplicateIssues(data.experiments.experiments.map((experiment) => experiment.id), 'experiments.id', issues);
  addDuplicateIssues(data.experiments.experiments.flatMap((experiment) => experiment.attempts.map((attempt) => attempt.id)), 'experimentAttempts.id', issues);
  addDuplicateIssues(data.applications.applications.map((application) => application.id), 'applications.id', issues);
  addDuplicateIssues(data.journey.budget.savingTransactions.map((transaction) => transaction.id), 'budget.savingTransactions.id', issues);

  for (const phase of data.journey.phases) {
    if (!phase.id) issues.push({ severity: 'error', path: 'phases', message: 'Phase is missing an ID.' });
    for (const month of phase.months) {
      if (!month.id) issues.push({ severity: 'error', path: `phase.${phase.id}.months`, message: 'Month is missing an ID.' });
      if (month.phaseId !== phase.id) {
        issues.push({ severity: 'error', path: `month.${month.id}.phaseId`, message: `Month points to ${month.phaseId}, expected ${phase.id}.` });
      }
      for (const goal of month.goals) {
        if (!goal.id) issues.push({ severity: 'error', path: `month.${month.id}.goals`, message: 'Goal is missing an ID.' });
        if (goal.monthId !== month.id) {
          issues.push({ severity: 'error', path: `goal.${goal.id}.monthId`, message: `Goal points to ${goal.monthId}, expected ${month.id}.` });
        }
        for (const task of goal.tasks) {
          if (!task.id) issues.push({ severity: 'error', path: `goal.${goal.id}.tasks`, message: 'Task is missing an ID.' });
          if (!task.createdAt) issues.push({ severity: 'warning', path: `task.${task.id}.createdAt`, message: 'Task has no createdAt timestamp.' });
        }
      }
    }
  }

  for (const journal of data.journey.journalEntries) {
    if (!journal.id) issues.push({ severity: 'error', path: 'journalEntries', message: 'Journal entry is missing an ID.' });
  }

  for (const document of data.journey.documents) {
    if (!document.id) issues.push({ severity: 'error', path: 'documents', message: 'Document is missing an ID.' });
  }

  for (const experiment of data.experiments.experiments) {
    if (!experiment.id) issues.push({ severity: 'error', path: 'experiments', message: 'Experiment is missing an ID.' });
    for (const attempt of experiment.attempts) {
      if (!attempt.id) issues.push({ severity: 'error', path: `experiment.${experiment.id}.attempts`, message: 'Experiment attempt is missing an ID.' });
    }
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return {
    valid: errors.length === 0,
    counts: getMigrationCounts(data),
    errors,
    warnings,
  };
}

export function buildMigrationPreview(data: NormalizedMigrationData) {
  const result = validateMigrationData(data);
  return {
    status: result.valid ? (result.warnings.length ? 'WARNING' : 'READY') : 'BLOCKED',
    counts: result.counts,
    errors: result.errors,
    warnings: result.warnings,
    canImport: result.valid,
  } as const;
}
