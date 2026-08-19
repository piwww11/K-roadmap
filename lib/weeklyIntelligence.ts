import type { Experiment, Major, MajorDecisionAnalysis, MajorDecisionResponse, Phase, Task } from '@/types';
import { analyzeReflections } from './reflectionIntelligence';
import { buildMajorComparisonModel } from './majorComparison';

export interface WeeklyIntelligenceReview {
  taskProgress: { completed: number; total: number; inProgress: number; percent: number };
  experimentProgress: { total: number; completed: number; reflectedAttempts: number; percent: number; averageInterest: number; averageEnergy: number; interestTrend: 'rising' | 'stable' | 'falling' | 'insufficient-data' };
  currentInterestLeader?: { majorId: string; name: string; icon: string; adaptiveScore: number; evidenceScore: number; maturity: number };
  suggestions: string[];
  summary: string;
}

function allTasks(phases: Phase[]): Task[] {
  return phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks)));
}

export function buildWeeklyIntelligenceReview({
  phases,
  experiments,
  majors,
  decision,
  analyses,
}: {
  phases: Phase[];
  experiments: Experiment[];
  majors: Major[];
  decision?: MajorDecisionResponse;
  analyses: MajorDecisionAnalysis[];
}): WeeklyIntelligenceReview {
  const tasks = allTasks(phases);
  const completedTasks = tasks.filter((task) => task.status === 'Completed').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'In Progress').length;
  const taskPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const reflectedExperiments = experiments.filter((experiment) =>
    (experiment.attempts ?? []).some((attempt) => Boolean(attempt.reflection)) || Boolean(experiment.reflection)
  ).length;
  const reflections = analyzeReflections(experiments);
  const experimentPercent = experiments.length ? Math.round((reflectedExperiments / experiments.length) * 100) : 0;

  // Comparison Studio is the single source of truth for the current leader and
  // its adaptive/evidence/maturity values. Weekly Review must never maintain a
  // second ranking implementation, otherwise the two intelligence surfaces can drift.
  const comparison = decision
    ? buildMajorComparisonModel({ majors, phases, experiments, decision, analyses })
    : undefined;
  const leaderEntry = comparison?.leaderId
    ? comparison.entries.find((entry) => entry.majorId === comparison.leaderId)
    : undefined;

  const currentInterestLeader = leaderEntry
    ? {
        majorId: leaderEntry.majorId,
        name: leaderEntry.name,
        icon: leaderEntry.icon,
        adaptiveScore: leaderEntry.adaptiveScore,
        evidenceScore: leaderEntry.evidenceScore,
        maturity: leaderEntry.evidenceMaturity,
      }
    : undefined;

  const suggestions: string[] = [];
  const nextTask = tasks.find((task) => task.status === 'In Progress') ?? tasks.find((task) => task.status === 'Not Started');
  if (inProgressTasks > 0) suggestions.push(`Finish an in-progress task${nextTask ? `: ${nextTask.title}` : ''}.`);
  else if (nextTask) suggestions.push(`Complete your next roadmap task: ${nextTask.title}.`);
  if (experiments.length === 0) suggestions.push('Start a small experiment for one of your majors to create behavioral evidence.');
  else if (reflectedExperiments < experiments.length) suggestions.push(`Reflect on another experiment (${reflectedExperiments}/${experiments.length} experiments currently reflected).`);
  else if (reflections.reflectedAttempts < 3) suggestions.push('Repeat one experiment and reflect again so the signal has longitudinal evidence.');
  if (currentInterestLeader && currentInterestLeader.maturity < 0.6) suggestions.push(`Keep collecting evidence for ${currentInterestLeader.name}; its current evidence maturity is only ${Math.round(currentInterestLeader.maturity * 100)}%.`);
  if (!suggestions.length) suggestions.push('Keep the current rhythm: complete roadmap work and collect honest reflections before changing direction.');

  const leaderText = currentInterestLeader
    ? `${currentInterestLeader.name} currently leads the deterministic evidence signal at ${currentInterestLeader.adaptiveScore}/100.`
    : 'There is not enough decision evidence yet to identify a current major leader.';
  const summary = `${completedTasks}/${tasks.length} roadmap tasks completed (${taskPercent}%). ${reflectedExperiments}/${experiments.length} experiments reflected (${experimentPercent}%). ${leaderText}`;

  return {
    taskProgress: { completed: completedTasks, total: tasks.length, inProgress: inProgressTasks, percent: taskPercent },
    experimentProgress: {
      total: experiments.length,
      completed: reflectedExperiments,
      reflectedAttempts: reflections.reflectedAttempts,
      percent: experimentPercent,
      averageInterest: reflections.averageInterest,
      averageEnergy: reflections.averageEnergy,
      interestTrend: reflections.interestTrend,
    },
    currentInterestLeader,
    suggestions: Array.from(new Set(suggestions)).slice(0, 4),
    summary,
  };
}
