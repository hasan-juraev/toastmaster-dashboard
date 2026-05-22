-- Link ah_counter_reports to the Ah-Counter meeting_role assignment.
-- This allows joining reports back to the role that produced them
-- and is consistent with grammarian/evaluator/timer report patterns.

alter table ah_counter_reports
  add column if not exists meeting_role_id uuid references meeting_roles(id) on delete set null;

create index if not exists ah_counter_reports_meeting_role_id_idx
  on ah_counter_reports(meeting_role_id);
