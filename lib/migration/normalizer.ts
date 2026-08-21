import type {
  Achievement,
  BudgetItem,
  DocumentItem,
  Experiment,
  ExperimentAttempt,
  JournalEntry,
  Major,
  MajorDecisionResponse,
  Phase,
  Skill,
  Task,
} from '../../types';

export const JOURNEY_STORAGE_KEY = 'k-roadmap-storage-v2';
export const EXPERIMENT_STORAGE_KEY = 'k-roadmap-experiments-v1';
export const APPLICATION_STORAGE_KEY = 'k-roadmap-application-tracker-v1';

export interface NormalizationIssue {
  severity: 'warning' | 'error';
  path: string;
  message: string;
}

export interface LocalApplicationRecord {
  id: string;
  // Application tracker is a legacy persisted store whose shape is intentionally open-ended.
  // The importer narrows individual fields at the cloud boundary.
  [key: string]: any;
}

export interface NormalizedJourneyData {
  myWhy: string;
  phases: Phase[];
  majors: Major[];
  skills: Skill[];
  journalEntries: JournalEntry[];
  budget: {
    items: BudgetItem[];
    targetAmount: number;
    legacyCurrentSavings: number;
  };
  documents: DocumentItem[];
  achievements: Achievement[];
  majorDecisions: MajorDecisionResponse[];
}

export interface NormalizedExperimentData {
  experiments: Experiment[];
}

export interface NormalizedApplicationData {
  applications: LocalApplicationRecord[];
}

export interface NormalizedMigrationData {
  journey: NormalizedJourneyData;
  experiments: NormalizedExperimentData;
  applications: NormalizedApplicationData;
  issues: NormalizationIssue[];
}

export interface LocalStorageSnapshot {
  journey: unknown;
  experiments: unknown;
  applications: unknown;
}

