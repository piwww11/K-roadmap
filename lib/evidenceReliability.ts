import type { MajorDecisionAnalysis } from '@/types';

export type EvidenceReliabilityBand = 'low' | 'moderate' | 'high' | 'very-high';

export interface EvidenceReliabilityDimension {
  key: 'breadth' | 'depth' | 'consistency' | 'recency' | 'behavioral';
  label: string;
  score: number;
  explanation: string;
}

export interface EvidenceReliability {
  score: number;
  band: EvidenceReliabilityBand;
  dimensions: EvidenceReliabilityDimension[];
  strengths: string[];
  limitations: string[];
  nextSteps: string[];
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function bandFor(score: number): EvidenceReliabilityBand {
  if (score >= 80) return 'very-high';
  if (score >= 60) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

export function assessEvidenceReliability(analysis: MajorDecisionAnalysis): EvidenceReliability {
  const taskRatio = analysis.totalExplorationTasks > 0
    ? analysis.completedExplorationTasks / analysis.totalExplorationTasks
    : 0;
  const experimentRatio = analysis.totalExperiments > 0
    ? analysis.completedExperiments / analysis.totalExperiments
    : 0;
  const attemptRatio = (analysis.totalExperimentAttempts ?? 0) > 0
    ? (analysis.reflectedAttempts ?? 0) / (analysis.totalExperimentAttempts ?? 1)
    : 0;

  const evidenceCount = analysis.completedExplorationTasks + analysis.completedExperiments;
  const breadth = clamp(Math.min(100, evidenceCount * 20 + Math.min(20, (analysis.totalExplorationTasks + analysis.totalExperiments) * 4)));
  const depth = clamp(
    (analysis.averageReflectionInterest !== undefined ? analysis.averageReflectionInterest * 10 : 0) * 0.35 +
    (analysis.averageReflectionEnergy !== undefined ? analysis.averageReflectionEnergy * 10 : 0) * 0.2 +
    (analysis.averageReflectionDifficulty !== undefined ? analysis.averageReflectionDifficulty * 10 : 0) * 0.1 +
    Math.min(35, (analysis.reflectedAttempts ?? 0) * 12)
  );

  const trend = analysis.reflectionInterestTrend ?? 'insufficient-data';
  const consistencyBase = trend === 'rising' ? 85 : trend === 'stable' ? 75 : trend === 'falling' ? 40 : 20;
  const repeatSignal = analysis.wouldDoAgainRate ?? 0;
  const consistency = clamp(consistencyBase * 0.55 + repeatSignal * 0.45);

  const maturity = evidenceCount === 0
    ? 0
    : analysis.reflectedAttempts && analysis.reflectedAttempts > 0
      ? clamp(55 + Math.min(45, analysis.reflectedAttempts * 10))
      : clamp(45 + Math.min(35, analysis.completedExplorationTasks * 8));

  const behavioral = clamp(
    taskRatio * 35 +
    experimentRatio * 30 +
    attemptRatio * 20 +
    (repeatSignal / 100) * 15
  );

  const dimensions: EvidenceReliabilityDimension[] = [
    {
      key: 'breadth',
      label: 'Evidence breadth',
      score: breadth,
      explanation: `${evidenceCount} completed evidence-producing ${evidenceCount === 1 ? 'activity' : 'activities'}.`,
    },
    {
      key: 'depth',
      label: 'Evidence depth',
      score: depth,
      explanation: `${analysis.reflectedAttempts ?? 0} reflected attempt${(analysis.reflectedAttempts ?? 0) === 1 ? '' : 's'} with measurable interest, energy and difficulty signals.`,
    },
    {
      key: 'consistency',
      label: 'Consistency',
      score: consistency,
      explanation: trend === 'insufficient-data'
        ? 'Not enough repeated reflections to establish a reliable trend yet.'
        : `Interest trend is ${trend}, with ${repeatSignal}% willingness to do similar work again.`,
    },
    {
      key: 'recency',
      label: 'Evidence maturity',
      score: maturity,
      explanation: 'Maturity increases as evidence is repeatedly generated and reflected on rather than inferred from a single signal.',
    },
    {
      key: 'behavioral',
      label: 'Behavioral evidence',
      score: behavioral,
      explanation: 'Weights completed exploration, experiments, reflection coverage and willingness to repeat.',
    },
  ];

  const score = clamp(
    breadth * 0.2 +
    depth * 0.25 +
    consistency * 0.2 +
    maturity * 0.1 +
    behavioral * 0.25
  );

  const strengths: string[] = [];
  const limitations: string[] = [];
  const nextSteps: string[] = [];

  if (breadth >= 60) strengths.push('Evidence comes from more than one activity rather than a single impression.');
  if (depth >= 60) strengths.push('Hands-on evidence includes reflection signals that can be compared across attempts.');
  if (consistency >= 70) strengths.push('Repeated behavior is reasonably aligned with the current interest signal.');
  if (behavioral >= 60) strengths.push('The conclusion is supported by what you actually did, not only what you reported.');

  if (breadth < 50) limitations.push('The evidence base is still narrow; more varied exploration would improve reliability.');
  if (depth < 50) limitations.push('There are not enough reflected experiments to understand the experience deeply.');
  if (consistency < 50) limitations.push('Repeated evidence does not yet show a stable pattern.');
  if (behavioral < 50) limitations.push('There is limited behavioral evidence behind the current conclusion.');
  if (analysis.evidenceLevel === 'strong' && score < 60) limitations.push('The evidence quantity looks strong, but evidence quality is not yet equally strong.');

  if (breadth < 70) nextSteps.push('Add one different type of exploration activity for this major.');
  if (depth < 70) nextSteps.push('Complete and reflect on another hands-on experiment.');
  if (consistency < 70) nextSteps.push('Repeat a similar experiment later and compare the reflection instead of relying on one attempt.');
  if (nextSteps.length === 0) nextSteps.push('Keep collecting real experiences before treating the current conclusion as final.');

  return { score, band: bandFor(score), dimensions, strengths, limitations, nextSteps };
}
