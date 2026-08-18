// ============ ENUMS & TYPES ============

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type SkillStatus = 'not-started' | 'learning' | 'completed' | 'locked';
export type DocumentStatus = 'Not Started' | 'In Progress' | 'Ready' | 'Verified';
export type BudgetCategory = 'Application' | 'Document' | 'Travel' | 'Other' | 'Language Test' | 'Translation' | 'Authentication' | 'Transportation';
export type JournalCategory = 'Physics' | 'BCS' | 'Life Science' | 'GKS' | 'Mathematics' | 'Personal' | 'University Research';
export type MajorTrack = 'physics' | 'bcs' | 'life-science';
export type ExperimentStatus = 'planned' | 'in-progress' | 'completed' | 'skipped';

export interface Major {
  id: string;
  name: string;
  university: string;
  interestScore: number;
  baseConfidenceScore?: number;
  confidenceScore: number;
  themeColor: string;
  icon: string;
  description?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  goalId: string;
  status: TaskStatus;
  category: string;
  majorReward?: { majorId: string; confidenceAmount: number };
  explorationMajorIds?: string[];
  unlocksSkillIds?: string[];
  dueDate?: string;
  createdAt: string;
}

export interface Goal { id: string; title: string; description?: string; monthId: string; tasks: Task[]; status: TaskStatus; progress: number; category?: string; }
export interface Month { id: string; name: string; year: number; phaseId: string; goals: Goal[]; startDate: string; endDate: string; }
export interface Phase { id: string; number: number; title: string; subtitle: string; description: string; months: Month[]; startDate: string; endDate: string; status: 'Not Started' | 'In Progress' | 'Completed'; }
export interface Skill { id: string; title: string; track: MajorTrack; category: string; requiredTaskIds?: string[]; requiredSkillIds?: string[]; status: SkillStatus; unlockedAt?: string; completedAt?: string; }
export interface JournalEntry { id: string; date: string; title: string; content: string; category: JournalCategory; mood: number; interest: number; tags: string[]; createdAt: string; }
export interface ExperimentReflection { interest: number; energy: number; difficulty: number; wouldDoAgain: boolean; notes: string; createdAt: string; }
export interface ExperimentAttempt { id: string; startedAt?: string; completedAt?: string; reflection?: ExperimentReflection; }
export interface Experiment { id: string; title: string; description: string; majorId: string; estimatedMinutes: number; status: ExperimentStatus; createdAt: string; startedAt?: string; completedAt?: string; reflection?: ExperimentReflection; attempts: ExperimentAttempt[]; }

export interface BudgetItem { id: string; name: string; amount: number; category: BudgetCategory; dueDate?: string; notes?: string; }
export interface BudgetSaving { id: string; amount: number; date: string; note?: string; }
export interface Budget { items: BudgetItem[]; targetAmount: number; currentSavings: number; savings: BudgetSaving[]; }
export interface DocumentItem { id: string; name: string; description: string; status: DocumentStatus; category: string; dueDate?: string; notes?: string; reference?: string; }
export interface Achievement { id: string; name: string; description: string; icon: string; unlockedAt?: string; rarity: 'common' | 'rare' | 'epic' | 'legendary'; }

export interface MajorDecisionResponse { q1_most_curious: string; q2_willing_to_struggle: string; q3_enjoy_most: string; q4_math_feeling: string; q5_most_enjoyable_experiment: string; q6_voluntary_research: string; q7_without_name: string; timestamp: string; }
export type DecisionEvidenceLevel = 'low' | 'developing' | 'strong';
export type DecisionRecommendationStatus = 'insufficient-evidence' | 'exploring' | 'leading' | 'strong-fit';
export interface MajorDecisionAnalysis { majorId: string; score: number; confidence: number; evidenceLevel: DecisionEvidenceLevel; strengths: string[]; uncertainties: string[]; recommendedNextSteps: string[]; completedExplorationTasks: number; totalExplorationTasks: number; completedExperiments: number; totalExperiments: number; reflectedAttempts?: number; totalExperimentAttempts?: number; averageReflectionInterest?: number; averageReflectionEnergy?: number; averageReflectionDifficulty?: number; wouldDoAgainRate?: number; reflectionRepeatRate?: number; reflectionInterestTrend?: 'rising' | 'stable' | 'falling' | 'insufficient-data'; decisionScore?: number; evidenceScore?: number; adaptiveScore?: number; evidenceMaturity?: number; }
export interface MajorDecisionResult { id: string; createdAt: string; analyses: MajorDecisionAnalysis[]; topMajorId?: string; recommendationStatus: DecisionRecommendationStatus; }

export interface JourneyState {
  myWhy: string; setMyWhy: (text: string) => void;
  phases: Phase[]; getPhase: (phaseId: string) => Phase | undefined; getMonth: (monthId: string) => Month | undefined; getGoal: (goalId: string) => Goal | undefined; getTask: (taskId: string) => Task | undefined; toggleTask: (taskId: string) => void; addTask: (goalId: string, task: Omit<Task, 'id' | 'goalId' | 'createdAt'>) => void; updateTask: (taskId: string, updates: Partial<Task>) => void; deleteTask: (taskId: string) => void;
  majors: Major[]; reorderMajors: (oldIndex: number, newIndex: number) => void; updateMajorScore: (majorId: string, type: 'interest' | 'confidence', score: number) => void; getMajorConfidenceFromTasks: (majorId: string) => number;
  skills: Skill[]; updateSkillStatus: (skillId: string, status: SkillStatus) => void;
  journalEntries: JournalEntry[]; addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void; updateJournalEntry: (entryId: string, updates: Partial<JournalEntry>) => void; deleteJournalEntry: (entryId: string) => void; getJournalByCategory: (category: JournalCategory) => JournalEntry[];
  budget: Budget; addBudgetItem: (item: BudgetItem) => void; removeBudgetItem: (itemId: string) => void; updateBudgetItem: (itemId: string, updates: Partial<BudgetItem>) => void; setBudgetTarget: (amount: number) => void; setCurrentSavings: (amount: number) => void; addSaving: (saving: Omit<BudgetSaving, 'id'>) => void; removeSaving: (savingId: string) => void;
  documents: DocumentItem[]; updateDocumentStatus: (documentId: string, status: DocumentStatus) => void; addDocument: (doc: Omit<DocumentItem, 'id'>) => void; deleteDocument: (documentId: string) => void;
  achievements: Achievement[]; unlockAchievement: (achievementId: string) => void; majorDecisions: MajorDecisionResponse[]; addMajorDecisionResponse: (response: MajorDecisionResponse) => void;
  getOverallProgress: () => number; getPhaseProgress: (phaseId: string) => number; getCompletedTaskCount: () => number; getTotalTaskCount: () => number; getCurrentPhase: () => Phase | undefined; getNextTask: () => Task | undefined; exportData: () => string; importData: (jsonString: string) => boolean; resetData: () => void;
}
