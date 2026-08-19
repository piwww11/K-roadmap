import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Experiment, ExperimentAttempt, ExperimentReflection } from '@/types';
import { INITIAL_EXPERIMENTS } from './experiments';

interface AttemptDetails {
  experimentName: string;
  durationMinutes: number;
}

interface ExperimentState {
  experiments: Experiment[];
  addExperiment: (experiment: Omit<Experiment, 'id' | 'createdAt' | 'attempts'>) => void;
  startExperiment: (experimentId: string) => void;
  updateExperiment: (experimentId: string, updates: Partial<Experiment>) => void;
  deleteExperiment: (experimentId: string) => void;
  saveReflection: (experimentId: string, reflection: Omit<ExperimentReflection, 'createdAt'>, details?: AttemptDetails) => void;
  resetExperiments: () => void;
}

function createAttempt(): ExperimentAttempt {
  return {
    id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: new Date().toISOString(),
  };
}

function normalizeExperiments(experiments: Experiment[]): Experiment[] {
  return INITIAL_EXPERIMENTS.map((template) => {
    const persisted = experiments.find((experiment) => experiment.id === template.id)
      ?? experiments.find((experiment) => experiment.majorId === template.majorId);

    const legacyAttempt = persisted?.reflection
      ? [{
          id: `attempt-legacy-${template.id}`,
          startedAt: persisted.startedAt,
          completedAt: persisted.completedAt,
          reflection: persisted.reflection,
        }]
      : [];

    return {
      ...template,
      attempts: Array.isArray(persisted?.attempts) && persisted.attempts.length
        ? persisted.attempts
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
      saveReflection: (experimentId, reflection, details) => set((state) => ({
        experiments: state.experiments.map((experiment) => {
          if (experiment.id !== experimentId) return experiment;
          const attempts = [...(experiment.attempts ?? [])];
          const index = attempts.length - 1;
          const now = new Date().toISOString();
          const detailValues = details
            ? { experimentName: details.experimentName.trim(), durationMinutes: Math.max(1, Math.round(details.durationMinutes)) }
            : undefined;

          if (index < 0) {
            attempts.push({ ...createAttempt(), ...(detailValues ?? {}), completedAt: now, reflection: { ...reflection, createdAt: now } });
          } else {
            attempts[index] = { ...attempts[index], ...(detailValues ?? {}), completedAt: now, reflection: { ...reflection, createdAt: now } };
          }
          const latest = attempts[attempts.length - 1];
          return { ...experiment, status: 'completed', startedAt: latest.startedAt, completedAt: latest.completedAt, reflection: latest.reflection, attempts };
        }),
      })),
      resetExperiments: () => set({ experiments: INITIAL_EXPERIMENTS }),
    }),
    {
      name: 'k-roadmap-experiments-v1',
      version: 4,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState as never;
        const state = persistedState as { experiments?: Experiment[] };
        return { ...persistedState, experiments: normalizeExperiments(state.experiments ?? INITIAL_EXPERIMENTS) };
      },
    }
  )
);