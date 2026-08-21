-- Migration compatibility patch.
-- A MajorDecisionResponse is a questionnaire response set, not a decision for one
-- specific major. The local type therefore has no majorId. Keep the relationship
-- optional and preserve the full response in payload.
alter table public.major_decisions
  alter column major_id drop not null;
