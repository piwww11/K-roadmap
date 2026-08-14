import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  JourneyState,
  Phase,
  Goal,
  Task,
  Major,
  Skill,
  BudgetItem,
  MajorDecisionResponse,
  TaskStatus,
  SkillStatus,
  JournalCategory,
} from '../types';
import {
  INITIAL_PHASES,
  INITIAL_MAJORS,
  INITIAL_SKILLS,
  INITIAL_DOCUMENTS,
  INITIAL_BUDGET,
  INITIAL_ACHIEVEMENTS,
} from './Speed data';
import { TASK_SKILL_UNLOCKS } from './skillUnlocks';

const STORAGE_VERSION = 5;
const STORAGE_NAME = 'k-roadmap-storage-v2';

const clampScore = (value: number) => Math.min(10, Math.max(0, value));

function allTasks(phases: Phase[]): Task[] {
  return phases.flatMap((phase) =>
    phase.months.flatMap((month) => month.goals.flatMap((goal) => goal.tasks))
  );
}

function getTaskFromPhases(phases: Phase[], taskId: string): Task | undefined {
  return allTasks(phases).find((task) => task.id === taskId);
}

function calculateGoalState(goal: Goal): Goal {
  const total = goal.tasks.length;
  const completed = goal.tasks.filter((task) => task.status === 'Completed').length;
  const active = goal.tasks.some(
    (task) => task.status === 'Completed' || task.status === 'In Progress'
  );

  return {
    ...goal,
    progress: total === 0 ? 0 : Math.round((completed / total) * 100),
    status:
      total === 0
        ? 'Not Started'
        : completed === total
          ? 'Completed'
          : active
            ? 'In Progress'
            : 'Not Started',
  };
}

function calculatePhaseState(phase: Phase): Phase {
  const months = phase.months.map((month) => ({
    ...month,
    goals: month.goals.map(calculateGoalState),
  }));
  const tasks = months.flatMap((month) =>
    month.goals.flatMap((goal) => goal.tasks)
  );
  const completed = tasks.filter((task) => task.status === 'Completed').length;
  const active = tasks.some(
    (task) => task.status === 'Completed' || task.status === 'In Progress'
  );

  return {
    ...phase,
    months,
    status:
      tasks.length === 0
        ? 'Not Started'
        : completed === tasks.length
          ? 'Completed'
          : active
            ? 'In Progress'
            : 'Not Started',
  };
}

function recalculatePhases(phases: Phase[]): Phase[] {
  return phases.map(calculatePhaseState);
}

function taskRewardsByMajor(phases: Phase[]): Map<string, number> {
  const rewards = new Map<string, number>();
  for (const task of allTasks(phases)) {
    if (task.status !== 'Completed' || !task.majorReward) continue;
    rewards.set(
      task.majorReward.majorId,
      (rewards.get(task.majorReward.majorId) ?? 0) + task.majorReward.confidenceAmount
    );
  }
  return rewards;
}

function recalculateMajors(phases: Phase[], majors: Major[]): Major[] {
  const rewards = taskRewardsByMajor(phases);
  return majors.map((major) => {
    const base = major.baseConfidenceScore ?? major.confidenceScore;
    const reward = rewards.get(major.id) ?? 0;
    return {
      ...major,
      baseConfidenceScore: base,
      confidenceScore: Math.round(clampScore(base + reward) * 10) / 10,
    };
  });
}

/**
 * Skill progression has ONE source of truth:
 * completed roadmap tasks + explicit task/skill requirements.
 * There is intentionally NO positional/track/category skill chain.
 */
