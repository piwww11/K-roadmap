import type {
  Major,
  MajorDecisionAnalysis,
  MajorDecisionResponse,
  MajorDecisionResult,
  Phase,
} from '@/types';

const MAJOR_KEYWORDS: Record<string, string[]> = {
  physics: ['physics', 'fisika', 'mechanics', 'mechanika', 'quantum', 'kuantum', 'space', 'astronomy', 'astronomi', 'experiment', 'eksperimen', 'mathematics', 'matematika'],
  bcs: ['brain', 'otak', 'cognitive', 'kognitif', 'neuroscience', 'neurosains', 'psychology', 'psikologi', 'neural', 'neuron', 'behavior', 'perilaku'],
  'life-science': ['biology', 'biologi', 'life science', 'genetics', 'genetik', 'molecular', 'molekuler', 'cell', 'sel', 'bioinformatics', 'bioinformatika', 'biomedical', 'biomedis'],
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

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function keywordHits(answer: string, majorId: string): number {
  const text = normalize(answer);
  return (MAJOR_KEYWORDS[majorId] ?? []).reduce(
    (count, keyword) => count + (text.includes(keyword) ? 1 : 0),
    0,
  );
}

function taskStats(phases: Phase[], majorId: string) {
  const tasks = phases.flatMap((phase) =>
    phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks)),
  );
  const exploration = tasks.filter((task) => task.majorReward?.majorId === majorId);
  const completed = exploration.filter((task) => task.status === 'Completed').length;
  return { completed, total: exploration.length };
}

function levelFor(completed: number, total: number): MajorDecisionAnalysis['evidenceLevel'] {
  if (completed >= 3 || (total > 0 && completed / total >= 0.6)) return 'strong';
  if (completed > 0) return 'developing';
  return 'low';
}

export function analyzeMajorDecision(
  response: MajorDecisionResponse,
  majors: Major[],
  phases: Phase[],
): MajorDecisionResult {
  const analyses = majors.map((major) => {
    const stats = taskStats(phases, major.id);
    const hits = QUESTIONS.reduce((sum, question) => sum + keywordHits(response[question], major.id), 0);
    const keywordScore = Math.min(35, hits * 7);
    const interestScore = Math.round(Math.min(25, major.interestScore * 2.5));
    const confidenceScore = Math.round(Math.min(20, major.confidenceScore * 2));
    const explorationScore = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 20);
    const score = Math.min(100, keywordScore + interestScore + confidenceScore + explorationScore);
    const evidenceLevel = levelFor(stats.completed, stats.total);

    const strengths: string[] = [];
    if (hits >= 2) strengths.push('Your decision answers repeatedly point toward this field.');
    if (major.interestScore >= 7) strengths.push('You already report strong interest in this major.');
    if (stats.completed > 0) strengths.push(`You have completed ${stats.completed} exploration task${stats.completed === 1 ? '' : 's'} in this area.`);

    const uncertainties: string[] = [];
    if (stats.completed === 0) uncertainties.push('There is not enough hands-on roadmap evidence yet.');
    if (major.confidenceScore < 5) uncertainties.push('Your current confidence is still relatively low.');
    if (hits === 0) uncertainties.push('The latest decision answers do not contain a clear signal for this field.');

    const recommendedNextSteps: string[] = [];
    if (stats.total > stats.completed) recommendedNextSteps.push('Complete another exploration task in this major.');
    if (stats.completed === 0) recommendedNextSteps.push('Run a small hands-on experiment before making a commitment.');
    if (major.confidenceScore < 5) recommendedNextSteps.push('Reflect on what specifically makes you uncertain about this field.');
    if (recommendedNextSteps.length === 0) recommendedNextSteps.push('Keep logging real experiences before treating this result as final.');

    return {
      majorId: major.id,
      score,
      confidence: Math.round((keywordScore + explorationScore) / 55 * 100),
      evidenceLevel,
      strengths,
      uncertainties,
      recommendedNextSteps,
      completedExplorationTasks: stats.completed,
      totalExplorationTasks: stats.total,
    };
  });

  const ranked = [...analyses].sort((a, b) => b.score - a.score);
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const enoughEvidence = analyses.some((analysis) => analysis.completedExplorationTasks > 0);
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
