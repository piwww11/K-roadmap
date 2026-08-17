import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Experiment, ExperimentReflection } from '@/types';
import { INITIAL_EXPERIMENTS } from './experiments';

interface ExperimentState {
  experiments: Experiment[];
  addExperiment: (experiment: Omit<Experiment, 'id' | 'createdAt'>) => void;
  updateExperiment: (experimentId: string, updates: Partial<Experiment>) => void;
  deleteExperiment: (experimentId: string) => void;
  saveReflection: (experimentId: string, reflection: Omit<ExperimentReflection, 'createdAt'>) => void;
  resetExperiments: () => void;
}

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set) => ({
      experiments: INITIAL_EXPERIMENTS,

      addExperiment: (experiment) =>
        set((state) => ({
          experiments: [
            ...state.experiments,
            {
              ...experiment,
              id: `experiment-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateExperiment: (experimentId, updates) =>
        set((state) => ({
          experiments: state.experiments.map((experiment) =>
            experiment.id === experimentId
              ? { ...experiment, ...updates }
              : experiment
          ),
        })),

      deleteExperiment: (experimentId) =>
        set((state) => ({
          experiments: state.experiments.filter(
            (experiment) => experiment.id !== experimentId
          ),
        })),

      saveReflection: (experimentId, reflection) =>
        set((state) => ({
          experiments: state.experiments.map((experiment) =>
            experiment.id === experimentId
              ? {
                  ...experiment,
                  status: 'completed',
                  completedAt: experiment.completedAt ?? new Date().toISOString(),
                  reflection: {
                    ...reflection,
                    createdAt: new Date().toISOString(),
                  },
                }
              : experiment
          ),
        })),

      resetExperiments: () => set({ experiments: INITIAL_EXPERIMENTS }),
    }),
    {
      name: 'k-roadmap-experiments-v1',
      version: 1,
    }
  )
);