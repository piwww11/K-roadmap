import type { Experiment } from '@/types';

export const INITIAL_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-physics-mechanics',
    title: 'Physics mini-lab: explain one mechanics problem',
    description: 'Pick a simple mechanics problem, solve it without looking at the solution, then explain why your approach works in your own words.',
    majorId: 'm1',
    estimatedMinutes: 45,
    status: 'planned',
    createdAt: '2026-08-17T00:00:00.000Z',
  },
  {
    id: 'exp-bcs-cognition',
    title: 'BCS mini-study: test a memory or attention effect',
    description: 'Run a tiny self-observation or informal experiment around memory, attention, or decision-making and write down what surprised you.',
    majorId: 'm2',
    estimatedMinutes: 30,
    status: 'planned',
    createdAt: '2026-08-17T00:00:00.000Z',
  },
  {
    id: 'exp-life-dna',
    title: 'Life Science mini-project: trace one biological mechanism',
    description: 'Choose a biological process such as DNA replication, gene expression, or cell signaling and build a simple explanation from cause to effect.',
    majorId: 'm3',
    estimatedMinutes: 45,
    status: 'planned',
    createdAt: '2026-08-17T00:00:00.000Z',
  },
];