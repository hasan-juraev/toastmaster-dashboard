-- Enforce NOT NULL on meeting_role_id for grammarian and evaluator reports.
-- A report without a meeting_role_id is semantically orphaned.
-- The seed data and all application inserts always supply this column.
-- Verify before applying: both queries below must return 0 rows.
--   SELECT id FROM grammarian_reports WHERE meeting_role_id IS NULL;
--   SELECT id FROM evaluator_reports  WHERE meeting_role_id IS NULL;

alter table grammarian_reports
  alter column meeting_role_id set not null;

alter table evaluator_reports
  alter column meeting_role_id set not null;

-- timer_reports is excluded here — its UNIQUE constraint will be dropped
-- and the column restructured in the Phase 7 timer-per-member migration.
