import type { Experiment, Major, MajorDecisionAnalysis, MajorDecisionResponse, MajorDecisionResult, Phase } from '@/types';

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
  return {
    completed: relevant.filter((experiment) => experiment.status === 'completed' && experiment.reflection).length,
    total: relevant.length,
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
    const keywordHitsTotal = QUESTIONS.reduce((sum, question) => sum + keywordHits(response[question], major.id), 0);
    const conceptHitsTotal = QUESTIONS.reduce((sum, question) => sum + conceptHits(response[question], major.id), 0);

    const languageSignal = Math.min(40, keywordHitsTotal * 5 + conceptHitsTotal * 8);
    const interestSignal = Math.round(Math.min(20, major.interestScore * 2));
    const confidenceSignal = Math.round(Math.min(15, major.confidenceScore * 1.5));
    const taskSignal = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 15);
    const experimentSignal = experiment.total === 0 ? 0 : Math.round((experiment.completed / experiment.total) * 10);
    const explorationSignal = Math.min(25, taskSignal + experimentSignal);
    const score = Math.min(100, languageSignal + interestSignal + confidenceSignal + explorationSignal);
    const evidenceLevel = levelFor(stats.completed, experiment.completed, stats.total + experiment.total);

    const strengths: string[] = [];
    if (keywordHitsTotal >= 2 || conceptHitsTotal > 0) strengths.push('Your decision answers contain recurring signals connected to this field.');
    if (major.interestScore >= 7) strengths.push('You already report strong interest in this major.');
    if (stats.completed > 0) strengths.push(`You have completed ${stats.completed} exploration task${stats.completed === 1 ? '' : 's'} in this area.`);
    if (experiment.completed > 0) strengths.push(`You completed ${experiment.completed} experiment${experiment.completed === 1 ? '' : 's'} and reflected on the experience.`);

    const uncertainties: string[] = [];
    if (stats.completed === 0 && experiment.completed === 0) uncertainties.push('There is not enough hands-on roadmap evidence yet.');
    if (major.confidenceScore < 5) uncertainties.push('Your current confidence is still relatively low.');
    if (keywordHitsTotal === 0 && conceptHitsTotal === 0) uncertainties.push('The latest decision answers do not contain a clear signal for this field.');
    if (experiment.completed > 0 && experiment.completed < experiment.total) uncertainties.push('You have started exploring this field but have not reflected on every experiment yet.');

    const recommendedNextSteps: string[] = [];
    if (experiment.total > experiment.completed) recommendedNextSteps.push('Run and reflect on another small experiment in this major.');
    if (stats.total > stats.completed) recommendedNextSteps.push('Complete another exploration task in this major.');
    if (stats.completed === 0 && experiment.completed === 0) recommendedNextSteps.push('Run a small hands-on experiment before making a commitment.');
    if (major.confidenceScore < 5) recommendedNextSteps.push('Reflect on what specifically makes you uncertain about this field.');
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
