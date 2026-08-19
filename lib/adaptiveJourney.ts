import type { Experiment, Major, MajorDecisionAnalysis, MajorDecisionResponse, Phase, Task } from '@/types';
import { buildMajorComparisonModel, type MajorComparisonEntry } from './majorComparison';

export interface AdaptiveTaskRecommendation {
  task: Task;
  score: number;
  reasons: string[];
  focusMajorId?: string;
}

export interface AdaptiveJourneyModel {
  focusMajor?: MajorComparisonEntry;
  focusReason: string;
  mode: 'stabilize' | 'explore' | 'deepen' | 'prepare';
  modeLabel: string;
  modeDescription: string;
  recommendations: AdaptiveTaskRecommendation[];
  suppressedTasks: number;
}

function allTasks(phases: Phase[]): Task[] {
  return phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks)));
}

function taskMatchesMajor(task: Task, majorId: string): boolean {
  return task.explorationMajorIds?.includes(majorId) || task.majorReward?.majorId === majorId;
}

function chooseMode(focus?: MajorComparisonEntry): AdaptiveJourneyModel['mode'] {
  if (!focus) return 'stabilize';
  if (focus.evidenceMaturity < 0.34) return 'explore';
  if (focus.evidenceMaturity < 0.67) return 'deepen';
  return 'prepare';
}

function modeCopy(mode: AdaptiveJourneyModel['mode'], focus?: MajorComparisonEntry) {
  const name = focus?.name ?? 'your current path';
  if (mode === 'explore') return { label: 'Explore before committing', description: `${name} is currently leading, but the evidence base is still early. Prioritize small, reversible exploration tasks rather than locking in a final choice.` };
  if (mode === 'deepen') return { label: 'Deepen the strongest signal', description: `${name} has enough evidence to justify deeper work. Prioritize tasks that create stronger skill and experience evidence while keeping alternatives visible.` };
  if (mode === 'prepare') return { label: 'Turn evidence into readiness', description: `${name} has mature evidence. Shift some attention toward skills, documents, budget, and application preparation without abandoning evidence collection.` };
  return { label: 'Stabilize the journey', description: 'Keep the roadmap moving while you build enough decision evidence for the journey to adapt safely.' };
}

export function buildAdaptiveJourneyModel({
  phases,
  majors,
  experiments,
  decision,
  analyses,
}: {
  phases: Phase[];
  majors: Major[];
  experiments: Experiment[];
  decision?: MajorDecisionResponse;
  analyses: MajorDecisionAnalysis[];
}): AdaptiveJourneyModel {
  const tasks = allTasks(phases);
  const comparison = decision ? buildMajorComparisonModel({ majors, phases, experiments, decision, analyses }) : undefined;
  const focusMajor = comparison?.leaderId ? comparison.entries.find((entry) => entry.majorId === comparison.leaderId) : undefined;
  const mode = chooseMode(focusMajor);
  const copy = modeCopy(mode, focusMajor);

  const recommendations = tasks
    .filter((task) => task.status !== 'Completed')
    .map((task) => {
      const reasons: string[] = [];
      let score = 0;
      const matchesFocus = Boolean(focusMajor && taskMatchesMajor(task, focusMajor.majorId));
      if (task.status === 'In Progress') { score += 100; reasons.push('Already in progress, so finishing it preserves momentum.'); }
      if (matchesFocus) { score += mode === 'prepare' ? 22 : 40; reasons.push(`Supports the current ${focusMajor?.name} evidence direction.`); }
      if (task.explorationMajorIds?.length) score += 10;
      if (task.category.toLowerCase().includes('application') || task.category.toLowerCase().includes('document')) {
        if (mode === 'prepare') { score += 28; reasons.push('Application preparation becomes more valuable as evidence matures.'); }
        else score -= 8;
      }
      if (task.dueDate) {
        const days = (new Date(task.dueDate).getTime() - Date.now()) / 86400000;
        if (days >= 0 && days <= 14) { score += 30; reasons.push('Due within the next two weeks.'); }
      }
      if (!reasons.length) reasons.push('Keeps the baseline roadmap moving.');
      return { task, score, reasons: reasons.slice(0, 3), focusMajorId: matchesFocus ? focusMajor?.majorId : undefined } satisfies AdaptiveTaskRecommendation;
    })
    .sort((a, b) => b.score - a.score || a.task.title.localeCompare(b.task.title))
    .slice(0, 6);

  const focusReason = focusMajor
    ? `${focusMajor.name} is currently the adaptive leader at ${focusMajor.adaptiveScore}/100, so the journey prioritizes actions that strengthen or validate that signal instead of permanently rewriting your roadmap.`
    : 'No Major Decision result is available yet, so Adaptive Journey stays conservative and only prioritizes momentum and near-term work.';

  return {
    focusMajor,
    focusReason,
    mode,
    modeLabel: copy.label,
    modeDescription: copy.description,
    recommendations,
    suppressedTasks: Math.max(0, tasks.filter((task) => task.status !== 'Completed').length - recommendations.length),
  };
}
