import type { Experiment, JournalEntry, Major, MajorDecisionResponse, Phase, Task } from '@/types';

export type ProgressEventKind = 'decision' | 'experiment' | 'reflection' | 'journal';

export interface ProgressTimelineEvent {
  id: string;
  date: string;
  kind: ProgressEventKind;
  title: string;
  detail: string;
}

export interface ProgressPhaseSummary {
  id: string;
  number: number;
  title: string;
  startDate: string;
  endDate: string;
  completed: number;
  total: number;
  progress: number;
  status: Phase['status'];
}

export interface ProgressMajorSummary {
  majorId: string;
  name: string;
  icon: string;
  completedTasks: number;
  totalTasks: number;
  taskProgress: number;
  experiments: number;
  reflectedExperiments: number;
  reflectionRate: number;
}

export interface ProgressAnalyticsModel {
  overall: { completed: number; total: number; progress: number };
  phases: ProgressPhaseSummary[];
  majors: ProgressMajorSummary[];
  activity: ProgressTimelineEvent[];
  activityCount: number;
  currentPhase?: ProgressPhaseSummary;
  nextPhase?: ProgressPhaseSummary;
  note: string;
}

function allTasks(phases: Phase[]): Task[] {
  return phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks)));
}

function taskMajorIds(task: Task): string[] {
  if (task.explorationMajorIds?.length) return task.explorationMajorIds;
  return task.majorReward?.majorId ? [task.majorReward.majorId] : [];
}

function dateValue(value?: string): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateLabel(value: string): string {
  return value.slice(0, 10);
}

function phaseSummary(phase: Phase): ProgressPhaseSummary {
  const tasks = phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks));
  const completed = tasks.filter((task) => task.status === 'Completed').length;
  return {
    id: phase.id,
    number: phase.number,
    title: phase.title,
    startDate: phase.startDate,
    endDate: phase.endDate,
    completed,
    total: tasks.length,
    progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    status: phase.status,
  };
}

function buildActivity(
  decisions: MajorDecisionResponse[],
  experiments: Experiment[],
  journalEntries: JournalEntry[]
): ProgressTimelineEvent[] {
  const events: ProgressTimelineEvent[] = [];

  decisions.forEach((decision, index) => {
    events.push({
      id: `decision-${decision.timestamp}-${index}`,
      date: decision.timestamp,
      kind: 'decision',
      title: `Major Decision snapshot #${index + 1}`,
      detail: 'A new decision snapshot was recorded and is now part of the intelligence history.',
    });
  });

  experiments.forEach((experiment) => {
    (experiment.attempts ?? []).forEach((attempt, index) => {
      const startDate = attempt.startedAt ?? experiment.createdAt;
      events.push({
        id: `experiment-${experiment.id}-${attempt.id}-start`,
        date: startDate,
        kind: 'experiment',
        title: `Started experiment: ${experiment.title}`,
        detail: `Attempt #${index + 1} · ${experiment.majorId}`,
      });
      if (attempt.reflection) {
        events.push({
          id: `reflection-${experiment.id}-${attempt.id}`,
          date: attempt.reflection.createdAt,
          kind: 'reflection',
          title: `Reflected on: ${experiment.title}`,
          detail: `Interest ${attempt.reflection.interest}/5 · Energy ${attempt.reflection.energy}/5 · Difficulty ${attempt.reflection.difficulty}/5 · ${attempt.reflection.wouldDoAgain ? 'Would repeat' : 'Would not repeat'}`,
        });
      }
    });
  });

  journalEntries.forEach((entry) => {
    const date = entry.date || entry.createdAt;
    events.push({
      id: `journal-${entry.id}`,
      date,
      kind: 'journal',
      title: `Journal: ${entry.title}`,
      detail: `${entry.category} · mood ${entry.mood}/5 · interest ${entry.interest}/5`,
    });
  });

  return events
    .filter((event) => dateValue(event.date) > 0)
    .sort((a, b) => dateValue(b.date) - dateValue(a.date));
}

export function buildProgressAnalytics({
  phases,
  majors,
  experiments,
  decisions,
  journalEntries,
}: {
  phases: Phase[];
  majors: Major[];
  experiments: Experiment[];
  decisions: MajorDecisionResponse[];
  journalEntries: JournalEntry[];
}): ProgressAnalyticsModel {
  const tasks = allTasks(phases);
  const completed = tasks.filter((task) => task.status === 'Completed').length;
  const phaseSummaries = phases.map(phaseSummary);
  const currentPhase = phaseSummaries.find((phase) => phase.status === 'In Progress') ?? phaseSummaries.find((phase) => phase.progress < 100);
  const currentIndex = currentPhase ? phaseSummaries.findIndex((phase) => phase.id === currentPhase.id) : -1;
  const nextPhase = currentIndex >= 0 ? phaseSummaries[currentIndex + 1] : undefined;

  const majorSummaries = majors.map((major) => {
    const majorTasks = tasks.filter((task) => taskMajorIds(task).includes(major.id));
    const majorExperiments = experiments.filter((experiment) => experiment.majorId === major.id);
    const reflected = majorExperiments.filter((experiment) =>
      (experiment.attempts ?? []).some((attempt) => Boolean(attempt.reflection)) || Boolean(experiment.reflection)
    ).length;
    return {
      majorId: major.id,
      name: major.name,
      icon: major.icon,
      completedTasks: majorTasks.filter((task) => task.status === 'Completed').length,
      totalTasks: majorTasks.length,
      taskProgress: majorTasks.length ? Math.round((majorTasks.filter((task) => task.status === 'Completed').length / majorTasks.length) * 100) : 0,
      experiments: majorExperiments.length,
      reflectedExperiments: reflected,
      reflectionRate: majorExperiments.length ? Math.round((reflected / majorExperiments.length) * 100) : 0,
    } satisfies ProgressMajorSummary;
  });

  const activity = buildActivity(decisions, experiments, journalEntries);
  const note = 'Progress is derived from the current roadmap state and dated activity already stored by K-ROADMAP. Tasks do not currently store a completion timestamp, so the timeline never invents a completion date.';

  return {
    overall: { completed, total: tasks.length, progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0 },
    phases: phaseSummaries,
    majors: majorSummaries,
    activity,
    activityCount: activity.length,
    currentPhase,
    nextPhase,
    note,
  };
}

export { dateLabel };
