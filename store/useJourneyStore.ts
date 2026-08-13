import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============ TYPE DEFINITIONS ============

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type SkillStatus = 'not-started' | 'learning' | 'completed' | 'locked';
export type DocumentStatus = 'Not Started' | 'In Progress' | 'Completed';
export type BudgetCategory = 'Application' | 'Document' | 'Travel' | 'Other';

export interface Task {
  id: string;
  title: string;
  phaseId: string;
  status: TaskStatus;
  category: string;
}

export interface Phase {
  id: string;
  title: string;
  timeline: string;
  description: string;
  tasks: Task[];
}

export interface Major {
  id: string;
  name: string;
  university: string;
  interestScore: number;
  confidenceScore: number;
  themeColor: string;
}

export interface Skill {
  id: string;
  title: string;
  track: 'physics' | 'bcs' | 'life-science';
  category: string;
  status: SkillStatus;
}

export interface DocumentItem {
  id: string;
  name: string;
  description: string;
  status: DocumentStatus;
  category: string;
}

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  category: BudgetCategory;
}

interface ConfidenceReward {
  majorId: string;
  amount: number;
}

interface JourneyState {
  myWhy: string;
  setMyWhy: (text: string) => void;

  phases: Phase[];
  toggleTask: (phaseId: string, taskId: string) => void;

  majors: Major[];
  reorderMajors: (oldIndex: number, newIndex: number) => void;
  updateMajorScore: (
    majorId: string,
    type: 'interest' | 'confidence',
    score: number
  ) => void;

  skills: Skill[];
  updateSkillStatus: (skillId: string, status: SkillStatus) => void;

  documents: DocumentItem[];
  updateDocumentStatus: (documentId: string, status: DocumentStatus) => void;

  budget: BudgetItem[];
  addBudgetItem: (item: BudgetItem) => void;
  removeBudgetItem: (itemId: string) => void;

  exportData: () => string;
}

// ============ INITIAL DATA ============

const initialPhases: Phase[] = [
  {
    id: 'phase-1',
    title: 'Know the Battlefield',
    timeline: 'Aug - Sept 2026',
    description: 'Understand requirements and identify math weaknesses.',
    tasks: [
      {
        id: 't1',
        title: 'Research KAIST Physics curriculum',
        phaseId: 'phase-1',
        status: 'Not Started',
        category: 'Physics',
      },
      {
        id: 't2',
        title: 'Identify weak mathematics topics',
        phaseId: 'phase-1',
        status: 'Not Started',
        category: 'Math',
      },
      {
        id: 't3',
        title: 'Start algebra review',
        phaseId: 'phase-1',
        status: 'Not Started',
        category: 'Math',
      },
    ],
  },
  {
    id: 'phase-2',
    title: 'Physics vs BCS vs Life Science Experiment',
    timeline: 'Oct - Nov 2026',
    description: 'Test genuine interest through small projects.',
    tasks: [
      {
        id: 't4',
        title: 'Build simple orbit simulation',
        phaseId: 'phase-2',
        status: 'Not Started',
        category: 'Physics',
      },
      {
        id: 't5',
        title: 'Learn basic neural network concepts',
        phaseId: 'phase-2',
        status: 'Not Started',
        category: 'BCS',
      },
    ],
  },
];

const initialMajors: Major[] = [
  {
    id: 'm1',
    name: 'Physics',
    university: 'KAIST',
    interestScore: 8,
    confidenceScore: 4,
    themeColor: 'text-indigo-400',
  },
  {
    id: 'm2',
    name: 'Brain & Cognitive Sciences',
    university: 'KAIST',
    interestScore: 7,
    confidenceScore: 6,
    themeColor: 'text-cyan-400',
  },
  {
    id: 'm3',
    name: 'Life Science & Biotechnology',
    university: 'Korea University',
    interestScore: 5,
    confidenceScore: 7,
    themeColor: 'text-emerald-400',
  },
];

