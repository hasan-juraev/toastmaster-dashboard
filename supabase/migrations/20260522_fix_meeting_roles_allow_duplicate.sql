-- Drop the dead allow_duplicate column from meeting_roles.
-- The UNIQUE constraint on (meeting_id, role_id) already enforces one role per meeting
-- unconditionally, making allow_duplicate a no-op. It was never read by the application.

alter table meeting_roles drop column allow_duplicate;
