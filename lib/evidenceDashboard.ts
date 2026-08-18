import type { Experiment, Major, MajorDecisionAnalysis, MajorDecisionResponse, Phase, Task } from '@/types';
import { analyzeReflections } from './reflectionIntelligence';
import { buildAdaptiveDashboardPlan } from './adaptiveDashboard';
import type { AdaptiveEvidence } from './adaptiveDashboard';

export type EvidenceTimelineDirection = 'strengthened' | 'softened' | 'neutral';
export type EvidenceTimelineKind = 'decision' | 'task' | 'experiment' | 'reflection';

export interface EvidenceTimelineEvent {
  id: string;
  majorId: string;
  kind: EvidenceTimelineKind;
  date: string;
  title: string;
  detail: string;
  direction: EvidenceTimelineDirection;
}

export interface EvidenceDashboardMajor {
  majorId: string;
  name: string;
  icon: string;
  adaptive: AdaptiveEvidence;
  evidenceLevel: MajorDecisionAnalysis['evidenceLevel'];
  strengths: string[];
  uncertainties: string[];
  nextEvidenceNeeded: string[];
  taskProgress: { completed: number; total: number };
  experimentProgress: { completed: number; total: number; attempts: number; reflectedAttempts: number };
  reflection: {
    interest: number;
    energy: number;
    difficulty: number;
    wouldDoAgain: number;
    repeatRate: number;
    trend: 'rising' | 'stable' | 'falling' | 'insufficient-data';
  };
  timeline: EvidenceTimelineEvent[];
}

export interface EvidenceDashboardModel {
  majors: EvidenceDashboardMajor[];
  leaderId?: string;
  generatedAt: string;
}

function allTasks(phases: Phase[]): Task[] {
  return phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks)));
}

function taskMajorIds(task: Task): string[] {
  return task.explorationMajorIds?.length
    ? task.explorationMajorIds
    : task.majorReward?.majorId
      ? [task.majorReward.majorId]
      : [];
}

function eventDirection(text: string): EvidenceTimelineDirection {
  const lower = text.toLowerCase();
  if (lower.includes('down') || lower.includes('low') || lower.includes('not') || lower.includes('difficulty') && lower.includes('high')) return 'softened';
  if (lower.includes('up') || lower.includes('strong') || lower.includes('repeat') || lower.includes('energy')) return 'strengthened';
  return 'neutral';
}

