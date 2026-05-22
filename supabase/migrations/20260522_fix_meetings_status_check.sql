-- Add CHECK constraint to meetings.status (previously unconstrained text)
-- Existing data only uses 'upcoming' and 'completed' so this is safe to apply

alter table meetings
  add constraint meetings_status_check
  check (status in ('upcoming', 'in_progress', 'completed', 'cancelled'));
