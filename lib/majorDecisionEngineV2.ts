import type { Experiment, Major, MajorDecisionAnalysis, MajorDecisionResponse, MajorDecisionResult, Phase } from '@/types';
import { analyzeReflections } from '@/lib/reflectionIntelligence';

const MAJOR_KEYWORDS: Record<string, string[]> = {
  m1: ['physics', 'fisika', 'mechanics', 'mechanika', 'quantum', 'kuantum', 'space', 'astronomy', 'astronomi', 'vectors', 'vektor', 'waves', 'gelombang', 'motion', 'gerak', 'experiment', 'eksperimen', 'mathematics', 'matematika'],
  m2: ['brain', 'otak', 'cognitive', 'kognitif', 'neuroscience', 'neurosains', 'psychology', 'psikologi', 'neural', 'neuron', 'behavior', 'perilaku', 'intelligence', 'kecerdasan', 'memory', 'memori'],
  m3: ['biology', 'biologi', 'life science', 'genetics', 'genetik', 'molecular', 'molekuler', 'cell', 'sel', 'bioinformatics', 'bioinformatika', 'biomedical', 'biomedis', 'dna', 'rna', 'organism', 'organisme'],
};

const MAJOR_CONCEPTS: Record<string, string[]> = {
  m1: ['how nature works', 'understand how the universe works', 'why things happen', 'fundamental laws', 'physical world', 'alam bekerja', 'hukum alam', 'alam semesta'],
  m2: ['how the brain works', 'how people think', 'human mind', 'how we learn', 'decision making', 'cara otak bekerja', 'cara manusia berpikir', 'pikiran manusia'],
  m3: ['how life works', 'living systems', 'how cells work', 'disease mechanisms', 'biological systems', 'cara kehidupan bekerja', 'sistem kehidupan', 'cara sel bekerja'],
};

const QUESTIONS: (keyof MajorDecisionResponse)[] = [
  'q1_most_curious',
  'q2_willing_to_struggle',
  'q3_enjoy_most',
  'q4_math_feeling',
  'q5_most_enjoyable_experiment',
  'q6_voluntary_research',
  'q7_without_name',
];

function keywordHits(answer: string, majorId: string): number {
  const text = answer.toLowerCase().trim();
  return (MAJOR_KEYWORDS[majorId] ?? []).reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function conceptHits(answer: string, majorId: string): number {
  const text = answer.toLowerCase().trim();
  return (MAJOR_CONCEPTS[majorId] ?? []).reduce((count, phrase) => count + (text.includes(phrase) ? 1 : 0), 0);
}

function taskStats(phases: Phase[], majorId: string) {
  const tasks = phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks)));
  const exploration = tasks.filter((task) => {
    const explicit = task.explorationMajorIds ?? [];
    return explicit.includes(majorId) || (!task.explorationMajorIds && task.majorReward?.majorId === majorId);
  });
  return {
    completed: exploration.filter((task) => task.status === 'Completed').length,
    total: exploration.length,
  };
}

function experimentStats(experiments: Experiment[], majorId: string) {
  const relevant = experiments.filter((experiment) => experiment.majorId === majorId);
  const reflected = relevant.filter((experiment) =>
    (experiment.attempts ?? []).some((attempt) => Boolean(attempt.reflection)) || Boolean(experiment.reflection)
  );
  const attempts = relevant.reduce(
    (count, experiment) => count + (experiment.attempts?.filter((attempt) => attempt.reflection).length ?? (experiment.reflection ? 1 : 0)),
    0
  );
  return {
    completed: reflected.length,
    total: relevant.length,
    attempts,
  };
}

function levelFor(completedTasks: number, completedExperiments: number, totalEvidence: number): MajorDecisionAnalysis['evidenceLevel'] {
  const completed = completedTasks + completedExperiments;
  if (completed >= 3 || (totalEvidence > 0 && completed / totalEvidence >= 0.6)) return 'strong';
  if (completed > 0) return 'developing';
  return 'low';
}