function buildTimeline(
  majorId: string,
  majorName: string,
  decisions: MajorDecisionResponse[],
  tasks: Task[],
  experiments: Experiment[],
): EvidenceTimelineEvent[] {
  const events: EvidenceTimelineEvent[] = [];

  decisions.forEach((decision, index) => {
    const text = Object.values(decision).filter((value): value is string => typeof value === 'string').join(' ').toLowerCase();
    const mentionsMajor = majorId === 'm1'
      ? /physics|fisika|mechanics|quantum|space|astronomy/.test(text)
      : majorId === 'm2'
        ? /brain|cognitive|neuroscience|psychology|memory|neuron/.test(text)
        : /biology|biologi|life science|genetics|cell|dna|rna|molecular/.test(text);
    if (mentionsMajor) {
      events.push({
        id: `decision-${majorId}-${decision.timestamp}`,
        majorId,
        kind: 'decision',
        date: decision.timestamp,
        title: `Decision #${index + 1} reinforced ${majorName}`,
        detail: 'Your questionnaire contained a direct signal for this field. This is an initial belief, not behavioral evidence.',
        direction: 'strengthened',
      });
    }
  });

  tasks.filter((task) => taskMajorIds(task).includes(majorId) && task.status === 'Completed').forEach((task) => {
    events.push({
      id: `task-${task.id}`,
      majorId,
      kind: 'task',
      date: task.dueDate ?? task.createdAt,
      title: `Completed: ${task.title}`,
      detail: 'A completed major-specific roadmap task adds observed exploration evidence.',
      direction: 'strengthened',
    });
  });

  experiments.filter((experiment) => experiment.majorId === majorId).forEach((experiment) => {
    (experiment.attempts ?? []).forEach((attempt, index) => {
      const date = attempt.reflection?.createdAt ?? attempt.completedAt ?? attempt.startedAt ?? experiment.createdAt;
      events.push({
        id: `experiment-${experiment.id}-${attempt.id}`,
        majorId,
        kind: attempt.reflection ? 'reflection' : 'experiment',
        date,
        title: attempt.reflection ? `Reflection: ${experiment.title}` : `Started: ${experiment.title}`,
        detail: attempt.reflection
          ? `Interest ${attempt.reflection.interest}/5 · Energy ${attempt.reflection.energy}/5 · Difficulty ${attempt.reflection.difficulty}/5 · ${attempt.reflection.wouldDoAgain ? 'Would repeat' : 'Would not repeat'}.`
          : `Attempt #${index + 1} started and is waiting for reflection.`,
        direction: attempt.reflection
          ? attempt.reflection.wouldDoAgain && attempt.reflection.interest >= 4 ? 'strengthened' : attempt.reflection.interest <= 2 || !attempt.reflection.wouldDoAgain ? 'softened' : 'neutral'
          : 'neutral',
      });
    });
  });

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function nextEvidenceNeeded(analysis: MajorDecisionAnalysis, timeline: EvidenceTimelineEvent[]): string[] {
  const next: string[] = [];
  if (analysis.completedExplorationTasks < analysis.totalExplorationTasks) next.push(`Complete another major-specific exploration task (${analysis.completedExplorationTasks}/${analysis.totalExplorationTasks} completed).`);
  if (analysis.completedExperiments < analysis.totalExperiments) next.push(`Reflect on more experiments (${analysis.completedExperiments}/${analysis.totalExperiments} experiments reflected).`);
  if ((analysis.reflectedAttempts ?? 0) < 2) next.push('Collect at least one more reflection so the signal is not based on a single experience.');
  if (analysis.reflectionInterestTrend === 'falling') next.push('Run a contrasting experiment to understand the falling interest signal.');
  if ((analysis.wouldDoAgainRate ?? 100) <= 33 && (analysis.reflectedAttempts ?? 0) > 0) next.push('Test whether the low willingness to repeat persists in a different experiment.');
  if (analysis.evidenceLevel === 'low') next.push('Build hands-on evidence before treating the current decision score as reliable.');
  if (!timeline.length) next.push('Create the first observable evidence event for this major.');
  return Array.from(new Set(next)).slice(0, 4);
}

export function buildEvidenceDashboardModel({
  majors,
  phases,
  experiments,
  decisions,
  analyses,
}: {
  majors: Major[];
  phases: Phase[];
  experiments: Experiment[];
  decisions: MajorDecisionResponse[];
  analyses: MajorDecisionAnalysis[];
}): EvidenceDashboardModel {
  const tasks = allTasks(phases);
  const plan = buildAdaptiveDashboardPlan({ analyses, majors, phases, experiments });
  const modelMajors = analyses.map((analysis) => {
    const major = majors.find((item) => item.id === analysis.majorId);
    const majorExperiments = experiments.filter((experiment) => experiment.majorId === analysis.majorId);
    const reflection = analyzeReflections(majorExperiments);
    const timeline = buildTimeline(analysis.majorId, major?.name ?? analysis.majorId, decisions, tasks, majorExperiments);

    const strengths = [...analysis.strengths];
    if (analysis.averageReflectionInterest !== undefined && analysis.averageReflectionInterest >= 4) strengths.push(`Reflections average ${analysis.averageReflectionInterest}/5 interest.`);
    if (analysis.averageReflectionEnergy !== undefined && analysis.averageReflectionEnergy >= 3.5) strengths.push(`Reflections show ${analysis.averageReflectionEnergy}/5 average energy.`);
    if (analysis.reflectionInterestTrend === 'rising') strengths.push('Observed interest is trending upward over time.');
    if ((analysis.wouldDoAgainRate ?? 0) >= 67) strengths.push(`${analysis.wouldDoAgainRate}% of reflected attempts say you would do it again.`);

    const uncertainties = [...analysis.uncertainties];
    if (analysis.adaptiveScore !== undefined && analysis.decisionScore !== undefined && Math.abs(analysis.adaptiveScore - analysis.decisionScore) >= 8) {
      uncertainties.push(`Initial decision (${analysis.decisionScore}) and observed evidence are meaningfully different, so the direction is still evolving.`);
    }
    if ((analysis.reflectedAttempts ?? 0) > 0 && (analysis.reflectedAttempts ?? 0) < 3) uncertainties.push('Reflection history is still small; avoid over-interpreting one or two experiences.');

    return {
      majorId: analysis.majorId,
      name: major?.name ?? analysis.majorId,
      icon: major?.icon ?? '🎓',
      adaptive: {
        decisionScore: analysis.decisionScore ?? analysis.score,
        evidenceScore: analysis.evidenceScore ?? 0,
        adaptiveScore: analysis.adaptiveScore ?? analysis.score,
        evidenceMaturity: analysis.evidenceMaturity ?? 0,
        taskEvidence: 0,
        experimentEvidence: 0,
        reflectionEvidence: 0,
        confidenceEvidence: Math.min(100, (major?.confidenceScore ?? 0) * 10),
      },
      evidenceLevel: analysis.evidenceLevel,
      strengths: Array.from(new Set(strengths)),
      uncertainties: Array.from(new Set(uncertainties)),
      nextEvidenceNeeded: nextEvidenceNeeded(analysis, timeline),
      taskProgress: { completed: analysis.completedExplorationTasks, total: analysis.totalExplorationTasks },
      experimentProgress: {
        completed: analysis.completedExperiments,
        total: analysis.totalExperiments,
        attempts: analysis.totalExperimentAttempts ?? reflection.attempts,
        reflectedAttempts: analysis.reflectedAttempts ?? reflection.reflectedAttempts,
      },
      reflection: {
        interest: analysis.averageReflectionInterest ?? reflection.averageInterest,
        energy: analysis.averageReflectionEnergy ?? reflection.averageEnergy,
        difficulty: analysis.averageReflectionDifficulty ?? reflection.averageDifficulty,
        wouldDoAgain: analysis.wouldDoAgainRate ?? reflection.wouldDoAgainRate,
        repeatRate: analysis.reflectionRepeatRate ?? reflection.repeatRate,
        trend: analysis.reflectionInterestTrend ?? reflection.interestTrend,
      },
      timeline,
    };
  });

  return {
    majors: modelMajors.sort((a, b) => b.adaptive.adaptiveScore - a.adaptive.adaptiveScore),
    leaderId: plan.focusMajorId,
    generatedAt: new Date().toISOString(),
  };
}