type AnyRecord = Record<string, any>;

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function unwrapPersistedState(value: unknown): AnyRecord {
  if (!isRecord(value)) return {};
  return isRecord(value.state) ? value.state : value;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

function normalizePhases(phases: unknown): Phase[] {
  if (!Array.isArray(phases)) return [];
  // Keep derived progress/status in the normalized snapshot for preview/debugging.
  // The later cloud adapter must intentionally omit them from source-of-truth writes.
  return clone(phases).map((phase: Phase) => ({
    ...phase,
    months: Array.isArray(phase.months)
      ? phase.months.map((month) => ({
          ...month,
          goals: Array.isArray(month.goals)
            ? month.goals.map((goal) => ({
                ...goal,
                tasks: Array.isArray(goal.tasks)
                  ? goal.tasks.map((task) => ({
                      ...task,
                      explorationMajorIds: uniqueIds(task.explorationMajorIds),
                      unlocksSkillIds: uniqueIds(task.unlocksSkillIds),
                    }))
                  : [],
              }))
            : [],
        }))
      : [],
  }));
}

function normalizeMajors(majors: unknown): Major[] {
  if (!Array.isArray(majors)) return [];
  return clone(majors).map((major: Major) => ({
    ...major,
    // Preserve the local value for preview; cloud writes must use baseConfidenceScore as source.
    confidenceScore: major.confidenceScore,
  }));
}

function normalizeSkills(skills: unknown): Skill[] {
  if (!Array.isArray(skills)) return [];
  return clone(skills).map((skill: Skill) => ({
    ...skill,
    requiredTaskIds: uniqueIds(skill.requiredTaskIds),
    requiredSkillIds: uniqueIds(skill.requiredSkillIds),
  }));
}

function normalizeBudget(state: AnyRecord): NormalizedJourneyData['budget'] {
  const budget = isRecord(state.budget) ? state.budget : {};
  return {
    items: Array.isArray(budget.items) ? clone(budget.items) : [],
    targetAmount: typeof budget.targetAmount === 'number' && Number.isFinite(budget.targetAmount)
      ? budget.targetAmount
      : 0,
    // Kept only for migration preview. It is intentionally NOT a cloud balance source of truth.
    legacyCurrentSavings:
      typeof budget.currentSavings === 'number' && Number.isFinite(budget.currentSavings)
        ? budget.currentSavings
        : 0,
  };
}

function normalizeJourney(raw: unknown): NormalizedJourneyData {
  const state = unwrapPersistedState(raw);
  return {
    myWhy: typeof state.myWhy === 'string' ? state.myWhy : '',
    phases: normalizePhases(state.phases),
    majors: normalizeMajors(state.majors),
    skills: normalizeSkills(state.skills),
    journalEntries: Array.isArray(state.journalEntries) ? clone(state.journalEntries) : [],
    budget: normalizeBudget(state),
    documents: Array.isArray(state.documents) ? clone(state.documents) : [],
    achievements: Array.isArray(state.achievements) ? clone(state.achievements) : [],
    majorDecisions: Array.isArray(state.majorDecisions) ? clone(state.majorDecisions) : [],
  };
}

function normalizeExperiments(raw: unknown): NormalizedExperimentData {
  const state = unwrapPersistedState(raw);
  const experiments = Array.isArray(state.experiments) ? clone(state.experiments) : [];

  return {
    experiments: experiments.map((experiment: Experiment) => ({
      ...experiment,
      attempts: Array.isArray(experiment.attempts)
        ? experiment.attempts.map((attempt: ExperimentAttempt) => ({
            ...attempt,
            reflection: attempt.reflection ? clone(attempt.reflection) : undefined,
          }))
        : [],
      reflection: experiment.reflection ? clone(experiment.reflection) : undefined,
    })),
  };
}

function normalizeApplications(raw: unknown): NormalizedApplicationData {
  const state = unwrapPersistedState(raw);
  const applications = Array.isArray(state.applications) ? clone(state.applications) : [];
  return {
    applications: applications.filter((application): application is LocalApplicationRecord =>
      isRecord(application) && typeof application.id === 'string' && application.id.length > 0
    ),
  };
}

function collectTaskIds(phases: Phase[]): Set<string> {
  return new Set(
    phases.flatMap((phase) =>
      phase.months.flatMap((month) =>
        month.goals.flatMap((goal) => goal.tasks.map((task) => task.id))
      )
    )
  );
}

export function normalizeLocalSnapshot(snapshot: LocalStorageSnapshot): NormalizedMigrationData {
  const issues: NormalizationIssue[] = [];
  const journey = normalizeJourney(snapshot.journey);
  const experiments = normalizeExperiments(snapshot.experiments);
  const applications = normalizeApplications(snapshot.applications);

  const taskIds = collectTaskIds(journey.phases);
  const majorIds = new Set(journey.majors.map((major) => major.id));
  const skillIds = new Set(journey.skills.map((skill) => skill.id));

  journey.phases.forEach((phase) =>
    phase.months.forEach((month) =>
      month.goals.forEach((goal) =>
        goal.tasks.forEach((task) => {
          if (task.goalId !== goal.id) {
            issues.push({ severity: 'error', path: `phases.${phase.id}.${goal.id}.${task.id}.goalId`, message: 'Task goalId does not match its containing goal.' });
          }
          if (task.majorReward && !majorIds.has(task.majorReward.majorId)) {
            issues.push({ severity: 'error', path: `task.${task.id}.majorReward.majorId`, message: `Referenced major ${task.majorReward.majorId} does not exist.` });
          }
          for (const skillId of task.unlocksSkillIds ?? []) {
            if (!skillIds.has(skillId)) issues.push({ severity: 'warning', path: `task.${task.id}.unlocksSkillIds`, message: `Referenced skill ${skillId} does not exist.` });
          }
        })
      )
    )
  );

  journey.skills.forEach((skill) => {
    for (const taskId of skill.requiredTaskIds ?? []) {
      if (!taskIds.has(taskId)) issues.push({ severity: 'warning', path: `skill.${skill.id}.requiredTaskIds`, message: `Required task ${taskId} does not exist.` });
    }
    for (const skillId of skill.requiredSkillIds ?? []) {
      if (!skillIds.has(skillId)) issues.push({ severity: 'warning', path: `skill.${skill.id}.requiredSkillIds`, message: `Required skill ${skillId} does not exist.` });
    }
  });

  experiments.experiments.forEach((experiment) => {
    if (!majorIds.has(experiment.majorId)) {
      issues.push({ severity: 'warning', path: `experiment.${experiment.id}.majorId`, message: `Referenced major ${experiment.majorId} does not exist.` });
    }
  });

  if (journey.budget.legacyCurrentSavings !== 0) {
    issues.push({ severity: 'warning', path: 'budget.currentSavings', message: 'Legacy currentSavings is preserved for migration review but will not become the cloud balance source of truth.' });
  }

  return { journey, experiments, applications, issues };
}

export function readLocalStorageSnapshot(storage: Storage = window.localStorage): LocalStorageSnapshot {
  const parse = (key: string): unknown => {
    const raw = storage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  return {
    journey: parse(JOURNEY_STORAGE_KEY),
    experiments: parse(EXPERIMENT_STORAGE_KEY),
    applications: parse(APPLICATION_STORAGE_KEY),
  };
}

export function getMigrationCounts(data: NormalizedMigrationData) {
  const tasks = data.journey.phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks)));
  const attempts = data.experiments.experiments.flatMap((experiment) => experiment.attempts);
  const reflections = data.experiments.experiments.filter((experiment) => experiment.reflection).length + attempts.filter((attempt) => attempt.reflection).length;

  return {
    phases: data.journey.phases.length,
    months: data.journey.phases.reduce((count, phase) => count + phase.months.length, 0),
    goals: data.journey.phases.reduce((count, phase) => count + phase.months.reduce((monthCount, month) => monthCount + month.goals.length, 0), 0),
    tasks: tasks.length,
    majors: data.journey.majors.length,
    skills: data.journey.skills.length,
    journalEntries: data.journey.journalEntries.length,
    documents: data.journey.documents.length,
    achievements: data.journey.achievements.length,
    majorDecisions: data.journey.majorDecisions.length,
    budgetItems: data.journey.budget.items.length,
    experiments: data.experiments.experiments.length,
    experimentAttempts: attempts.length,
    experimentReflections: reflections,
    applications: data.applications.applications.length,
  };
}