const initialSkills: Skill[] = [
  {
    id: 'skill-algebra',
    title: 'Algebra',
    track: 'physics',
    category: 'Mathematics',
    status: 'not-started',
  },
  {
    id: 'skill-functions',
    title: 'Functions',
    track: 'physics',
    category: 'Mathematics',
    status: 'locked',
  },
  {
    id: 'skill-trigonometry',
    title: 'Trigonometry',
    track: 'physics',
    category: 'Mathematics',
    status: 'locked',
  },
  {
    id: 'skill-calculus',
    title: 'Calculus',
    track: 'physics',
    category: 'Mathematics',
    status: 'locked',
  },
  {
    id: 'skill-mechanics',
    title: 'Mechanics',
    track: 'physics',
    category: 'Physics',
    status: 'not-started',
  },
  {
    id: 'skill-waves',
    title: 'Waves',
    track: 'physics',
    category: 'Physics',
    status: 'locked',
  },
  {
    id: 'skill-python',
    title: 'Python Basics',
    track: 'physics',
    category: 'Programming',
    status: 'not-started',
  },
  {
    id: 'skill-cell-biology-bcs',
    title: 'Cell Biology',
    track: 'bcs',
    category: 'Biology',
    status: 'not-started',
  },
  {
    id: 'skill-neurons',
    title: 'Neurons',
    track: 'bcs',
    category: 'Biology',
    status: 'locked',
  },
  {
    id: 'skill-python-bcs',
    title: 'Python',
    track: 'bcs',
    category: 'Computation',
    status: 'not-started',
  },
  {
    id: 'skill-statistics',
    title: 'Statistics',
    track: 'bcs',
    category: 'Computation',
    status: 'locked',
  },
  {
    id: 'skill-cell-biology-life',
    title: 'Cell Biology',
    track: 'life-science',
    category: 'Biology',
    status: 'not-started',
  },
  {
    id: 'skill-molecular-biology',
    title: 'Molecular Biology',
    track: 'life-science',
    category: 'Biology',
    status: 'locked',
  },
  {
    id: 'skill-genetics',
    title: 'Genetics',
    track: 'life-science',
    category: 'Biology',
    status: 'locked',
  },
];

const initialDocuments: DocumentItem[] = [
  {
    id: 'doc-passport',
    name: 'Passport',
    description: 'Valid passport for the GKS application.',
    status: 'Not Started',
    category: 'GKS',
  },
  {
    id: 'doc-transcript',
    name: 'Academic Transcript',
    description: 'Official academic records and grades.',
    status: 'Not Started',
    category: 'University',
  },
  {
    id: 'doc-diploma',
    name: 'Graduation Certificate',
    description: 'Proof of high school graduation.',
    status: 'Not Started',
    category: 'GKS',
  },
  {
    id: 'doc-personal-statement',
    name: 'Personal Statement',
    description: 'Personal statement explaining your journey and goals.',
    status: 'Not Started',
    category: 'GKS',
  },
  {
    id: 'doc-study-plan',
    name: 'Study Plan',
    description: 'Planned academic direction and future goals.',
    status: 'Not Started',
    category: 'GKS',
  },
  {
    id: 'doc-recommendation',
    name: 'Recommendation Letter',
    description: 'Recommendation from an appropriate academic referee.',
    status: 'Not Started',
    category: 'GKS',
  },
];

const initialBudget: BudgetItem[] = [
  {
    id: 'budget-passport',
    name: 'Passport',
    amount: 0,
    category: 'Document',
  },
  {
    id: 'budget-translation',
    name: 'Document Translation',
    amount: 0,
    category: 'Document',
  },
  {
    id: 'budget-application',
    name: 'Application Costs',
    amount: 0,
    category: 'Application',
  },
  {
    id: 'budget-travel',
    name: 'Travel',
    amount: 0,
    category: 'Travel',
  },
];

const confidenceRewards: Record<string, ConfidenceReward> = {
  t1: {
    majorId: 'm1',
    amount: 0.5,
  },
  t2: {
    majorId: 'm1',
    amount: 0.2,
  },
  t3: {
    majorId: 'm1',
    amount: 0.3,
  },
  t4: {
    majorId: 'm1',
    amount: 0.7,
  },
  t5: {
    majorId: 'm2',
    amount: 0.5,
  },
};

