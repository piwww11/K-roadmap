import type { Major, MajorDecisionAnalysis, MajorDecisionResponse, Experiment, Phase } from '@/types';
import { buildEvidenceDashboardModel, type EvidenceDashboardMajor } from './evidenceDashboard';

export interface MajorComparisonEntry {
  majorId: string;
  name: string;
  university: string;
  icon: string;
  interest: number;
  confidence: number;
  decisionScore: number;
  evidenceScore: number;
  adaptiveScore: number;
  evidenceLevel: EvidenceDashboardMajor['evidenceLevel'];
  evidenceMaturity: number;
  exploration: { completed: number; total: number; progress: number };
  experiments: { completed: number; total: number; attempts: number; reflectedAttempts: number };
  reflection: EvidenceDashboardMajor['reflection'];
  strengths: string[];
  uncertainties: string[];
  nextEvidenceNeeded: string[];
  adaptiveGap: number;
  rank: number;
}

export interface MajorComparisonModel {
  entries: MajorComparisonEntry[];
  leaderId?: string;
  runnerUpId?: string;
  leaderGap: number;
  headline: string;
  explanation: string;
  generatedAt: string;
}

function progress(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function buildDimensionExplanation(entry: MajorComparisonEntry, leader: MajorComparisonEntry): string[] {
  const reasons: string[] = [];
  if (entry.adaptiveScore === leader.adaptiveScore) reasons.push('Adaptive evidence is currently tied.');
  if (entry.interest > leader.interest) reasons.push(`Interest is higher (${entry.interest}/10 vs ${leader.interest}/10).`);
  if (entry.confidence > leader.confidence) reasons.push(`Confidence is higher (${entry.confidence}/10 vs ${leader.confidence}/10).`);
  if (entry.evidenceScore > leader.evidenceScore) reasons.push(`Observed evidence is stronger (${entry.evidenceScore}/100 vs ${leader.evidenceScore}/100).`);
  if (entry.evidenceMaturity > leader.evidenceMaturity) reasons.push(`Evidence maturity is higher (${Math.round(entry.evidenceMaturity * 100)}% vs ${Math.round(leader.evidenceMaturity * 100)}%).`);
  if (entry.exploration.progress > leader.exploration.progress) reasons.push(`Exploration coverage is higher (${entry.exploration.progress}% vs ${leader.exploration.progress}%).`);
  if (entry.reflection.interest > leader.reflection.interest) reasons.push(`Reflected interest is higher (${entry.reflection.interest}/5 vs ${leader.reflection.interest}/5).`);
  if (!reasons.length) reasons.push('The current ranking is driven by the combined adaptive score; inspect the evidence details below to see the trade-offs.');
  return reasons.slice(0, 3);
}

function buildComparisonExplanation(leader?: MajorComparisonEntry, runnerUp?: MajorComparisonEntry): string {
  if (!leader) return 'Complete a Major Decision questionnaire to generate a comparison.';
  if (!runnerUp) return `${leader.name} is the only major with an available analysis. Add or compare more majors as the roadmap grows.`;
  const gap = leader.adaptiveScore - runnerUp.adaptiveScore;
  if (gap <= 2) return `${leader.name} is only ${gap} point${gap === 1 ? '' : 's'} ahead of ${runnerUp.name}. Treat the ranking as close and use the next evidence actions to test the difference.`;
  if (leader.evidenceMaturity < 0.34) return `${leader.name} leads by ${gap} points, but evidence maturity is still early. The questionnaire remains an important prior, so the ranking should not be treated as a final verdict.`;
  if (leader.evidenceScore > leader.decisionScore + 8) return `${leader.name} leads by ${gap} points and its observed evidence is now stronger than its initial decision signal. Real exploration is materially influencing the comparison.`;
  return `${leader.name} leads by ${gap} points on the adaptive score. The comparison combines initial decision signals with observed tasks, experiments, reflections, confidence, and evidence maturity.`;
}

export function buildMajorComparisonModel({
  majors,
  phases,
  experiments,
  decision,
  analyses,
}: {
  majors: Major[];
  phases: Phase[];
  experiments: Experiment[];
  decision: MajorDecisionResponse;
  analyses: MajorDecisionAnalysis[];
}): MajorComparisonModel {
  const evidence = buildEvidenceDashboardModel({ majors, phases, experiments, decisions: [decision], analyses });
  const sorted = [...evidence.majors].sort((a, b) => b.adaptive.adaptiveScore - a.adaptive.adaptiveScore);
  const leader = sorted[0];
  const runnerUp = sorted[1];

  const entries = sorted.map((item, index) => {
    const major = majors.find((candidate) => candidate.id === item.majorId);
    const explorationProgress = progress(item.taskProgress.completed, item.taskProgress.total);
    return {
      majorId: item.majorId,
      name: item.name,
      university: major?.university ?? '',
      icon: item.icon,
      interest: major?.interestScore ?? 0,
      confidence: major?.confidenceScore ?? 0,
      decisionScore: item.adaptive.decisionScore,
      evidenceScore: item.adaptive.evidenceScore,
      adaptiveScore: item.adaptive.adaptiveScore,
      evidenceLevel: item.evidenceLevel,
      evidenceMaturity: item.adaptive.evidenceMaturity,
      exploration: { ...item.taskProgress, progress: explorationProgress },
      experiments: item.experimentProgress,
      reflection: item.reflection,
      strengths: item.strengths,
      uncertainties: item.uncertainties,
      nextEvidenceNeeded: item.nextEvidenceNeeded,
      adaptiveGap: leader ? Math.round((leader.adaptive.adaptiveScore - item.adaptive.adaptiveScore) * 10) / 10 : 0,
      rank: index + 1,
    } satisfies MajorComparisonEntry;
  });

  const leaderEntry = entries.find((entry) => entry.majorId === leader?.majorId);
  const runnerUpEntry = entries.find((entry) => entry.majorId === runnerUp?.majorId);

  return {
    entries,
    leaderId: leaderEntry?.majorId,
    runnerUpId: runnerUpEntry?.majorId,
    leaderGap: leaderEntry && runnerUpEntry ? Math.round((leaderEntry.adaptiveScore - runnerUpEntry.adaptiveScore) * 10) / 10 : 0,
    headline: leaderEntry ? `${leaderEntry.name} currently leads the comparison` : 'No comparison leader yet',
    explanation: buildComparisonExplanation(leaderEntry, runnerUpEntry),
    generatedAt: new Date().toISOString(),
  };
}

export function explainMajorAgainstLeader(entry: MajorComparisonEntry, leader: MajorComparisonEntry): string[] {
  if (entry.majorId === leader.majorId) return ['This major is currently leading the adaptive comparison.', ...entry.strengths.slice(0, 2)];
  const reasons = buildDimensionExplanation(entry, leader);
  if (entry.adaptiveGap > 0) reasons.unshift(`${entry.adaptiveGap} points behind the current leader on adaptive evidence.`);
  return reasons.slice(0, 4);
}
