import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Experiment, ExperimentAttempt, ExperimentReflection } from '@/types';
import { INITIAL_EXPERIMENTS } from './experiments';

interface ExperimentState {
  experiments: Experiment[];
  addExperiment: (experiment: Omit<Experiment, 'id' | 'createdAt' | 'attempts'>) => void;
  startExperiment: (experimentId: string) => void;
  updateExperiment: (experimentId: string, updates: Partial<Experiment>) => void;
  deleteExperiment: (experimentId: string) => void;
  saveReflection: (experimentId: string, reflection: Omit<ExperimentReflection, 'createdAt'>) => void;
  resetExperiments: () => void;
}

function createAttempt(): ExperimentAttempt {
  return {
    id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: new Date().toISOString(),
  };
}

function normalizeExperiments(experiments: Experiment[]): Experiment[] {
  return experiments.map((experiment) => {
    const legacyAttempt = experiment.reflection
      ? [{
          id: `attempt-legacy-${experiment.id}`,
          startedAt: experiment.startedAt,
          completedAt: experiment.completedAt,
          reflection: experiment.reflection,
        }]
      : [];

    return {
      ...experiment,
      attempts: Array.isArray(experiment.attempts) && experiment.attempts.length
        ? experiment.attempts
        : legacyAttempt,
    };
  });
}

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set) => ({
      experiments: INITIAL_EXPERIMENTS,
      addExperiment: (experiment) => set((state) => ({
        experiments: [...state.experiments, { ...experiment, id: `experiment-${Date.now()}`, createdAt: new Date().toISOString(), attempts: [] }],
      })),
      startExperiment: (experimentId) => set((state) => ({
        experiments: state.experiments.map((experiment) => {
          if (experiment.id !== experimentId) return experiment;
          const attempt = createAttempt();
          return { ...experiment, status: 'in-progress', startedAt: attempt.startedAt, completedAt: undefined, reflection: undefined, attempts: [...(experiment.attempts ?? []), attempt] };
        }),
      })),
      updateExperiment: (experimentId, updates) => set((state) => ({
        experiments: state.experiments.map((experiment) => experiment.id === experimentId ? { ...experiment, ...updates } : experiment),
      })),
      deleteExperiment: (experimentId) => set((state) => ({
        experiments: state.experiments.filter((experiment) => experiment.id !== experimentId),
      })),
      saveReflection: (experimentId, reflection) => set((state) => ({
        experiments: state.experiments.map((experiment) => {
          if (experiment.id !== experimentId) return experiment;
          const attempts = [...(experiment.attempts ?? [])];
          const index = attempts.length - 1;
          const now = new Date().toISOString();
          if (index < 0) {
            attempts.push({ ...createAttempt(), completedAt: now, reflection: { ...reflection, createdAt: now } });
          } else {
            attempts[index] = { ...attempts[index], completedAt: now, reflection: { ...reflection, createdAt: now } };
          }
          const latest = attempts[attempts.length - 1];
          return { ...experiment, status: 'completed', startedAt: latest.startedAt, completedAt: latest.completedAt, reflection: latest.reflection, attempts };
        }),
      })),
      resetExperiments: () => set({ experiments: INITIAL_EXPERIMENTS }),
    }),
    {
      name: 'k-roadmap-experiments-v1',
      version: 3,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState as never;
        const state = persistedState as { experiments?: Experiment[] };
        return { ...persistedState, experiments: normalizeExperiments(state.experiments ?? INITIAL_EXPERIMENTS) };
      },
    }
  )
);