function recalculateSkills(phases: Phase[], skills: Skill[]): Skill[] {
  const tasks = allTasks(phases);
  const completedTaskIds = new Set(
    tasks.filter((task) => task.status === 'Completed').map((task) => task.id)
  );
  const completedSkillIds = new Set(
    skills.filter((skill) => skill.status === 'completed').map((skill) => skill.id)
  );

  return skills.map((skill) => {
    // Never revoke a skill the user has already completed. Unlock gates control
    // access to a skill; they should not erase historical completion.
    if (skill.status === 'completed') return skill;

    const mappedTaskIds = Object.entries(TASK_SKILL_UNLOCKS)
      .filter(([, skillIds]) => skillIds.includes(skill.id))
      .map(([taskId]) => taskId);

    const inlineTaskIds = tasks
      .filter(
        (task) =>
          task.status === 'Completed' &&
          task.unlocksSkillIds?.includes(skill.id)
      )
      .map((task) => task.id);

    const requiredTaskIds = skill.requiredTaskIds ?? [];
    const requiredSkillIds = skill.requiredSkillIds ?? [];

    const mappedTaskReady = mappedTaskIds.some((taskId) =>
      completedTaskIds.has(taskId)
    );
    const inlineTaskReady = inlineTaskIds.length > 0;
    const requiredTasksReady =
      requiredTaskIds.length === 0 ||
      requiredTaskIds.every((taskId) => completedTaskIds.has(taskId));
    const requiredSkillsReady =
      requiredSkillIds.length === 0 ||
      requiredSkillIds.every((skillId) => completedSkillIds.has(skillId));

    const hasExplicitGate =
      mappedTaskIds.length > 0 ||
      inlineTaskIds.length > 0 ||
      requiredTaskIds.length > 0 ||
      requiredSkillIds.length > 0;

    if (!hasExplicitGate) return skill;

    const unlocked =
      (mappedTaskReady || inlineTaskReady || requiredTaskIds.length > 0 || requiredSkillIds.length > 0) &&
      requiredTasksReady &&
      requiredSkillsReady;

    if (unlocked && skill.status === 'locked') {
      return {
        ...skill,
        status: 'not-started' as SkillStatus,
        unlockedAt: skill.unlockedAt ?? new Date().toISOString(),
      };
    }

    if (!unlocked && skill.status === 'not-started') {
      return {
        ...skill,
        status: 'locked',
        unlockedAt: undefined,
      };
    }

    return skill;
  });
}

