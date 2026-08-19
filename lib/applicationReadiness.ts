import type { Budget, DocumentItem, Phase, Skill } from '@/types';

export interface ReadinessMetric {
  id: 'roadmap' | 'documents' | 'skills' | 'budget';
  label: string;
  score: number;
  detail: string;
  status: 'ready' | 'in-progress' | 'blocked';
}

export interface ApplicationReadinessModel {
  metrics: ReadinessMetric[];
  overall: number;
  status: 'not-ready' | 'building' | 'nearly-ready' | 'ready';
  strengths: string[];
  blockers: string[];
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const round = (value: number) => Math.round(value * 10) / 10;

function roadmapScore(phases: Phase[]) {
  const tasks = phases.flatMap((phase) =>
    phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks))
  );
  if (!tasks.length) return 0;
  return round((tasks.filter((task) => task.status === 'Completed').length / tasks.length) * 100);
}

function documentScore(documents: DocumentItem[]) {
  if (!documents.length) return 0;
  return round((documents.filter((document) => document.status === 'Verified').length / documents.length) * 100);
}

function skillScore(skills: Skill[]) {
  if (!skills.length) return 0;
  return round((skills.filter((skill) => skill.status === 'completed').length / skills.length) * 100);
}

function budgetScore(budget: Budget) {
  if (budget.targetAmount <= 0) return 0;
  return round(clamp((budget.currentSavings / budget.targetAmount) * 100));
}

export function buildApplicationReadiness(
  phases: Phase[],
  documents: DocumentItem[],
  skills: Skill[],
  budget: Budget
): ApplicationReadinessModel {
  const roadmap = roadmapScore(phases);
  const documentsReady = documentScore(documents);
  const skillsReady = skillScore(skills);
  const budgetReady = budgetScore(budget);

  const metrics: ReadinessMetric[] = [
    {
      id: 'roadmap',
      label: 'Roadmap progress',
      score: roadmap,
      detail: 'Completed roadmap tasks divided by all roadmap tasks.',
      status: roadmap >= 80 ? 'ready' : roadmap > 0 ? 'in-progress' : 'blocked',
    },
    {
      id: 'documents',
      label: 'Document readiness',
      score: documentsReady,
      detail: 'Verified documents divided by all tracked documents.',
      status: documentsReady >= 100 ? 'ready' : documentsReady > 0 ? 'in-progress' : 'blocked',
    },
    {
      id: 'skills',
      label: 'Skill completion',
      score: skillsReady,
      detail: 'Completed skills divided by all tracked skills.',
      status: skillsReady >= 80 ? 'ready' : skillsReady > 0 ? 'in-progress' : 'blocked',
    },
    {
      id: 'budget',
      label: 'Budget readiness',
      score: budgetReady,
      detail: 'Current savings divided by the configured target amount.',
      status: budgetReady >= 100 ? 'ready' : budgetReady > 0 ? 'in-progress' : 'blocked',
    },
  ];

  const overall = round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length);
  const status = overall >= 90 ? 'ready' : overall >= 70 ? 'nearly-ready' : overall > 0 ? 'building' : 'not-ready';
  const strengths = metrics.filter((metric) => metric.score >= 75).map((metric) => `${metric.label} is at ${metric.score}%.`);
  const blockers = metrics.filter((metric) => metric.score < 75).map((metric) => `${metric.label} needs more progress (${metric.score}%).`);

  return { metrics, overall, status, strengths, blockers };
}
