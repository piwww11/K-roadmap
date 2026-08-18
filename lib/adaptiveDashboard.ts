import type { Experiment, Major, MajorDecisionAnalysis, Phase, Task } from '@/types';

export type AdaptivePriority = 'high' | 'medium' | 'low';

export interface AdaptiveDashboardPlan {
  focusMajorId?: string;
  focusMajorName?: string;
  focusScore?: number;
  missionTask?: Task;
  priority: AdaptivePriority;
  title: string;
  reason: string;
  signals: string[];
}

function allTasks(phases: Phase[]): Task[] {
  return phases.flatMap((phase) =>
    phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks))
  );
}

function taskIsRelevant(task: Task, majorId: string): boolean {
  return task.explorationMajorIds?.includes(majorId) === true || task.majorReward?.majorId === majorId;
}

function firstRelevantIncompleteTask(tasks: Task[], majorId: string): Task | undefined {
  return tasks.find((task) => task.status !== 'Completed' && taskIsRelevant(task, majorId));
}

export function buildAdaptiveDashboardPlan({
  analyses,
  majors,
  phases,
  experiments,
}: {
  analyses: MajorDecisionAnalysis[];
  majors: Major[];
  phases: Phase[];
  experiments: Experiment[];
}): AdaptiveDashboardPlan {
  const tasks = allTasks(phases);
  const leader = analyses[0];

  if (!leader) {
    const fallback = [...majors].sort((a, b) => b.interestScore - a.interestScore)[0];
    return {
      focusMajorId: fallback?.id,
      focusMajorName: fallback?.name,
      focusScore: fallback ? fallback.interestScore * 10 : undefined,
      missionTask: tasks.find((task) => task.status !== 'Completed'),
      priority: 'medium',
      title: fallback ? `Explore ${fallback.name}` : 'Take the next roadmap step',
      reason: 'There is not enough decision evidence yet, so the dashboard keeps you moving without treating the current direction as final.',
      signals: fallback ? ['Highest current interest is being used as the fallback signal.'] : ['No major decision evidence is available yet.'],
    };
  }

  const major = majors.find((candidate) => candidate.id === leader.majorId);
  const relevantExperiments = experiments.filter((experiment) => experiment.majorId === leader.majorId);
  const reflectedExperiments = relevantExperiments.filter((experiment) =>
    (experiment.attempts ?? []).some((attempt) => Boolean(attempt.reflection)) || Boolean(experiment.reflection)
  );
  const relevantTask = firstRelevantIncompleteTask(tasks, leader.majorId);
  const activeExperiment = relevantExperiments.find((experiment) => experiment.status === 'in-progress' || experiment.status === 'planned');

  const signals: string[] = [];
  let priority: AdaptivePriority = leader.score >= 70 ? 'high' : 'medium';

  if (leader.score >= 70) signals.push(`Decision evidence is strong at ${leader.score}/100.`);
  else if (leader.score >= 50) signals.push(`Decision evidence is developing at ${leader.score}/100.`);
  else signals.push(`Decision evidence is still early at ${leader.score}/100.`);

  if (leader.reflectionInterestTrend === 'rising') signals.push('Recent reflected interest is trending upward.');
  if (leader.reflectionInterestTrend === 'falling') signals.push('Recent reflected interest is trending downward.');
  if ((leader.wouldDoAgainRate ?? 0) >= 67) signals.push(`${leader.wouldDoAgainRate}% of reflected attempts say you would do this again.`);
  if ((leader.wouldDoAgainRate ?? 100) <= 33 && (leader.reflectedAttempts ?? 0) > 0) signals.push('Willingness to repeat is low, so the next action should reduce uncertainty rather than push commitment.');
  if (leader.averageReflectionEnergy !== undefined && leader.averageReflectionEnergy <= 2 && (leader.reflectedAttempts ?? 0) > 0) signals.push('Recent energy is low, so the dashboard avoids escalating commitment automatically.');

  let title = major ? `Keep exploring ${major.name}` : 'Continue the highest-priority exploration';
  let reason = 'Use the next small action to turn your latest decision evidence into another real-world data point.';
  let missionTask = relevantTask;

  if (leader.reflectionInterestTrend === 'falling' || ((leader.wouldDoAgainRate ?? 100) <= 33 && (leader.reflectedAttempts ?? 0) > 0)) {
    title = major ? `Run a contrasting experiment in ${major.name}` : 'Run a contrasting experiment';
    reason = 'Your recent reflections contain a caution signal. A contrasting experiment is more useful now than simply doing more of the same.';
    missionTask = undefined;
    priority = 'high';
  } else if (relevantTask) {
    title = `Complete the next ${major?.name ?? 'exploration'} task`;
    reason = 'This task is directly connected to the current leading major and can strengthen the evidence behind your decision.';
  } else if (activeExperiment) {
    title = `Finish and reflect on a ${major?.name ?? 'major'} experiment`;
    reason = 'You have an active experiment in the leading major; completing and reflecting on it will produce more useful evidence than starting unrelated work.';
    missionTask = undefined;
  } else if (reflectedExperiments.length > 0) {
    title = major ? `Re-test your ${major.name} signal` : 'Run another evidence-building experiment';
    reason = 'You already have reflection history here, so another small experiment can test whether the current signal holds over time.';
    missionTask = undefined;
  }

  return {
    focusMajorId: leader.majorId,
    focusMajorName: major?.name,
    focusScore: leader.score,
    missionTask,
    priority,
    title,
    reason,
    signals,
  };
}
