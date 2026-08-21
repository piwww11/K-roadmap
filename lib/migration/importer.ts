'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MajorDecisionResponse, Skill } from '@/types';
import type { NormalizedMigrationData } from './normalizer';

export interface MigrationImportResult {
  success: boolean;
  userId?: string;
  insertedOrUpdated: number;
  errors: string[];
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toPayload(value: unknown) {
  return value && typeof value === 'object' ? value : {};
}

function reflectionId(experimentId: string, attemptId?: string) {
  return attemptId ? `${attemptId}:reflection` : `${experimentId}:reflection`;
}

export async function importMigrationData(
  supabase: SupabaseClient,
  data: NormalizedMigrationData,
): Promise<MigrationImportResult> {
  const errors: string[] = [];
  let count = 0;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, insertedOrUpdated: 0, errors: [authError?.message ?? 'You must be signed in to import local progress.'] };
  }

  const userId = authData.user.id;
  const majorIds = new Set(data.journey.majors.map((major) => major.id));
  const documentIds = new Set(data.journey.documents.map((document) => document.id));

  async function upsert(table: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return true;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) {
      errors.push(`${table}: ${error.message}`);
      return false;
    }
    count += rows.length;
    return true;
  }

  const profile = {
    id: userId,
    display_name: authData.user.user_metadata?.full_name ?? authData.user.email ?? null,
  };
  {
    const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
    if (error) errors.push(`profiles: ${error.message}`);
    else count += 1;
  }

  const majors = data.journey.majors.map((major) => ({
    id: major.id,
    user_id: userId,
    name: major.name,
    university: major.university,
    interest_score: major.interestScore,
    confidence_score: major.baseConfidenceScore ?? major.confidenceScore,
    payload: toPayload(major),
  }));
  if (!(await upsert('majors', majors))) return { success: false, userId, insertedOrUpdated: count, errors };

  const phases = data.journey.phases.map((phase) => ({
    id: phase.id,
    user_id: userId,
    phase_number: phase.number,
    title: phase.title,
    subtitle: phase.subtitle,
    payload: toPayload(phase),
  }));
  if (!(await upsert('journey_phases', phases))) return { success: false, userId, insertedOrUpdated: count, errors };

  const months = data.journey.phases.flatMap((phase) => phase.months.map((month) => ({
    id: month.id,
    user_id: userId,
    phase_id: month.phaseId,
    month_number: month.year,
    title: month.name,
    payload: toPayload(month),
  })));
  if (!(await upsert('journey_months', months))) return { success: false, userId, insertedOrUpdated: count, errors };

  const goals = data.journey.phases.flatMap((phase) => phase.months.flatMap((month) => month.goals.map((goal) => ({
    id: goal.id,
    user_id: userId,
    month_id: goal.monthId,
    title: goal.title,
    payload: toPayload(goal),
  }))));
  if (!(await upsert('journey_goals', goals))) return { success: false, userId, insertedOrUpdated: count, errors };

  const tasks = data.journey.phases.flatMap((phase) =>
    phase.months.flatMap((month) =>
      month.goals.flatMap((goal) =>
        goal.tasks.map((task) => ({
          id: task.id,
          user_id: userId,
          goal_id: task.goalId,
          status: task.status,
          major_reward: task.majorReward ?? null,
          exploration_major_ids: task.explorationMajorIds ?? [],
          unlocks_skill_ids: task.unlocksSkillIds ?? [],
          depends_on_task_ids: [],
          payload: toPayload(task),
        })),
      ),
    ),
  );
  if (!(await upsert('journey_tasks', tasks))) return { success: false, userId, insertedOrUpdated: count, errors };

  const skills = data.journey.skills.map((skill: Skill) => ({
    id: skill.id,
    user_id: userId,
    major_id: null,
    name: skill.title,
    status: skill.status,
    payload: toPayload(skill),
  }));
  if (!(await upsert('skills', skills))) return { success: false, userId, insertedOrUpdated: count, errors };

  const journal = data.journey.journalEntries.map((entry) => ({
    id: entry.id,
    user_id: userId,
    entry_date: dateOrNull(entry.date),
    title: entry.title,
    content: entry.content,
    payload: toPayload(entry),
  }));
  if (!(await upsert('journal_entries', journal))) return { success: false, userId, insertedOrUpdated: count, errors };

  const documents = data.journey.documents.map((document) => ({
    id: document.id,
    user_id: userId,
    name: document.name,
    status: document.status,
    payload: toPayload(document),
  }));
  if (!(await upsert('documents', documents))) return { success: false, userId, insertedOrUpdated: count, errors };

  const achievements = data.journey.achievements.map((achievement) => ({
    id: achievement.id,
    user_id: userId,
    name: achievement.name,
    payload: toPayload(achievement),
  }));
  if (!(await upsert('achievements', achievements))) return { success: false, userId, insertedOrUpdated: count, errors };

  const decisions = data.journey.majorDecisions.map((decision: MajorDecisionResponse, index) => ({
    id: `decision:${decision.timestamp}:${index}`,
    user_id: userId,
    major_id: null,
    payload: toPayload(decision),
    created_at: isoOrNull(decision.timestamp) ?? new Date().toISOString(),
  }));
  if (!(await upsert('major_decisions', decisions))) return { success: false, userId, insertedOrUpdated: count, errors };

  const experiments = data.experiments.experiments.map((experiment) => ({
    id: experiment.id,
    user_id: userId,
    major_id: majorIds.has(experiment.majorId) ? experiment.majorId : null,
    title: experiment.title,
    custom_title: experiment.customTitle ?? null,
    description: experiment.description,
    estimated_minutes: experiment.estimatedMinutes,
    status: experiment.status,
    started_at: isoOrNull(experiment.startedAt),
    completed_at: isoOrNull(experiment.completedAt),
    payload: toPayload(experiment),
  }));
  if (!(await upsert('experiments', experiments))) return { success: false, userId, insertedOrUpdated: count, errors };

  const attempts = data.experiments.experiments.flatMap((experiment) => experiment.attempts.map((attempt) => ({
    id: attempt.id,
    user_id: userId,
    experiment_id: experiment.id,
    experiment_name: attempt.experimentName ?? null,
    duration_minutes: attempt.durationMinutes ?? null,
    started_at: isoOrNull(attempt.startedAt),
    completed_at: isoOrNull(attempt.completedAt),
    payload: toPayload(attempt),
  })));
  if (!(await upsert('experiment_attempts', attempts))) return { success: false, userId, insertedOrUpdated: count, errors };

  const reflections = data.experiments.experiments.flatMap((experiment) => {
    const rows = [] as Record<string, unknown>[];
    if (experiment.reflection) rows.push({
      id: reflectionId(experiment.id), user_id: userId, experiment_id: experiment.id, attempt_id: null,
      interest: experiment.reflection.interest, energy: experiment.reflection.energy, difficulty: experiment.reflection.difficulty,
      would_do_again: experiment.reflection.wouldDoAgain, notes: experiment.reflection.notes,
      reflected_at: isoOrNull(experiment.reflection.createdAt), payload: toPayload(experiment.reflection),
    });
    for (const attempt of experiment.attempts) if (attempt.reflection) rows.push({
      id: reflectionId(experiment.id, attempt.id), user_id: userId, experiment_id: experiment.id, attempt_id: attempt.id,
      interest: attempt.reflection.interest, energy: attempt.reflection.energy, difficulty: attempt.reflection.difficulty,
      would_do_again: attempt.reflection.wouldDoAgain, notes: attempt.reflection.notes,
      reflected_at: isoOrNull(attempt.reflection.createdAt), payload: toPayload(attempt.reflection),
    });
    return rows;
  });
  if (!(await upsert('experiment_reflections', reflections))) return { success: false, userId, insertedOrUpdated: count, errors };

  const applications = data.applications.applications.map((application) => ({
    id: application.id, user_id: userId, type: application.type, name: application.name,
    organization: application.organization, country: application.country, program: application.program ?? null,
    major_id: application.majorId && majorIds.has(application.majorId) ? application.majorId : null,
    major_label: application.majorLabel ?? null, status: application.status, priority: application.priority,
    deadline: isoOrNull(application.deadline), eligibility: application.eligibility ?? null,
    application_url: application.applicationUrl ?? null, notes: application.notes ?? null, payload: toPayload(application),
  }));
  if (!(await upsert('applications', applications))) return { success: false, userId, insertedOrUpdated: count, errors };

  const applicationDocuments = data.applications.applications.flatMap((application) => {
    const ids = Array.isArray(application.requiredDocumentIds) ? application.requiredDocumentIds : [];
    return ids.filter((documentId) => documentIds.has(documentId)).map((documentId) => ({
      application_id: application.id, document_id: documentId, user_id: userId,
    }));
  });
  if (applicationDocuments.length) {
    const { error } = await supabase.from('application_documents').upsert(applicationDocuments, { onConflict: 'application_id,document_id' });
    if (error) errors.push(`application_documents: ${error.message}`);
    else count += applicationDocuments.length;
  }

  {
    const { error } = await supabase.from('budget_profiles').upsert({
      user_id: userId,
      target_amount: data.journey.budget.targetAmount,
      payload: { legacyCurrentSavings: data.journey.budget.legacyCurrentSavings },
    }, { onConflict: 'user_id' });
    if (error) errors.push(`budget_profiles: ${error.message}`);
    else count += 1;
  }

  const budgetItems = data.journey.budget.items.map((item) => ({
    id: item.id, user_id: userId, name: item.name, amount: item.amount, category: item.category,
    due_date: dateOrNull(item.dueDate), notes: item.notes ?? null, payload: toPayload(item),
  }));
  if (!(await upsert('budget_items', budgetItems))) return { success: false, userId, insertedOrUpdated: count, errors };

  return { success: errors.length === 0, userId, insertedOrUpdated: count, errors };
}