export function analyzeMajorDecision(
  response: MajorDecisionResponse,
  majors: Major[],
  phases: Phase[],
  experiments: Experiment[] = []
): MajorDecisionResult {
  const analyses = majors.map((major) => {
    const stats = taskStats(phases, major.id);
    const experiment = experimentStats(experiments, major.id);
    const relevantExperiments = experiments.filter((candidate) => candidate.majorId === major.id);
    const reflection = analyzeReflections(relevantExperiments);
    const keywordHitsTotal = QUESTIONS.reduce((sum, question) => sum + keywordHits(response[question], major.id), 0);
    const conceptHitsTotal = QUESTIONS.reduce((sum, question) => sum + conceptHits(response[question], major.id), 0);

    const languageSignal = Math.min(40, keywordHitsTotal * 5 + conceptHitsTotal * 8);
    const interestSignal = Math.round(Math.min(20, major.interestScore * 2));
    const confidenceSignal = Math.round(Math.min(15, major.confidenceScore * 1.5));
    const taskSignal = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 15);

    // Experiment evidence remains bounded at 10 points. Coverage is the main
    // signal; reflection quality adds a small, explainable adjustment using all
    // reflected attempts, including interest, energy, and willingness to repeat.
    const experimentCoverageSignal = experiment.total === 0
      ? 0
      : Math.round((experiment.completed / experiment.total) * 8);
    const reflectionQualitySignal = reflection.reflectedAttempts === 0
      ? 0
      : Math.round(
          (
            (reflection.averageInterest / 5) * 0.5 +
            (reflection.averageEnergy / 5) * 0.2 +
            (reflection.wouldDoAgainRate / 100) * 0.3
          ) * 2
        );
    const experimentSignal = Math.min(10, experimentCoverageSignal + reflectionQualitySignal);
    const explorationSignal = Math.min(25, taskSignal + experimentSignal);
    const score = Math.min(100, languageSignal + interestSignal + confidenceSignal + explorationSignal);
    const evidenceLevel = levelFor(stats.completed, experiment.completed, stats.total + experiment.total);

    const strengths: string[] = [];
    if (keywordHitsTotal >= 2 || conceptHitsTotal > 0) strengths.push('Your decision answers contain recurring signals connected to this field.');
    if (major.interestScore >= 7) strengths.push('You already report strong interest in this major.');
    if (stats.completed > 0) strengths.push(`You have completed ${stats.completed} exploration task${stats.completed === 1 ? '' : 's'} in this area.`);
    if (experiment.completed > 0) strengths.push(`You reflected on ${experiment.completed} experiment${experiment.completed === 1 ? '' : 's'} in this area across ${experiment.attempts} attempt${experiment.attempts === 1 ? '' : 's'}.`);
    if (reflection.reflectedAttempts > 0 && reflection.averageInterest >= 4) strengths.push(`Reflections show strong average interest (${reflection.averageInterest}/5) across all reflected attempts.`);
    if (reflection.reflectedAttempts > 0 && reflection.wouldDoAgainRate >= 67) strengths.push(`${reflection.wouldDoAgainRate}% of reflected attempts say you would willingly do similar work again.`);
    if (reflection.reflectedAttempts > 1 && reflection.interestTrend === 'rising') strengths.push('Your reflection history shows interest rising across repeated attempts.');
    if (reflection.reflectedAttempts > 0 && reflection.averageDifficulty >= 4 && reflection.averageEnergy >= 3) strengths.push('High difficulty is paired with sustained energy, suggesting a productive challenge rather than simple avoidance.');

    const uncertainties: string[] = [];
    if (stats.completed === 0 && experiment.completed === 0) uncertainties.push('There is not enough hands-on roadmap evidence yet.');
    if (major.confidenceScore < 5) uncertainties.push('Your current confidence is still relatively low.');
    if (keywordHitsTotal === 0 && conceptHitsTotal === 0) uncertainties.push('The latest decision answers do not contain a clear signal for this field.');
    if (experiment.completed > 0 && experiment.completed < experiment.total) uncertainties.push('You have started exploring this field but have not reflected on every experiment yet.');
    if (reflection.reflectedAttempts > 0 && reflection.wouldDoAgainRate <= 33) uncertainties.push(`Only ${reflection.wouldDoAgainRate}% of reflected attempts indicate willingness to repeat this kind of work.`);
    if (reflection.reflectedAttempts > 1 && reflection.interestTrend === 'falling') uncertainties.push('Interest is trending downward across the reflection history; investigate why before treating the field as a poor fit.');

    const recommendedNextSteps: string[] = [];
    if (experiment.total > experiment.completed) recommendedNextSteps.push('Run and reflect on another small experiment in this major.');
    if (stats.total > stats.completed) recommendedNextSteps.push('Complete another exploration task in this major.');
    if (stats.completed === 0 && experiment.completed === 0) recommendedNextSteps.push('Run a small hands-on experiment before making a commitment.');
    if (major.confidenceScore < 5) recommendedNextSteps.push('Reflect on what specifically makes you uncertain about this field.');
    if (reflection.reflectedAttempts > 0 && reflection.interestTrend === 'falling') recommendedNextSteps.push('Repeat a related experiment with a different approach to test whether the falling interest is stable.');
    if (reflection.reflectedAttempts > 0 && reflection.wouldDoAgainRate <= 33) recommendedNextSteps.push('Write a short note about what made the experience less appealing before deciding what to explore next.');
    if (recommendedNextSteps.length === 0) recommendedNextSteps.push('Keep logging real experiences before treating this result as final.');

    return {
      majorId: major.id,
      score,
      confidence: Math.min(100, Math.round(((languageSignal + explorationSignal) / 65) * 100)),
      evidenceLevel,
      strengths,
      uncertainties,
      recommendedNextSteps,
      completedExplorationTasks: stats.completed,
      totalExplorationTasks: stats.total,
      completedExperiments: experiment.completed,
      totalExperiments: experiment.total,
      reflectedAttempts: reflection.reflectedAttempts,
      totalExperimentAttempts: reflection.attempts,
      averageReflectionInterest: reflection.averageInterest,
      averageReflectionEnergy: reflection.averageEnergy,
      averageReflectionDifficulty: reflection.averageDifficulty,
      wouldDoAgainRate: reflection.wouldDoAgainRate,
      reflectionRepeatRate: reflection.repeatRate,
      reflectionInterestTrend: reflection.interestTrend,
    };
  });

  const ranked = [...analyses].sort((a, b) => b.score - a.score);
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const enoughEvidence = analyses.some((analysis) => analysis.completedExplorationTasks > 0 || analysis.completedExperiments > 0);
  const gap = leader && runnerUp ? leader.score - runnerUp.score : 0;

  let recommendationStatus: MajorDecisionResult['recommendationStatus'] = 'insufficient-evidence';
  if (enoughEvidence && leader) {
    if (leader.evidenceLevel === 'strong' && gap >= 10) recommendationStatus = 'strong-fit';
    else if (gap >= 6) recommendationStatus = 'leading';
    else recommendationStatus = 'exploring';
  }

  return {
    id: `decision-${response.timestamp}`,
    createdAt: response.timestamp,
    analyses: ranked,
    topMajorId: leader?.majorId,
    recommendationStatus,
  };
}
