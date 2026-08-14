// Explicit Task → Skill gates for the roadmap progression system.
// Keep this mapping separate from Speed data.ts so roadmap data stays stable.

export const TASK_SKILL_UNLOCKS: Record<string, string[]> = {
  // Physics / Mathematics
  't1-8': ['skill-algebra'],
  't1-9': ['skill-functions'],
  't2-1': ['skill-mechanics'],
  't2-2': ['skill-vectors'],
  't2-3': ['skill-python'],
  't2-4': ['skill-waves'],

  // BCS
  't2-5': ['skill-neurons'],
  't2-6': ['skill-brain-anatomy'],
  't2-7': ['skill-machine-learning'],

  // Life Science
  't2-8': ['skill-cell-biology-life'],
  't2-9': ['skill-genetics-life'],
  't2-10': ['skill-bioinformatics'],
};
