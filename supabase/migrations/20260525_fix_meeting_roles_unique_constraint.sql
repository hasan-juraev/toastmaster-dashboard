-- Replace the DEFERRABLE unique constraint on meeting_roles(meeting_id, role_id)
-- with a non-deferrable one so that upsert ON CONFLICT can use it as an arbiter.
-- PostgreSQL error 55000: "ON CONFLICT does not support deferrable unique constraints".

-- The auto-generated name for an inline unique() clause is <table>_<col1>_<col2>_key.
-- We drop it and recreate it without DEFERRABLE.
alter table meeting_roles
  drop constraint if exists meeting_roles_meeting_id_role_id_key;

alter table meeting_roles
  add constraint meeting_roles_meeting_id_role_id_key
  unique (meeting_id, role_id);