function migratePersistedState(persisted: unknown): unknown {
  if (!persisted || typeof persisted !== 'object') return persisted;

  const wrapper = persisted as Record<string, any>;
  const state =
    wrapper.state && typeof wrapper.state === 'object'
      ? (wrapper.state as Record<string, any>)
      : wrapper;

  const phases = Array.isArray(state.phases) ? state.phases : INITIAL_PHASES;
  const majors = Array.isArray(state.majors) ? state.majors : INITIAL_MAJORS;
  const rewards = taskRewardsByMajor(phases);
  const migratedMajors = majors.map((major: Major) => ({
    ...major,
    baseConfidenceScore:
      major.baseConfidenceScore ??
      clampScore(major.confidenceScore - (rewards.get(major.id) ?? 0)),
  }));
  const normalizedPhases = recalculatePhases(phases);
  const migratedSkills = Array.isArray(state.skills) ? state.skills : INITIAL_SKILLS;

  return {
    ...state,
    phases: normalizedPhases,
    majors: recalculateMajors(normalizedPhases, migratedMajors),
    skills: recalculateSkills(normalizedPhases, migratedSkills),
    journalEntries: Array.isArray(state.journalEntries) ? state.journalEntries : [],
    budget:
      state.budget && Array.isArray(state.budget.items)
        ? state.budget
        : INITIAL_BUDGET,
    documents: Array.isArray(state.documents) ? state.documents : INITIAL_DOCUMENTS,
    achievements: Array.isArray(state.achievements)
      ? state.achievements
      : INITIAL_ACHIEVEMENTS,
    majorDecisions: Array.isArray(state.majorDecisions) ? state.majorDecisions : [],
  };
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      myWhy:
        'I want to understand what kind of person and scientist I want to become, and I want to give myself a real chance to study what I genuinely care about.',
      setMyWhy: (text) => set({ myWhy: text }),

      phases: recalculatePhases(INITIAL_PHASES),
      getPhase: (phaseId) => get().phases.find((phase) => phase.id === phaseId),
      getMonth: (monthId) => {
        for (const phase of get().phases) {
          const month = phase.months.find((candidate) => candidate.id === monthId);
          if (month) return month;
        }
        return undefined;
      },
      getGoal: (goalId) => {
        for (const phase of get().phases) {
          for (const month of phase.months) {
            const goal = month.goals.find((candidate) => candidate.id === goalId);
            if (goal) return goal;
          }
        }
        return undefined;
      },
      getTask: (taskId) => getTaskFromPhases(get().phases, taskId),

      toggleTask: (taskId) =>
        set((state) => {
          const currentTask = getTaskFromPhases(state.phases, taskId);
          if (!currentTask) return state;
          const nextStatus: TaskStatus =
            currentTask.status === 'Completed' ? 'Not Started' : 'Completed';

          const phases = recalculatePhases(
            state.phases.map((phase) => ({
              ...phase,
              months: phase.months.map((month) => ({
                ...month,
                goals: month.goals.map((goal) => ({
                  ...goal,
                  tasks: goal.tasks.map((task) =>
                    task.id === taskId ? { ...task, status: nextStatus } : task
                  ),
                })),
              })),
            }))
          );

          return {
            phases,
            majors: recalculateMajors(phases, state.majors),
            skills: recalculateSkills(phases, state.skills),
          };
        }),

      addTask: (goalId, task) =>
        set((state) => {
          const newTask: Task = {
            ...task,
            id: `task-${Date.now()}`,
            goalId,
            createdAt: new Date().toISOString(),
          };
          const phases = recalculatePhases(
            state.phases.map((phase) => ({
              ...phase,
              months: phase.months.map((month) => ({
                ...month,
                goals: month.goals.map((goal) =>
                  goal.id === goalId
                    ? { ...goal, tasks: [...goal.tasks, newTask] }
                    : goal
                ),
              })),
            }))
          );
          return {
            phases,
            majors: recalculateMajors(phases, state.majors),
            skills: recalculateSkills(phases, state.skills),
          };
        }),

      updateTask: (taskId, updates) =>
        set((state) => {
          const phases = recalculatePhases(
            state.phases.map((phase) => ({
              ...phase,
              months: phase.months.map((month) => ({
                ...month,
                goals: month.goals.map((goal) => ({
                  ...goal,
                  tasks: goal.tasks.map((task) =>
                    task.id === taskId ? { ...task, ...updates } : task
                  ),
                })),
              })),
            }))
          );
          return {
            phases,
            majors: recalculateMajors(phases, state.majors),
            skills: recalculateSkills(phases, state.skills),
          };
        }),

      deleteTask: (taskId) =>
        set((state) => {
          const phases = recalculatePhases(
            state.phases.map((phase) => ({
              ...phase,
              months: phase.months.map((month) => ({
                ...month,
                goals: month.goals.map((goal) => ({
                  ...goal,
                  tasks: goal.tasks.filter((task) => task.id !== taskId),
                })),
              })),
            }))
          );
          return {
            phases,
            majors: recalculateMajors(phases, state.majors),
            skills: recalculateSkills(phases, state.skills),
          };
        }),

      majors: INITIAL_MAJORS.map((major) => ({
        ...major,
        baseConfidenceScore: major.baseConfidenceScore ?? major.confidenceScore,
      })),
      reorderMajors: (oldIndex, newIndex) =>
        set((state) => {
          if (
            oldIndex < 0 ||
            oldIndex >= state.majors.length ||
            newIndex < 0 ||
            newIndex >= state.majors.length
          )
            return state;
          const majors = [...state.majors];
          const [moved] = majors.splice(oldIndex, 1);
          if (!moved) return state;
          majors.splice(newIndex, 0, moved);
          return { majors };
        }),
      updateMajorScore: (majorId, type, score) =>
        set((state) => {
          const nextScore = clampScore(score);
          const rewards = taskRewardsByMajor(state.phases);
          return {
            majors: state.majors.map((major) => {
              if (major.id !== majorId) return major;
              if (type === 'interest') {
                return { ...major, interestScore: nextScore };
              }
              return {
                ...major,
                baseConfidenceScore: nextScore,
                confidenceScore:
                  Math.round(
                    clampScore(nextScore + (rewards.get(majorId) ?? 0)) * 10
                  ) / 10,
              };
            }),
          };
        }),
      getMajorConfidenceFromTasks: (majorId) => {
        const reward = taskRewardsByMajor(get().phases).get(majorId) ?? 0;
        const major = get().majors.find((candidate) => candidate.id === majorId);
        const base = major?.baseConfidenceScore ?? major?.confidenceScore ?? 0;
        return Math.round(clampScore(base + reward) * 10) / 10;
      },

      skills: INITIAL_SKILLS,
      updateSkillStatus: (skillId, status) =>
        set((state) => {
          const skill = state.skills.find((candidate) => candidate.id === skillId);
          if (!skill || skill.status === 'locked') return state;

          const now = new Date().toISOString();
          const skills = state.skills.map((candidate) =>
            candidate.id === skillId
              ? {
                  ...candidate,
                  status,
                  unlockedAt: candidate.unlockedAt ?? now,
                  completedAt:
                    status === 'completed' ? now : candidate.completedAt,
                }
              : candidate
          );

          return { skills: recalculateSkills(state.phases, skills) };
        }),

      journalEntries: [],
      addJournalEntry: (entry) =>
        set((state) => ({
          journalEntries: [
            ...state.journalEntries,
            {
              ...entry,
              id: `journal-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateJournalEntry: (entryId, updates) =>
        set((state) => ({
          journalEntries: state.journalEntries.map((entry) =>
            entry.id === entryId ? { ...entry, ...updates } : entry
          ),
        })),
      deleteJournalEntry: (entryId) =>
        set((state) => ({
          journalEntries: state.journalEntries.filter(
            (entry) => entry.id !== entryId
          ),
        })),
      getJournalByCategory: (category) =>
        get().journalEntries.filter((entry) => entry.category === category),

      budget: INITIAL_BUDGET,
      addBudgetItem: (item: BudgetItem) =>
        set((state) => ({
          budget: { ...state.budget, items: [...state.budget.items, item] },
        })),
      removeBudgetItem: (itemId) =>
        set((state) => ({
          budget: {
            ...state.budget,
            items: state.budget.items.filter((item) => item.id !== itemId),
          },
        })),
      updateBudgetItem: (itemId, updates) =>
        set((state) => ({
          budget: {
            ...state.budget,
            items: state.budget.items.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          },
        })),
      setBudgetTarget: (amount) =>
        set((state) => ({
          budget: { ...state.budget, targetAmount: Math.max(0, amount) },
        })),
      setCurrentSavings: (amount) =>
        set((state) => ({
          budget: { ...state.budget, currentSavings: Math.max(0, amount) },
        })),

      documents: INITIAL_DOCUMENTS,
      updateDocumentStatus: (documentId, status) =>
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === documentId ? { ...doc, status } : doc
          ),
        })),
      addDocument: (doc) =>
        set((state) => ({
          documents: [...state.documents, { ...doc, id: `doc-${Date.now()}` }],
        })),
      deleteDocument: (documentId) =>
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== documentId),
        })),

      achievements: INITIAL_ACHIEVEMENTS,
      unlockAchievement: (achievementId) =>
        set((state) => ({
          achievements: state.achievements.map((achievement) =>
            achievement.id === achievementId && !achievement.unlockedAt
              ? { ...achievement, unlockedAt: new Date().toISOString() }
              : achievement
          ),
        })),

      majorDecisions: [],
      addMajorDecisionResponse: (response: MajorDecisionResponse) =>
        set((state) => ({
          majorDecisions: [...state.majorDecisions, response],
        })),

      getOverallProgress: () => {
        const tasks = allTasks(get().phases);
        if (tasks.length === 0) return 0;
        return Math.round(
          (tasks.filter((task) => task.status === 'Completed').length /
            tasks.length) *
            100
        );
      },
      getPhaseProgress: (phaseId) => {
        const phase = get().phases.find((candidate) => candidate.id === phaseId);
        if (!phase) return 0;
        const tasks = phase.months.flatMap((month) =>
          month.goals.flatMap((goal) => goal.tasks)
        );
        if (tasks.length === 0) return 0;
        return Math.round(
          (tasks.filter((task) => task.status === 'Completed').length /
            tasks.length) *
            100
        );
      },
      getCompletedTaskCount: () =>
        allTasks(get().phases).filter((task) => task.status === 'Completed').length,
      getTotalTaskCount: () => allTasks(get().phases).length,
      getCurrentPhase: () =>
        get().phases.find((phase) => phase.status === 'In Progress') ??
        get().phases[0],
      getNextTask: () => {
        for (const phase of get().phases) {
          for (const month of phase.months) {
            for (const goal of month.goals) {
              const task = goal.tasks.find(
                (candidate) => candidate.status !== 'Completed'
              );
              if (task) return task;
            }
          }
        }
        return undefined;
      },

      exportData: () => {
        const state = get();
        return JSON.stringify({
          myWhy: state.myWhy,
          phases: state.phases,
          majors: state.majors,
          skills: state.skills,
          journalEntries: state.journalEntries,
          budget: state.budget,
          documents: state.documents,
          achievements: state.achievements,
          majorDecisions: state.majorDecisions,
        });
      },
      importData: (jsonString) => {
        try {
          const parsed = JSON.parse(jsonString) as Partial<JourneyState>;
          if (!parsed || !Array.isArray(parsed.phases) || !Array.isArray(parsed.majors)) {
            return false;
          }
          const phases = recalculatePhases(parsed.phases);
          const majors = recalculateMajors(phases, parsed.majors);
          const skills = recalculateSkills(
            phases,
            Array.isArray(parsed.skills) ? parsed.skills : INITIAL_SKILLS
          );
          set({
            myWhy: parsed.myWhy ?? get().myWhy,
            phases,
            majors,
            skills,
            journalEntries: Array.isArray(parsed.journalEntries)
              ? parsed.journalEntries
              : [],
            budget:
              parsed.budget && Array.isArray(parsed.budget.items)
                ? parsed.budget
                : get().budget,
            documents: Array.isArray(parsed.documents)
              ? parsed.documents
              : get().documents,
            achievements: Array.isArray(parsed.achievements)
              ? parsed.achievements
              : get().achievements,
            majorDecisions: Array.isArray(parsed.majorDecisions)
              ? parsed.majorDecisions
              : [],
          });
          return true;
        } catch {
          return false;
        }
      },
      resetData: () =>
        set({
          myWhy:
            'I want to understand what kind of person and scientist I want to become, and I want to give myself a real chance to study what I genuinely care about.',
          phases: recalculatePhases(INITIAL_PHASES),
          majors: INITIAL_MAJORS.map((major) => ({
            ...major,
            baseConfidenceScore:
              major.baseConfidenceScore ?? major.confidenceScore,
          })),
          skills: INITIAL_SKILLS,
          journalEntries: [],
          budget: INITIAL_BUDGET,
          documents: INITIAL_DOCUMENTS,
          achievements: INITIAL_ACHIEVEMENTS,
          majorDecisions: [],
        }),
    }),
    {
      name: STORAGE_NAME,
      version: STORAGE_VERSION,
      migrate: (persistedState) => migratePersistedState(persistedState) as any,
    }
  )
);