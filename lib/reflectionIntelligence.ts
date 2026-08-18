import type { Experiment, ExperimentReflection } from '@/types';

export interface ReflectionInsight {
  id: string;
  tone: 'positive' | 'neutral' | 'caution';
  title: string;
  detail: string;
}

export interface ReflectionAnalysis {
  attempts: number;
  reflectedAttempts: number;
  averageInterest: number;
  averageEnergy: number;
  averageDifficulty: number;
  wouldDoAgainRate: number;
  repeatRate: number;
  interestTrend: 'rising' | 'stable' | 'falling' | 'insufficient-data';
  insights: ReflectionInsight[];
}

function reflected(experiment: Experiment): ExperimentReflection[] {
  const attempts = experiment.attempts ?? [];
  const history = attempts
    .map((attempt) => attempt.reflection)
    .filter(Boolean) as ExperimentReflection[];
  if (history.length) return history;
  return experiment.reflection ? [experiment.reflection] : [];
}

function average(values: number[]) {
  return values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : 0;
}

export function analyzeReflections(experiments: Experiment[]): ReflectionAnalysis {
  const reflections = experiments.flatMap(reflected);
  const completed = experiments.filter((experiment) => reflected(experiment).length > 0);
  const repeated = completed.filter((experiment) => reflected(experiment).length > 1);
  const interests = reflections.map((item) => item.interest);
  const energies = reflections.map((item) => item.energy);
  const difficulties = reflections.map((item) => item.difficulty);
  const wouldDoAgain = reflections.map((item) => item.wouldDoAgain);
  const attempts = experiments.reduce(
    (sum, experiment) =>
      sum + Math.max(experiment.attempts?.length ?? 0, experiment.reflection ? 1 : 0),
    0
  );
  const insights: ReflectionInsight[] = [];

  if (!reflections.length) {
    return {
      attempts,
      reflectedAttempts: 0,
      averageInterest: 0,
      averageEnergy: 0,
      averageDifficulty: 0,
      wouldDoAgainRate: 0,
      repeatRate: 0,
      interestTrend: 'insufficient-data',
      insights: [
        {
          id: 'no-data',
          tone: 'neutral',
          title: 'No reflection pattern yet',
          detail:
            'Complete and reflect on experiments to build a longitudinal picture of your interests and energy.',
        },
      ],
    };
  }

  const first = interests[0];
  const last = interests[interests.length - 1];
  const delta = last - first;
  const interestTrend =
    interests.length < 2
      ? 'insufficient-data'
      : delta >= 0.7
        ? 'rising'
        : delta <= -0.7
          ? 'falling'
          : 'stable';
  const averageInterestScore = average(interests);
  const averageEnergyScore = average(energies);
  const averageDifficultyScore = average(difficulties);
  const wouldDoAgainRate = Math.round(
    (wouldDoAgain.filter(Boolean).length / wouldDoAgain.length) * 100
  );
  const repeatRate = completed.length
    ? Math.round((repeated.length / completed.length) * 100)
    : 0;

  if (averageInterestScore >= 4) {
    insights.push({
      id: 'high-interest',
      tone: 'positive',
      title: 'Strong enjoyment signal',
      detail: `Your average interest across reflected attempts is ${averageInterestScore}/5.`,
    });
  }
  if (interestTrend === 'rising') {
    insights.push({
      id: 'interest-rising',
      tone: 'positive',
      title: 'Interest is trending upward',
      detail: `Your recorded interest moved from ${first}/5 to ${last}/5 across the reflection sequence.`,
    });
  }
  if (interestTrend === 'falling') {
    insights.push({
      id: 'interest-falling',
      tone: 'caution',
      title: 'Interest is trending downward',
      detail: `Your recorded interest moved from ${first}/5 to ${last}/5. Treat this as a signal to investigate, not a final verdict.`,
    });
  }
  if (averageDifficultyScore >= 4 && averageEnergyScore >= 3) {
    insights.push({
      id: 'productive-challenge',
      tone: 'positive',
      title: 'Difficulty may be productive',
      detail: `You report high difficulty (${averageDifficultyScore}/5) while maintaining energy (${averageEnergyScore}/5).`,
    });
  }
  if (wouldDoAgainRate >= 67) {
    insights.push({
      id: 'willingness-to-repeat',
      tone: 'positive',
      title: 'You want to revisit this kind of work',
      detail: `${wouldDoAgainRate}% of reflected attempts say you would willingly do something like this again.`,
    });
  } else if (wouldDoAgainRate <= 33) {
    insights.push({
      id: 'low-willingness-to-repeat',
      tone: 'caution',
      title: 'Low willingness to repeat',
      detail: `Only ${wouldDoAgainRate}% of reflected attempts say you would willingly do something like this again. Investigate what made the experience less appealing.`,
    });
  }
  if (repeated.length) {
    insights.push({
      id: 'repeat-behavior',
      tone: 'positive',
      title: 'You are returning to experiments',
      detail: `${repeated.length} experiment${repeated.length === 1 ? '' : 's'} has been repeated, creating stronger evidence than a single reflection.`,
    });
  }
  if (!insights.length) {
    insights.push({
      id: 'early-signal',
      tone: 'neutral',
      title: 'Early evidence is still forming',
      detail:
        'Keep reflecting consistently; patterns become more trustworthy as the history grows.',
    });
  }

  return {
    attempts,
    reflectedAttempts: reflections.length,
    averageInterest: averageInterestScore,
    averageEnergy: averageEnergyScore,
    averageDifficulty: averageDifficultyScore,
    wouldDoAgainRate,
    repeatRate,
    interestTrend,
    insights,
  };
}

export function analyzeExperimentReflection(experiment: Experiment): ReflectionAnalysis {
  return analyzeReflections([experiment]);
}
