import type { Experiment, Major, MajorDecisionAnalysis, Phase, Task } from '@/types';

export type AdaptivePriority = 'high' | 'medium' | 'low';

export interface AdaptiveEvidence {
  decisionScore: number;
  evidenceScore: number;
  adaptiveScore: number;
  evidenceMaturity: number;
  taskEvidence: number;
  experimentEvidence: number;
  reflectionEvidence: number;
  confidenceEvidence: number;
}

export interface AdaptiveDashboardPlan {
  focusMajorId?: string;
  focusMajorName?: string;
  focusScore?: number;
  evidence?: AdaptiveEvidence;
  missionTask?: Task;
  priority: AdaptivePriority;
  title: string;
  reason: string;
  signals: string[];
}

function allTasks(phases: Phase[]): Task[] {
  return phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks)));
}

function taskIsRelevant(task: Task, majorId: string): boolean {
  return task.explorationMajorIds?.includes(majorId) === true || task.majorReward?.majorId === majorId;
}

function firstRelevantIncompleteTask(tasks: Task[], majorId: string): Task | undefined {
  return tasks.find((task) => task.status !== 'Completed' && taskIsRelevant(task, majorId));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Builds the shared evidence-aware score used by both Dashboard and comparison views. */
export function buildAdaptiveEvidence(analysis: MajorDecisionAnalysis, major?: Major): AdaptiveEvidence {
  const taskCoverage = analysis.totalExplorationTasks > 0 ? analysis.completedExplorationTasks / analysis.totalExplorationTasks : 0;
  const taskEvidence = clamp(taskCoverage * 100);

  const attempts = analysis.totalExperimentAttempts ?? 0;
  const reflectedAttempts = analysis.reflectedAttempts ?? 0;
  const completedExperiments = analysis.completedExperiments;
  const totalExperiments = analysis.totalExperiments;
  const experimentCoverage = totalExperiments > 0 ? completedExperiments / totalExperiments : 0;
  const reflectionCoverage = attempts > 0 ? reflectedAttempts / attempts : 0;
  const volume = clamp((attempts * 8) + (completedExperiments * 12));
  const experimentEvidence = clamp(volume * 0.35 + experimentCoverage * 35 + reflectionCoverage * 30);

  const hasReflection = reflectedAttempts > 0;
  const interest = (analysis.averageReflectionInterest ?? 0) / 5;
  const energy = (analysis.averageReflectionEnergy ?? 0) / 5;
  const willingness = (analysis.wouldDoAgainRate ?? 0) / 100;
  const repeat = (analysis.reflectionRepeatRate ?? 0) / 100;
  const trend = analysis.reflectionInterestTrend === 'rising' ? 1 : analysis.reflectionInterestTrend === 'falling' ? 0 : analysis.reflectionInterestTrend === 'stable' ? 0.5 : 0;
  const reflectionQuality = hasReflection ? interest * 0.35 + energy * 0.2 + willingness * 0.25 + repeat * 0.1 + trend * 0.1 : 0;
  const reflectionEvidence = clamp(reflectionQuality * 100);
  const confidenceEvidence = clamp((major?.confidenceScore ?? 0) * 10);

  const evidenceScore = round(taskEvidence * 0.2 + experimentEvidence * 0.2 + reflectionEvidence * 0.4 + confidenceEvidence * 0.2);
  const maturityUnits = analysis.completedExplorationTasks + completedExperiments + reflectedAttempts;
  const evidenceMaturity = round(clamp(maturityUnits / 6, 0, 1));
  const decisionWeight = 0.65 - (0.30 * evidenceMaturity);
  const evidenceWeight = 1 - decisionWeight;
  const decisionScore = analysis.score;
  const adaptiveScore = round(decisionScore * decisionWeight + evidenceScore * evidenceWeight);

  return { decisionScore, evidenceScore, adaptiveScore, evidenceMaturity, taskEvidence: round(taskEvidence), experimentEvidence: round(experimentEvidence), reflectionEvidence: round(reflectionEvidence), confidenceEvidence: round(confidenceEvidence) };
}

function rankAnalyses(analyses: MajorDecisionAnalysis[], majors: Major[]): Array<MajorDecisionAnalysis & { adaptive: AdaptiveEvidence }> {
  return analyses.map((analysis) => ({ ...analysis, adaptive: buildAdaptiveEvidence(analysis, majors.find((major) => major.id === analysis.majorId)) })).sort((a, b) => b.adaptive.adaptiveScore - a.adaptive.adaptiveScore);
}

export function buildAdaptiveDashboardPlan({ analyses, majors, phases, experiments }: { analyses: MajorDecisionAnalysis[]; majors: Major[]; phases: Phase[]; experiments: Experiment[] }): AdaptiveDashboardPlan {
  const tasks = allTasks(phases);
  const ranked = rankAnalyses(analyses, majors);
  const leader = ranked[0];

  if (!leader) {
    const fallback = [...majors].sort((a, b) => b.interestScore - a.interestScore)[0];
    return { focusMajorId: fallback?.id, focusMajorName: fallback?.name, focusScore: fallback ? fallback.interestScore * 10 : undefined, missionTask: tasks.find((task) => task.status !== 'Completed'), priority: 'medium', title: fallback ? `Explore ${fallback.name}` : 'Take the next roadmap step', reason: 'There is not enough decision or real-world evidence yet, so the dashboard keeps you moving without treating the current direction as final.', signals: fallback ? ['No decision analysis is available yet; current interest is being used only as a temporary fallback.'] : ['No major evidence is available yet.'] };
  }

  const major = majors.find((candidate) => candidate.id === leader.majorId);
  const evidence = leader.adaptive;
  const runnerUp = ranked[1];
  const relevantExperiments = experiments.filter((experiment) => experiment.majorId === leader.majorId);
  const reflectedExperiments = relevantExperiments.filter((experiment) => (experiment.attempts ?? []).some((attempt) => Boolean(attempt.reflection)) || Boolean(experiment.reflection));
  const relevantTask = firstRelevantIncompleteTask(tasks, leader.majorId);
  const activeExperiment = relevantExperiments.find((experiment) => experiment.status === 'in-progress' || experiment.status === 'planned');
  const margin = runnerUp ? round(evidence.adaptiveScore - runnerUp.adaptive.adaptiveScore) : evidence.adaptiveScore;
  const signals: string[] = [`Initial decision signal: ${evidence.decisionScore}/100.`, `Observed evidence signal: ${evidence.evidenceScore}/100.`];
  if (evidence.evidenceMaturity >= 0.5) signals.push(`Real-world evidence has ${Math.round(evidence.evidenceMaturity * 100)}% maturity and now carries more weight than the initial questionnaire.`);
  else if (evidence.evidenceMaturity > 0) signals.push(`Real-world evidence is still developing (${Math.round(evidence.evidenceMaturity * 100)}% maturity), so the initial decision remains an important prior.`);
  else signals.push('No meaningful real-world evidence exists yet, so the initial decision remains the main signal.');
  if (evidence.taskEvidence > 0) signals.push(`Exploration completion contributes ${evidence.taskEvidence}/100 to observed evidence.`);
  if (evidence.experimentEvidence > 0) signals.push(`Experiment engagement contributes ${evidence.experimentEvidence}/100 to observed evidence.`);
  if (evidence.reflectionEvidence > 0) signals.push(`Reflection quality contributes ${evidence.reflectionEvidence}/100 to observed evidence.`);
  if (evidence.confidenceEvidence > 0) signals.push(`Current confidence contributes ${evidence.confidenceEvidence}/100 to observed evidence.`);
  if (margin > 0 && runnerUp) signals.push(`Adaptive evidence currently puts ${major?.name ?? 'this major'} ahead by ${margin} points.`);

  let priority: AdaptivePriority = evidence.adaptiveScore >= 70 ? 'high' : evidence.adaptiveScore >= 50 ? 'medium' : 'low';
  let title = major ? `Keep exploring ${major.name}` : 'Continue the strongest evidence-backed exploration';
  let reason = `The dashboard is combining your initial decision (${evidence.decisionScore}/100) with observed evidence (${evidence.evidenceScore}/100), rather than following the questionnaire alone.`;
  let missionTask = relevantTask;

  if (leader.reflectionInterestTrend === 'falling' || ((leader.wouldDoAgainRate ?? 100) <= 33 && (leader.reflectedAttempts ?? 0) > 0)) {
    title = major ? `Run a contrasting experiment in ${major.name}` : 'Run a contrasting experiment';
    reason = 'Recent reflections contain a caution signal. A contrasting experiment is more useful now than simply repeating the same path.';
    missionTask = undefined;
    priority = 'high';
  } else if (relevantTask) {
    title = `Complete the next ${major?.name ?? 'exploration'} task`;
    reason = `This action matches the strongest evidence-backed direction. Decision signal: ${evidence.decisionScore}/100 · observed evidence: ${evidence.evidenceScore}/100.`;
  } else if (activeExperiment) {
    title = `Finish and reflect on a ${major?.name ?? 'major'} experiment`;
    reason = 'You have an active experiment in the strongest evidence-backed direction; completing and reflecting on it will produce more useful evidence than starting unrelated work.';
    missionTask = undefined;
  } else if (reflectedExperiments.length > 0) {
    title = major ? `Re-test your ${major.name} signal` : 'Run another evidence-building experiment';
    reason = 'You already have reflection history here, so another small experiment can test whether the current signal holds over time.';
    missionTask = undefined;
  }

  return { focusMajorId: leader.majorId, focusMajorName: major?.name, focusScore: evidence.adaptiveScore, evidence, missionTask, priority, title, reason, signals };
}