// ============ ZUSTAND STORE ============

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      myWhy:
        'I want to understand what kind of person and scientist I want to become, and I want to give myself a real chance to study what I genuinely care about.',

      setMyWhy: (text: string) =>
        set({
          myWhy: text,
        }),

      phases: initialPhases,

      toggleTask: (phaseId: string, taskId: string) =>
        set((state) => {
          const phase = state.phases.find((p) => p.id === phaseId);

          if (!phase) {
            return state;
          }

          const task = phase.tasks.find((t) => t.id === taskId);

          if (!task) {
            return state;
          }

          const wasCompleted = task.status === 'Completed';
          const newStatus: TaskStatus = wasCompleted ? 'Not Started' : 'Completed';

          const newPhases = state.phases.map((currentPhase) => {
            if (currentPhase.id !== phaseId) {
              return currentPhase;
            }

            return {
              ...currentPhase,
              tasks: currentPhase.tasks.map((currentTask) =>
                currentTask.id === taskId
                  ? {
                      ...currentTask,
                      status: newStatus,
                    }
                  : currentTask
              ),
            };
          });

          let newMajors = state.majors;
          const reward = confidenceRewards[taskId];

          if (reward) {
            newMajors = state.majors.map((major) => {
              if (major.id !== reward.majorId) {
                return major;
              }

              const change = wasCompleted ? -reward.amount : reward.amount;
              const newScore = Math.min(10, Math.max(0, major.confidenceScore + change));

              return {
                ...major,
                confidenceScore: Math.round(newScore * 10) / 10,
              };
            });
          }

          return {
            phases: newPhases,
            majors: newMajors,
          };
        }),

      majors: initialMajors,

      reorderMajors: (oldIndex: number, newIndex: number) =>
        set((state) => {
          const newMajors = [...state.majors];
          const [movedMajor] = newMajors.splice(oldIndex, 1);

          if (!movedMajor) {
            return state;
          }

          newMajors.splice(newIndex, 0, movedMajor);

          return {
            majors: newMajors,
          };
        }),

      updateMajorScore: (majorId: string, type: 'interest' | 'confidence', score: number) =>
        set((state) => ({
          majors: state.majors.map((major) =>
            major.id === majorId
              ? {
                  ...major,
                  [type === 'interest' ? 'interestScore' : 'confidenceScore']: Math.min(
                    10,
                    Math.max(0, score)
                  ),
                }
              : major
          ),
        })),

      skills: initialSkills,

      updateSkillStatus: (skillId: string, status: SkillStatus) =>
        set((state) => {
          const skills = [...state.skills];
          const skillIndex = skills.findIndex((skill) => skill.id === skillId);

          if (skillIndex === -1) {
            return state;
          }

          const currentSkill = skills[skillIndex];

          skills[skillIndex] = {
            ...currentSkill,
            status,
          };

          // Unlock next skill in the same track and category when completed
          if (status === 'completed') {
            const nextSkillIndex = skills.findIndex(
              (skill, index) =>
                index > skillIndex &&
                skill.track === currentSkill.track &&
                skill.category === currentSkill.category &&
                skill.status === 'locked'
            );

            if (nextSkillIndex !== -1) {
              skills[nextSkillIndex] = {
                ...skills[nextSkillIndex],
                status: 'not-started',
              };
            }
          }

          return {
            skills,
          };
        }),

      documents: initialDocuments,

      updateDocumentStatus: (documentId: string, status: DocumentStatus) =>
        set((state) => ({
          documents: state.documents.map((document) =>
            document.id === documentId
              ? {
                  ...document,
                  status,
                }
              : document
          ),
        })),

      budget: initialBudget,

      addBudgetItem: (item: BudgetItem) =>
        set((state) => ({
          budget: [...state.budget, item],
        })),

      removeBudgetItem: (itemId: string) =>
        set((state) => ({
          budget: state.budget.filter((item) => item.id !== itemId),
        })),

      exportData: () => JSON.stringify(get()),
    }),
    {
      name: 'k-roadmap-storage',
    }
  )
);