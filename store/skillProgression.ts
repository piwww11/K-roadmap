import type { Skill, Task } from '../types';
import { TASK_SKILL_UNLOCKS } from './skillUnlocks';

/**
 * Applies explicit task gates without changing the roadmap data itself.
 * A completed gate unlocks a skill permanently; uncompleting the gate does
 * not relock a skill that has already been earned.
 */
export function applyTaskSkillUnlocks(skills: Skill[], tasks: Task[]): Skill[] {
  const completedTaskIds = new Set(
    tasks.filter((task) => task.status === 'Completed').map((task) => task.id)
  );

  const earnedSkillIds = new Set<string>();
  for (const task of tasks) {
    if (task.status !== 'Completed') continue;
    for (const skillId of TASK_SKILL_UNLOCKS[task.id] ?? task.unlocksSkillIds ?? []) {
      earnedSkillIds.add(skillId);
    }
  }

  return skills.map((skill) => {
    if (earnedSkillIds.has(skill.id)) {
      return skill.status === 'locked'
        ? { ...skill, status: 'not-started', unlockedAt: skill.unlockedAt ?? new Date().toISOString() }
        : skill;
    }

    // Preserve already-earned skills. Explicit gates are unlock events, not
    // reversible status conditions.
    if (skill.unlockedAt && skill.status !== 'locked') return skill;

    return skill;
  });
}
